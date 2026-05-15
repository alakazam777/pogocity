// CSV parsers for PokeGenie and Calcy IV exports.
// Auto-detects format via header signature; falls back to a generic mode
// that just requires Name + (CP or Level).
//
// Output is a normalized Pokémon shape consumed by collectionStorage.

// ─── RFC-4180-ish CSV tokenizer ───
// Handles quoted fields, embedded commas/newlines, "" escapes.
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    // Strip BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    while (i < text.length) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
                inQuotes = false; i++; continue;
            }
            field += c; i++;
        } else {
            if (c === '"') { inQuotes = true; i++; continue; }
            if (c === ',') { row.push(field); field = ''; i++; continue; }
            if (c === '\r') { i++; continue; }
            if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
            field += c; i++;
        }
    }
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

// Normalize a header for fuzzy matching: lowercase + strip non-alphanumeric.
function normHeader(h) {
    return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Alias table mapping normalized headers → internal field name.
//
// PokeGenie iOS exports use locale-translated column names (FR/ES/etc.),
// so each field's alias list also covers the localized variants. Note that
// `normHeader` strips non-alphanumeric characters, so accents are removed
// before matching: "Déf IV" → "dfiv", "Rés IV" → "rsiv", "Poussières" → "poussires".
const HEADER_ALIASES = {
    // Identity
    name: ['name', 'pokemon', 'pokemonname', 'species', 'nom', 'nombre', 'nome'],
    nickname: ['nickname', 'customname', 'name1', 'displayname', 'surnom', 'apodo'],
    dexNumber: ['pokemonnumber', 'pokedexnumber', 'pokedex', 'dex', 'number', 'pokemonid', 'id',
                'nombrepokemon', 'numeropokemon', 'nopokemon', 'numpokemon', 'numerodex'],
    form: ['form', 'variant', 'forme', 'forma'],
    gender: ['gender', 'sex', 'sexe', 'genero'],
    // Combat
    cp: ['cp', 'combatpower', 'pc', 'puissancecombat', 'pccombat'],
    hp: ['hp', 'hitpoints', 'maxhp', 'pv', 'pointsdevie'],
    level: ['level', 'lvl', 'levelmin', 'minlevel',
            'niveau', 'niveaumin', 'niv', 'lv'],
    levelMax: ['levelmax', 'maxlevel', 'niveaumax'],
    // IVs (FR PokeGenie: "Atq IV" → "atqiv", "Déf IV" → "dfiv" after accent strip,
    //                   "Rés IV" → "rsiv", "IV Moyen" → "ivmoyen")
    ivAtk: ['atkiv', 'attackiv', 'attiv', 'iva', 'attack',
            'atqiv', 'attaqueiv'],
    ivDef: ['defiv', 'defenseiv', 'ivd', 'defense',
            'dfiv', 'defenceiv'],
    ivSta: ['staiv', 'staminaiv', 'hpiv', 'ivs', 'stamina',
            'rsiv', 'resiv', 'enduranceiv', 'resistanceiv'],
    ivPercent: ['ivavg', 'iv', 'ivpercent', 'ivpercentage', 'ivtotal',
                'ivmoyen', 'ivmoyenne', 'pourcentageiv', 'ivpromedio'],
    // Moves
    fastMove: ['quickmove', 'fastmove', 'fastattack', 'quickattack',
               'attaquerapide', 'attaquerap', 'ataquerap'],
    chargedMove: ['chargemove', 'chargedmove', 'chargeattack', 'specialmove', 'specialattack',
                  'chargemove1', 'chargedmove1',
                  'attaquecharge', 'attaquechargee'],
    chargedMove2: ['chargemove2', 'chargedmove2', 'specialmove2', 'secondchargemove',
                   'attaquecharge2', 'attaquechargee2'],
    // Physical
    weight: ['weight', 'weightkg', 'kg', 'poids'],
    height: ['height', 'heightm', 'taille', 'hauteur'],
    // Flags (PokeGenie FR: "Chanceux", "Obscur/Purifié" → "obscurpurifi", "Favori")
    lucky: ['lucky', 'chanceux', 'afortunado'],
    shiny: ['shiny', 'chromatique', 'cromatico', 'shundo'],
    shadow: ['shadow', 'shadowpurified', 'shadowstatus',
             'obscur', 'obscurpurifi', 'obscurpurifie', 'oscuro', 'oscuropurificado'],
    purified: ['purified', 'purifi', 'purifie', 'purificado'],
    favorite: ['favorite', 'favourite', 'fav', 'favori', 'favorito'],
    // Resources (PokeGenie FR: "Poussières" → "poussires" after accent strip)
    dust: ['dust', 'stardust', 'poussires', 'poussiere', 'polvoestelar'],
    candy: ['candy', 'bonbon', 'bonbons', 'caramelo'],
    // Dates (PokeGenie FR: "Date Attrapée" → "dateattrape")
    caughtDate: ['catchdate', 'caughtdate', 'datecaught', 'caught',
                 'dateattrape', 'datecapture', 'datacaptura'],
    scanDate: ['scandate', 'datescanned', 'lastscan',
               'dateanalyse', 'datadescaneo'],
    originalScanDate: ['originalscandate', 'firstscan',
                       'datedanalysedorigine', 'dateoriginedanalyse'],
};

// Build reverse lookup: normalized header → canonical field name
function buildHeaderMap(headers) {
    const map = {};
    for (let i = 0; i < headers.length; i++) {
        const norm = normHeader(headers[i]);
        if (!norm) continue;
        for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
            if (aliases.includes(norm)) {
                if (!(field in map)) map[field] = i;
                break;
            }
        }
    }
    return map;
}

