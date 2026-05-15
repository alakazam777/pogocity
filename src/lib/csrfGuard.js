// Lightweight CSRF protection for state-changing API routes.
//
// Modern browsers send `sec-fetch-site` on every fetch (Chrome 76+, FF 90+,
// Safari 15+). It's the most reliable signal — `same-origin`/`same-site`/`none`
// are safe; `cross-site` is the smoking gun of a CSRF attempt.
//
// We fall back to Origin/Referer host comparison for older clients, and reject
// requests with none of the three headers as a paranoid default.
export function isSameOriginRequest(request) {
    const fetchSite = request.headers.get('sec-fetch-site');
    if (fetchSite) {
        return fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none';
    }

    const host = request.headers.get('host');
    const origin = request.headers.get('origin');
    if (origin) {
        try {
            return new URL(origin).host === host;
        } catch { return false; }
    }

    const referer = request.headers.get('referer');
    if (referer) {
        try {
            return new URL(referer).host === host;
        } catch { return false; }
    }

    // No Origin/Referer/Sec-Fetch-Site at all → block. Legitimate browsers
    // always send at least one of these on POST/DELETE/PATCH.
    return false;
}
