import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { getCollectionSummary } from '@/lib/collectionStorage';

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
    if (!username) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const summary = await getCollectionSummary(username);
        return NextResponse.json({ username, summary });
    } catch (err) {
        console.error('[collection-summary] Error:', err);
        return NextResponse.json({ error: 'Failed to read collection' }, { status: 500 });
    }
}
