import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';

async function checkAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);

    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;

    return isPasswordAdmin || isDiscordAdmin;
}

export async function POST(req) {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { filename } = body;

        if (!filename || typeof filename !== 'string') {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        // Prevent directory traversal
        const normalizedFilename = path.basename(filename);

        const filePath = path.join(process.cwd(), 'public/Costumes', normalizedFilename);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        fs.unlinkSync(filePath);
        return NextResponse.json({ success: true, message: `Deleted ${normalizedFilename}` });
    } catch (error) {
        console.error('Failed to delete costume:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
