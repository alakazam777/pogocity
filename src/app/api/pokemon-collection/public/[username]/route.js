import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/collectionStorage';
import { createRateLimiter } from '@/lib/rateLimit';

// Anti-DoS / anti-enumeration. 60 reqs/min/IP is generous for any legitimate
// browsing pattern (rankings modal hits this once per profile click).
const limiter = createRateLimiter('public-favorites', 60, 60 * 1000);

// Public endpoint — returns ONLY favorited Pokémon for the given username.
// No auth required. Used by the rankings modal to showcase another trainer's
// favorite Pokémon publicly.
export async function GET(request, { params }) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    const { username } = await params;
    if (!username || typeof username !== 'string' || username.length > 60) {
        return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }

    try {
        const all = await getCollection(username);
        const favorites = (all || [])
            .filter((p) => p.favorite)
            .map((p) => ({
                id: p.id,
                name: p.name,
                nickname: p.nickname,
                dexNumber: p.dexNumber,
                cp: p.cp,
                level: p.level,
                iv: p.iv,
                types: p.types,
                fastMove: p.fastMove,
                chargedMove: p.chargedMove,
                shiny: p.shiny,
                lucky: p.lucky,
                shadow: p.shadow,
                tags: p.tags,
            }));
        return NextResponse.json({ username, favorites });
    } catch (err) {
        console.error('[public-favorites] Error:', err);
        return NextResponse.json({ error: 'Failed to read collection' }, { status: 500 });
    }
}
