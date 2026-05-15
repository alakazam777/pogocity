import { NextResponse } from 'next/server';
import path from 'path';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

const ADMIN_USERNAMES = new Set(['lcsnzh']);

function requireAdmin(request) {
    const username = request.headers.get('x-pogo-admin-user');
    if (!username || !ADMIN_USERNAMES.has(username)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

// Atomic writes + rolling timestamped backups (src/lib/safeJsonStore.js)
const readEvents = () => safeReadJson(EVENTS_FILE, {});
const writeEvents = (data) => safeWriteJson(EVENTS_FILE, data);

const slugify = (s) => (s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

// GET → all events
export async function GET(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    return NextResponse.json(await readEvents());
}

// POST  body: { id?, title, city, lat, lng, startDate, endDate, color?, description?, heroImage?, links?, news?, showFlashingDot? }
//   Creates new event (id auto-generated from title if missing) OR updates existing one.
export async function POST(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const title = (body.title || '').trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: 'Missing title' }, { status: 400 });
    const id = (body.id && body.id.trim()) || slugify(title) + '-' + Date.now().toString(36).slice(-4);

    const events = await readEvents();
    const existing = events[id] || {};
    events[id] = {
        ...existing,
        id,
        title,
        city: (body.city || '').trim().slice(0, 100),
        lat: Number.isFinite(body.lat) ? body.lat : existing.lat ?? 0,
        lng: Number.isFinite(body.lng) ? body.lng : existing.lng ?? 0,
        startDate: body.startDate || existing.startDate || '',
        endDate: body.endDate || existing.endDate || '',
        color: body.color || existing.color || '#22d3ee',
        description: body.description ?? existing.description ?? '',
        heroImage: body.heroImage ?? existing.heroImage ?? '',
        images: Array.isArray(body.images) ? body.images : (existing.images || []),
        news: Array.isArray(body.news) ? body.news : (existing.news || []),
        links: Array.isArray(body.links) ? body.links : (existing.links || []),
        participants: existing.participants || [],
        showFlashingDot: body.showFlashingDot !== undefined ? !!body.showFlashingDot : (existing.showFlashingDot !== false),
    };
    await writeEvents(events);
    return NextResponse.json({ ok: true, id, event: events[id] });
}

// DELETE  body: { id }
export async function DELETE(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const events = await readEvents();
    if (!events[id]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    delete events[id];
    await writeEvents(events);
    return NextResponse.json({ ok: true });
}
