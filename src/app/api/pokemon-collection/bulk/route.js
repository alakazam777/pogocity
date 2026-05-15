import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { removePokemon, updatePokemon, getCollectionSummary } from '@/lib/collectionStorage';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const limiter = createRateLimiter('pokemon-collection-bulk', 30, 60 * 60 * 1000);
const VALID_ID = /^[a-f0-9-]{8,40}$/i;
const MAX_BULK = 200;

async function resolveTrainerUsername() {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;

    if (session?.user?.name) {
        const u = await getUser(session.user.name);
        if (u) return u.username;
        if (session.user.id) {
            const all = await getAllUsers();
            for (const [, userData] of Object.entries(all)) {
                if ((userData?.discordId === session.user.id || userData?.appleId === session.user.id)) return userData.username;
            }
        }
    }
    if (pogoSession) {
        const [pogoUser, pogoToken] = pogoSession.split(':');
        if (pogoUser && pogoToken && await verifySession(pogoUser, pogoToken)) {
            return pogoUser;
        }
    }
    return null;
}

export async function POST(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const username = await resolveTrainerUsername();
    if (!username) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const { action, ids } = body || {};
    if (!['delete', 'favorite', 'unfavorite'].includes(action)) {
        return NextResponse.json({ error: 'action must be delete | favorite | unfavorite' }, { status: 400 });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    if (ids.length > MAX_BULK) {
        return NextResponse.json({ error: `Too many ids (max ${MAX_BULK})` }, { status: 413 });
    }
    const cleanIds = ids.filter((id) => typeof id === 'string' && VALID_ID.test(id));
    if (cleanIds.length === 0) {
        return NextResponse.json({ error: 'No valid ids' }, { status: 400 });
    }

    let succeeded = 0;
    let failed = 0;
    try {
        for (const id of cleanIds) {
            try {
                if (action === 'delete') {
                    const ok = await removePokemon(username, id);
                    if (ok) succeeded++; else failed++;
                } else {
                    const updated = await updatePokemon(username, id, {
                        favorite: action === 'favorite',
                    });
                    if (updated) succeeded++; else failed++;
                }
            } catch {
                failed++;
            }
        }
        const summary = await getCollectionSummary(username);
        return NextResponse.json({ success: true, action, succeeded, failed, summary });
    } catch (err) {
        console.error('[bulk] Error:', err);
        return NextResponse.json({ error: 'Bulk operation failed' }, { status: 500 });
    }
}
