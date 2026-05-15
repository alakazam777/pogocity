// /api/niantic-events — proxies the LeekDuck event feed (via the
// ScrapedDuck community mirror) and returns the "current + upcoming"
// slice that the homepage hero card cares about.
//
// Why a proxy instead of fetching ScrapedDuck directly from the client:
//   1. CORS — the raw.githubusercontent.com response does NOT include
//      Access-Control-Allow-Origin, so a browser fetch from
//      pogosphere.com fails the preflight.
//   2. Cache — we hit GitHub once per hour from this server instead of
//      once per visitor, keeping us comfortably under the unauthenticated
//      rate limit (60 req/h) and making the homepage instant for users.
//   3. Trimming — ScrapedDuck returns the *full* event archive (~hundreds
//      of items including events that ended years ago). We filter to the
//      handful that matter "right now" before sending bytes over the wire.
//
// Cache key: in-process Map keyed by "events" (single resource), TTL 1h.
// In-process is fine because Next.js standalone runs as a single Node
// process under pm2 — no horizontal scaling, no need for Redis.

import { NextResponse } from 'next/server';

const SOURCE_URL = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const MAX_UPCOMING = 8;

let cache = { fetchedAt: 0, data: null };

// "soon" cutoff for the upcoming slice — anything starting beyond this
// is too far in the future to be useful on the homepage. 21 days felt
// right (covers Community Day, the next monthly tour, and the next
// raid rotation).
const UPCOMING_WINDOW_DAYS = 21;

function shapeEvent(e) {
    // Translate ScrapedDuck schema → minimal payload the UI needs.
    // Skipping `extraData` keeps the response small (~50× smaller than
    // raw) since most events ship 5-30 KB of nested raid boss data.
    return {
        id: e.eventID,
        name: e.name,
        heading: e.heading,         // "Raid Battles", "Community Day", …
        type: e.eventType,
        link: e.link,
        image: e.image,
        start: e.start,
        end: e.end,
    };
}

async function fetchUpstream() {
    // 10s timeout — GitHub's raw CDN is usually <500ms but we don't want
    // a hung connection to block the homepage during an incident.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
        const res = await fetch(SOURCE_URL, {
            signal: ctrl.signal,
            headers: { 'User-Agent': 'pogosphere.com niantic-events proxy' },
        });
        if (!res.ok) throw new Error(`upstream ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(t);
    }
}

function partition(events) {
    const now = Date.now();
    const upcomingCutoff = now + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    const current = [];
    const upcoming = [];

    for (const raw of events) {
        if (!raw?.start || !raw?.end) continue;
        const start = new Date(raw.start).getTime();
        const end = new Date(raw.end).getTime();
        if (Number.isNaN(start) || Number.isNaN(end)) continue;

        if (start <= now && end >= now) {
            current.push({ ...shapeEvent(raw), _start: start, _end: end });
        } else if (start > now && start <= upcomingCutoff) {
            upcoming.push({ ...shapeEvent(raw), _start: start, _end: end });
        }
    }

    // Current: most recently started first (so the freshly-launched event
    // shows above one that's been running for a week).
    current.sort((a, b) => b._start - a._start);
    // Upcoming: chronological — the one closest to "now" comes first.
    upcoming.sort((a, b) => a._start - b._start);

    // Strip the _start/_end scratch fields before sending to the client.
    const strip = ({ _start, _end, ...rest }) => rest;
    return {
        current: current.map(strip),
        upcoming: upcoming.slice(0, MAX_UPCOMING).map(strip),
    };
}

export async function GET() {
    const now = Date.now();
    if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
        return NextResponse.json({ ...cache.data, cached: true, fetchedAt: cache.fetchedAt });
    }

    try {
        const raw = await fetchUpstream();
        const data = partition(raw);
        cache = { fetchedAt: now, data };
        return NextResponse.json({ ...data, cached: false, fetchedAt: now });
    } catch (e) {
        // On upstream failure, serve stale cache if we have one — better
        // than a broken hero card on the homepage.
        if (cache.data) {
            return NextResponse.json({
                ...cache.data,
                cached: true,
                stale: true,
                fetchedAt: cache.fetchedAt,
                error: e.message,
            });
        }
        return NextResponse.json({ current: [], upcoming: [], error: e.message }, { status: 502 });
    }
}