// ─── Value parsers ───

function parseBool(v) {
    if (v === null || v === undefined) return false;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes' || s === 'y' || s === '✓' || s === 'x';
}

function parseInt0(v) {
    const n = parseInt(String(v).replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
}

function parseFloat0(v) {
    const n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
    return Number.isFinite(n) ? n : null;
}

function parseShadowField(v) {
    // Accepts EN ("Shadow"/"Purified"), FR ("Obscur"/"Purifié"), ES, plus
    // numeric 0/1 (some PokeGenie exports use "0" for "neither shadow nor purified").
    const s = String(v || '').trim().toLowerCase();
    if (s === 'shadow' || s === 'obscur' || s === 'oscuro') {
        return { shadow: true, purified: false };
    }
    if (s === 'purified' || s === 'purifi' || s === 'purifie' || s === 'purifié' || s === 'purificado') {
        return { shadow: false, purified: true };
    }
    if (s === '' || s === '0' || s === 'false' || s === 'no') {
        return { shadow: false, purified: false };
    }
    if (parseBool(s)) return { shadow: true, purified: false };
    return { shadow: false, purified: false };
}

function parseDate(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
}

function parseGender(v) {
    const s = String(v || '').trim().toLowerCase();
    if (s === 'm' || s === 'male' || s === '♂') return 'male';
    if (s === 'f' || s === 'female' || s === '♀') return 'female';
    if (s === '-' || s === 'genderless' || s === 'none') return 'genderless';
    return null;
}

// ─── Format detection ───

function detectFormat(headerMap, headers) {
    const norms = headers.map(normHeader);
    const has = (n) => norms.includes(n);

    // PokeGenie signature: Atk IV + Def IV + Sta IV all present as separate columns,
    // plus Pokemon Number or Pokedex.
    const hasSplitIVs = ('ivAtk' in headerMap) && ('ivDef' in headerMap) && ('ivSta' in headerMap);
    const hasPokeGenieMarkers = has('originalscandate') || has('levelmin') || has('levelmax');
    if (hasSplitIVs && (hasPokeGenieMarkers || 'dexNumber' in headerMap)) {
        return 'pokegenie';
    }

    // Calcy IV signature: typically has IV% (single percentage) without separate split,
    // and may include "Quickmove"/"Chargemove" without "Charge Move 2".
    const hasIVPercent = 'ivPercent' in headerMap;
    if (hasIVPercent && !hasSplitIVs) {
        return 'calcyiv';
    }

    // Calcy IV variant that DOES include split IVs but no PokeGenie markers
    if (hasSplitIVs && !hasPokeGenieMarkers) {
        return 'calcyiv';
    }

    return 'generic';
}

// ─── Main parser ───

/**
 * Parse a CSV string into an array of normalized Pokémon objects.
 *
 * @param {string} csvText - raw CSV content
 * @returns {{ format: string, pokemon: object[], errors: {row: number, message: string}[] }}
 */
export function parsePokemonCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') {
        return { format: 'invalid', pokemon: [], errors: [{ row: 0, message: 'Empty or invalid CSV input' }] };
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
        return { format: 'invalid', pokemon: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }] };
    }

    const headers = rows[0];
    const headerMap = buildHeaderMap(headers);

    if (!('name' in headerMap)) {
        return { format: 'invalid', pokemon: [], errors: [{ row: 0, message: 'CSV is missing a recognizable Name column' }] };
    }

    const format = detectFormat(headerMap, headers);
    const pokemon = [];
    const errors = [];

    const get = (row, field) => {
        const idx = headerMap[field];
        return idx === undefined ? '' : (row[idx] ?? '');
    };

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every((c) => !c || !String(c).trim())) continue;

        const name = String(get(row, 'name') || '').trim();
        if (!name) {
            errors.push({ row: r + 1, message: 'Missing Name' });
            continue;
        }

        const cp = parseInt0(get(row, 'cp'));
        const level = parseFloat0(get(row, 'level'));

        if (cp === null && level === null) {
            errors.push({ row: r + 1, message: `Row "${name}" has neither CP nor Level — skipped` });
            continue;
        }

        const ivAtk = parseInt0(get(row, 'ivAtk'));
        const ivDef = parseInt0(get(row, 'ivDef'));
        const ivSta = parseInt0(get(row, 'ivSta'));
        let ivPercent = parseFloat0(get(row, 'ivPercent'));
        if (ivPercent === null && ivAtk !== null && ivDef !== null && ivSta !== null) {
            ivPercent = Math.round(((ivAtk + ivDef + ivSta) / 45) * 1000) / 10;
        }

        const iv = (ivAtk !== null && ivDef !== null && ivSta !== null)
            ? { atk: ivAtk, def: ivDef, sta: ivSta, percent: ivPercent }
            : (ivPercent !== null ? { atk: null, def: null, sta: null, percent: ivPercent } : null);

        const shadowParsed = parseShadowField(get(row, 'shadow'));
        const purified = parseBool(get(row, 'purified')) || shadowParsed.purified;
        const shadow = shadowParsed.shadow && !purified;

        pokemon.push({
            dexNumber: parseInt0(get(row, 'dexNumber')),
            name,
            nickname: String(get(row, 'nickname') || '').trim() || null,
            form: String(get(row, 'form') || '').trim() || null,
            gender: parseGender(get(row, 'gender')),
            cp,
            hp: parseInt0(get(row, 'hp')),
            level,
            levelMax: parseFloat0(get(row, 'levelMax')),
            iv,
            fastMove: String(get(row, 'fastMove') || '').trim() || null,
            chargedMove: String(get(row, 'chargedMove') || '').trim() || null,
            chargedMove2: String(get(row, 'chargedMove2') || '').trim() || null,
            weight: parseFloat0(get(row, 'weight')),
            height: parseFloat0(get(row, 'height')),
            shiny: parseBool(get(row, 'shiny')),
            lucky: parseBool(get(row, 'lucky')),
            shadow,
            purified,
            favorite: parseBool(get(row, 'favorite')),
            dust: parseInt0(get(row, 'dust')),
            candy: parseInt0(get(row, 'candy')),
            caughtDate: parseDate(get(row, 'caughtDate')),
            originalScanDate: parseDate(get(row, 'originalScanDate')),
            tags: [],
        });
    }

    return { format, pokemon, errors };
}

// Exported for tests / advanced callers
export const _internals = { parseCSV, normHeader, buildHeaderMap, detectFormat };
