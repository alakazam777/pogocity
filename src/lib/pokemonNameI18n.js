// Helpers to translate Pokémon names that appear in the rankings page.
// Input names are French (from topPokemon.js). Handles:
//   - base lookup via POKEMON_DATA (nameFr → nameEn / nameJp)
//   - parenthetical form suffixes like "Smogogo (Galar)"
//   - multi-parenthetical like "Feunard (Alola) (Obscur)"
//   - Méga-/Primo- prefix forms, including "Méga-Dracaufeu X/Y"
//   - small alias table for FR spelling drift in topPokemon.js

import { POKEMON_DATA } from '@/data/pokemon';
import {
    formSuffixTranslations,
    megaPrefixTranslations,
    primalPrefixTranslations,
} from '@/data/pokemonFormTranslations';

const norm = (s) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s'’-]/g, '');

// topPokemon.js sometimes stores names with missing accents, english spellings,
// or drifted variants. Map those to the canonical FR name in POKEMON_DATA.
const frAliases = {
    'flabebe': 'Flabébé',
    'morpheo': 'Morphéo',
    'nanmeoui': 'Nanméouïe',
    'heledelle': 'Hélédelle',
    'couafarel': 'Couaffarel',
    'golgopthe': 'Golgopathe',
    'golgothpe': 'Golgopathe',
    'golgopex': 'Golgopathe',
    'spectrival': 'Spectreval',
    'eternatos': 'Éthernatos',
    'qwilepik': 'Qwilpik',
    'aerodactyl': 'Ptéra',
    'farfetchd': 'Canarticho',
    'farfetch': 'Canarticho',
    'sirfetchd': 'Palarticho',
    'elecsprint': 'Élecsprint',
    'balekaze': 'Balbalèze',
    'oniglaline': 'Oniglali',
};

let frToEntry = null;
function getFrMap() {
    if (frToEntry) return frToEntry;
    frToEntry = new Map();
    for (const p of POKEMON_DATA) {
        if (p.nameFr) frToEntry.set(norm(p.nameFr), p);
        // Also index by nameEn so opponent lookups with English raw names work.
        if (p.nameEn) frToEntry.set(norm(p.nameEn), p);
    }
    return frToEntry;
}

function lookupFr(frBase) {
    const n = norm(frBase);
    const direct = getFrMap().get(n);
    if (direct) return direct;
    const alias = frAliases[n];
    if (alias) return getFrMap().get(norm(alias)) || null;
    return null;
}

function pickLangName(entry, lang) {
    if (!entry) return null;
    if (lang === 'en') return entry.nameEn || entry.nameFr;
    if (lang === 'ja') return entry.nameJp || entry.nameFr;
    return entry.nameFr || entry.nameEn;
}

function translateFormSuffix(frSuffixRaw, lang) {
    if (!frSuffixRaw) return '';
    const key = frSuffixRaw.trim().toLowerCase();
    const entry = formSuffixTranslations[key];
    if (!entry) return frSuffixRaw;
    return entry[lang] || entry.fr || frSuffixRaw;
}

// Strip a trailing letter variant like " X" or " Y" from "Dracaufeu X".
// Returns { base: 'Dracaufeu', variant: ' X' } (variant may be empty).
function splitTrailingLetterVariant(name) {
    const m = name.match(/^(.+?)(\s+[A-Z])$/);
    if (m) return { base: m[1], variant: m[2] };
    return { base: name, variant: '' };
}

/**
 * Translate a Pokémon name from French to the target language.
 * Handles base names, parenthetical forms, Méga-/Primo- prefixes,
 * multi-parenthetical forms and trailing X/Y letter variants.
 * Falls back to the original FR string when no lookup matches.
 */
export function translatePokemonName(frName, lang) {
    if (!frName || lang === 'fr') return frName;

    // Méga-/Primo- prefix
    const megaMatch = frName.match(/^Méga-(.+)$/);
    if (megaMatch) {
        const { base, variant } = splitTrailingLetterVariant(megaMatch[1]);
        const baseTranslated = translatePokemonName(base, lang);
        const prefix = megaPrefixTranslations[lang] || megaPrefixTranslations.fr;
        return prefix + baseTranslated + variant;
    }
    const primalMatch = frName.match(/^Primo-(.+)$/);
    if (primalMatch) {
        const { base, variant } = splitTrailingLetterVariant(primalMatch[1]);
        const baseTranslated = translatePokemonName(base, lang);
        const prefix = primalPrefixTranslations[lang] || primalPrefixTranslations.fr;
        return prefix + baseTranslated + variant;
    }

    // Parenthetical form — greedy so the LAST "(...)" becomes the outer suffix,
    // allowing multi-paren names like "Feunard (Alola) (Obscur)" to recurse.
    const parenMatch = frName.match(/^(.+)\s*\(([^)]+)\)\s*$/);
    if (parenMatch) {
        const base = parenMatch[1].trim();
        const suffix = parenMatch[2].trim();
        const translatedBase = translatePokemonName(base, lang);
        const translatedSuffix = translateFormSuffix(suffix, lang);
        if (!translatedSuffix) return translatedBase;
        // English regional variants read naturally as prefixes: "Galarian Slowbro"
        if (lang === 'en' && /^(Alolan|Galarian|Hisuian|Paldean)$/.test(translatedSuffix)) {
            return `${translatedSuffix} ${translatedBase}`;
        }
        if (lang === 'ja' && /^(アローラ|ガラル|ヒスイ|パルデア)$/.test(translatedSuffix)) {
            return `${translatedSuffix}${translatedBase}`;
        }
        // Shadow form reads more naturally as a prefix too.
        if (lang === 'en' && translatedSuffix === 'Shadow') {
            return `Shadow ${translatedBase}`;
        }
        if (lang === 'ja' && translatedSuffix === 'シャドウ') {
            return `シャドウ${translatedBase}`;
        }
        return `${translatedBase} (${translatedSuffix})`;
    }

    // Plain name lookup (with alias fallback and X/Y variant stripping)
    const entry = lookupFr(frName);
    if (entry) return pickLangName(entry, lang);
    const { base, variant } = splitTrailingLetterVariant(frName);
    if (variant) {
        const baseEntry = lookupFr(base);
        if (baseEntry) return pickLangName(baseEntry, lang) + variant;
    }
    return frName;
}
