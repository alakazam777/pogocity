// Shared session authentication helper.
// Resolves the current user from request cookies/headers.
// Reusable across any API route that needs the logged-in username.

import { cookies } from 'next/headers';
import { verifySession } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Resolve the authenticated username from the request.
 * Checks (in order): pogo_session cookie, NextAuth OAuth session (Discord OR Apple).
 * @param {Request} request — the incoming Next.js request
 * @returns {Promise<{username: string} | null>}
 */
export async function getSessionUser(request) {
    // Method 1: pogo_session cookie  (username:token)
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;
    if (pogoSession) {
        const sep = pogoSession.indexOf(':');
        if (sep > 0) {
            const user = pogoSession.substring(0, sep);
            const token = pogoSession.substring(sep + 1);
            if (await verifySession(user, token)) {
                return { username: user };
            }
        }
    }

    // Method 2: NextAuth OAuth session (Discord OR Apple).
    // The id field on the user record depends on which provider was used to
    // authenticate — `discordId` for Discord, `appleId` for Apple. Without
    // this dispatch, Apple-only accounts (created via Sign in with Apple)
    // return 401 from any route that uses this helper, e.g. the messaging
    // endpoints.
    const session = await getServerSession(authOptions);
    if (session?.user) {
        const { getAllUsers } = await import('@/lib/pokemonStorage');
        const allUsers = await getAllUsers();
        const provider = session.user.provider;
        const idField = provider === 'apple' ? 'appleId' : 'discordId';
        for (const key in allUsers) {
            if (allUsers[key][idField] === session.user.id) {
                return { username: allUsers[key].username };
            }
        }
    }

    return null;
}
