import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUser, saveUser, getAllUsers, verifySession, getSessionToken } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPath';

const DATA_FILE = path.join(DATA_DIR, 'pokemon_users.json');

export async function POST(request) {
    try {
        const { currentUsername, newUsername } = await request.json();

        if (!currentUsername || !newUsername) {
            return NextResponse.json({ error: 'Pseudo actuel et nouveau pseudo requis' }, { status: 400 });
        }

        const trimmedNew = newUsername.trim();
        if (trimmedNew.length < 2) {
            return NextResponse.json({ error: 'Le pseudo doit contenir au moins 2 caractères' }, { status: 400 });
        }

        if (trimmedNew.length > 30) {
            return NextResponse.json({ error: 'Le pseudo ne peut pas dépasser 30 caractères' }, { status: 400 });
        }

        // Verify the user is authorized (via pogo_session cookie OR Discord session)
        const cookieStore = await cookies();
        const pogoSession = cookieStore.get('pogo_session')?.value;

        let authorized = false;

        // Method 1: pogo_session cookie (password-based login)
        if (pogoSession) {
            const parts = pogoSession.split(':');
            const pogoUser = parts[0];
            const pogoToken = parts[1];
            if (pogoUser?.toLowerCase() === currentUsername.toLowerCase()) {
                authorized = await verifySession(pogoUser, pogoToken);
            }
        }

        // Method 2: Discord session (NextAuth)
        if (!authorized) {
            const session = await getServerSession(authOptions);
            if (session?.user) {
                // Check if the Discord user owns this account
                const currentUser = await getUser(currentUsername);
                if (currentUser && (currentUser.discordId === session.user.id || currentUser.appleId === session.user.id)) {
                    authorized = true;
                }
            }
        }

        if (!authorized) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const normalizedCurrent = currentUsername.toLowerCase().replace(/'/g, "\u2019");
        const normalizedNew = trimmedNew.toLowerCase().replace(/'/g, "\u2019");

        // Check if new username is already taken (and is different from current)
        if (normalizedCurrent !== normalizedNew) {
            const existingUser = await getUser(trimmedNew);
            if (existingUser) {
                return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 });
            }
        }

        // Read the full users file, move the data to the new key
        const fileContent = await fs.readFile(DATA_FILE, 'utf-8');
        const users = JSON.parse(fileContent);

        const currentData = users[normalizedCurrent];
        if (!currentData) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        // Create new entry with updated username
        const updatedData = {
            ...currentData,
            username: trimmedNew,
            previousUsernames: [...(currentData.previousUsernames || []), currentData.username],
            lastUpdated: new Date().toISOString()
        };

        // If the normalized key changed, remove old and create new
        if (normalizedCurrent !== normalizedNew) {
            delete users[normalizedCurrent];
        }
        users[normalizedNew] = updatedData;

        await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));

        // Generate new session token for the new username
        const newSessionToken = await getSessionToken(trimmedNew, updatedData.passwordHash);

        const { passwordHash, ...safeUser } = updatedData;

        const response = NextResponse.json({ ...safeUser, sessionToken: newSessionToken });

        // Update session cookie with new username
        response.cookies.set('pogo_session', `${trimmedNew}:${newSessionToken}`, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30
        });

        return response;
    } catch (error) {
        console.error('Rename error:', error);
        return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
    }
}
