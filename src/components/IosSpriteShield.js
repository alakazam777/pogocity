'use client';

import { useEffect } from 'react';

/**
 * iOS-only Pokémon sprite shield.
 *
 * The PogoSphere website uses ~23k Pokémon sprite URLs from PokeAPI,
 * PokeMiners, pokemondb, etc. for the rich web UX. These are derivatives of
 * Nintendo / The Pokémon Company artwork — fine on the open web (where the
 * footer disclaimer + /terms mitigation is the industry standard for fan
 * apps), but a potential trigger for App Store reviewers when bundled
 * inside a Capacitor wrapper.
 *
 * Strategy: silhouette filter (not src replacement).
 *
 * Earlier iteration replaced the src with a single placeholder so every
 * Pokémon looked identical (a violet orb). UX-wise that loses the only
 * visual cue users have to recognize a Pokémon. New approach: keep the
 * original image loaded, but apply a CSS filter that flattens the colours
 * and detail to a coloured silhouette — the OUTLINE remains unique per
 * Pokémon (so users still distinguish Pikachu from Mewtwo), but no
 * recognizable Pokémon Company artwork ships in the rendered pixels. A
 * faint aurora glow keeps the look on-brand.
 *
 * The component runs ONLY when the page is hosted inside the Capacitor
 * native webview (`window.Capacitor.isNativePlatform()` returns true).
 * Browser visitors (including iOS Safari on iPhone) get the original
 * sprites untouched — this component is a no-op for them.
 */

const SPRITE_HOST_PATTERNS = [
    // External CDNs / repos serving Pokémon sprite assets
    /\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\//i,
    /\/\/raw\.githubusercontent\.com\/PokeMiners\/pogo_assets\//i,
    /\/\/raw\.githubusercontent\.com\/HybridShivam\/Pokemon\//i,
    /\/\/img\.pokemondb\.net\/sprites\//i,
    /\/\/raw\.githubusercontent\.com\/WatWowMap\/wwm-uicons\//i,
    /\/\/9db\.jp\//i,                  // Japanese Pokémon DB (some Spinda forms)
    /\/\/cdn08\.net\/pokemongo\//i,    // shadow/purified/costume helper sprites
    // Same-origin /public/<folder>/ buckets that hold curated sprite copies.
    // ALL these regexes are case-insensitive (i flag) because the on-disk
    // folder names are mixed-case (Costumes, GMAX, Prismillon) but URLs in
    // the wild may end up lower-cased depending on which page generated the
    // <img> tag. The previous version had `i` only on /spinda/, missing
    // /Costumes/, /GMAX/, /Prismillon/, /Shiny Gigamax Sprites/, /Zarbi/.
    /\/spinda\//i,
    /\/costumes?\//i,                                      // /Costumes/, /Costume/, /costumes/
    /\/gmax\//i,                                           // /GMAX/, /gmax/
    /\/prismillon\//i,
    /\/zarbi\//i,
    /\/shiny(?:%20|\s|_|-)*gigamax(?:%20|\s|_|-)*sprites\//i,  // "/Shiny Gigamax Sprites/"
    /\/sprites\//i,                                        // generic /sprites/ folder
    /\/forms\//i,                                          // /forms/ pokemon forms
];

const SHIELD_FLAG = 'data-pogo-shielded';

// CSS filter chain that converts any image into a deep purple silhouette
// matching the header gradient (purple-300 → purple-600 = #9333ea anchor).
// Earlier iterations leaned pink/magenta because of high sepia + low hue
// rotation; this version pushes toward the cooler / bluer end of purple
// (closer to purple-600 #9333ea) by dropping sepia, tightening saturation,
// and rotating hue further into the violet range.
//
// Visual: each Pokémon retains its UNIQUE outline (so users distinguish
// Pikachu from Mewtwo) but every recognizable internal detail (eyes,
// colours, markings) is gone — no Pokémon Company asset survives in the
// rendered pixels. App Store reviewers see solid purple silhouettes in
// the exact hue family as the header text and login button.
// hue-rotate 263deg leans magenta on iPad's wider color profile (verified
// against simulator screenshots — sprites came out hot-pink). Bumping to
// 275deg pushes the tone deeper into cool-violet so iPhone AND iPad both
// render a true purple silhouette. Sepia reduced 58→50 cuts the warm-red
// component that was visible at the orb edges on iPad screens.
const SILHOUETTE_FILTER = (
    'brightness(0) saturate(100%) invert(20%) sepia(50%) ' +
    'saturate(4500%) hue-rotate(275deg) brightness(95%) contrast(105%) ' +
    'drop-shadow(0 0 3px rgba(147,51,234,0.55))'
);

function isCapacitorNative() {
    if (typeof window === 'undefined') return false;
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap?.isNative) return true;
    if (typeof navigator !== 'undefined' && /Capacitor/i.test(navigator.userAgent || '')) return true;
    return false;
}

function shouldShield(url) {
    if (!url || typeof url !== 'string') return false;
    return SPRITE_HOST_PATTERNS.some((rx) => rx.test(url));
}

function shieldImg(img) {
    try {
        if (!img || img.tagName !== 'IMG') return;
        if (img.getAttribute(SHIELD_FLAG) === '1') return;
        const src = img.currentSrc || img.src || img.getAttribute('src');
        if (!shouldShield(src)) return;
        img.setAttribute(SHIELD_FLAG, '1');
        // Apply the silhouette filter inline. !important wins over any
        // page-level rule that might disable filters.
        img.style.setProperty('filter', SILHOUETTE_FILTER, 'important');
        img.style.setProperty('-webkit-filter', SILHOUETTE_FILTER, 'important');
    } catch {
        // Defensive — never let the shield throw and break the page.
    }
}

function shieldAll(root = document) {
    const imgs = root.querySelectorAll ? root.querySelectorAll('img') : [];
    imgs.forEach(shieldImg);
}

export default function IosSpriteShield() {
    useEffect(() => {
        if (!isCapacitorNative()) return;

        // First pass — anything already in the DOM at hydration time.
        shieldAll();

        // Catch images added later (CesiumGlobe billboards, modals, infinite
        // scrolls, etc.) and src changes on existing imgs.
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes') {
                    if (mutation.target?.tagName === 'IMG') {
                        // Only re-evaluate if src actually changed to a sprite URL.
                        // Resetting our own placeholder src would loop, so the
                        // shield flag check inside shieldImg short-circuits.
                        const flagged = mutation.target.getAttribute(SHIELD_FLAG) === '1';
                        if (!flagged) shieldImg(mutation.target);
                    }
                } else if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node?.nodeType !== 1) return;
                        if (node.tagName === 'IMG') {
                            shieldImg(node);
                        } else if (node.querySelectorAll) {
                            shieldAll(node);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'srcset'],
        });

        return () => observer.disconnect();
    }, []);

    // Render nothing — pure side effect.
    return null;
}
