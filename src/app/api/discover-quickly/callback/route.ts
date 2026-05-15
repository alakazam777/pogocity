import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Optional for PKCE but good for refresh
const redirect_uri = `${process.env.NEXT_PUBLIC_URL}/api/discover-quickly/callback`;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const storedState = (await cookies()).get('spotify_auth_state')?.value;
    const codeVerifier = (await cookies()).get('spotify_code_verifier')?.value;

    console.log('CALLBACK: Received state:', state);
    console.log('CALLBACK: Stored state:', storedState);
    console.log('CALLBACK: Request URL:', request.url);

    if (state === null || state !== storedState) {
        return NextResponse.redirect(new URL('/?error=state_mismatch', request.url));
    }

    if (!code || !codeVerifier) {
        return NextResponse.redirect(new URL('/?error=missing_code', request.url));
    }

    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri!,
        client_id: client_id!,
        code_verifier: codeVerifier,
    });

    // If we have a client secret, we can use Basic Auth, but PKCE with public client doesn't need it.
    // However, Spotify supports PKCE for confidential clients too.
    // Let's try sending client_id in body (public client style) first.
    // If that fails, we might need Basic Auth.
    // Actually, for "Authorization Code Flow with PKCE", if we have a secret, we should use it?
    // Spotify docs say: "If you are using the Authorization Code Flow with PKCE, you do not need to include the client_secret parameter in the request body."
    // But if we are a confidential client (web app with server), we usually use standard Auth Code flow.
    // But user insisted on PKCE.
    // Let's stick to PKCE parameters.

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Token exchange failed', data);
        return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url));
    }

    const { access_token, refresh_token, expires_in } = data;

    (await cookies()).set('spotify_access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: expires_in,
        path: '/',
    });

    if (refresh_token) {
        (await cookies()).set('spotify_refresh_token', refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
    }

    // Clear auth cookies
    (await cookies()).delete('spotify_auth_state');
    (await cookies()).delete('spotify_code_verifier');

    return NextResponse.redirect(new URL('/', request.url));
}
