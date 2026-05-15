import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { getCustomTags, addCustomTag, removeCustomTag } from '@/lib/collectionStorage';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const limiter = createRateLimiter('pokemon-collection-tags', 60, 60 * 60 * 1000);

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

export async function GET() {
    const username = await resolveTrainerUsername();
    if (!username) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    try {
        const tags = await getCustomTags(username);
        return NextResponse.json({ tags });
    } catch (err) {
        console.error('[tags-get] Error:', err);
        return NextResponse.json({ error: 'Failed to read tags' }, { status: 500 });
    }
}

export async function POST(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const { allowed } = limiter(request);
    if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    const username = await resolveTrainerUsername();
    if (!username) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
    if (!tag) return NextResponse.json({ error: 'tag is required' }, { status: 400 });

    try {
        const tags = await addCustomTag(username, tag);
        return NextResponse.json({ success: true, tags });
    } catch (err) {
        if (err.code === 'TAG_LIMIT') {
            return NextResponse.json({ error: err.message }, { status: 413 });
        }
        console.error('[tags-add] Error:', err);
        return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
    }
}

export async function DELETE(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const { allowed } = limiter(request);
    if (!allowed) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    const username = await resolveTrainerUsername();
    if (!username) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const tag = typeof body?.tag === 'string' ? body.tag.trim() : '';
    if (!tag) return NextResponse.json({ error: 'tag is required' }, { status: 400 });

    try {
        const tags = await removeCustomTag(username, tag);
        return NextResponse.json({ success: true, tags });
    } catch (err) {
        console.error('[tags-remove] Error:', err);
        return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
    }
}
