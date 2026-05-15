import { NextResponse } from 'next/server';
import decode from 'heic-decode';
import { PNG } from 'pngjs';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifySession } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';

// 20 conversions per 5 minutes per IP
const limiter = createRateLimiter('convert-heic', 20, 5 * 60 * 1000);

async function checkUserAuth() {
    const session = await getServerSession(authOptions);
    if (session) return true;
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;
    if (pogoSession) {
        const [user, token] = pogoSession.split(':');
        return await verifySession(user, token);
    }
    return false;
}

export async function POST(request) {
    if (!await checkUserAuth()) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 15 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 413 });
        }

        // Decode HEIC to raw pixel data
        const { width, height, data } = await decode({ buffer });

        // Encode raw data to PNG
        const png = new PNG({ width, height });
        png.data = data;

        const pngBuffer = PNG.sync.write(png);

        const base64 = `data:image/png;base64,${pngBuffer.toString('base64')}`;

        return NextResponse.json({ image: base64 });
    } catch (error) {
        console.error('HEIC conversion error:', error);
        return NextResponse.json({ error: 'HEIC conversion failed' }, { status: 500 });
    }
}
