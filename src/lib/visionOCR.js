import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { consumeQuota } from './visionQuota.js';
import { POKEMON_DATA } from '@/data/pokemon';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Pokédex#-keyed name lookup, built once at module load.
// Resolves the "nickname problem": OCR reads the user's custom name (e.g. "Sparky"),
// but the # in the corner of the PoGo screen lets us recover the species name.
const DEX_TO_NAMES = new Map();
for (const p of POKEMON_DATA) {
    DEX_TO_NAMES.set(p.id, { fr: p.nameFr, en: p.nameEn, ja: p.nameJp });
}

/**
 * Analyze a Pokémon screenshot, returning detected text + parsed stats.
 * Tries Google Cloud Vision first (better accuracy), falls back to Tesseract.
 *
 * @param {Buffer} imageBuffer - raw image bytes
 * @param {{ lang?: 'fr'|'en' }} opts
 * @returns {Promise<{ source: 'vision'|'tesseract', text: string, stats: object, quota?: object }>}
 */
export async function analyzeScreenshot(imageBuffer, opts = {}) {
    const lang = opts.lang || 'fr';

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    let visionResult = null;

    if (apiKey) {
        const quota = await consumeQuota();
        if (quota.granted) {
            try {
                const text = await runVisionOCR(imageBuffer, apiKey);
                visionResult = { source: 'vision', text, stats: parsePokemonScreen(text, lang), quota };
            } catch (err) {
                console.warn('[visionOCR] Vision API failed, falling back to Tesseract:', err.message);
                visionResult = null;
            }
        }
        // If quota.granted === false → fall through to Tesseract silently.
    }

    if (visionResult) return visionResult;

    const text = await runTesseractOCR(imageBuffer);
    return { source: 'tesseract', text, stats: parsePokemonScreen(text, lang) };
}

// ─── Vision API call ───

