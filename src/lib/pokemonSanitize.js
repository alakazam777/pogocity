// Shared input sanitization for Pokémon collection writes.
// Used by both the create endpoint (full payload) and the patch endpoint
// (partial updates) so the validation rules stay in lockstep.

const str = (v, max = 100) =>
    typeof v === 'string' ? v.trim().slice(0, max) : null;

const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
};

const numBound = (v, min, max) => {
    const x = num(v);
    if (x === null) return null;
    if (x < min || x > max) return null;
    return x;
};

const bool = (v) => v === true || v === 'true' || v === 1;

const inRangeIv = (v) => v === null || (v >= 0 && v <= 15);

function sanitizeIv(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const atk = num(raw.atk);
    const def = num(raw.def);
    const sta = num(raw.sta);
    const percent = num(raw.percent);
    if (!inRangeIv(atk) || !inRangeIv(def) || !inRangeIv(sta)) return null;
    if (atk === null && def === null && sta === null && percent === null) return null;
    return {
        atk, def, sta,
        percent: percent !== null ? percent
            : (atk !== null && def !== null && sta !== null
                ? Math.round(((atk + def + sta) / 45) * 1000) / 10
                : null),
    };
}

function sanitizeTags(raw) {
    if (!Array.isArray(raw)) return null;
    return raw.map((t) => str(t, 30)).filter(Boolean).slice(0, 20);
}

function sanitizeTypes(raw) {
    if (!Array.isArray(raw)) return null;
    return raw.map((t) => str(t, 20)).filter(Boolean).slice(0, 2);
}

const FIELD_PROCESSORS = {
    name: (v) => str(v, 60),
    nickname: (v) => str(v, 30),
    form: (v) => str(v, 30),
    dexNumber: (v) => numBound(v, 1, 9999),
    cp: (v) => numBound(v, 0, 99999),
    hp: (v) => numBound(v, 0, 9999),
    level: (v) => numBound(v, 0, 100),
    weight: (v) => numBound(v, 0, 10000),
    height: (v) => numBound(v, 0, 100),
    gender: (v) => ['male', 'female', 'genderless'].includes(v) ? v : null,
    iv: sanitizeIv,
    fastMove: (v) => str(v, 40),
    chargedMove: (v) => str(v, 40),
    chargedMove2: (v) => str(v, 40),
    types: sanitizeTypes,
    shiny: bool,
    lucky: bool,
    shadow: bool,
    purified: bool,
    favorite: bool,
    caughtDate: (v) => str(v, 30),
    tags: sanitizeTags,
    source: (v) => ['ocr', 'manual', 'pokegenie', 'calcyiv', 'generic'].includes(v) ? v : null,
};

/**
 * Full sanitization for a brand-new Pokémon being added.
 * Returns the complete normalized object, or null if name is missing.
 */
export function sanitizeForCreate(p) {
    if (!p || typeof p !== 'object') return null;
    const name = str(p.name, 60);
    if (!name) return null;
    return {
        name,
        nickname: FIELD_PROCESSORS.nickname(p.nickname),
        form: FIELD_PROCESSORS.form(p.form),
        dexNumber: FIELD_PROCESSORS.dexNumber(p.dexNumber),
        gender: FIELD_PROCESSORS.gender(p.gender),
        cp: FIELD_PROCESSORS.cp(p.cp),
        hp: FIELD_PROCESSORS.hp(p.hp),
        level: FIELD_PROCESSORS.level(p.level),
        iv: FIELD_PROCESSORS.iv(p.iv),
        fastMove: FIELD_PROCESSORS.fastMove(p.fastMove),
        chargedMove: FIELD_PROCESSORS.chargedMove(p.chargedMove),
        chargedMove2: FIELD_PROCESSORS.chargedMove2(p.chargedMove2),
        types: FIELD_PROCESSORS.types(p.types) || [],
        weight: FIELD_PROCESSORS.weight(p.weight),
        height: FIELD_PROCESSORS.height(p.height),
        shiny: FIELD_PROCESSORS.shiny(p.shiny),
        lucky: FIELD_PROCESSORS.lucky(p.lucky),
        shadow: FIELD_PROCESSORS.shadow(p.shadow),
        purified: FIELD_PROCESSORS.purified(p.purified),
        favorite: FIELD_PROCESSORS.favorite(p.favorite),
        caughtDate: FIELD_PROCESSORS.caughtDate(p.caughtDate),
        tags: FIELD_PROCESSORS.tags(p.tags) || [],
        source: FIELD_PROCESSORS.source(p.source) || 'manual',
    };
}

/**
 * Partial sanitization — only keys present in `updates` are processed.
 * Returns a subset object suitable for `Object.assign(existing, sanitized)`.
 * Returns null if input is unusable.
 */
export function sanitizeForPatch(updates) {
    if (!updates || typeof updates !== 'object') return null;
    const result = {};
    for (const key of Object.keys(updates)) {
        const processor = FIELD_PROCESSORS[key];
        if (!processor) continue; // silently drop unknown fields
        if (key === 'name') {
            const v = processor(updates.name);
            if (!v) return null; // explicit empty name on patch is rejected
            result.name = v;
            continue;
        }
        result[key] = processor(updates[key]);
    }
    return Object.keys(result).length === 0 ? null : result;
}
