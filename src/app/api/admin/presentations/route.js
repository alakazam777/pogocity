import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import { DATA_DIR } from '@/lib/dataPath';

const HIDDEN_FILE = path.join(DATA_DIR, 'hidden_presentations.json');
const OVERRIDES_FILE = path.join(DATA_DIR, 'presentation_overrides.json');

// Helper to check for admin status
async function isAdmin() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);

    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;

    return isPasswordAdmin || isDiscordAdmin;
}

// Helper to get hidden IDs
async function getHiddenIds() {
    try {
        await fs.access(HIDDEN_FILE);
        const content = await fs.readFile(HIDDEN_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

// Helper to get overrides
async function getOverrides() {
    try {
        await fs.access(OVERRIDES_FILE);
        const content = await fs.readFile(OVERRIDES_FILE, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

// POST to hide a message
export async function POST(req) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const hidden = await getHiddenIds();
        if (!hidden.includes(id)) {
            hidden.push(id);
            await fs.writeFile(HIDDEN_FILE, JSON.stringify(hidden, null, 2));
        }

        return NextResponse.json({ success: true, hidden });
    } catch (error) {
        console.error('Error hiding presentation using POST:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// DELETE to hide a message
export async function DELETE(req) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await req.json();
        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const hidden = await getHiddenIds();
        if (!hidden.includes(id)) {
            hidden.push(id);
            await fs.writeFile(HIDDEN_FILE, JSON.stringify(hidden, null, 2));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error hiding presentation:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}

// PUT to edit a message content
export async function PUT(req) {
    if (!await isAdmin()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, content } = await req.json();
        if (!id || content === undefined) return NextResponse.json({ error: 'Missing ID or content' }, { status: 400 });

        const overrides = await getOverrides();
        overrides[id] = content;

        await fs.writeFile(OVERRIDES_FILE, JSON.stringify(overrides, null, 2));

        return NextResponse.json({ success: true, overrides });
    } catch (error) {
        console.error('Error updates presentation content:', error);
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
