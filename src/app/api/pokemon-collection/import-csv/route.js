import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getUser, verifySession, getAllUsers } from '@/lib/pokemonStorage';
import { addPokemonBatch, setCollection, getCollectionSummary } from '@/lib/collectionStorage';
import { parsePokemonCSV } from '@/lib/csvParsers';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const limiter = createRateLimiter('pokemon-collection-import-csv', 10, 60 * 60 * 1000);

const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 5000;

async function resolveTrainerUsername() {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;

    // 1. Discord session → match by display name first
    if (session?.user?.name) {
        const u = await getUser(session.user.name);
        if (u) return u.username;

        // Fallback: match by discordId on aliased accounts
        if (session.user.id) {
            const all = await getAllUsers();
            for (const [, userData] of Object.entries(all)) {
                if ((userData?.discordId === session.user.id || userData?.appleId === session.user.id)) {
                    return userData.username;
                }
            }
        }
    }

    // 2. Local pogo_session cookie
    if (pogoSession) {
        const [pogoUser, pogoToken] = pogoSession.split(':');
        if (pogoUser && pogoToken && await verifySession(pogoUser, pogoToken)) {
            return pogoUser;
        }
    }

    return null;
}

export async function POST(request) {
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 });
    }
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { csvContent, mode = 'append' } = body || {};

    if (typeof csvContent !== 'string' || !csvContent.trim()) {
        return NextResponse.json({ error: 'csvContent is required (string)' }, { status: 400 });
    }
    if (csvContent.length > MAX_CSV_BYTES) {
        return NextResponse.json({ error: `CSV too large (max ${MAX_CSV_BYTES / 1024 / 1024} MB)` }, { status: 413 });
    }
    if (mode !== 'append' && mode !== 'replace') {
        return NextResponse.json({ error: 'mode must be "append" or "replace"' }, { status: 400 });
    }

    const username = await resolveTrainerUsername();
    if (!username) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { format, pokemon, errors } = parsePokemonCSV(csvContent);

    if (format === 'invalid') {
        return NextResponse.json({ error: errors[0]?.message || 'CSV parsing failed', errors }, { status: 400 });
    }
    if (pokemon.length === 0) {
        return NextResponse.json({ error: 'No valid rows in CSV', errors }, { status: 400 });
    }
    if (pokemon.length > MAX_ENTRIES) {
        return NextResponse.json({ error: `Too many entries (${pokemon.length} > ${MAX_ENTRIES})` }, { status: 413 });
    }

    try {
        if (mode === 'replace') {
            await setCollection(username, pokemon, format);
        } else {
            await addPokemonBatch(username, pokemon, format);
        }
        const summary = await getCollectionSummary(username);
        return NextResponse.json({
            success: true,
            format,
            imported: pokemon.length,
            mode,
            errors,
            summary,
        });
    } catch (err) {
        console.error('[import-csv] Save error:', err);
        return NextResponse.json({ error: 'Failed to save collection' }, { status: 500 });
    }
}
