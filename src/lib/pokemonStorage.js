import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { DATA_DIR } from './dataPath';

const DATA_FILE = path.join(DATA_DIR, 'pokemon_users.json');
const BCRYPT_ROUNDS = 10;

// ─── File-level mutex ───
// Prevents concurrent read-modify-write races on the JSON data file.
let _lockPromise = Promise.resolve();

async function withFileLock(fn) {
    let release;
    const acquire = new Promise((resolve) => { release = resolve; });
    const previous = _lockPromise;
    _lockPromise = acquire;
    await previous;          // wait for any in-flight write to finish
    try {
        return await fn();
    } finally {
        release();           // let the next queued write proceed
    }
}

// Ensure data directory and file exist
async function ensureDataFile() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }

    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify({}, null, 2));
    }
}

// ─── Password hashing ───

// Legacy SHA256 (unsalted) — kept for verifying old hashes during migration
function hashPasswordLegacy(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Modern bcrypt hash
async function hashPassword(password) {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Detect bcrypt hash format ($2a$, $2b$, $2y$)
function isBcryptHash(hash) {
    return hash && hash.startsWith('$2');
}

// Constant-time comparison for hex strings (session tokens, legacy hashes)
function safeEqual(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// ─── Internal: update only the passwordHash field ───
// Surgical update that doesn't touch any other user data.
async function _updatePasswordHash(username, newHash) {
    return withFileLock(async () => {
        await ensureDataFile();
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        const users = JSON.parse(fileContent);
        const normalized = username.toLowerCase().replace(/'/g, "\u2019");

        if (!users[normalized]) return;
        users[normalized].passwordHash = newHash;
        await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));
    });
}

// ─── Public API ───

export async function getUser(username) {
    await ensureDataFile();
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    const users = JSON.parse(fileContent);
    // Normalize quotes for consistency
    let normalized = username.toLowerCase().replace(/'/g, "\u2019");

    // Explicit alias for merged user
    if (normalized === "mercure1456") normalized = "max\u2019ster";

    return users[normalized] || users[username.toLowerCase()] || null;
}

export async function saveUser(username, data, password = null) {
    return withFileLock(async () => {
        await ensureDataFile();
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        const users = JSON.parse(fileContent);

        // Use lowercase for the key to ensure uniqueness and case-insensitivity
        const normalizedUsername = username.toLowerCase().replace(/'/g, "\u2019");

        const userData = users[normalizedUsername] || {
            stats: {},
            checklist: {},
            createdAt: new Date().toISOString(),
            username: username // Store original casing for display
        };

        // Update password if provided — always use bcrypt for new passwords
        if (password) {
            userData.passwordHash = await hashPassword(password);
        }

        // Defense-in-depth: strip fields that must never be overwritten via
        // the data spread. Even if the API route forgets to sanitize, these
        // critical fields stay safe.
        const { passwordHash: _ph, createdAt: _ca, previousUsernames: _pu, ...safeData } = data;

        // Update other data
        users[normalizedUsername] = {
            ...userData,
            ...safeData,
            username: safeData.username || userData.username || username,
            lastUpdated: new Date().toISOString(),
        };

        await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));

        // Return user without password hash
        const { passwordHash, ...safeUser } = users[normalizedUsername];
        return safeUser;
    });
}

/**
 * Verify a user's password. Supports both bcrypt and legacy SHA256 hashes.
 * If a legacy SHA256 hash is verified, it is transparently migrated to bcrypt.
 *
 * IMPORTANT: after calling this, re-read the user via getUser() if you need
 * the current passwordHash (it may have been updated by the migration).
 */
export async function verifyUser(username, password) {
    const user = await getUser(username);
    if (!user || !user.passwordHash) return false;

    if (isBcryptHash(user.passwordHash)) {
        // Modern bcrypt hash — bcrypt.compare is inherently constant-time
        return bcrypt.compare(password, user.passwordHash);
    }

    // Legacy SHA256 hash — verify with constant-time comparison
    const legacyHash = hashPasswordLegacy(password);
    if (!safeEqual(user.passwordHash, legacyHash)) return false;

    // Password matches legacy hash — migrate to bcrypt.
    // This runs synchronously (awaited) so the caller can re-read the
    // user afterwards and get the updated hash for session token generation.
    try {
        const bcryptHash = await hashPassword(password);
        await _updatePasswordHash(username, bcryptHash);
        console.log(`[pokemonStorage] Migrated "${username}" from SHA256 to bcrypt`);
    } catch (err) {
        // Migration failure is non-fatal — the user is still authenticated.
        // They'll get migrated on their next login.
        console.error(`[pokemonStorage] bcrypt migration failed for "${username}":`, err);
    }

    return true;
}

export async function getSessionToken(username, passwordHash) {
    if (!username || !passwordHash) return null;
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error('NEXTAUTH_SECRET environment variable is required');
    return crypto.createHash('sha256')
        .update(`${username.toLowerCase()}:${passwordHash}:${secret}`)
        .digest('hex');
}

export async function verifySession(username, token) {
    const user = await getUser(username);
    if (!user || !user.passwordHash) return false;
    const expectedToken = await getSessionToken(username, user.passwordHash);
    return safeEqual(token, expectedToken);
}

export async function getAllUsers() {
    await ensureDataFile();
    const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(fileContent);
}

/**
 * Rename a user atomically under the file-level mutex.
 * Moves the user data from the old normalised key to the new one,
 * preserving all data and recording the previous username.
 *
 * Returns the updated user data (including passwordHash for session
 * token re-generation), or null if the source user doesn't exist.
 */
export async function renameUser(currentUsername, newUsername) {
    return withFileLock(async () => {
        await ensureDataFile();
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        const users = JSON.parse(fileContent);

        const normalizedCurrent = currentUsername.toLowerCase().replace(/'/g, "’");
        const normalizedNew = newUsername.toLowerCase().replace(/'/g, "’");

        const currentData = users[normalizedCurrent];
        if (!currentData) return null;

        const updatedData = {
            ...currentData,
            username: newUsername,
            previousUsernames: [...(currentData.previousUsernames || []), currentData.username],
            lastUpdated: new Date().toISOString(),
        };

        if (normalizedCurrent !== normalizedNew) {
            delete users[normalizedCurrent];
        }
        users[normalizedNew] = updatedData;

        await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));
        return updatedData;
    });
}
