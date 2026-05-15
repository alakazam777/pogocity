import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import { DATA_DIR } from '@/lib/dataPath';

const dataFilePath = path.join(DATA_DIR, 'projects.json');

// Admin-only auth: matches /api/settings pattern. Admin cookie (from /admin login)
// or Discord OAuth session matching DISCORD_ADMIN_ID.
async function checkAdminAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);

    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;

    return isPasswordAdmin || isDiscordAdmin;
}

export async function GET() {
    try {
        const fileContents = await fs.readFile(dataFilePath, 'utf8');
        const projects = JSON.parse(fileContents);
        return NextResponse.json(projects);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
    }
}

export async function POST(request) {
    if (!await checkAdminAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const projects = await request.json();
        await fs.writeFile(dataFilePath, JSON.stringify(projects, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
