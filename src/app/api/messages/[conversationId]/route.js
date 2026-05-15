import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/pokemonStorage';
import { getMessages } from '@/lib/messageStorage';
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

export async function GET(request, { params }) {
    try {
        const username = await getAuthenticatedUsername();
        if (!username) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { conversationId } = await params;
        const data = await getMessages(conversationId);

        // Verify user is a participant
        if (!data.participants.includes(username.toLowerCase())) {
            return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Get messages error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
