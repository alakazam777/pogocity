import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveUser, verifySession, getUser } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

// 120 saves per 2 minutes per IP (generous for auto-save every ~1s)
const limiter = createRateLimiter('pokemon-save', 120, 2 * 60 * 1000);

// Allowlist of fields that clients are permitted to write.
// Anything not in this set (e.g. passwordHash, createdAt) is silently dropped.
const ALLOWED_FIELDS = new Set([
    'stats', 'checklist', 'medals', 'trainerColor', 'trainerImage',
    'discordId', 'settings', 'history', 'favorites',
    'tradeList', 'tradeWebhookMsgId',
]);

function sanitizeData(data) {
    const clean = {};
    for (const key of Object.keys(data)) {
        if (ALLOWED_FIELDS.has(key)) {
            clean[key] = data[key];
        }
    }
    return clean;
}

export async function POST(request) {
    // CSRF protection — reject cross-origin requests
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const { username, data, sessionToken: bodyToken } = await request.json();

        if (!username || !data) {
            return NextResponse.json({ error: 'Username and data are required' }, { status: 400 });
        }

        // 1. Check for Discord Session
        const session = await getServerSession(authOptions);
        const discordUser = session?.user?.name;

        // 2. Check for Custom Session Cookie
        const cookieStore = await cookies();
        const pogoSession = cookieStore.get('pogo_session')?.value;
        let pogoUser = null;
        let pogoToken = null;

        if (pogoSession) {
            // Use indexOf instead of split to handle usernames containing ':'
            const sep = pogoSession.indexOf(':');
            if (sep > 0) {
                pogoUser = pogoSession.substring(0, sep);
                pogoToken = pogoSession.substring(sep + 1);
            }
        }

        // 3. Validation Logic
        const isSelfDiscord = discordUser?.toLowerCase() === username.toLowerCase();

        // Handle aliased Discord username (e.g. mercure1456 -> Max’ster)
        // Also handle Discord-created accounts where Discord name != site username
        let isAliasedDiscord = false;
        if (session?.user && !isSelfDiscord) {
            // First try: lookup by Discord display name
            const resolvedUser = await getUser(discordUser);
            if (resolvedUser && resolvedUser.username.toLowerCase().replace(/'/g, "’") === username.toLowerCase().replace(/'/g, "’")) {
                isAliasedDiscord = true;
            }
            // Second try: check if the target user's discordId matches the session's Discord ID
            if (!isAliasedDiscord) {
                const targetUser = await getUser(username);
                if (targetUser && (targetUser.discordId === session.user.id || targetUser.appleId === session.user.id)) {
                    isAliasedDiscord = true;
                }
            }
        }

        const isSelfPogo = pogoUser?.toLowerCase() === username.toLowerCase() && await verifySession(pogoUser, pogoToken);
        const isSelfBodyToken = bodyToken && await verifySession(username, bodyToken);

        if (!isSelfDiscord && !isAliasedDiscord && !isSelfPogo && !isSelfBodyToken) {
            return NextResponse.json({ error: 'Unauthorized to save this profile' }, { status: 401 });
        }

        // Strip any fields not in the allowlist (e.g. passwordHash, createdAt)
        const safeData = sanitizeData(data);

        const updatedUser = await saveUser(username, safeData);

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Save error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
