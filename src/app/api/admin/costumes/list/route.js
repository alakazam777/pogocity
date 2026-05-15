import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

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
    const costumesDir = path.join(process.cwd(), 'public/Costumes');

    try {
        const files = fs.readdirSync(costumesDir).filter(f => f.match(/\.(png|webp|jpg|jpeg)$/i));
        // Sort numerically if possible
        files.sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.replace(/\D/g, '')) || 0;
            return numB - numA;
        });

        return NextResponse.json(files);
    } catch (error) {
        console.error('Error reading costumes directory:', error);
        return NextResponse.json({ error: 'Failed to list costumes' }, { status: 500 });
    }
}
