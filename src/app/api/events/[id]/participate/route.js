import { NextResponse } from 'next/server';
import path from 'path';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

const readEvents = () => safeReadJson(EVENTS_FILE, {});
const writeEvents = (data) => safeWriteJson(EVENTS_FILE, data);

// POST   /api/events/<id>/participate    → add current user (body: { username })
// DELETE /api/events/<id>/participate    → remove current user
//
// Identity: comes from request body { username } — we trust the client here since
// pokemon_user is in localStorage; future hardening can require a NextAuth session.
export async function POST(request, { params }) {
    const { id } = await params;
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const username = (body.username || '').trim().slice(0, 60);
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const events = await readEvents();
    if (!events[id]) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (!Array.isArray(events[id].participants)) events[id].participants = [];
    if (!events[id].participants.includes(username)) {
        events[id].participants.push(username);
        await writeEvents(events);
    }
    return NextResponse.json({ ok: true, count: events[id].participants.length });
}

export async function DELETE(request, { params }) {
    const { id } = await params;
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const username = (body.username || '').trim();
    if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 });

    const events = await readEvents();
    if (!events[id]) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    events[id].participants = (events[id].participants || []).filter(p => p !== username);
    await writeEvents(events);
    return NextResponse.json({ ok: true, count: events[id].participants.length });
}
