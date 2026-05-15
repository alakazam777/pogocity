import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { DATA_DIR } from '@/lib/dataPath';

// PogoSphere et PogoPoitiers partagent la même base utilisateurs (via
// POGO_DATA_DIR), mais chacun a historiquement servi ses uploads depuis son
// propre dossier `public/uploads/`. Résultat : les avatars uploadés depuis
// PogoPoitiers (ex. stevypa, Ares16700) renvoient 404 sur sphere.pogopoitiers.fr.
//
// Fix : on essaie d'abord le dossier local, puis on retombe sur le dossier
// partagé situé à côté de DATA_DIR (= pogopoitiers/public/uploads). Comme ça
// les anciens avatars PogoPoitiers s'affichent aussi sur PogoSphere.
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const SHARED_UPLOAD_DIR = path.resolve(DATA_DIR, '..', 'public', 'uploads');

export async function GET(request, { params }) {
    // In Next.js 15+, params is a Promise
    const { filename } = await params;

    // Security: Prevent directory traversal
    const safeFilename = path.basename(filename);

    // Try local first, then the shared PogoPoitiers folder. Both are read-only
    // here so the order is purely about freshness — local uploads (newer ones
    // made via this app) take precedence.
    const candidatePaths = [
        path.join(LOCAL_UPLOAD_DIR, safeFilename),
        path.join(SHARED_UPLOAD_DIR, safeFilename),
    ];

    for (const filePath of candidatePaths) {
        try {
            const fileBuffer = await fs.readFile(filePath);

            // Determine content type
            let contentType = 'image/jpeg';
            const lower = safeFilename.toLowerCase();
            if (lower.endsWith('.png')) contentType = 'image/png';
            else if (lower.endsWith('.webp')) contentType = 'image/webp';
            else if (lower.endsWith('.gif')) contentType = 'image/gif';

            return new NextResponse(fileBuffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            });
        } catch (err) {
            if (err?.code !== 'ENOENT') {
                // Real I/O error — log and keep trying the next candidate.
                console.error(`Error reading ${filePath}:`, err);
            }
            // ENOENT → try next candidate path silently.
        }
    }

    return new NextResponse('File not found', { status: 404 });
}
