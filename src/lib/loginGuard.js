// Per-username login attempt tracking. Complements the per-IP rate limiter
// in lib/rateLimit.js — that one stops a single attacker hammering, this
// one stops a distributed attack (many IPs, one target username) from
// brute-forcing a specific account.
//
// Design:
//   - In-memory Map keyed by normalized (lowercased) username.
//   - Each entry: { count, firstAttemptAt, lockedUntil? }.
//   - After MAX_FAILURES failures within WINDOW_MS, the username is locked
//     for LOCKOUT_MS. Successful login clears the entry.
//   - Counter resets on its own once WINDOW_MS passes since the first
//     failed attempt — so casual typos don't accumulate forever.
//
// Trade-offs:
//   - In-memory means a server restart wipes the counters. That's fine —
//     restarts are rare, and our threat model is a sustained brute-force,
//     not a one-shot attempt that survives a restart.
//   - We log lockouts so admins can spot patterns in pm2 logs.

const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;       // 15 min sliding window for counting
const LOCKOUT_MS = 15 * 60 * 1000;      // 15 min lockout once threshold hit

// We accept a config object so the same module could be reused for other
// auth surfaces later (e.g. admin login) with different thresholds.
const attempts = new Map();

function normalizeKey(username) {
    return String(username || '').toLowerCase().trim();
}

/**
 * Returns { locked, retryAfterMs } for the given username.
 * Stale entries (past their window) are cleaned up lazily here.
 */
export function checkLockout(username) {
    const key = normalizeKey(username);
    if (!key) return { locked: false, retryAfterMs: 0 };

    const entry = attempts.get(key);
    if (!entry) return { locked: false, retryAfterMs: 0 };

    const now = Date.now();
    if (entry.lockedUntil && now < entry.lockedUntil) {
        return { locked: true, retryAfterMs: entry.lockedUntil - now };
    }
    if (entry.lockedUntil && now >= entry.lockedUntil) {
        // Lockout expired — clear the slate.
        attempts.delete(key);
        return { locked: false, retryAfterMs: 0 };
    }
    return { locked: false, retryAfterMs: 0 };
}

/**
 * Record a failed login attempt. Returns the new lockout state so callers
 * can include retry hints in the response.
 */
export function recordFailure(username) {
    const key = normalizeKey(username);
    if (!key) return { locked: false, count: 0 };

    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || (now - entry.firstAttemptAt) > WINDOW_MS) {
        // Fresh window — start counting from 1.
        attempts.set(key, { count: 1, firstAttemptAt: now });
        return { locked: false, count: 1 };
    }

    entry.count += 1;
    if (entry.count >= MAX_FAILURES) {
        entry.lockedUntil = now + LOCKOUT_MS;
        console.warn(`[loginGuard] LOCKED "${key}" for ${LOCKOUT_MS / 1000 / 60}min after ${entry.count} failed attempts`);
    }
    return { locked: !!entry.lockedUntil, count: entry.count };
}

/**
 * Clear the failure counter for a username. Call on successful login.
 */
export function clearFailures(username) {
    const key = normalizeKey(username);
    if (!key) return;
    attempts.delete(key);
}

// Periodic sweep of stale entries so the Map doesn't grow unbounded
// from typo'd usernames that never lock out. Runs every 30 min.
const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
        const cutoff = entry.lockedUntil || (entry.firstAttemptAt + WINDOW_MS);
        if (now > cutoff) attempts.delete(key);
    }
}, 30 * 60 * 1000);
sweepInterval.unref?.();
