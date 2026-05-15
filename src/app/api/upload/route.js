import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import sharp from 'sharp';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifySession } from '@/lib/pokemonStorage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
    try {
        // --- AUTH CHECK ---
        const session = await getServerSession(authOptions);
        const cookieStore = await cookies();
        const pogoSession = cookieStore.get('pogo_session')?.value;

        let isAuthenticated = !!session;

        if (!isAuthenticated && pogoSession) {
            const [user, token] = pogoSession.split(':');
            isAuthenticated = await verifySession(user, token);
        }

        if (!isAuthenticated) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // ------------------

        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Convert to buffer and enforce size limit (15 MB)
        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 15 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large (max 15 MB)' }, { status: 413 });
        }
        // Sanitize filename and force .jpg extension
        let filename = file.name;
        const nameWithoutExt = path.parse(filename).name;
        const safeFilename = Date.now() + '_' + nameWithoutExt.replace(/[^\w\s-]/g, '').replace(/\s/g, '_') + '.jpg';

        const uploadDir = path.join(process.cwd(), 'public', 'uploads');

        // Ensure upload directory exists
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, safeFilename);

        // Process with Sharp
        try {
            // Try to convert to jpeg and resize to avoid huge files
            const outputBuffer = await sharp(buffer)
                .resize(1500, 1500, { fit: 'inside', withoutEnlargement: true }) // Resize to max 1500px dimension
                .jpeg({ quality: 85 }) // Compress slightly
                .toBuffer();

            // Write to file
            await fs.writeFile(filePath, outputBuffer);
        } catch (sharpError) {
            console.error('Sharp processing error:', sharpError);
            throw new Error(`Image processing failed: ${sharpError.message}`);
        }

        return NextResponse.json({ url: `/uploads/${safeFilename}` });
    } catch (error) {
        console.error('Upload error details:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
