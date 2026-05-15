import crypto from 'crypto';

// ─── Per-session admin tokens ───
// Instead of using a static ADMIN_TOKEN from .env for the cookie value,
// we generate a cryptographically random token on each successful login.
// Tokens are stored in an in-memory Set with a creation timestamp;
// they auto-expire after TOKEN_TTL_MS and are cleaned up periodically.
// On server restart, all tokens are invalidated (admins must re-login).

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 1 day, matches cookie maxAge
const activeTokens = new Map(); // token → { createdAt: number }

// Cleanup expired tokens every 15 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, meta] of activeTokens) {
        if (now - meta.createdAt > TOKEN_TTL_MS) {
            activeTokens.delete(token);
        }
    }
}, 15 * 60 * 1000).unref();

/**
 * Generate a new admin session token and register it.
 * @returns {string} Hex token (64 chars = 256 bits)
 */
export function generateAdminToken() {
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.set(token, { createdAt: Date.now() });
    return token;
}

/**
 * Verify an admin session token (constant-time).
 * @param {string|undefined} token - The token from the admin_token cookie
 * @returns {boolean}
 */
export function verifyAdminToken(token) {
    if (!token || typeof token !== 'string') return false;

    // Also accept the static ADMIN_TOKEN from env as a fallback so that
    // existing cookies issued before this upgrade still work until they
    // expire naturally (1 day). This prevents locking out the admin on
    // deploy — they'll just re-login next time and get a per-session token.
    const staticToken = process.env.ADMIN_TOKEN;

    // Check per-session tokens first
    for (const [activeToken, meta] of activeTokens) {
        if (Date.now() - meta.createdAt > TOKEN_TTL_MS) continue;
        if (safeEqual(token, activeToken)) return true;
    }

    // Fallback: static env token (for backward compat during transition)
    if (staticToken && safeEqual(token, staticToken)) return true;

    return false;
}

/**
 * Verify the admin password (constant-time comparison).
 * @param {string} password
 * @returns {boolean}
 */
export function verifyAdminPassword(password) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!password || !expected) return false;
    return safeEqual(password, expected);
}

// ─── Helpers ───

function safeEqual(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
