import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import util from 'util';

const execPromise = util.promisify(exec);

async function checkAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);
    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;
    return isPasswordAdmin || isDiscordAdmin;
}

export async function POST() {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        // Run `npm run build` then restart the pm2 process. Executed
        // async so the request returns immediately (a build takes ~1 min).
        // The pm2 process name is read from PM2_APP_NAME (.env.local).

        const pm2Name = process.env.PM2_APP_NAME || 'pogocity';
        execPromise(`npm run build && pm2 restart ${pm2Name}`).catch(err => {
            console.error('Build/Restart failed:', err);
        });

        // We return immediately rather than waiting for it to finish,
        // because we don't want the user's browser to hang or timeout.
        return NextResponse.json({
            success: true,
            message: 'Rebuild & Restart inititié en arrière-plan. Le site sera mis à jour dans environ 1-2 minutes.'
        });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
