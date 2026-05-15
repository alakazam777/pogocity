import { NextResponse } from 'next/server';
import { getUser, saveUser, verifyUser, getSessionToken } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';
import { checkLockout, recordFailure, clearFailures } from '@/lib/loginGuard';
import { TERMS_VERSION } from '@/lib/legalContent';

// 10 confirms per minute per IP — generous for legitimate use, tight
// enough to slow brute-force attempts on the claim path.
const limiter = createRateLimiter('discord-confirm', 10, 60 * 1000);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, matches /api/pokemon/login

/**
 * Second leg of the Discord-OAuth flow: the user has authenticated with
 * Discord and the discord/login route returned `needsUsername: true`
 * (because there's no existing account matching their Discord ID or
 * email). The frontend then collected the user's choice and POSTs here.
 *
 * Two actions:
 *
 *   action: 'create'
 *     Create a brand-new account with the chosen username.
 *     Username must not already exist.
 *
 *   action: 'claim'
 *     Link this Discord identity to an existing password-protected
 *     account. The user MUST supply the existing account's password —
 *     no password-less linking, otherwise anyone could hijack accounts
 *     by setting their Discord display name to a victim's username.
 *
 * On success, sets the same `pogo_session` HTTP-only cookie that
 * /api/pokemon/login sets, so the user stays logged in afterwards.
 */
export async function POST(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json(
            { error: 'Trop de tentatives. Réessayez dans une minute.' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const { discordId, action, username, password, email, image, team } = body;

        if (!discordId) {
            return NextResponse.json({ error: 'Discord ID required' }, { status: 400 });
        }
        if (!username || typeof username !== 'string') {
            return NextResponse.json({ error: 'Username required' }, { status: 400 });
        }

        const trimmed = username.trim();
        if (trimmed.length === 0 || trimmed.length > 30) {
            return NextResponse.json(
                { error: 'Le pseudo doit faire entre 1 et 30 caractères' },
                { status: 400 }
            );
        }
        if (trimmed.includes(':')) {
            return NextResponse.json(
                { error: 'Le pseudo ne peut pas contenir ":"' },
                { status: 400 }
            );
        }

        if (action === 'claim') {
            // Per-username lockout — protects against brute-forcing the
            // claim path with stolen Discord accounts.
            const { locked, retryAfterMs } = checkLockout(trimmed);
            if (locked) {
                const minutes = Math.ceil(retryAfterMs / 60000);
                return NextResponse.json(
                    { error: `Compte temporairement verrouillé. Réessayez dans ${minutes} min.` },
                    { status: 429 }
                );
            }

            if (!password) {
                return NextResponse.json(
                    { error: 'Mot de passe requis pour réclamer un compte existant' },
                    { status: 400 }
                );
            }

            const target = await getUser(trimmed);
            if (!target) {
                // Same error wording for "no such user" and "wrong password"
                // to avoid leaking which usernames exist via Discord OAuth.
                recordFailure(trimmed);
                return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 });
            }

            // Reject if the target account is already linked to a DIFFERENT
            // Discord — that would silently overwrite someone else's link.
            if (target.discordId && target.discordId !== discordId) {
                return NextResponse.json(
                    { error: 'Ce compte est déjà lié à un autre compte Discord.' },
                    { status: 409 }
                );
            }

            const ok = await verifyUser(trimmed, password);
            if (!ok) {
                const { locked: nowLocked, count } = recordFailure(trimmed);
                if (nowLocked) {
                    return NextResponse.json(
                        { error: 'Trop de tentatives échouées. Compte verrouillé 15 minutes.' },
                        { status: 429 }
                    );
                }
                return NextResponse.json(
                    { error: 'Identifiants incorrects', attemptsRemaining: Math.max(0, 10 - count) },
                    { status: 401 }
                );
            }

            clearFailures(trimmed);

            // Re-read after verify (verifyUser may have migrated the hash)
            const fresh = await getUser(trimmed);

            // Link Discord to the existing account. Preserve all existing data.
            const linked = await saveUser(fresh.username, {
                ...fresh,
                discordId,
                email: fresh.email || email || null,
                trainerImage: fresh.trainerImage || image || null,
                team: fresh.team || team || null,
            });

            // saveUser strips passwordHash — re-fetch to compute session token.
            const reread = await getUser(trimmed);
            const sessionToken = await getSessionToken(reread.username, reread.passwordHash);

            const { passwordHash, ...safeUser } = linked;
            const response = NextResponse.json({
                ...safeUser,
                sessionToken,
                claimed: true,
            });
            response.cookies.set('pogo_session', `${reread.username}:${sessionToken}`, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: COOKIE_MAX_AGE,
            });
            return response;
        }

        // action === 'create' (default).
        // Reject if username is already taken — we never auto-link without
        // proof of ownership (use 'claim' with password instead).
        const existing = await getUser(trimmed);
        if (existing) {
            return NextResponse.json(
                {
                    error: 'Ce pseudo est déjà pris. Si c\'est votre compte, utilisez « Réclamer un compte existant » avec votre mot de passe.',
                    usernameTaken: true,
                },
                { status: 409 }
            );
        }

        // Create new Discord-only account (no password). Existing Discord
        // -only accounts in the data don't have a passwordHash either —
        // they rely on NextAuth's own session for subsequent requests, not
        // on the `pogo_session` cookie that password-based logins use. So
        // we don't set a cookie here either, matching the existing pattern.
        //
        // `termsAccepted: true` is enforced upstream (DiscordUsernameModal
        // requires the EULA checkbox before this endpoint is called for
        // first-time creates) — we record termsAcceptedAt + termsVersion
        // here so EulaGate doesn't immediately re-prompt the user.
        if (body.termsAccepted !== true) {
            return NextResponse.json({ error: 'You must accept the Terms of Service' }, { status: 400 });
        }
        const created = await saveUser(trimmed, {
            username: trimmed,
            discordId,
            email: email || null,
            trainerImage: image || null,
            team: team || null,
            stats: {},
            checklist: {},
            createdAt: new Date().toISOString(),
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: TERMS_VERSION,
        });

        const { passwordHash, ...safeUser } = created;
        return NextResponse.json({ ...safeUser, created: true });

    } catch (error) {
        console.error('[discord/confirm] error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
