import { NextResponse } from 'next/server';
import sharp from 'sharp';
import heicConvert from 'heic-convert';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifySession } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';

// 20 conversions per 5 minutes per IP
const limiter = createRateLimiter('convert-image', 20, 5 * 60 * 1000);

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

export async function POST(req) {
    if (!await checkUserAuth()) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { allowed } = limiter(req);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        let buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 15 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 413 });
        }
        console.log(`Processing file: ${file.name}, size: ${buffer.length}`);

        // Check if it's a HEIC file based on magic bytes or extension
        const isHeic = file.name.toLowerCase().endsWith('.heic') ||
            (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70 &&
                buffer[8] === 0x68 && buffer[9] === 0x65 && buffer[10] === 0x69 && buffer[11] === 0x63);

        if (isHeic) {
            console.log('Detected HEIC file, converting with heic-convert...');
            try {
                buffer = await heicConvert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 1
                });
                console.log('heic-convert successful');
            } catch (heicError) {
                console.error('heic-convert failed:', heicError);
                throw new Error('HEIC conversion failed: ' + heicError.message);
            }
        }

        // Process with sharp (resize/compress if needed, or just ensure valid JPEG)
        const jpegBuffer = await sharp(buffer)
            .toFormat('jpeg')
            .toBuffer();

        const base64Image = `data:image/jpeg;base64,${jpegBuffer.toString('base64')}`;

        return NextResponse.json({ image: base64Image });
    } catch (error) {
        console.error('Conversion error:', error);
        return NextResponse.json({ error: 'Image conversion failed' }, { status: 500 });
    }
}
