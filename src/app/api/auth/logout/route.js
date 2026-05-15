import { NextResponse } from 'next/server';

// Clears the `pogo_session` httpOnly cookie. The Header's logout handler
// pairs this with localStorage cleanup + NextAuth `signOut()` so that the
// user is fully signed out everywhere, including the cookie that
// `/api/auth/me` would otherwise use to silently restore the session on
// the next page load.

export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set('pogo_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}
