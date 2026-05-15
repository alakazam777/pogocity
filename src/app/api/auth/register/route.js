import { NextResponse } from 'next/server';
import { getUser, saveUser, getSessionToken, getAllUsers } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../[...nextauth]/route';
import { createRateLimiter } from '@/lib/rateLimit';
import { TERMS_VERSION } from '@/lib/legalContent';

// 10 registration attempts per 15 minutes per IP
const limiter = createRateLimiter('auth-register', 10, 15 * 60 * 1000);

export async function POST(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
    }

    try {
        const { username, password, termsAccepted } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Nom de dresseur et mot de passe requis' }, { status: 400 });
        }

        if (termsAccepted !== true) {
            return NextResponse.json({ error: 'You must accept the Terms of Service' }, { status: 400 });
        }

        const trimmedUsername = username.trim();

        if (trimmedUsername.length < 2) {
            return NextResponse.json({ error: 'Le nom de dresseur doit contenir au moins 2 caractères' }, { status: 400 });
        }
        if (trimmedUsername.length > 30) {
            return NextResponse.json({ error: 'Le nom de dresseur est trop long (max 30 caractères)' }, { status: 400 });
        }
        if (trimmedUsername.includes(':')) {
            return NextResponse.json({ error: 'Le nom de dresseur ne peut pas contenir ":"' }, { status: 400 });
        }

        if (password.length < 4) {
            return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 4 caractères' }, { status: 400 });
        }

        // Check if username already exists
        const existingUser = await getUser(trimmedUsername);
        let user;

        if (existingUser) {
            if (existingUser.passwordHash) {
                // Account has a password already. Allow a password reset only
                // if the requester proves ownership via an OAuth session
                // (Discord OR Apple) that matches the linked id on the account.
                const session = await getServerSession(authOptions);
                const sessionProvider = session?.user?.provider;
                const sessionId = session?.user?.id;
                const matchesDiscord = sessionProvider === 'discord' && existingUser.discordId && sessionId === existingUser.discordId;
                const matchesApple = sessionProvider === 'apple' && existingUser.appleId && sessionId === existingUser.appleId;

                if (matchesDiscord || matchesApple) {
                    // OAuth-verified owner — allow password reset.
                    user = await saveUser(trimmedUsername, existingUser, password);
                } else if (!existingUser.discordId && !existingUser.appleId) {
                    // No OAuth identity linked → can't verify ownership of an
                    // existing password-protected account.
                    return NextResponse.json({ error: 'Ce nom de dresseur est déjà pris. Utilisez l\'onglet Connexion.' }, { status: 409 });
                } else {
                    // Has Discord and/or Apple, but the requester isn't
                    // authenticated as the right one. Prompt them.
                    const needsDiscord = !!existingUser.discordId;
                    const needsApple = !!existingUser.appleId;
                    const msg = needsDiscord && needsApple
                        ? 'Ce compte est lié à Discord ou Apple. Connectez-vous d\'abord avec l\'un des deux pour réinitialiser votre mot de passe.'
                        : needsDiscord
                            ? 'Ce compte est lié à Discord. Connectez-vous d\'abord avec Discord pour réinitialiser votre mot de passe.'
                            : 'Ce compte est lié à Apple. Connectez-vous d\'abord avec Apple pour réinitialiser votre mot de passe.';
                    return NextResponse.json({
                        error: msg,
                        needsDiscord,
                        needsApple,
                    }, { status: 409 });
                }
            } else {
                // Account exists but has NO password (e.g. created via Discord
                // OR Apple) — allow setting a password.
                user = await saveUser(trimmedUsername, existingUser, password);
            }
        } else {
            // Brand new account — `termsVersion` lets EulaGate know this
            // user already accepted the CURRENT terms, so the gate
            // doesn't re-prompt. If we ever revise the terms, bumping
            // TERMS_VERSION in legalContent.js automatically re-prompts
            // every existing user (their saved version no longer matches).
            const initialData = {
                username: trimmedUsername,
                stats: {},
                checklist: {},
                createdAt: new Date().toISOString(),
                termsAcceptedAt: new Date().toISOString(),
                termsVersion: TERMS_VERSION,
            };
            user = await saveUser(trimmedUsername, initialData, password);
        }

        // Generate session token
        // Need to re-read user to get passwordHash for token generation
        const fullUser = await getUser(trimmedUsername);
        const sessionToken = await getSessionToken(trimmedUsername, fullUser.passwordHash);

        const { passwordHash, ...safeUser } = user;

        const response = NextResponse.json({ ...safeUser, sessionToken });

        // Set session cookie
        response.cookies.set('pogo_session', `${trimmedUsername}:${sessionToken}`, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            // 1 year — see comment in /api/pokemon/login.
            maxAge: 60 * 60 * 24 * 365
        });

        return response;
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
    }
}
