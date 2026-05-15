import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { analyzeScreenshot } from '@/lib/visionOCR';
import { getQuotaStatus } from '@/lib/visionQuota';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const ipLimiter = createRateLimiter('pokemon-ocr-ip', 10, 60 * 60 * 1000);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// Per-user daily limiter — separate from IP limiter to prevent a single user
// from chewing through the global Vision quota even from many IPs.
const userLimits = new Map();
const USER_DAILY_MAX = 30;
const USER_WINDOW_MS = 24 * 60 * 60 * 1000;

function checkUserLimit(username) {
    const now = Date.now();
    const entry = userLimits.get(username);
    if (!entry || now - entry.start > USER_WINDOW_MS) {
        userLimits.set(username, { start: now, count: 1 });
        return { allowed: true, remaining: USER_DAILY_MAX - 1 };
    }
    if (entry.count >= USER_DAILY_MAX) {
        return { allowed: false, remaining: 0 };
    }
    entry.count++;
    return { allowed: true, remaining: USER_DAILY_MAX - entry.count };
}

async function resolveTrainerUsername() {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;

    if (session?.user?.name) {
        const u = await getUser(session.user.name);
        if (u) return u.username;
        if (session.user.id) {
            const all = await getAllUsers();
            for (const [, userData] of Object.entries(all)) {
                if ((userData?.discordId === session.user.id || userData?.appleId === session.user.id)) return userData.username;
            }
        }
    }

    if (pogoSession) {
        const [pogoUser, pogoToken] = pogoSession.split(':');
        if (pogoUser && pogoToken && await verifySession(pogoUser, pogoToken)) {
            return pogoUser;
        }
    }

    return null;
}

export async function POST(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const ipCheck = ipLimiter(request);
    if (!ipCheck.allowed) {
        return NextResponse.json({ error: 'IP rate limit exceeded' }, { status: 429 });
    }

    const username = await resolveTrainerUsername();
    if (!username) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userCheck = checkUserLimit(username);
    if (!userCheck.allowed) {
        return NextResponse.json({
            error: 'Daily OCR limit reached (30/day)',
            retryAfter: 'tomorrow',
        }, { status: 429 });
    }

    let formData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Expected multipart/form-data with an "image" field' }, { status: 400 });
    }

    const file = formData.get('image');
    const langField = formData.get('lang');
    const lang = (langField === 'en' || langField === 'fr') ? langField : 'fr';

    if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: `Image too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB)` }, { status: 413 });
    }
    if (file.type && !ALLOWED_MIME.includes(file.type.toLowerCase())) {
        return NextResponse.json({ error: `Unsupported image type: ${file.type}` }, { status: 415 });
    }

    let buffer;
    try {
        buffer = Buffer.from(await file.arrayBuffer());
    } catch {
        return NextResponse.json({ error: 'Failed to read uploaded file' }, { status: 400 });
    }

    try {
        const result = await analyzeScreenshot(buffer, { lang });
        const quotaStatus = await getQuotaStatus();
        return NextResponse.json({
            success: true,
            source: result.source,
            stats: result.stats,
            rawText: result.text,
            quota: { used: quotaStatus.used, limit: quotaStatus.limit, remaining: quotaStatus.remaining },
            userRemaining: userCheck.remaining,
        });
    } catch (err) {
        console.error('[import-ocr] Analysis error:', err);
        return NextResponse.json({ error: 'OCR analysis failed' }, { status: 500 });
    }
}
