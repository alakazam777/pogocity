// Dynamic sitemap. Lists every public, indexable route on pogosphere.com
// — static pages + the 60-odd public trainer profiles at /u/[username]
// and /trainers/[username]. Pulls usernames from the shared pokemon_users
// data file so newly-registered trainers appear in the sitemap on the
// next crawl without manual edits.
//
// Routes deliberately EXCLUDED:
//   – /admin/*           (private)
//   – /account-deletion  (auth-required)
//   – /api/*             (no SEO value)
//   – /uploads/*         (private user uploads)
//   – /manager           (admin tool)
//   – /en, /fr, /ja      (language redirects, canonical lives at /)
//
// If you add a new public top-level route, append it to STATIC_ROUTES
// below with a sensible priority/changeFrequency.

import fs from 'fs';
import path from 'path';
import cityConfig from '@/lib/cityConfig';

const BASE_URL = `https://${cityConfig.domain}`;

const STATIC_ROUTES = [
    { path: '',                    priority: 1.0, changeFrequency: 'weekly' },
    { path: '/rankings',           priority: 0.9, changeFrequency: 'daily' },
    { path: '/trades',             priority: 0.9, changeFrequency: 'daily' },
    { path: '/events',             priority: 0.9, changeFrequency: 'daily' },
    { path: '/community',          priority: 0.85, changeFrequency: 'weekly' },
    { path: '/trainers',           priority: 0.85, changeFrequency: 'daily' },
    { path: '/directory',          priority: 0.8, changeFrequency: 'weekly' },
    { path: '/friend-codes',       priority: 0.8, changeFrequency: 'weekly' },
    { path: '/globe',              priority: 0.8, changeFrequency: 'weekly' },
    { path: '/regionals',          priority: 0.75, changeFrequency: 'monthly' },
    { path: '/regionals2',         priority: 0.7, changeFrequency: 'monthly' },
    { path: '/attackers',          priority: 0.75, changeFrequency: 'monthly' },
    { path: '/attackers-dynamax',  priority: 0.7, changeFrequency: 'monthly' },
    { path: '/attackers-rocket',   priority: 0.7, changeFrequency: 'monthly' },
    { path: '/pokematos',          priority: 0.7, changeFrequency: 'monthly' },
    { path: '/photos',             priority: 0.65, changeFrequency: 'weekly' },
    { path: '/box',                priority: 0.65, changeFrequency: 'weekly' },
    { path: '/presentations',      priority: 0.65, changeFrequency: 'weekly' },
    { path: '/trainers/lointaines-contrees', priority: 0.6, changeFrequency: 'weekly' },
    { path: '/campfire',           priority: 0.5, changeFrequency: 'monthly' },
    { path: '/privacy',            priority: 0.3, changeFrequency: 'yearly' },
    { path: '/terms',              priority: 0.3, changeFrequency: 'yearly' },
];

// Resolve the path to this install's pokemon_users.json. POGO_DATA_DIR
// can override the location; by default it's the local ./data folder.
// If the file doesn't exist (eg. fresh install, CI build), we just
// emit the static routes.
function loadPublicUsernames() {
    const dataDir = process.env.POGO_DATA_DIR || path.resolve(process.cwd(), 'data');
    const file = path.join(dataDir, 'pokemon_users.json');
    try {
        if (!fs.existsSync(file)) return [];
        const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Object.values(raw)
            .filter(u => u && u.username && !u.private && !u.deleted)
            .map(u => u.username);
    } catch (e) {
        console.warn('[sitemap] could not load users for /u/* entries:', e.message);
        return [];
    }
}

export default function sitemap() {
    const now = new Date();
    const usernames = loadPublicUsernames();

    const staticEntries = STATIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
        url: `${BASE_URL}${path}`,
        lastModified: now,
        changeFrequency,
        priority,
    }));

    // Two URL shapes per user: /u/<name> (compact) and /trainers/<name>
    // (canonical-ish, links from rankings). Both are real routes and
    // both should be indexed so Google can pick whichever it prefers.
    const userEntries = usernames.flatMap(username => [
        {
            url: `${BASE_URL}/u/${encodeURIComponent(username)}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.55,
        },
        {
            url: `${BASE_URL}/trainers/${encodeURIComponent(username)}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.6,
        },
    ]);

    return [...staticEntries, ...userEntries];
}
