// Raid Screenshot Parser
// Extracts raid info from OCR text of Pokemon GO raid screenshots

import { POKEMON_DATA } from '@/data/pokemon';

// Build a lookup of French Pokemon names for fuzzy matching
const POKEMON_NAMES_FR = POKEMON_DATA.map(p => p.nameFr).filter(Boolean);

/**
 * Compute Levenshtein distance between two strings
 */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/**
 * Try to match OCR text to a known Pokemon name
 * Uses exact substring match first, then fuzzy matching
 */
export function matchPokemonName(ocrText) {
    if (!ocrText) return null;
    const text = ocrText.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿçœæ0-9\s'-]/gi, ' ');

    // 1. Exact substring match (case-insensitive)
    for (const name of POKEMON_NAMES_FR) {
        if (text.includes(name.toLowerCase())) {
            return name;
        }
    }

    // 2. Check each word/phrase against known names with fuzzy matching
    const words = text.split(/\s+/).filter(w => w.length > 2);
    let bestMatch = null;
    let bestDist = Infinity;

    for (const name of POKEMON_NAMES_FR) {
        const nameLower = name.toLowerCase();
        if (nameLower.length < 5) continue; // Skip short names to avoid false fuzzy matches

        // Try matching against sliding windows of words
        for (let i = 0; i < words.length; i++) {
            // Single word
            const dist1 = levenshtein(words[i], nameLower);
            const threshold = Math.max(1, Math.floor(nameLower.length * 0.3));
            if (dist1 <= threshold && dist1 < bestDist) {
                bestDist = dist1;
                bestMatch = name;
            }
            // Two-word combo
            if (i < words.length - 1) {
                const combo = words[i] + words[i + 1];
                const dist2 = levenshtein(combo, nameLower.replace(/[\s-]/g, ''));
                if (dist2 <= threshold && dist2 < bestDist) {
                    bestDist = dist2;
                    bestMatch = name;
                }
            }
        }
    }

    return bestMatch;
}

/**
 * Extract timer from OCR text
 * Raid screenshots show timers like "0:45:23" or "1:23:45"
 */
export function extractTimer(ocrText) {
    if (!ocrText) return null;

    // Pattern: H:MM:SS or HH:MM:SS or M:SS
    const timerPatterns = [
        /(\d{1,2})\s*[:;.]\s*(\d{2})\s*[:;.]\s*(\d{2})/,  // H:MM:SS
        /(\d{1,2})\s*[:;.]\s*(\d{2})/,                       // M:SS (shorter timer)
    ];

    for (const pattern of timerPatterns) {
        const match = ocrText.match(pattern);
        if (match) {
            if (match[3]) {
                // H:MM:SS
                const h = parseInt(match[1]);
                const m = parseInt(match[2]);
                const s = parseInt(match[3]);
                if (h <= 2 && m < 60 && s < 60) {
                    const totalSeconds = h * 3600 + m * 60 + s;
                    const endTime = new Date(Date.now() + totalSeconds * 1000);
                    return {
                        display: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
                        totalSeconds,
                        endTime
                    };
                }
            } else {
                // M:SS
                const m = parseInt(match[1]);
                const s = parseInt(match[2]);
                if (m < 60 && s < 60) {
                    const totalSeconds = m * 60 + s;
                    const endTime = new Date(Date.now() + totalSeconds * 1000);
                    return {
                        display: `${m}:${String(s).padStart(2, '0')}`,
                        totalSeconds,
                        endTime
                    };
                }
            }
        }
    }

    // Try to find a time in HH:MM format (raid tab in nearby shows hatch time)
    const timeMatch = ocrText.match(/(\d{1,2})\s*[h:]\s*(\d{2})/);
    if (timeMatch) {
        const h = parseInt(timeMatch[1]);
        const m = parseInt(timeMatch[2]);
        if (h < 24 && m < 60) {
            const target = new Date();
            target.setHours(h, m, 0, 0);
            // If the time is in the past, it's probably tomorrow
            if (target < new Date()) target.setDate(target.getDate() + 1);
            return {
                display: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                totalSeconds: Math.floor((target - Date.now()) / 1000),
                endTime: target,
                isAbsoluteTime: true
            };
        }
    }

    return null;
}

