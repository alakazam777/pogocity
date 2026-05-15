// Deep-merges brand overrides into common translations.
// Brand keys win over common keys at any nesting level.

export function mergeTranslations(common, overrides) {
    const result = {};
    for (const lang of Object.keys(common)) {
        result[lang] = deepMerge(common[lang], overrides[lang] || {});
    }
    return result;
}

function deepMerge(base, override) {
    const result = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (
            typeof value === 'object' && value !== null && !Array.isArray(value) &&
            typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
        ) {
            result[key] = deepMerge(result[key], value);
        } else {
            result[key] = value;
        }
    }
    return result;
}
