import { NextResponse } from 'next/server';

// Translate English time strings to French
function translateTime(time) {
    if (!time) return null;
    return time
        .replace(/just now/i, 'à l\'instant')
        .replace(/(\d+)\s*seconds?\s*ago/i, 'il y a $1 secondes')
        .replace(/(\d+)\s*minutes?\s*ago/i, 'il y a $1 minutes')
        .replace(/(\d+)\s*hours?\s*ago/i, 'il y a $1 heures')
        .replace(/(\d+)\s*days?\s*ago/i, 'il y a $1 jours')
        .replace(/(\d+)\s*weeks?\s*ago/i, 'il y a $1 semaines')
        .replace(/(\d+)\s*months?\s*ago/i, 'il y a $1 mois')
        .replace(/(\d+)\s*years?\s*ago/i, 'il y a $1 ans');
}

// Simple in-memory cache (5 min TTL, bounded size to prevent DoS)
// SECURITY: cache was previously unbounded — an attacker passing unique slugs
// could grow it indefinitely and OOM the process. We now both whitelist slug
// format (so the cache key space is tiny) and cap total entries as a belt.
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50; // plenty for ~18 legitimate Vivillon slugs

// Valid slugs use only lowercase letters and hyphens, max length 20.
// This matches every entry in src/data/prismillonForms.js and rejects
// traversal / cache-flooding / SSRF-via-slug attempts.
const SLUG_RE = /^[a-z-]{1,20}$/;

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
        return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }
    if (!SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const cached = cache.get(slug);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
        return NextResponse.json(cached.data);
    }

    try {
        const url = `https://www.pokemon-friends.eu/fr/vivillon/${slug}/`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            },
            next: { revalidate: 300 },
        });

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch', status: res.status }, { status: 502 });
        }

        const html = await res.text();

        // Parse table rows with code, country flag, and timestamp
        // The HTML has <tr> rows with: code, flag-icon-XX (country), and time text
        const entries = [];
        const seenEntries = new Set();

        // Try to extract structured rows: code + country + time
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(html)) !== null) {
            const rowHtml = rowMatch[1];

            // Extract friend code
            const codeMatch = rowHtml.match(/(\d{4}\s\d{4}\s\d{4})/);
            if (!codeMatch) continue;
            const code = codeMatch[1];
            if (seenEntries.has(code)) continue;
            seenEntries.add(code);

            // Extract country
            const flagMatch = rowHtml.match(/flag-icon-([a-z]{2})/i);
            const country = flagMatch ? flagMatch[1].toUpperCase() : null;

            // Extract time — strip HTML tags first, then look for time phrases
            const rowText = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
            const timeMatch = rowText.match(/(just now|il y a [^,]+?(?=\s*$|\s*,)|\d+\s*(?:minute|hour|heure|min|hr|jour|day|second|seconde|sec|month|mois|week|semaine|year|an|année)s?\s*ago)/i);
            const time = timeMatch ? timeMatch[1].trim() : null;

            entries.push({ code, country, time: translateTime(time) });
        }

        // Fallback: just extract raw codes
        if (entries.length === 0) {
            const codeRegex = /(\d{4}\s\d{4}\s\d{4})/g;
            let match;
            while ((match = codeRegex.exec(html)) !== null) {
                if (!seenEntries.has(match[1])) {
                    seenEntries.add(match[1]);
                    entries.push({ code: match[1], country: null, time: null });
                }
            }
        }

        const result = entries.slice(0, 20);

        // Evict oldest entry if cache is full (simple FIFO — Map preserves
        // insertion order, so the first key is the oldest).
        if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(slug)) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
        }
        cache.set(slug, { data: result, time: Date.now() });
        return NextResponse.json(result);
    } catch (err) {
        console.error('Vivillon API error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
