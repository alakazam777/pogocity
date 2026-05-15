import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { reorderCollection } from '@/lib/collectionStorage';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const limiter = createRateLimiter('pokemon-collection-reorder', 60, 60 * 60 * 1000);
const VALID_ID = /^[a-f0-9-]{8,40}$/i;
const MAX_IDS = 10000;

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

    const { ids } = body || {};
    if (!Array.isArray(ids)) {
        return NextResponse.json({ error: 'ids must be an array' }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
        return NextResponse.json({ error: `Too many ids (max ${MAX_IDS})` }, { status: 413 });
    }
    const cleanIds = ids.filter((id) => typeof id === 'string' && VALID_ID.test(id));

    try {
        const ordered = await reorderCollection(username, cleanIds);
        if (!ordered) return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
        return NextResponse.json({ success: true, count: ordered.length });
    } catch (err) {
        console.error('[reorder] Error:', err);
        return NextResponse.json({ error: 'Reorder failed' }, { status: 500 });
    }
}