async function runVisionOCR(imageBuffer, apiKey) {
    const base64 = imageBuffer.toString('base64');
    const body = {
        requests: [{
            image: { content: base64 },
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
    };

    const res = await fetch(`${VISION_API_URL}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Vision API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = await res.json();
    const text = json.responses?.[0]?.fullTextAnnotation?.text || '';
    if (!text) throw new Error('Empty Vision API response');
    return text;
}

// ─── Tesseract fallback ───

async function runTesseractOCR(imageBuffer) {
    const processed = await sharp(imageBuffer)
        .resize({ width: 800, withoutEnlargement: false })
        .grayscale()
        .threshold(150)
        .toFormat('png')
        .toBuffer();

    const cachePath = path.join(os.tmpdir(), 'tesseract-cache');
    try { await fs.mkdir(cachePath, { recursive: true }); } catch { }

    const worker = await createWorker('eng', 1, { cachePath });
    try {
        const { data } = await worker.recognize(processed);
        return data.text || '';
    } finally {
        await worker.terminate();
    }
}

// ─── Pokémon screen parser ───

const NUM = /[\d]+(?:[.,][\d]+)?/;

function toNumber(s) {
    if (!s) return null;
    const cleaned = String(s).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

/**
 * Parse a PoGo Pokémon-detail screenshot's OCR text into structured stats.
 * Heuristic — designed to fail gracefully (returns null for missing fields).
 *
 * @param {string} text
 * @param {'fr'|'en'} lang
 * @returns {{ name, cp, hp, hpMax, weight, height, fastMove, chargedMove, typeHints }}
 */
export function parsePokemonScreen(text, lang = 'fr') {
    const stats = {
        name: null,
        nickname: null,
        dexNumber: null,
        cp: null,
        hp: null,
        hpMax: null,
        weight: null,
        height: null,
        fastMove: null,
        chargedMove: null,
        typeHints: [],
    };
    if (!text) return stats;

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const lower = lines.map((l) => l.toLowerCase());
    const joined = text.toLowerCase();

    // CP / PC — keyword + number, or fallback to first 3-5 digit number on early lines.
    const cpMatch = joined.match(/(?:^|\s)(?:pc|cp)\s*[:\s]?\s*(\d{2,5})/i);
    if (cpMatch) stats.cp = parseInt(cpMatch[1], 10);
    if (stats.cp === null) {
        for (const l of lines.slice(0, 5)) {
            const m = l.match(/^\s*(\d{3,5})\s*$/);
            if (m) { stats.cp = parseInt(m[1], 10); break; }
        }
    }

    // HP / PV — pattern "X / Y" or "PV X / Y"
    const hpMatch = joined.match(/(?:pv|hp|ps)\s*[:\s]?\s*(\d{1,4})\s*\/\s*(\d{1,4})/i)
        || joined.match(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/);
    if (hpMatch) {
        stats.hp = parseInt(hpMatch[1], 10);
        stats.hpMax = parseInt(hpMatch[2], 10);
    }

    // Weight — "Poids 122,00 kg" or "Weight 122.00 kg"
    const weightMatch = joined.match(/(?:poids|weight|peso|gewicht)[:\s]*(\d+(?:[.,]\d+)?)\s*kg/i)
        || joined.match(/(\d+(?:[.,]\d+)?)\s*kg\b/i);
    if (weightMatch) stats.weight = toNumber(weightMatch[1]);

    // Height — "Taille 2,00 m" or "Height 2.00 m"
    const heightMatch = joined.match(/(?:taille|height|altura|grösse|grosse)[:\s]*(\d+(?:[.,]\d+)?)\s*m\b/i)
        || joined.match(/(\d+(?:[.,]\d+)?)\s*m\s*(?:$|\n)/im);
    if (heightMatch) stats.height = toNumber(heightMatch[1]);

    // Name — first line that's mostly letters and not a label/keyword
    const labelKeywords = ['pc', 'cp', 'pv', 'hp', 'poids', 'weight', 'taille', 'height',
                           'attaque', 'attack', 'defense', 'défense', 'endurance', 'stamina',
                           'transférer', 'transfer', 'pokédex', 'pokedex', 'evolve', 'évolution',
                           'puissance', 'power'];
    for (const l of lines) {
        const cleaned = l.replace(/[^\p{L}\s']/gu, '').trim();
        if (!cleaned || cleaned.length < 3) continue;
        const lc = cleaned.toLowerCase();
        if (labelKeywords.some((k) => lc.includes(k))) continue;
        if (/^\d/.test(l)) continue;
        if (cleaned.length > 30) continue;
        stats.name = cleaned;
        break;
    }

    // Pokédex# — shown as "n° 149" on French screens, "#149"/"No. 149" on English.
    // When found, the canonical species name overrides whatever OCR detected
    // (which may have been the user's nickname). The OCR name becomes the nickname
    // if it differs from the canonical name.
    const dexMatch = text.match(/n°\s*(\d{1,4})/i)
        || text.match(/#\s*(\d{1,4})/)
        || text.match(/no\.?\s*(\d{1,4})/i);
    if (dexMatch) {
        const dexNum = parseInt(dexMatch[1], 10);
        if (dexNum > 0 && dexNum <= 1025) {
            const names = DEX_TO_NAMES.get(dexNum);
            if (names) {
                stats.dexNumber = dexNum;
                const canonical = names[lang] || names.en;
                if (stats.name && canonical && stats.name.toLowerCase() !== canonical.toLowerCase()) {
                    stats.nickname = stats.name;
                }
                if (canonical) stats.name = canonical;
            }
        }
    }

    // Type hints — scan for type keywords (rough; types are usually icons not text,
    // but Pokédex entries sometimes include them).
    const typeKeywords = lang === 'fr'
        ? ['feu', 'eau', 'plante', 'electrik', 'électrik', 'glace', 'combat', 'poison', 'sol',
           'vol', 'psy', 'insecte', 'roche', 'spectre', 'dragon', 'ténèbres', 'tenebres',
           'acier', 'fée', 'fee', 'normal']
        : ['fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
           'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'normal'];
    for (const k of typeKeywords) {
        if (joined.includes(k)) stats.typeHints.push(k);
    }
    stats.typeHints = [...new Set(stats.typeHints)].slice(0, 2);

    return stats;
}

export const _internals = { runVisionOCR, runTesseractOCR };
