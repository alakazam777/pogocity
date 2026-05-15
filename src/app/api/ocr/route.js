import { NextResponse } from 'next/server';
import path from 'path';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifySession } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';

import { promises as fs } from 'fs';
import os from 'os';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// 10 OCR requests per 5 minutes per IP
const limiter = createRateLimiter('ocr', 10, 5 * 60 * 1000);

async function checkUserAuth() {
    const session = await getServerSession(authOptions);
    if (session) return true;
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;
    if (pogoSession) {
        const [user, token] = pogoSession.split(':');
        return await verifySession(user, token);
    }
    return false;
}

export async function POST(request) {
    if (!await checkUserAuth()) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
        }

        // Construct absolute path
        // imageUrl is like "/uploads/file.jpg"
        const filename = imageUrl.split('/').pop();

        // SECURITY: validate filename to prevent path traversal.
        // On Windows, path.join treats "\" as a separator, so a filename
        // like "..\\..\\secret.txt" would escape the uploads dir. We whitelist
        // only simple image filenames (word chars, dots, hyphens + image ext).
        if (!filename || !/^[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
            return NextResponse.json({ error: 'Invalid image filename' }, { status: 400 });
        }

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        const filePath = path.join(uploadsDir, filename);

        // Defense in depth: ensure the resolved path is still inside uploadsDir.
        // Catches anything the regex might have missed on exotic platforms.
        const resolvedPath = path.resolve(filePath);
        const resolvedUploads = path.resolve(uploadsDir);
        if (!resolvedPath.startsWith(resolvedUploads + path.sep) && resolvedPath !== resolvedUploads) {
            return NextResponse.json({ error: 'Invalid image path' }, { status: 400 });
        }

        // Preprocess image with Sharp for better OCR results
        const processedBuffer = await sharp(filePath)
            .resize({ width: 800, withoutEnlargement: false }) // 800px for speed
            .grayscale()
            .threshold(150) // Binarize for speed and contrast
            .toFormat('png')
            .toBuffer();

        // Use /tmp for cache in serverless environment
        const cachePath = path.join(os.tmpdir(), 'tesseract-cache');
        try { await fs.mkdir(cachePath, { recursive: true }); } catch (e) { }

        console.log('Starting Tesseract with cache at:', cachePath);

        // Only use 'eng' to speed up download/init. 
        // numbers are same. 'Level'/'Niveau' can be inferred if we loosen regex or just looking for patterns.
        const worker = await createWorker('eng', 1, {
            cachePath,
            logger: m => console.log(m) // helps debug in server logs
        });

        const ret = await worker.recognize(processedBuffer);
        const text = ret.data.text;
        await worker.terminate();

        // Parse Data
        const stats = parsePokemonStats(text);

        return NextResponse.json({
            success: true,
            stats,
            rawText: text
        });

    } catch (error) {
        // Log full details server-side only. Do NOT leak error.message to the
        // client — it can contain internal paths, sharp/tesseract internals, or
        // other implementation details useful to an attacker.
        console.error('OCR API Error:', error);
        return NextResponse.json({ error: 'Analyse OCR échouée' }, { status: 500 });
    }
}

function parsePokemonStats(text) {
    const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
    const stats = {};

    // Helper to find number in a line
    const extractNumber = (str) => {
        // Remove 'km' if present
        const cleanStr = str.replace(/km/gi, '').trim();

        // Match numbers like "27 700,8", "27,700.8", "27700"
        // We look for a sequence that looks like a number
        const matches = cleanStr.match(/(\d[\d\s.,]*)/g);
        if (!matches) return null;

        // Sort matches by length, assuming the longest is the stat
        const potentialNumbers = matches
            .map(m => m.trim())
            .filter(m => m.length > 0)
            .sort((a, b) => b.length - a.length);

        if (potentialNumbers.length === 0) return null;

        let bestMatch = potentialNumbers[0];
        // Replace spaces
        bestMatch = bestMatch.replace(/\s/g, '');
        // Replace comma with dot for float parsing
        bestMatch = bestMatch.replace(',', '.');

        // If multiple dots, keep last one as decimal? Or remove all if not decimal. 
        // 27.700 -> 27700 or 27.7? Standard is often no separators in POGO except maybe for decimal.
        // Actually POGO uses space for thousands in FR. "27 700".
        // Distance often has one decimal: "27 700,8 km".

        // Remove all dots if they aren't the last separator?
        // Let's just parse float.
        return parseFloat(bestMatch);
    };

    // Helper for specific patterns
    const findStat = (keywords) => {
        for (const line of lines) {
            if (keywords.some(k => line.includes(k))) {
                // Try to find number in this line
                let num = extractNumber(line);
                if (num !== null) return num;

                // Try next line (often the label is above the number)
                const index = lines.indexOf(line);
                if (index < lines.length - 1) {
                    num = extractNumber(lines[index + 1]);
                    if (num !== null) return num;
                }
                // Try prev line (rare but possible)
                if (index > 0) {
                    num = extractNumber(lines[index - 1]);
                    if (num !== null) return num;
                }
            }
        }
        return null;
    };

    // 1. XP (Most critical)
    // Often "Total XP 123 456" or "Total XP" then nextline "123 456"
    // Regex for XP specifically 
    const xpMatch = text.replace(/\s/g, '').match(/totalxp[:\s]*(\d+)/i) ||
        text.match(/total\s+xp\s*[:\s]*([\d\s]+)/i);

    if (xpMatch) {
        stats.xp = parseInt(xpMatch[1].replace(/\D/g, ''));
    } else {
        stats.xp = findStat(['total xp', 'xp total', 'expérience', 'experience']);
    }

    // 2. Level - Distinct pattern "Niveau 50"
    // Global regex often best for level
    const levelMatch = text.match(/(?:niveau|level|lvl|niv)[\s.:]*(\d{1,3})/i);
    if (levelMatch) {
        stats.level = parseInt(levelMatch[1]);
    } else {
        // Fallback: look for "Niveau" line and next line
        const nivIndex = lines.findIndex(l => /niveau|level/.test(l));
        if (nivIndex !== -1 && nivIndex < lines.length - 1) {
            const nextLineNum = extractNumber(lines[nivIndex + 1]);
            if (nextLineNum && nextLineNum < 100) stats.level = nextLineNum;
        }
    }

    // 3. Distance
    stats.distance = findStat(['distance', 'km', 'walked', 'marchée']);

    // 4. Caught
    stats.caught = findStat(['caught', 'attrapés', 'pokemon caught']);

    // 5. Stops
    stats.stops = findStat(['stops', 'visités', 'visited']);

    return stats;
}
