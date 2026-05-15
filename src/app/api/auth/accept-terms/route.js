import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { verifySession, getUser, getAllUsers, saveUser } from '@/lib/pokemonStorage';
import { authOptions } from '../[...nextauth]/route';
import { TERMS_VERSION } from '@/lib/legalContent';

/**
 * POST /api/auth/accept-terms
 *
 * Records explicit acceptance of the current Terms of Service version on
 * the authenticated user's record. Required for App Store Guideline 1.2
 * compliance (Apple wants per-user proof that every account-holder has
 * affirmatively agreed to a "no tolerance for objectionable content"
 * EULA before they can post UGC).
 *
 * Authorization order mirrors /api/auth/me:
 *   1. `pogo_session` cookie (username/password users)
 *   2. NextAuth Discord OR Apple session
 *
 * Body: { username: string, termsVersion: string }
 *
 * The body's `username` MUST match the resolved session user. We don't
 * trust the client to tell us who they are — we resolve from the cookie /
 * NextAuth session and reject if the body claims a different identity
 * (defense against logged-in user A clicking "accept" from a craft-replay
 * with a body claiming user B).
 *
 * Body's `termsVersion` MUST equal the current published TERMS_VERSION
 * constant — accepting an old version doesn't unlock the gate. This makes
 * the EulaGate idempotent: future term revisions just bump the constant
 * and every user is re-prompted.
 *
 * Returns: { username, termsAcceptedAt, termsVersion }
 */

export const dynamic = 'force-dynamic';

async function resolveSessionUsername() {
    // 1. pogo_session cookie
    const cookieStore = await cookies();
    const session = cookieStore.get('pogo_session')?.value;
    if (session) {
        const sep = session.indexOf(':');
        if (sep > 0) {
            const username = session.slice(0, sep);
            const token = session.slice(sep + 1);
            if (username && token && await verifySession(username, token)) {
                return username;
            }
        }
    }

    // 2. NextAuth (Discord / Apple)
    const nextAuth = await getServerSession(authOptions);
    if (nextAuth?.user?.id) {
        const oauthId = nextAuth.user.id;
        const provider = nextAuth.user.provider;
        const idField = provider === 'apple' ? 'appleId' : 'discordId';
        const allUsers = await getAllUsers();
        for (const key in allUsers) {
            if (allUsers[key][idField] === oauthId) {
                return allUsers[key].username || key;
            }
        }
    }

    return null;
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}));
        const claimedUsername = (body.username || '').trim();
        const claimedVersion = (body.termsVersion || '').trim();

        if (!claimedUsername) {
            return NextResponse.json({ error: 'Missing username' }, { status: 400 });
        }
        if (claimedVersion !== TERMS_VERSION) {
            return NextResponse.json({
                error: 'Outdated terms version',
                currentVersion: TERMS_VERSION,
            }, { status: 400 });
        }

        const sessionUsername = await resolveSessionUsername();
        if (!sessionUsername) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Case-insensitive identity match — pokemonStorage stores keys in
        // lowercase but `username` field preserves casing.
        if (sessionUsername.toLowerCase() !== claimedUsername.toLowerCase()) {
            return NextResponse.json({ error: 'Username mismatch with session' }, { status: 403 });
        }

        const existing = await getUser(sessionUsername);
        if (!existing) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const acceptedAt = new Date().toISOString();
        await saveUser(sessionUsername, {
            ...existing,
            termsAcceptedAt: acceptedAt,
            termsVersion: TERMS_VERSION,
        });

        return NextResponse.json({
            username: existing.username,
            termsAcceptedAt: acceptedAt,
            termsVersion: TERMS_VERSION,
        });
    } catch (err) {
        console.error('[/api/auth/accept-terms] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
