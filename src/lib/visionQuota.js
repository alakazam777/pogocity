import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from './dataPath';

const QUOTA_FILE = path.join(DATA_DIR, '.vision-quota.json');

// Default monthly cap stays well under Google's 1000/month free tier.
// Override via VISION_MONTHLY_CAP env if you want to change it without redeploying.
const DEFAULT_MONTHLY_CAP = 800;

function getMonthlyCap() {
    const fromEnv = parseInt(process.env.VISION_MONTHLY_CAP, 10);
    return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MONTHLY_CAP;
}

function currentMonth() {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Single mutex — quota writes are global, not per-user.
let _lockPromise = Promise.resolve();
async function withLock(fn) {
    let release;
    const acquire = new Promise((resolve) => { release = resolve; });
    const previous = _lockPromise;
    _lockPromise = acquire;
    try {
        await previous;
        return await fn();
    } finally {
        release();
    }
}

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

async function readQuotaFile() {
    try {
        const content = await fs.readFile(QUOTA_FILE, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        if (err.code === 'ENOENT') return null;
        // Corrupted file — recover by treating as empty.
        console.warn('[visionQuota] Quota file unreadable, resetting:', err.message);
        return null;
    }
}

async function writeQuotaFile(data) {
    await ensureDataDir();
    await fs.writeFile(QUOTA_FILE, JSON.stringify(data, null, 2));
}

// Returns the canonical state for the current month, auto-rotating on month change.
async function readOrInitState() {
    const month = currentMonth();
    const existing = await readQuotaFile();

    if (!existing || existing.month !== month) {
        return {
            month,
            count: 0,
            limit: getMonthlyCap(),
            lastUpdate: null,
            history: existing?.month && existing.month !== month
                ? [...(existing.history || []), { month: existing.month, count: existing.count }].slice(-12)
                : (existing?.history || []),
        };
    }

    return {
        month: existing.month,
        count: existing.count || 0,
        limit: getMonthlyCap(),
        lastUpdate: existing.lastUpdate || null,
        history: existing.history || [],
    };
}

// ─── Public API ───

/**
 * Read current quota status without modifying it.
 * @returns {Promise<{ month, used, limit, remaining, exhausted }>}
 */
export async function getQuotaStatus() {
    return withLock(async () => {
        const state = await readOrInitState();
        return {
            month: state.month,
            used: state.count,
            limit: state.limit,
            remaining: Math.max(0, state.limit - state.count),
            exhausted: state.count >= state.limit,
        };
    });
}

/**
 * Try to consume one quota unit. Returns true on success, false if exhausted.
 * Caller should fall back to Tesseract on false.
 */
export async function consumeQuota() {
    return withLock(async () => {
        const state = await readOrInitState();

        if (state.count >= state.limit) {
            // Persist if month rolled over so the new fresh state is saved.
            await writeQuotaFile(state);
            return { granted: false, used: state.count, limit: state.limit, remaining: 0, month: state.month };
        }

        state.count += 1;
        state.lastUpdate = new Date().toISOString();
        await writeQuotaFile(state);

        return {
            granted: true,
            used: state.count,
            limit: state.limit,
            remaining: state.limit - state.count,
            month: state.month,
        };
    });
}

/**
 * Manually reset the quota for the current month. Admin/debug use only.
 */
export async function resetQuota() {
    return withLock(async () => {
        const state = await readOrInitState();
        state.count = 0;
        state.lastUpdate = new Date().toISOString();
        await writeQuotaFile(state);
        return state;
    });
}

export const _internals = { currentMonth, getMonthlyCap };
