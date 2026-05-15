import { NextResponse } from 'next/server';
import { getUser, saveUser, verifyUser, getSessionToken, verifySession } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';
import { checkLockout, recordFailure, clearFailures } from '@/lib/loginGuard';

// 20 attempts per 15 minutes per IP (generous for session re-logins)
const limiter = createRateLimiter('pokemon-login', 20, 15 * 60 * 1000);

export async function POST(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
    }

    try {
        const { username, password, sessionToken: providedToken } = await request.json();

        if (!username || (!password && !providedToken)) {
            return NextResponse.json({ error: 'Credentials required' }, { status: 400 });
        }
        if (username.length > 30) {
            return NextResponse.json({ error: 'Username too long (max 30 characters)' }, { status: 400 });
        }
        if (username.includes(':')) {
            return NextResponse.json({ error: 'Username cannot contain ":"' }, { status: 400 });
        }

        // Per-username lockout — protects against distributed brute-force
        // (many IPs targeting one account) that the per-IP limiter misses.
        // Skipped for sessionToken re-logins since those don't expose the
        // password to guessing.
        if (!providedToken) {
            const { locked, retryAfterMs } = checkLockout(username);
            if (locked) {
                const minutes = Math.ceil(retryAfterMs / 60000);
                return NextResponse.json(
                    { error: `Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans ${minutes} min.` },
                    { status: 429 }
                );
            }
        }

        let user = await getUser(username);

        if (user) {
            // Verify session token if provided (automatic re-login)
            if (providedToken) {
                const isValidToken = await verifySession(username, providedToken);
                if (!isValidToken) {
                    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
                }
            } else {
                // Verify password (manual login)
                const isValid = await verifyUser(username, password);
                if (!isValid) {
                    if (!user.passwordHash) {
                        // SECURITY: the previous behaviour here auto-created a password
                        // on any login attempt for accounts that had none (migration
                        // case). Since usernames are public, that was an account
                        // takeover primitive — any attacker could claim any migrated
                        // account. We now refuse to auto-claim and require an admin
                        // to help the legitimate owner recover. User data is NEVER
                        // touched here; the account is only gated until recovery.
                        console.warn(`[pokemon/login] Migration-state login blocked for "${username}" — password never set, recovery needed.`);
                        return NextResponse.json({
                            error: "Ce compte nécessite une récupération. Contactez un administrateur sur Discord pour réactiver l'accès.",
                            needsRecovery: true
                        }, { status: 403 });
                    }
                    // Record failure for per-username lockout tracking.
                    const { locked, count } = recordFailure(username);
                    if (locked) {
                        return NextResponse.json(
                            { error: 'Trop de tentatives échouées. Compte verrouillé pendant 15 minutes.' },
                            { status: 429 }
                        );
                    }
                    return NextResponse.json(
                        { error: 'Invalid password', attemptsRemaining: Math.max(0, 10 - count) },
                        { status: 401 }
                    );
                }
                // Re-read user after verifyUser() — the password hash may have
                // been migrated from SHA256 to bcrypt, which changes the hash
                // value and thus the session token derived from it.
                user = await getUser(username);
                // Successful password login — clear any prior failure count.
                clearFailures(username);
            }
        } else if (password) {
            // Create new user (only with password)
            const initialData = {
                username,
                stats: {},
                checklist: {},
                createdAt: new Date().toISOString(),
            };
            await saveUser(username, initialData, password);
            // Re-read to get the full user object including passwordHash
            // (saveUser strips it from the return value for safety)
            user = await getUser(username);
        }

        // Return user without sensitive data
        const { passwordHash, ...safeUser } = user;
        const sessionToken = await getSessionToken(username, user.passwordHash);

        const response = NextResponse.json({ ...safeUser, sessionToken });

        // Set a secure HTTP-only cookie
        response.cookies.set('pogo_session', `${username}:${sessionToken}`, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            // 1 year — the cookie is httpOnly + signed (sessionToken depends
            // on the password hash), so making it long-lived is safe and lets
            // mobile users stay logged in across iOS Safari ITP wipes.
            maxAge: 60 * 60 * 24 * 365
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
