import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllUsers, getUser, saveUser, verifySession } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/route';

// Mirror of `/api/auth/link-discord`, for Apple Sign In.
//
// Use case: a user already has a Pogo account (created via username/password
// or via Discord) and now wants to add Sign in with Apple as an alternate
// login method. They:
//   1. Sign in with Apple via NextAuth (creates an Apple JWT session)
//   2. POST { username } here while their pogo_session cookie still
//      identifies the existing Pogo account they want to attach Apple to
//
// We verify both proofs of identity and link the two. If a separate
// Apple-only account already exists for this appleId, we merge its data
// into the target Pogo account and mark the orphan as `_mergedInto`.

export async function POST(request) {
    try {
        const { username } = await request.json();
        if (!username) {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        // Proof 1: NextAuth Apple session
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.provider !== 'apple') {
            return NextResponse.json({ error: 'Apple session required. Please log in with Apple first.' }, { status: 401 });
        }
        const appleId = session.user.id;
        const appleEmail = session.user.email;

        // Proof 2: pogo_session cookie owning the target username
        const cookieStore = await cookies();
        const pogoSession = cookieStore.get('pogo_session')?.value;

        let authorized = false;
        if (pogoSession) {
            const sep = pogoSession.indexOf(':');
            if (sep > 0) {
                const pogoUser = pogoSession.slice(0, sep);
                const pogoToken = pogoSession.slice(sep + 1);
                if (pogoUser?.toLowerCase() === username.toLowerCase()) {
                    authorized = await verifySession(pogoUser, pogoToken);
                }
            }
        }
        if (!authorized) {
            return NextResponse.json({ error: 'You must be logged in to your account to link Apple' }, { status: 401 });
        }

        // Lookup the current target user
        const currentUser = await getUser(username);
        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Already linked to this same appleId → nothing to do
        if (currentUser.appleId && currentUser.appleId === appleId) {
            return NextResponse.json({ message: 'Apple already linked', user: currentUser });
        }

        // Look for an orphan Apple-only account holding the same appleId
        const allUsers = await getAllUsers();
        const targetKey = username.toLowerCase().replace(/'/g, '’');
        let existingAppleUser = null;
        for (const key in allUsers) {
            if (allUsers[key].appleId === appleId && key !== targetKey) {
                existingAppleUser = allUsers[key];
                break;
            }
        }

        if (existingAppleUser) {
            // Merge the Apple-only account's data into the target.
            const mergedData = {
                ...currentUser,
                appleId,
                email: currentUser.email || existingAppleUser.email || appleEmail,
                trainerImage: currentUser.trainerImage || existingAppleUser.trainerImage,
                team: currentUser.team || existingAppleUser.team,
                stats: Object.keys(currentUser.stats || {}).length > 0
                    ? currentUser.stats
                    : (existingAppleUser.stats || {}),
                checklist: { ...(existingAppleUser.checklist || {}), ...(currentUser.checklist || {}) },
                medals: currentUser.medals || existingAppleUser.medals,
                history: currentUser.history || existingAppleUser.history,
                favorites: currentUser.favorites || existingAppleUser.favorites,
                settings: { ...(existingAppleUser.settings || {}), ...(currentUser.settings || {}) },
                friendCode: currentUser.friendCode || existingAppleUser.friendCode,
            };

            const updatedUser = await saveUser(username, mergedData);

            // Mark the old Apple-only account as merged.
            await saveUser(existingAppleUser.username, {
                ...existingAppleUser,
                appleId: null,
                _mergedInto: username,
                _mergedAt: new Date().toISOString(),
            });

            const { passwordHash, ...safeUser } = updatedUser;
            return NextResponse.json({
                message: 'Apple linked and data merged successfully',
                merged: true,
                mergedFrom: existingAppleUser.username,
                user: safeUser,
            });
        }

        // Simple link — no orphan to merge.
        const updatedUser = await saveUser(username, {
            ...currentUser,
            appleId,
            email: currentUser.email || appleEmail,
        });

        const { passwordHash, ...safeUser } = updatedUser;
        return NextResponse.json({
            message: 'Apple linked successfully',
            merged: false,
            user: safeUser,
        });
    } catch (error) {
        console.error('Link Apple error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
