import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

export async function GET() {
    const accessToken = (await cookies()).get('spotify_access_token')?.value;
    const refreshToken = (await cookies()).get('spotify_refresh_token')?.value;

    if (accessToken) {
        return NextResponse.json({ accessToken });
    }

    if (!refreshToken) {
        return NextResponse.json({ error: 'No token' }, { status: 401 });
    }

    // Refresh token
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: client_id!,
    });

    // For refresh, if we didn't use client_secret in initial exchange (PKCE public), we don't need it here?
    // Actually, if we have a client secret, we should probably use it for refresh if we are confidential.
    // But let's try without first as we did in callback.

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        return NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    }

    const { access_token, expires_in, refresh_token: new_refresh_token } = data;

    (await cookies()).set('spotify_access_token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: expires_in,
        path: '/',
    });

    if (new_refresh_token) {
        (await cookies()).set('spotify_refresh_token', new_refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
    }

    return NextResponse.json({ accessToken: access_token });
}
