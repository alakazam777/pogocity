import { NextResponse } from 'next/server';
import path from 'path';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const COMMUNITIES_FILE = path.join(DATA_DIR, 'city_communities.json');
const SUGGESTIONS_FILE = path.join(DATA_DIR, 'community_suggestions.json');

const VALID_TYPES = new Set(['discord', 'campfire', 'messenger', 'website', 'telegram', 'whatsapp', 'facebook']);

const readJson = safeReadJson;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city')?.toLowerCase().trim();
    const data = await readJson(COMMUNITIES_FILE, {});
    return NextResponse.json(city ? (data[city] || []) : data);
}

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const city = (body.city || '').toLowerCase().trim();
    const name = (body.name || '').trim().slice(0, 80);
    const url = (body.url || '').trim();
    const type = (body.type || '').toLowerCase().trim();

    if (!city || !name || !url || !type) {
        return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }
    if (!VALID_TYPES.has(type)) {
        return NextResponse.json({ error: 'Type invalide' }, { status: 400 });
    }
    try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    } catch {
        return NextResponse.json({ error: 'URL invalide' }, { status: 400 });
    }

    const suggestions = await readJson(SUGGESTIONS_FILE, []);
    suggestions.push({
        city,
        name,
        url,
        type,
        submittedAt: new Date().toISOString(),
    });
    await safeWriteJson(SUGGESTIONS_FILE, suggestions);

    return NextResponse.json({ ok: true });
}
