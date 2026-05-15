import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllUsers, getUser, saveUser, verifySession } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/route';

export async function POST(request) {
    try {
        const { username } = await request.json();

        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        // The user must be authenticated via Discord (NextAuth session)
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Discord session required. Please log in with Discord first.' }, { status: 401 });
        }

        const discordId = session.user.id;
        const discordName = session.user.name;
        const discordImage = session.user.image;

        // Verify the user making the request owns this account (via pogo_session cookie)
        const cookieStore = await cookies();
        const pogoSession = cookieStore.get('pogo_session')?.value;

        let authorized = false;
        if (pogoSession) {
            const parts = pogoSession.split(':');
            const pogoUser = parts[0];
            const pogoToken = parts[1];
            if (pogoUser?.toLowerCase() === username.toLowerCase()) {
                authorized = await verifySession(pogoUser, pogoToken);
            }
        }

        if (!authorized) {
            return NextResponse.json({ error: 'You must be logged in to your account to link Discord' }, { status: 401 });
        }

        // Check if this Discord ID is already linked to another account
        const allUsers = await getAllUsers();
        let existingDiscordUser = null;
        let existingDiscordKey = null;

        for (const key in allUsers) {
            if (allUsers[key].discordId === discordId && key !== username.toLowerCase().replace(/'/g, "\u2019")) {
                existingDiscordUser = allUsers[key];
                existingDiscordKey = key;
                break;
            }
        }

        const currentUser = await getUser(username);
        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (currentUser.discordId && currentUser.discordId === discordId) {
            return NextResponse.json({ message: 'Discord already linked', user: currentUser });
        }

        // If another account has this Discord ID, merge data into current account
        if (existingDiscordUser) {
            // Merge: keep current account's password, merge stats from Discord account
            const mergedData = {
                ...currentUser,
                discordId,
                trainerImage: currentUser.trainerImage || existingDiscordUser.trainerImage || discordImage,
                team: currentUser.team || existingDiscordUser.team,
                // Merge stats: prefer existing (Discord account) if current has none
                stats: Object.keys(currentUser.stats || {}).length > 0
                    ? currentUser.stats
                    : (existingDiscordUser.stats || {}),
                // Merge checklist: combine both (union)
                checklist: { ...(existingDiscordUser.checklist || {}), ...(currentUser.checklist || {}) },
                // Keep the richer data
                medals: currentUser.medals || existingDiscordUser.medals,
                history: currentUser.history || existingDiscordUser.history,
                favorites: currentUser.favorites || existingDiscordUser.favorites,
                settings: { ...(existingDiscordUser.settings || {}), ...(currentUser.settings || {}) },
                friendCode: currentUser.friendCode || existingDiscordUser.friendCode,
            };

            // Save merged data to current account
            const updatedUser = await saveUser(username, mergedData);

            // Mark old Discord-only account as merged (don't delete, just remove discordId to avoid conflicts)
            await saveUser(existingDiscordUser.username, {
                ...existingDiscordUser,
                discordId: null,
                _mergedInto: username,
                _mergedAt: new Date().toISOString()
            });

            const { passwordHash, ...safeUser } = updatedUser;
            return NextResponse.json({
                message: 'Discord linked and data merged successfully',
                merged: true,
                mergedFrom: existingDiscordUser.username,
                user: safeUser
            });
        }

        // Simple link: no existing Discord account to merge
        const updatedUser = await saveUser(username, {
            ...currentUser,
            discordId,
            trainerImage: currentUser.trainerImage || discordImage,
        });

        const { passwordHash, ...safeUser } = updatedUser;
        return NextResponse.json({
            message: 'Discord linked successfully',
            merged: false,
            user: safeUser
        });

    } catch (error) {
        console.error('Link Discord error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
