import { NextResponse } from 'next/server';
import { getAllUsers, saveUser, getUser } from '@/lib/pokemonStorage';

// Apple Sign In → Pogo account bridge.
//
// Mirrors `/api/auth/discord/login`. After NextAuth completes the Apple
// OAuth round-trip, the frontend (`/pokematos`) calls this endpoint with
// the Apple identity. We either:
//   1. Find an existing Pogo user that has this `appleId` linked → return it
//   2. Find a Pogo user whose `username` matches the suggested one → claim
//      it if it has no apple/discord owner yet, or generate a unique
//      username if it's already claimed
//   3. Create a brand new Pogo user
//
// The `email` is stored on the user record so they can later "link" it by
// setting a password via `/api/auth/register` (parallel to the
// Discord flow that allows password-set on existing Discord-linked
// accounts).
//
// NOTE: Apple may only provide `email` and `name` on the very first sign
// in. Subsequent sign-ins return only `appleId`. The frontend persists
// what Apple gave us in the NextAuth JWT so we can pass it along.

export async function POST(request) {
    try {
        const { appleId, username, email, name } = await request.json();

        if (!appleId) {
            return NextResponse.json({ error: 'Apple ID required' }, { status: 400 });
        }

        const allUsers = await getAllUsers();
        let foundUser = null;

        // 1. Find by appleId
        for (const key in allUsers) {
            if (allUsers[key].appleId === appleId) {
                foundUser = allUsers[key];
                break;
            }
        }

        // Fall-back username if Apple didn't provide a usable name. Apple's
        // "name" can be empty after the first login, and emails can be the
        // private relay address `xxx@privaterelay.appleid.com` — neither is
        // a great public-facing username, so we synthesize one from the
        // appleId hash.
        const suggestedUsername = (username && username.trim())
            || (name && name.trim())
            || `Trainer_${appleId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;

        if (!foundUser) {
            const existingUser = await getUser(suggestedUsername);
            if (existingUser) {
                if (!existingUser.appleId && !existingUser.discordId) {
                    // Username taken but unclaimed — adopt it.
                    foundUser = await saveUser(existingUser.username, {
                        ...existingUser,
                        appleId,
                        email: email || existingUser.email,
                    });
                } else {
                    // Already linked to someone else — generate a unique name.
                    const newUsername = `${suggestedUsername}_${appleId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4)}`;
                    foundUser = await saveUser(newUsername, {
                        username: newUsername,
                        appleId,
                        email: email || null,
                        stats: {},
                        checklist: {},
                        createdAt: new Date().toISOString(),
                    });
                }
            } else {
                // Brand new user.
                foundUser = await saveUser(suggestedUsername, {
                    username: suggestedUsername,
                    appleId,
                    email: email || null,
                    stats: {},
                    checklist: {},
                    createdAt: new Date().toISOString(),
                });
            }
        } else {
            // Existing Apple user — refresh email if they didn't have one
            // saved (Apple sometimes only ships email on the very first
            // sign-in, so we never overwrite a stored value).
            if (email && !foundUser.email) {
                foundUser = await saveUser(foundUser.username, { ...foundUser, email });
            }
        }

        const { passwordHash, ...safeUser } = foundUser;
        return NextResponse.json(safeUser);

    } catch (error) {
        console.error('Apple Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
