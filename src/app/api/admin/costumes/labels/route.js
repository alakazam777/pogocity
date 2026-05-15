import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

const FORMS_FILE = path.join(process.cwd(), 'src', 'data', 'pokemonForms.js');

async function checkAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);
    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;
    return isPasswordAdmin || isDiscordAdmin;
}

// GET: Read all costume labels from pokemonForms.js (the Pikachu entries with costumeOnly: true)
export async function GET() {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const content = fs.readFileSync(FORMS_FILE, 'utf-8');
        // Parse costume entries: { id: 'c_XXXXX', label: 'NAME' or "NAME", costumeOnly: true, ... }
        const regex = /\{\s*id:\s*['"](c_[A-Za-z0-9_]+)['"]\s*,\s*label:\s*(['"])(.*?)\2/g;
        const labels = {};
        let match;
        while ((match = regex.exec(content)) !== null) {
            labels[match[1]] = match[3];
        }
        return NextResponse.json(labels);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Update costume labels in pokemonForms.js
export async function POST(request) {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { labels } = await request.json();
        if (!labels || typeof labels !== 'object') {
            return NextResponse.json({ error: 'Invalid labels data' }, { status: 400 });
        }

        let content = fs.readFileSync(FORMS_FILE, 'utf-8');

        // For each label update, find the matching line and replace the label
        for (const [costumeId, newLabel] of Object.entries(labels)) {
            // Escape special characters for regex
            const escapedId = costumeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Match: { id: 'c_XXXXX', label: 'OLD_LABEL' or "OLD_LABEL"
            const pattern = new RegExp(
                `(\\{\\s*id:\\s*['"]${escapedId}['"]\\s*,\\s*label:\\s*)(['"])(.*?)\\2`,
                'g'
            );
            // Replace with same quote type
            content = content.replace(pattern, `$1$2${newLabel}$2`);
        }

        fs.writeFileSync(FORMS_FILE, content, 'utf-8');
        return NextResponse.json({ success: true, updated: Object.keys(labels).length });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
