import { NextResponse } from 'next/server';

// In-memory cache: invite code → { ts, members, online }
// 10-minute TTL keeps Discord's rate limit comfortable (50 req / 5 min per IP).
const CACHE = new Map();
const TTL_MS = 10 * 60 * 1000;

// Discord invite/server-channel link patterns we recognize:
//   discord.gg/CODE
//   discord.com/invite/CODE
//   discordapp.com/invite/CODE
// Channel-link URLs (discord.com/channels/<guild>/<channel>) are NOT invite codes
// and Discord's API won't return member counts for them — those return null.
function extractInviteCode(url) {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/i);
    return m ? m[1] : null;
}

async function fetchInviteCounts(code) {
    const cached = CACHE.get(code);
    if (cached && (Date.now() - cached.ts) < TTL_MS) return cached;
    try {
        const res = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true`, {
            headers: { 'User-Agent': 'PogoSphere/0.1 (+https://sphere.pogopoitiers.fr)' },
        });
        if (!res.ok) {
            const stub = { ts: Date.now(), members: null, online: null, error: `HTTP ${res.status}` };
            CACHE.set(code, stub);
            return stub;
        }
        const data = await res.json();
        const entry = {
            ts: Date.now(),
            members: data.approximate_member_count ?? null,
            online: data.approximate_presence_count ?? null,
            guildName: data.guild?.name ?? null,
        };
        CACHE.set(code, entry);
        return entry;
    } catch (e) {
        return { ts: Date.now(), members: null, online: null, error: e.message };
    }
}

// POST { links: [{ url, type }] } → { results: [{ url, members, online }] }
// Single endpoint that takes an array so the caller fires one request, not N.
export async function POST(request) {
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const links = Array.isArray(body.links) ? body.links : [];

    const results = await Promise.all(links.map(async (link) => {
        if (!link || link.type !== 'discord') return { url: link?.url, members: null, online: null };
        const code = extractInviteCode(link.url);
        if (!code) return { url: link.url, members: null, online: null };
        const counts = await fetchInviteCounts(code);
        return { url: link.url, members: counts.members, online: counts.online, guildName: counts.guildName };
    }));

    return NextResponse.json({ results });
}
