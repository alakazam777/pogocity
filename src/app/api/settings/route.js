import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import { DATA_DIR } from '@/lib/dataPath';

const settingsPath = path.join(DATA_DIR, 'settings.json');

export const dynamic = 'force-dynamic';

async function checkAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);

    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;

    return isPasswordAdmin || isDiscordAdmin;
}

export async function GET() {
    try {
        const fileContents = await fs.readFile(settingsPath, 'utf8');
        return NextResponse.json(JSON.parse(fileContents));
    } catch (error) {
        return NextResponse.json({});
    }
}

export async function POST(request) {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const settings = await request.json();
        await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
