import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllUsers } from '@/lib/pokemonStorage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const adminToken = cookieStore.get('admin_token');
        const session = await getServerSession(authOptions);

        // Check for either the admin password cookie OR the specific Discord user
        const isPasswordAdmin = verifyAdminToken(adminToken?.value);
        const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;

        if (!isPasswordAdmin && !isDiscordAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const users = await getAllUsers();
        // Remove password hashes from response for extra safety
        const safeUsers = {};
        Object.entries(users).forEach(([key, user]) => {
            const { passwordHash, ...safeUser } = user;
            safeUsers[key] = safeUser;
        });

        return NextResponse.json(safeUsers);
    } catch (error) {
        console.error('Admin users error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
