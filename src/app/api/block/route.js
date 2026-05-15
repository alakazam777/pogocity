import { NextResponse } from 'next/server';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPath';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';
import { getSessionUser } from '@/lib/sessionAuth';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const BLOCKS_FILE = path.join(DATA_DIR, 'blocks.json');

// 30 block/unblock actions per hour per IP
const limiter = createRateLimiter('block', 30, 60 * 60 * 1000);

// GET — list blocked usernames for the current user
export async function GET(request) {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const blocks = await safeReadJson(BLOCKS_FILE, []);
    const blocked = blocks
        .filter(b => b.blockerUsername.toLowerCase() === sessionUser.username.toLowerCase())
        .map(b => b.blockedUsername);

    return NextResponse.json({ blocked });
}

// POST — block a user
export async function POST(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const { blockedUsername } = await request.json();
        if (!blockedUsername || typeof blockedUsername !== 'string') {
            return NextResponse.json({ error: 'blockedUsername is required' }, { status: 400 });
        }

        // Can't block yourself
        if (sessionUser.username.toLowerCase() === blockedUsername.toLowerCase()) {
            return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
        }

        const blocks = await safeReadJson(BLOCKS_FILE, []);

        // Check if already blocked
        const alreadyBlocked = blocks.some(
            b => b.blockerUsername.toLowerCase() === sessionUser.username.toLowerCase() &&
                 b.blockedUsername.toLowerCase() === blockedUsername.toLowerCase()
        );
        if (alreadyBlocked) {
            return NextResponse.json({ success: true, message: 'Already blocked' });
        }

        blocks.push({
            blockerUsername: sessionUser.username,
            blockedUsername,
            createdAt: new Date().toISOString(),
        });

        await safeWriteJson(BLOCKS_FILE, blocks);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Block error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE — unblock a user
export async function DELETE(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const { blockedUsername } = await request.json();
        if (!blockedUsername || typeof blockedUsername !== 'string') {
            return NextResponse.json({ error: 'blockedUsername is required' }, { status: 400 });
        }

        const blocks = await safeReadJson(BLOCKS_FILE, []);
        const filtered = blocks.filter(
            b => !(b.blockerUsername.toLowerCase() === sessionUser.username.toLowerCase() &&
                   b.blockedUsername.toLowerCase() === blockedUsername.toLowerCase())
        );

        await safeWriteJson(BLOCKS_FILE, filtered);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Unblock error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
