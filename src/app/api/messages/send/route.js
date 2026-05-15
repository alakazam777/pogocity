import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, getUser } from '@/lib/pokemonStorage';
import { sendMessage } from '@/lib/messageStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createRateLimiter } from '@/lib/rateLimit';

const limiter = createRateLimiter('msg-send', 30, 60 * 1000);

async function getAuthenticatedUsername(request) {
    // Method 1: pogo_session cookie
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;
    if (pogoSession) {
        const parts = pogoSession.split(':');
        if (parts[0] && parts[1] && await verifySession(parts[0], parts[1])) {
            return parts[0];
        }
    }

    // Method 2: NextAuth OAuth session (Discord OR Apple).
    // We dispatch to the matching id field based on `session.user.provider`,
    // which is set by the NextAuth jwt callback from `account.provider`.
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
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Trop de messages. Patientez.' }, { status: 429 });
    }

    try {
        const username = await getAuthenticatedUsername(request);
        if (!username) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const { to, text } = await request.json();
        if (!to || !text?.trim()) {
            return NextResponse.json({ error: 'Destinataire et message requis' }, { status: 400 });
        }

        if (text.trim().length > 2000) {
            return NextResponse.json({ error: 'Message trop long (2000 max)' }, { status: 400 });
        }

        // Check recipient exists
        const recipient = await getUser(to);
        if (!recipient) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        // Can't message yourself
        if (username.toLowerCase() === to.toLowerCase()) {
            return NextResponse.json({ error: 'Impossible de vous envoyer un message' }, { status: 400 });
        }

        const result = await sendMessage(username, to, text.trim());
        return NextResponse.json(result);
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
