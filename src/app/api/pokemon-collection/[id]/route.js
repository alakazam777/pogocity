import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { removePokemon, updatePokemon, getCollectionSummary } from '@/lib/collectionStorage';
import { isSameOriginRequest } from '@/lib/csrfGuard';
import { sanitizeForPatch } from '@/lib/pokemonSanitize';

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

const VALID_ID = /^[a-f0-9-]{8,40}$/i;

export async function DELETE(request, { params }) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const { id } = await params;
    if (!id || !VALID_ID.test(id)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const username = await resolveTrainerUsername();
    if (!username) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    try {
        const removed = await removePokemon(username, id);
        if (!removed) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const summary = await getCollectionSummary(username);
        return NextResponse.json({ success: true, summary });
    } catch (err) {
        console.error('[collection-delete] Error:', err);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const { id } = await params;
    if (!id || !VALID_ID.test(id)) {
        return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const username = await resolveTrainerUsername();
    if (!username) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const updates = body?.updates;
    if (!updates || typeof updates !== 'object') {
        return NextResponse.json({ error: 'updates object required' }, { status: 400 });
    }

    // Full edit support — same whitelist + bounds as create, but only for
    // fields actually present in the update payload (true PATCH semantics).
    const sanitized = sanitizeForPatch(updates);
    if (!sanitized) {
        return NextResponse.json({ error: 'No valid fields in updates' }, { status: 400 });
    }

    try {
        const updated = await updatePokemon(username, id, sanitized);
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
        const summary = await getCollectionSummary(username);
        return NextResponse.json({ success: true, pokemon: updated, summary });
    } catch (err) {
        console.error('[collection-patch] Error:', err);
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}
