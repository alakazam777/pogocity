export function getPokemonSprite(id, isShiny = false, formId = null) {
    if (parseInt(id) === 9999) {
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent pixel fallback
    }

    const baseUrl = 'https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/pokemon';

    let baseName = id.toString();
    if (formId) {
        // Support for direct local paths or URLs passed as formId
        if (formId.toString().includes('/') || formId.toString().includes('.webp') || formId.toString().includes('.png')) {
            return formId;
        }

        const fId = formId.toString();
        // If formId starts with '_', append it directly (e.g. '_f45' -> '666_f45')
        if (fId.startsWith('_')) {
            baseName = `${id}${fId}`;
        } else {
            // Otherwise use standard underscore separator (e.g. '00' -> '201_00')
            // This is primarily for cases where we might fallback to old behavior or explicit 00-09
            baseName = `${id}_${fId}`;
        }
    }

    const filename = isShiny
        ? `${baseName}_s.png`
        : `${baseName}.png`;

    // Check if we have it locally? No, we can't reliably check existence.
    // But we know we downloaded 'forms/...'
    // If the file matches one of our downloaded patterns, we could prefer local.
    // For now, let's try to reference the local /sprites/forms/ directory if it's a known form.
    // But keeping it simple: just return strict URL.
    // For downloaded forms, we want to use local path.
    // I'll add logic: if it's an '_f' suffix, TRY to look in /sprites/forms/ ?
    // No, I'll return the remote URL by default, but relying on browser cache/availability.
    // Wait, the user said "make the application reload to show them".
    // If I successfully downloaded them to `public/sprites/forms/`, I should point to THAT.

    // Logic: If it has an underscore suffix (meaning it's a form), prefer local path logic?
    // Local override removed to rely on verified remote URLs
    // if (formId && formId.toString().startsWith('_')) { ... }

    return `${baseUrl}/${filename}`;
}
