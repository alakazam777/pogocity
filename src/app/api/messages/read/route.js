import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/pokemonStorage';
import { markAsRead, getMessages } from '@/lib/messageStorage';
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

export async function POST(request) {
    try {
        const username = await getAuthenticatedUsername();
        if (!username) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { conversationId } = await request.json();
        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId requis' }, { status: 400 });
        }

        // Verify user is a participant
        const data = await getMessages(conversationId);
        if (!data.participants.includes(username.toLowerCase())) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        await markAsRead(conversationId, username);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Mark as read error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
