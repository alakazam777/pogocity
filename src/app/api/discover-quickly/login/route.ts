import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateRandomString, generateCodeChallenge } from '@/lib/discover-quickly/auth';

const client_id = process.env.SPOTIFY_CLIENT_ID;
const redirect_uri = `${process.env.NEXT_PUBLIC_URL}/api/discover-quickly/callback`;

export async function GET() {
    const state = generateRandomString(16);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const scope = 'streaming user-read-email user-read-private playlist-modify-public user-library-modify';

    (await cookies()).set('spotify_auth_state', state);
    (await cookies()).set('spotify_code_verifier', codeVerifier);

    console.log('LOGIN: Setting state cookie:', state);
    console.log('LOGIN: Redirect URI:', redirect_uri);

    const args = new URLSearchParams({
        response_type: 'code',
        client_id: client_id!,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
    });

    return NextResponse.redirect('https://accounts.spotify.com/authorize?' + args.toString());
}