/**
 * Clean a gym name string: remove OCR artifacts while preserving the real name
 */
function cleanGymName(raw) {
    if (!raw) return raw;
    return raw
        // Remove leading/trailing non-letter chars (quotes, =, +, @, #, *, etc.)
        .replace(/^[^a-zA-ZÀ-ÿ0-9(]+/, '')
        .replace(/[^a-zA-ZÀ-ÿ0-9.)!']+$/, '')
        // Remove trailing single isolated letter (OCR artifact like "Arc e" → "Arc")
        .replace(/\s+[a-zA-ZÀ-ÿ]$/, '')
        // Collapse multiple spaces
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Extract gym name from OCR text (typically the top region)
 */
export function extractGymName(ocrText) {
    if (!ocrText) return null;

    const lines = ocrText.split('\n')
        .map(l => cleanGymName(l))
        .filter(l => l && l.length > 2);

    // Filter out common OCR noise and game UI text
    const noisePatterns = [
        /^raid$/i, /raid\s*d'elite/i, /arene\s*de\s*raid/i, /ar[eè]ne\s*de/i,
        /^combat$/i, /^PC\s/i, /^CP\s/i, /^\d+:\d+/, /^niveau/i, /^level/i,
        /^ar$/i, /^TCA$/i, /^\d+$/, /^[a-z]{1,2}$/i, /^Camm/i, /^pea$/i,
        /^Notre-Dame/i  // Partial noise — handled via longest line logic
    ];

    // Score each line: prefer longer lines that look like real gym names
    let bestLine = null;
    let bestScore = 0;

    for (const line of lines) {
        if (noisePatterns.some(p => p.test(line))) continue;
        if (line.length < 4) continue;

        // Score: length + bonus for capital letters (proper nouns = gym names)
        let score = line.length;
        const capitalWords = (line.match(/[A-ZÀ-Ÿ][a-zà-ÿ]+/g) || []).length;
        score += capitalWords * 3;

        // Penalty for too many non-letter chars (OCR noise)
        const nonLetterRatio = (line.replace(/[a-zA-ZÀ-ÿ\s'-]/g, '').length) / line.length;
        if (nonLetterRatio > 0.3) continue; // Skip lines with >30% junk chars

        if (score > bestScore) {
            bestScore = score;
            bestLine = line;
        }
    }

    return bestLine || lines[0] || null;
}

/**
 * Extract CP value from OCR text
 */
export function extractCP(ocrText) {
    if (!ocrText) return null;

    // Look for "PC 12345" or "CP 12345" pattern
    const cpMatch = ocrText.match(/(?:PC|CP)\s*(\d[\d\s]*\d)/i);
    if (cpMatch) {
        return parseInt(cpMatch[1].replace(/\s/g, ''));
    }

    // Look for large standalone numbers that could be CP
    // Raid boss CP is typically 5000+ (T1) to 60000+ (T5/Mega)
    // Only match 5+ digit standalone numbers to avoid OCR noise
    const numbers = [...ocrText.matchAll(/\b(\d{5,6})\b/g)].map(m => parseInt(m[1]));
    if (numbers.length > 0) {
        return Math.max(...numbers);
    }

    return null;
}

/**
 * Infer raid tier from CP value
 */
export function inferRaidTier(cp) {
    if (!cp) return null;
    if (cp < 5000) return 1;
    if (cp < 15000) return 3;
    if (cp < 30000) return 4; // Mega
    return 5; // Legendary
}

/**
 * Detect if screenshot shows an egg (pre-hatch) vs active raid boss
 * Egg screenshots: show a timer counting down to hatch, no Pokemon name/CP
 * Active raid: show Pokemon name, CP, timer counting down to disappearance
 *
 * IMPORTANT: Only use CP and exact substring match (not fuzzy) for type detection
 * to avoid false positives from OCR noise on egg screenshots.
 */
export function detectRaidType(fullText) {
    if (!fullText) return 'unknown';
    const text = fullText.toLowerCase();

    // CP is the strongest indicator of an active raid
    const hasCP = /\b(pc|cp)\s*\d/i.test(text);
    if (hasCP) return 'active';

    // Only use EXACT substring match for Pokemon name detection (no fuzzy)
    // This prevents OCR garbage from matching short Pokemon names like "Coxy"
    let hasExactPokemonName = false;
    for (const name of POKEMON_NAMES_FR) {
        if (name.length >= 5 && text.includes(name.toLowerCase())) {
            hasExactPokemonName = true;
            break;
        }
    }
    if (hasExactPokemonName) return 'active';

    // No CP and no confident Pokemon name → egg
    return 'egg';
}

/**
 * Infer egg tier from visual cues in OCR text
 * In Pokemon GO: pink egg = T1, yellow egg = T3, dark blue egg = T5, mega egg = mega
 */
export function inferEggTier(fullText) {
    if (!fullText) return null;
    const text = fullText.toLowerCase();

    // Look for star indicators
    const starMatch = text.match(/(\d)\s*(?:star|etoile|étoile|\*)/i);
    if (starMatch) return parseInt(starMatch[1]);

    // Look for tier level text
    if (/mega|méga/i.test(text)) return 'mega';
    if (/légendaire|legendary|legendaire/i.test(text)) return 5;

    return null;
}

/**
 * Determine if OCR text looks like a raid screenshot
 * Returns a confidence score 0-1
 */
export function isRaidScreenshot(allText) {
    if (!allText) return 0;
    const text = allText.toLowerCase();

    let score = 0;
    // Strong indicators
    if (/raid/i.test(text)) score += 0.3;
    if (/\b(pc|cp)\s*\d/i.test(text)) score += 0.3;
    if (/\d:\d{2}:\d{2}/.test(text)) score += 0.2;  // Timer pattern
    if (/\d:\d{2}/.test(text)) score += 0.1;

    // Pokemon name found
    if (matchPokemonName(text)) score += 0.3;

    // Egg indicators also count
    if (/\b(oeuf|egg|œuf)\b/i.test(text)) score += 0.2;

    // Weak indicators
    if (/combat/i.test(text)) score += 0.1;
    if (/arene|arène|gym/i.test(text)) score += 0.1;

    return Math.min(score, 1);
}

/**
 * Main parsing function: takes region-specific OCR results and produces structured raid info
 */
export function parseRaidInfo({ gymText, pokemonText, timerText, fullText }) {
    const info = {};

    // Detect raid type: egg (pre-hatch) or active (boss visible)
    info.raidType = detectRaidType(fullText);

    // Gym name (from top region)
    info.gymName = extractGymName(gymText) || extractGymName(fullText) || 'Arene inconnue';

    // CP
    info.cp = extractCP(pokemonText) || extractCP(fullText);

    // If CP was found but type was classified as egg, correct to active
    if (info.raidType === 'egg' && info.cp) {
        info.raidType = 'active';
    }

    // Pokemon name (only for active raids — skip for eggs to avoid false OCR matches)
    if (info.raidType === 'egg') {
        info.pokemonName = null;
    } else {
        info.pokemonName = matchPokemonName(pokemonText) || matchPokemonName(fullText) || null;
    }

    // Timer
    const timer = extractTimer(timerText) || extractTimer(fullText);
    if (timer) {
        info.timeRemaining = timer.display;
        if (info.raidType === 'egg') {
            // For eggs, timer = time until hatch → hatchTime
            info.hatchTime = timer.endTime;
            // Raid ends ~45 min after hatch
            info.endTime = new Date(timer.endTime.getTime() + 45 * 60 * 1000);
        } else {
            // For active raids, timer = time until disappearance
            info.endTime = timer.endTime;
        }
        info.isAbsoluteTime = timer.isAbsoluteTime || false;
    }

    // Raid tier
    if (info.cp) {
        info.tier = inferRaidTier(info.cp);
    } else {
        info.tier = inferEggTier(fullText);
    }

    // Confidence check
    info.confidence = isRaidScreenshot(fullText);

    // Get Pokemon sprite if matched
    if (info.pokemonName) {
        const pokemon = POKEMON_DATA.find(p => p.nameFr === info.pokemonName);
        if (pokemon) {
            info.pokemonId = pokemon.id;
            info.pokemonSprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
        }
    }

    return info;
}
