// Simple in-memory rate limiter (per-IP)
// Resets on server restart — lightweight, no external dependencies

const stores = {};

/**
 * Create a rate limiter for a specific route/group.
 * @param {string} name - Unique name for this limiter
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {function(Request): {allowed: boolean, remaining: number}}
 */
export function createRateLimiter(name, maxRequests, windowMs) {
    if (!stores[name]) {
        stores[name] = new Map();
        // Cleanup old entries every 5 minutes
        setInterval(() => {
            const now = Date.now();
            const store = stores[name];
            for (const [key, entry] of store) {
                if (now - entry.start > windowMs * 2) {
                    store.delete(key);
                }
            }
        }, 5 * 60 * 1000).unref();
    }

    return function checkLimit(request) {
        // IMPORTANT: cf-connecting-ip is set by Cloudflare and cannot be spoofed
        // by the client. x-forwarded-for CAN be spoofed (attacker sets it before
        // Cloudflare, code was taking the first entry). In production we're always
        // behind Cloudflare Tunnel, so cf-connecting-ip is the trusted source.
        // x-forwarded-for is kept as fallback for local dev (no Cloudflare).
        const ip = request.headers.get('cf-connecting-ip')
            || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || 'unknown';

        const store = stores[name];
        const now = Date.now();
        const entry = store.get(ip);

        if (!entry || now - entry.start > windowMs) {
            store.set(ip, { start: now, count: 1 });
            return { allowed: true, remaining: maxRequests - 1 };
        }

        entry.count++;
        if (entry.count > maxRequests) {
            return { allowed: false, remaining: 0 };
        }

        return { allowed: true, remaining: maxRequests - entry.count };
    };
}
