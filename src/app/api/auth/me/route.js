import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { verifySession, getUser, getAllUsers, saveUser } from '@/lib/pokemonStorage';
import { authOptions } from '../[...nextauth]/route';

// "Who am I?" endpoint used by the Header (and any client component) to
// transparently restore a user session when localStorage has been wiped —
// notably on iOS Safari, which clears localStorage after 7 days of
// inactivity (ITP). The cookies and NextAuth session token are httpOnly
// and survive ITP at their full max-age, so they're our source of truth.
//
// Resolution order:
//  1. `pogo_session` cookie  (email/password users)
//  2. NextAuth Discord session  (users who signed in with Discord)
//
// Returns `{ user: <safeUserObject> }` or `{ user: null }`.
//
// Never throws — if anything fails we just return null and the UI shows
// the login button as if the user were anonymous.

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // --- 1. pogo_session cookie ---
        const cookieStore = await cookies();
        const session = cookieStore.get('pogo_session')?.value;

        if (session) {
            const sep = session.indexOf(':');
            if (sep > 0) {
                const username = session.slice(0, sep);
                const token = session.slice(sep + 1);
                if (username && token && await verifySession(username, token)) {
                    const user = await getUser(username);
                    if (user) {
                        const { passwordHash, ...safeUser } = user;
                        return NextResponse.json({
                            user: { ...safeUser, sessionToken: token },
                            via: 'pogo_session',
                        });
                    }
                }
            }
        }

        // --- 2. NextAuth Discord OR Apple session ---
        const nextAuth = await getServerSession(authOptions);
        if (nextAuth?.user?.id) {
            const allUsers = await getAllUsers();
            const oauthId = nextAuth.user.id;
            const provider = nextAuth.user.provider; // 'discord' | 'apple'
            const idField = provider === 'apple' ? 'appleId' : 'discordId';

            // First, look up an existing Pogo user already linked to this OAuth identity.
            for (const key in allUsers) {
                if (allUsers[key][idField] === oauthId) {
                    const { passwordHash, ...safeUser } = allUsers[key];
                    return NextResponse.json({
                        user: safeUser,
                        via: `nextauth-${provider}`,
                    });
                }
            }

            // No Pogo user yet for this OAuth id → create one on the fly.
            // We previously relied on /pokematos to call the bridge endpoint
            // (`/api/auth/apple/login` or `/api/auth/discord/login`) after a
            // successful sign-in. But Apple's `response_mode: form_post` flow
            // doesn't always preserve the `callbackUrl` parameter through the
            // POST callback, so users sometimes land on `/` instead of
            // `/pokematos` and skip the bridge → they appear "not logged in"
            // forever. Creating the user here makes the Header's auto-restore
            // resilient regardless of where the user lands.
            if (provider === 'apple' || provider === 'discord') {
                const email = nextAuth.user.email || null;
                const name = nextAuth.user.name || null;
                const image = nextAuth.user.image || null;

                // Synthesize a non-colliding username.
                const sanitize = (s) => (s || '').replace(/[^a-zA-Z0-9_]/g, '');
                const baseName = sanitize(name) || `Trainer_${sanitize(oauthId).slice(0, 8)}`;
                let candidate = baseName;
                let suffix = 0;
                while (allUsers[candidate.toLowerCase()] && suffix < 50) {
                    suffix += 1;
                    candidate = `${baseName}_${sanitize(oauthId).slice(0, 4)}${suffix === 1 ? '' : suffix}`;
                }

                const data = {
                    username: candidate,
                    [idField]: oauthId,
                    email,
                    trainerImage: image,
                    stats: {},
                    checklist: {},
                    createdAt: new Date().toISOString(),
                };
                const created = await saveUser(candidate, data);
                const { passwordHash, ...safeUser } = created;
                return NextResponse.json({
                    user: safeUser,
                    via: `nextauth-${provider}-autocreated`,
                });
            }
        }

        return NextResponse.json({ user: null });
    } catch (err) {
        console.error('[/api/auth/me] error:', err);
        return NextResponse.json({ user: null });
    }
}
