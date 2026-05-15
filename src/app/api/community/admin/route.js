import { NextResponse } from 'next/server';
import path from 'path';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const COMMUNITIES_FILE = path.join(DATA_DIR, 'city_communities.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'community_suggestions.json');

const ADMIN_USERNAMES = new Set(['lcsnzh']);

function requireAdmin(request) {
    const username = request.headers.get('x-pogo-admin-user');
    if (!username || !ADMIN_USERNAMES.has(username)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

// Atomic writes + rolling timestamped backups — see src/lib/safeJsonStore.js
const readJson = safeReadJson;
const writeJson = safeWriteJson;

export async function GET(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const [suggestions, approved] = await Promise.all([
        readJson(SUGGESTIONS_FILE, []),
        readJson(COMMUNITIES_FILE, {}),
    ]);
    return NextResponse.json({ suggestions, approved });
}

const VALID_TYPES = new Set(['discord', 'campfire', 'messenger', 'website', 'telegram', 'whatsapp', 'facebook']);

function validateLink({ name, url, type }) {
    const cleanName = (name || '').trim().slice(0, 80);
    const cleanUrl = (url || '').trim();
    const cleanType = (type || '').toLowerCase().trim();
    if (!cleanName) return { error: 'Missing name' };
    if (!cleanUrl) return { error: 'Missing URL' };
    if (!VALID_TYPES.has(cleanType)) return { error: 'Invalid type' };
    try {
        const u = new URL(cleanUrl);
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
        return { error: 'Invalid URL' };
    }
    return { value: { name: cleanName, url: cleanUrl, type: cleanType } };
}

export async function POST(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { action } = body;

    // --- Approve / reject pending suggestions ---
    if (action === 'approve' || action === 'reject') {
        const { index } = body;
        if (typeof index !== 'number' || index < 0) {
            return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
        }
        const suggestions = await readJson(SUGGESTIONS_FILE, []);
        if (index >= suggestions.length) {
            return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
        }
        const [item] = suggestions.splice(index, 1);
        if (action === 'approve') {
            const approved = await readJson(COMMUNITIES_FILE, {});
            approved[item.city] = approved[item.city] || [];
            approved[item.city].push({ name: item.name, url: item.url, type: item.type });
            await writeJson(COMMUNITIES_FILE, approved);
        }
        await writeJson(SUGGESTIONS_FILE, suggestions);
        return NextResponse.json({ ok: true });
    }

    // --- Add a new approved community link directly (no suggestion flow) ---
    if (action === 'add') {
        const city = (body.city || '').toLowerCase().trim();
        if (!city) return NextResponse.json({ error: 'Missing city' }, { status: 400 });
        const v = validateLink(body);
        if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
        const approved = await readJson(COMMUNITIES_FILE, {});
        approved[city] = approved[city] || [];
        approved[city].push(v.value);
        await writeJson(COMMUNITIES_FILE, approved);
        return NextResponse.json({ ok: true });
    }

    // --- Edit an existing approved link ---
    if (action === 'edit') {
        const city = (body.city || '').toLowerCase().trim();
        const { linkIndex } = body;
        if (!city || typeof linkIndex !== 'number') {
            return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
        }
        const v = validateLink(body);
        if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
        const approved = await readJson(COMMUNITIES_FILE, {});
        if (!approved[city] || linkIndex >= approved[city].length) {
            return NextResponse.json({ error: 'Link not found' }, { status: 404 });
        }
        approved[city][linkIndex] = v.value;
        await writeJson(COMMUNITIES_FILE, approved);
        return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// Remove an already-approved community link.
// Body: { city: 'poitiers', linkIndex: 0 }
export async function DELETE(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { city, linkIndex } = body;
    if (!city || typeof linkIndex !== 'number') {
        return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }
    const approved = await readJson(COMMUNITIES_FILE, {});
    if (!approved[city] || linkIndex >= approved[city].length) {
        return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }
    approved[city].splice(linkIndex, 1);
    if (approved[city].length === 0) delete approved[city];
    await writeJson(COMMUNITIES_FILE, approved);
    return NextResponse.json({ ok: true });
}
