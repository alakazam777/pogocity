import { NextResponse } from 'next/server';
import { getUser } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';

// 60 lookups per minute per IP — generous for legitimate use
const limiter = createRateLimiter('pokemon-user', 60, 60 * 1000);

export async function GET(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    try {
        const user = await getUser(username);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return user without sensitive data
        const { passwordHash, ...safeUser } = user;
        return NextResponse.json(safeUser);
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
