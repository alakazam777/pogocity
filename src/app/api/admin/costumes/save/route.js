import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';

const mappingFile = path.join(process.cwd(), 'src/data/costume_mapping.json');

async function checkAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);

    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;

    return isPasswordAdmin || isDiscordAdmin;
}

export async function GET() {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!fs.existsSync(mappingFile)) {
            return NextResponse.json({});
        }
        const content = fs.readFileSync(mappingFile, 'utf8');
        const data = JSON.parse(content);
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to read mapping' }, { status: 500 });
    }
}

export async function POST(req) {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const mapping = body.mapping;

        fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 4), 'utf8');
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
    }
}
