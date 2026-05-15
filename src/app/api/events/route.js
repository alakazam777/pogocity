import { NextResponse } from 'next/server';
import path from 'path';
import { safeReadJson } from '@/lib/safeJsonStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

// safeReadJson auto-restores from latest backup if main file is corrupt/missing
const readEvents = () => safeReadJson(EVENTS_FILE, {});

// GET /api/events           → all events as a map
// GET /api/events?id=xxx    → single event
export async function GET(request) {
    const events = await readEvents();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (id) {
        return NextResponse.json(events[id] || null);
    }
    return NextResponse.json(events);
}
