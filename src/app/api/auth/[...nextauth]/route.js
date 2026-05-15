// Required env vars for Apple Sign In:
// APPLE_ID — Service ID (e.g., com.pogosphere.auth)
// APPLE_TEAM_ID — 10-char team ID from Apple Developer portal
// APPLE_KEY_ID — Key ID for the .p8 private key
// APPLE_PRIVATE_KEY — Contents of the .p8 file (with literal \n for newlines)

import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import AppleProvider from "next-auth/providers/apple"
import jwt from "jsonwebtoken"

// ---------- Apple client secret (JWT signed with ES256) ----------
function generateAppleClientSecret() {
    const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!privateKey) return undefined;

    const now = Math.floor(Date.now() / 1000);
    return jwt.sign(
        {
            iss: process.env.APPLE_TEAM_ID,
            iat: now,
            exp: now + 15777000, // ~6 months
            aud: 'https://appleid.apple.com',
            sub: process.env.APPLE_ID,
        },
        privateKey,
        {
            algorithm: 'ES256',
            keyid: process.env.APPLE_KEY_ID,
        }
    );
}

// ---------- Providers ----------
const providers = [
    DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }),
];

// Apple provider is optional — only enabled when env vars are set
if (process.env.APPLE_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY) {
    providers.push(
        AppleProvider({
            clientId: process.env.APPLE_ID,
            clientSecret: generateAppleClientSecret(),
            authorization: {
                params: {
                    scope: 'name email',
                    response_mode: 'form_post',
                },
            },
        })
    );
}

// Detect HTTP-localhost (dev / Tailnet) — NextAuth's default cookie handling under
// NODE_ENV=production assumes HTTPS, which causes "State cookie was missing" errors
// when running on http://localhost. Forcing explicit non-secure cookies fixes this.
const useSecureCookies = (process.env.NEXTAUTH_URL || '').startsWith('https://');
const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const authOptions = {
    providers,
    secret: process.env.NEXTAUTH_SECRET,
    useSecureCookies,
    // Keep mobile users (especially iOS Safari + Capacitor) logged in across
    // ITP/PWA wipes. 1 year matches the pogo_session cookie max-age.
    session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 365 },
    jwt: { maxAge: 60 * 60 * 24 * 365 },
    cookies: {
        sessionToken: {
            name: `${cookiePrefix}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: useSecureCookies,
                maxAge: 60 * 60 * 24 * 365,
            },
        },
        callbackUrl: {
            name: `${cookiePrefix}next-auth.callback-url`,
            options: { sameSite: 'lax', path: '/', secure: useSecureCookies },
        },
        csrfToken: {
            name: `${useSecureCookies ? '__Host-' : ''}next-auth.csrf-token`,
            options: { httpOnly: true, sameSite: 'lax', path: '/', secure: useSecureCookies },
        },
        // Apple's `response_mode: form_post` makes the callback a cross-site
        // POST request. SameSite=Lax cookies are NOT sent on cross-site POSTs,
        // so the PKCE/state/nonce cookies issued at signin disappear by the
        // time the callback arrives → "PKCE code_verifier cookie was missing".
        // Setting these to SameSite=None (with Secure) keeps them flowing
        // through Apple's POST callback. Discord (GET callback) is unaffected.
        pkceCodeVerifier: {
            name: `${cookiePrefix}next-auth.pkce.code_verifier`,
            options: {
                httpOnly: true,
                sameSite: useSecureCookies ? 'none' : 'lax',
                path: '/',
                secure: useSecureCookies,
                maxAge: 900,
            },
        },
        state: {
            name: `${cookiePrefix}next-auth.state`,
            options: {
                httpOnly: true,
                sameSite: useSecureCookies ? 'none' : 'lax',
                path: '/',
                secure: useSecureCookies,
                maxAge: 900,
            },
        },
        nonce: {
            name: `${cookiePrefix}next-auth.nonce`,
            options: {
                httpOnly: true,
                sameSite: useSecureCookies ? 'none' : 'lax',
                path: '/',
                secure: useSecureCookies,
            },
        },
    },
    callbacks: {
        async session({ session, token }) {
            if (session?.user) {
                session.user.id = token.sub;
                if (token.provider) session.user.provider = token.provider;
            }
            return session;
        },
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.id = user.id;
            }
            // Track which provider was used
            if (account) {
                token.provider = account.provider;
            }
            // Apple may only send name on the very first sign-in — persist it
            if (account?.provider === 'apple' && profile) {
                if (profile.name) {
                    token.name = [profile.name.firstName, profile.name.lastName]
                        .filter(Boolean)
                        .join(' ') || token.name;
                }
                if (profile.email) {
                    token.email = profile.email;
                }
            }
            return token;
        }
    },
    pages: {
        signIn: '/', // PogoSphere has no /pokemon route — redirect to home on sign-in / errors
    }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
