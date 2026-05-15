import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { addPokemon, getCollectionSummary } from '@/lib/collectionStorage';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';
import { sanitizeForCreate } from '@/lib/pokemonSanitize';

const limiter = createRateLimiter('pokemon-add', 60, 60 * 60 * 1000);

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

// Sanitization is centralized in @/lib/pokemonSanitize so the create + patch
// endpoints stay in lockstep on bound-checks, IV ranges, and field whitelists.

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
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const sanitized = sanitizeForCreate(body?.pokemon);
    if (!sanitized) {
        return NextResponse.json({ error: 'Invalid pokemon payload (name required, IVs must be 0-15)' }, { status: 400 });
    }

    try {
        const created = await addPokemon(username, sanitized);
        const summary = await getCollectionSummary(username);
        return NextResponse.json({ success: true, pokemon: created, summary });
    } catch (err) {
        console.error('[add] Error:', err);
        return NextResponse.json({ error: 'Failed to save pokemon' }, { status: 500 });
    }
}
