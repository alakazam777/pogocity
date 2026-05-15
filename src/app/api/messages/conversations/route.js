import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/pokemonStorage';
import { getConversationsForUser, getTotalUnreadCount } from '@/lib/messageStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

async function getAuthenticatedUsername() {
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;
    if (pogoSession) {
        const parts = pogoSession.split(':');
        if (parts[0] && parts[1] && await verifySession(parts[0], parts[1])) {
            return parts[0];
        }
    }

    const session = await getServerSession(authOptions);
    if (session?.user) {
        const { getAllUsers } = await import('@/lib/pokemonStorage');
        const allUsers = await getAllUsers();
        const provider = session.user.provider;
        const idField = provider === 'apple' ? 'appleId' : 'discordId';
        for (const key in allUsers) {
            if (allUsers[key][idField] === session.user.id) {
                return allUsers[key].username;
            }
        }
    }

    return null;
}

export async function GET(request) {
    try {
        const username = await getAuthenticatedUsername();
        console.log('[Messages API] Authenticated username:', username);
        if (!username) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const url = new URL(request.url);
        const countOnly = url.searchParams.get('countOnly') === 'true';

        if (countOnly) {
            const count = await getTotalUnreadCount(username);
            return NextResponse.json({ unreadCount: count });
        }

        const conversations = await getConversationsForUser(username);
        return NextResponse.json({ conversations, username });
    } catch (error) {
        console.error('Get conversations error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
