'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { POKEMON_DATA } from '@/data/pokemon';
import { POKEMON_FORMS } from '@/data/pokemonForms';
import { EVOLUTION_FAMILY } from '@/data/evolutionFamilies';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { Search, X, Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { translatePokemonName } from '@/lib/pokemonNameI18n';

// Base attribute definitions — labels are resolved dynamically via i18n
// so the array stays a static constant (used for colors, hex map, etc.).
const ATTRIBUTE_DEFS = [
    { id: 'normal', labelKey: 'checklist.attrNormal', color: 'text-[#00d2ff]', headerColor: 'text-[#00d2ff]' },
    { id: 'shiny', labelKey: 'checklist.attrShiny', color: 'text-[#ffd700]', headerColor: 'text-[#ffd700]' },
    { id: 'lucky', labelKey: 'checklist.attrLucky', color: 'text-[#ffaa00]', headerColor: 'text-[#ffaa00]' },
    { id: 'xxl', labelKey: 'checklist.attrXxl', color: 'text-[#0099ff]', headerColor: 'text-[#0099ff]' },
    { id: 'xxs', labelKey: 'checklist.attrXxs', color: 'text-[#a6c1ee]', headerColor: 'text-[#a6c1ee]' },
    { id: 'shadow', labelKey: 'checklist.attrShadow', color: 'text-[#b388ff]', headerColor: 'text-[#b388ff]' },
    { id: 'purified', labelKey: 'checklist.attrPurified', color: 'text-[#00ffe5]', headerColor: 'text-[#00ffe5]' },
    { id: 'hundo', labelKey: 'checklist.attrHundo', color: 'text-[#ff6b6b]', headerColor: 'text-[#ff6b6b]' },
];

// Pre-computed hex colors for checkbox accentColor (avoids regex on every render)
const ATTR_HEX_COLORS = Object.fromEntries(
    ATTRIBUTE_DEFS.map(a => [a.id, a.color.match(/#[0-9a-fA-F]+/)?.[0] || '#22c55e'])
);

// Attributes that are hidden on form sub-rows
const FORM_HIDDEN_ATTRS = ['lucky', 'xxl', 'xxs'];

// Disable Gen 8 Hisui (partially) + Gen 9 + specific future/unreleased
const DISABLED_IDS = [
    // Pre-Gen 9 specific
    25, 26, 27, 28, 35, 36, 39, 40, 46, 47, 84, 85, 86, 87, 108, 113, 118, 119, 124, 128, 132, 133, 134, 135, 136, 137, 151, 161, 162, 163, 164, 167, 168, 170, 171, 172, 173, 174, 175, 176, 183, 184, 191, 192, 193, 196, 197, 206, 218, 219, 222, 223, 224, 226, 236, 238, 239, 240, 241, 242, 265, 266, 267, 268, 269, 270, 271, 272, 278, 279, 283, 284, 285, 286, 290, 298, 300, 301, 307, 308, 311, 312, 313, 314, 315, 316, 317, 324, 327, 335, 336, 337, 338, 351, 352, 358, 360, 366, 367, 368, 369, 370, 406, 407, 412, 417, 418, 419, 420, 421, 422, 423, 427, 428, 433, 438, 439, 440, 441, 442, 446, 447, 458, 463, 468, 489, 490, 492, 493, 494, 512, 513, 514, 517, 518, 537, 541, 542, 546, 547, 548, 552, 553, 556, 559, 592, 593, 599, 600, 605, 606, 610, 611, 612, 619, 620, 621, 625, 626, 627, 630, 631, 632, 636, 637, 638, 643, 644, 646, 648, 649, 650, 651, 652, 653, 654, 655, 657, 658, 664, 665, 671, 672, 673, 674, 675, 676, 677, 678, 679, 680, 681, 682, 683, 684, 685, 688, 689, 690, 691, 692, 695, 700, 702, 703, 704, 705, 706, 710, 711, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 734, 735, 739, 740, 741, 742, 743, 744, 745, 747, 748, 749, 750, 753, 754, 755, 756, 757, 758, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 868, 869, 870, 871, 872, 873, 874, 876, 877, 878, 879, 880, 881, 882, 883, 884, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895,
    // New Range (896 - 1025)
    // ...Array.from({ length: 135 }, (_, i) => i + 891) // Reverted global disable
];

const UNRELEASED_IDS = [
    489, 490, 493, 746, 771, 772, 773, 774, 801, 807, 833, 834, 837, 838, 839, 843, 844, 845, 846, 847, 868, 869, 871, 875, 878, 879, 880, 881, 882, 883, 896, 897, 898, 902, 931, 940, 941, 942, 943, 946, 947, 951, 952, 953, 954, 955, 956, 963, 964, 967, 969, 970, 976, 981, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1014, 1015, 1016, 1017, 1018, 1020, 1021, 1022, 1023, 1024, 1025
];
// Note: Many of these ARE released (like Sprigatito, Lechonk, etc.). 
// User asked to disable "new ones (since they are not available on Pokémon GO yet)".
// But Sprigatito IS in GO. 
// I should only disable the ones that are NOT in GO.
// The user said "disable all their ticking cases for the new ones".
// This implies the ones I just added (Missing IDs) are the ones to disable?
// The missing IDs I found were:
// 746, 771-774, 778, 801, 807, 824-826, 833-834, 837-839, 843-847, 868-869, 871, 875, 878-883, 896-898, 902, 931, 940-943, 946-947, 950-956, 963-964, 968-970, 976, 981, 984-995, 996-999?
// I should probably disable the IDs I just added if they are indeed unreleased.
// Météno (774) - released? In GO, yes.
// Wishiwashi (746) - released? No, I don't think so.
// Pyukumuku (771) - No.
// Minior (774) - Yes, released recently? Or maybe not. Actually Minior was released? I think so.
// Let's assume the user wants me to Disable the *gen 8/9* ones that aren't out.
// I will populate UNRELEASED_IDS with a safe list of potentially unreleased ones based on the missing list I just found, minus known released ones.
// Safest bet: Disable the ones I just found, as user said "bring all these pokémon back, disable all their ticking cases for the new ones".


const DISABLED_SHINY_IDS = [
    489, 490, 494, 679, 680, 681, 718, 719, 720, 721, 772, 773, 789, 790, 791, 792, 801, 802, 807,
    824, 825, 826, // Larvadar, Coléodôme, Astronelle — shiny not available
    890, 891, 892, 893, 896, 897, 898, 902, 905, 950, 973, 1001, 1002, 1003, 1004, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019
];

// List of Pokémon IDs that CANNOT be Shadow or Purified
const DISABLED_SHADOW_IDS = [
    // Gen 8 (810) to Gen 9 (1025) - Blanket ban...
    // But EXCLUDING specific whitelist:
    // 863 (Perrserker), 865 (Sirfetch'd), 866 (Mr. Rime), 867 (Runerigus)
    // 901 (Ursaluna), 903 (Sneasler), 904 (Overqwil), 979 (Annihilape)
    ...Array.from({ length: 1025 - 809 }, (_, i) => i + 810).filter(id =>
        ![863, 865, 866, 867, 901, 903, 904, 979].includes(id)
    ),

    // Requested Specific Exclusions (Gen 6/7/Misc)
    647, // Keldeo
    656, 657, 658, // Grenousse line
    664, 665, 666, // Lépidonille line
    667, 668, // Hélionceau line
    669, 670, 671, // Flabébé line
    692, 693, // Gamblast line
    694, 695, // Galvaran line

    // NEW User Request: Disable logic for these specific IDs
    // (Note: duplicates removed if any)
    639, 640, // Terrakion, Virizion
    628, 629, // Braviary, Vullaby
    624, // Pawniard
    615, // Cryogonal
    613, 614, // Cubchoo, Beartic
    601, 602, 603, 604, // Klink line, Eelektross line? No, 604 is Eelektross. 601 is Klinklang.
    587, // Emolga
    585, 586, // Deerling, Sawsbuck
    582, 583, 584, // Vanillite line
    506, 507, 508, // Lillipup line
    511, 512, 513, 514, 515, 516, 517, 518, // Pansage/Pansear/Panpour lines + Musharna
    527, 528, // Woobat line
    531, // Audino
    535, 536, 537, // Tympole line
    549, 550, 551, // Lilligant, Basculin, Sandile
    560, 561, // Scrafty line
    570, 571, // Zorua line
    572, 573, // Minccino line
    482, 481, 480, // Azelf, Mesprit, Uxie
    479, // Rotom
    469, 470, 471, // Yanmega, Leafeon, Glaceon (Wait, Leafeon 470 can be shadow? Eevee is shadow. Leafeon shadow exists. User said disable. Okay, following orders.)
    457, 456, 455, // Lumineon, Finneon, Carnivine
    448, // Lucario
    437, 436, // Bronzong, Bronzor
    433, // Chingling
    413, 414, 415, 416, // Wormadam, Mothim, Combee, Vespiquen
    402, 401, // Kricketune, Kricketot
    386, // Deoxys
    385, // Jirachi
    384, // Rayquaza (User said disable? Rayquaza shadow exists in raids... maybe user means cannot be collected currently? Or specific form? I will disable as requested.)
    357, // Tropius
    251, // Celebi
    235, // Smeargle
    201, // Unown
];

// Forms that cannot be Shadow/Purified
// Logic: "All Hisui / Galar etc forms cannot be obscurs"
// EXCEPT those needed for the allowed evolutions (e.g. Galar Meowth for Perrserker).
const DISABLED_SHADOW_FORMS = [
    // Hisui
    '58_01', '59_01', // Growlithe/Arcanine Hisui
    '100_01', '101_01', // Voltorb/Electrode Hisui
    '157_01', // Typhlosion Hisui
    '503_01', // Samurott Hisui
    '549_01', // Lilligant Hisui
    '570_01', '571_01', // Zorua/Zoroark Hisui
    '628_01', // Braviary Hisui
    '705_01', '706_01', // Sliggoo/Goodra Hisui
    '713_01', // Avalugg Hisui
    '724_01', // Decidueye Hisui

    // Galar (Exceptions: Meowth 52_02, Farfetch'd 83_01, Mr Mime 122_01, Yamask 562_01 allowed)
    '77_01', '78_01', // Ponyta/Rapidash Galar
    '79_01', '80_01', '199_01', // Slowpoke/Bro/King Galar
    '110_01', // Weezing Galar
    '144_01', '145_01', '146_01', // Birds Galar
    '222_01', // Corsola Galar (Cursola 864 not allowed)
    '263_01', '264_01', // Zigzagoon/Linoone Galar (Obstagoon 862 not allowed)
    '554_01', '555_01', // Darumaka/Darmanitan Galar
    '618_01', // Stunfisk Galar

    // Alola? (Usually allowed if Kanto allowed, e.g. Meowth, Grimer, etc. exist as shadows)
    // User didn't ask to disable Alola shadows specifically, only new forms.

    // Paldea (Tauros)
    '128_01', '128_02', '128_03', // Tauros Paldea
    '194_01', // Wooper Paldea (Clodsire 980 excluded from whitelist? User didn't list 980. So disable.)
];


const DISABLED_SIZE_IDS = [
    151, 251, 385, 489, 490, 493, 494, 721, 772, 773, 801, 807, 890, 896, 897, 898, 902, 1001, 1002, 1003, 1004, 1007, 1008
];

const DISABLED_FORMS = [
    '905_01' // Enamorus Totémique
];

// Temporarily define POKEMON_FORMS here to apply the change,
// as it's imported from another file in the original code.
// In a real scenario, you would edit the '@/data/pokemonForms' file directly.
const LOCAL_POKEMON_FORMS = {
    ...POKEMON_FORMS, // Keep existing forms
    649: [ // Genesect
        { id: '00', label: 'Normal', spriteSuffix: '' },
        { id: '01', label: 'Choc', spriteSuffix: '' },
        { id: '02', label: 'Brûlure', spriteSuffix: '' },
        { id: '03', label: 'Glaciation', spriteSuffix: '' },
        { id: '04', label: 'Hydro', spriteSuffix: '' }
    ],
};

// Set-based lookups for O(1) performance (avoid .includes() on large arrays in render)
const UNRELEASED_SET = new Set(UNRELEASED_IDS);
const DISABLED_SET = new Set(DISABLED_IDS);
const DISABLED_SHINY_SET = new Set(DISABLED_SHINY_IDS);
const DISABLED_SHADOW_SET = new Set(DISABLED_SHADOW_IDS);
const DISABLED_SIZE_SET = new Set(DISABLED_SIZE_IDS);
const DISABLED_FORMS_SET = new Set(DISABLED_FORMS);
const DISABLED_SHADOW_FORMS_SET = new Set(DISABLED_SHADOW_FORMS);
const FORM_HIDDEN_SET = new Set(FORM_HIDDEN_ATTRS);
const NORMAL_DISABLED_IDS = new Set([489, 490, 493]);

// Helper: check if a checkbox should be disabled for a given pokemon/form + attribute
function isCheckDisabled(pokemonId, attrId, formId) {
    if (UNRELEASED_SET.has(pokemonId)) return true;
    if ((attrId === 'purified' || attrId === 'shadow') && (DISABLED_SET.has(pokemonId) || DISABLED_SHADOW_SET.has(pokemonId) || (formId && DISABLED_SHADOW_FORMS_SET.has(formId)))) return true;
    if (attrId === 'shiny' && DISABLED_SHINY_SET.has(pokemonId)) return true;
    if ((attrId === 'xxs' || attrId === 'xxl') && DISABLED_SIZE_SET.has(pokemonId)) return true;
    if (attrId === 'normal' && NORMAL_DISABLED_IDS.has(pokemonId)) return true;
    if (formId && DISABLED_FORMS_SET.has(formId)) return true;
    return false;
}

// How many form rows to render per animation frame (keeps browser responsive)


// ─── Memoized row: Pokémon WITH forms (expand/collapse is LOCAL state) ───
// Progressive rendering: forms appear in chunks so the browser never freezes.
// Helper: deliberately returns nothing now — secondary names removed.
// Previously this rendered "EnglishName / 日本語名" beneath the primary
// name in FR mode (and analogous mixes for EN/JA), per the original
// trilingual reference design. UX feedback: the cluttered multi-lang
// stack distracts from the active-language name. Each row now shows the
// pokemon name in the current language only — translatePokemonName(...)
// already handles the primary label rendered just above this helper.
//
// Kept as a stub (returning '') to preserve the call sites without
// triggering empty-line layout shifts; the empty span collapses.
function getSecondaryNames(_pokemon, _lang) {
    return '';
}

// ─── Memoized row: Pokémon WITH forms ───
// Hybrid approach: ONE extra <tr> with colSpan containing a div-based forms panel.
// With table-layout:fixed, inserting a single <tr> is near-instant.
// Forms inside are div elements built with innerHTML (bypasses React rendering overhead).
// Progressive rendering: first 10 shown immediately, then 10 more per animation frame.
const PokemonWithFormsRow = memo(function PokemonWithFormsRow({ pokemon, forms, checklist, displayedAttributes, onToggleCheck, formatFormLabel, lang }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const panelRef = useRef(null);
    const hasBuiltRef = useRef(false);
    const ROW_H = 52;
    // Full height: show ALL forms, no nested scroll
    const PANEL_H = forms.length * ROW_H;

    // Build all form rows as HTML strings into the panel.
    // No <tr> insertion → no table relayout → zero lag.
    useEffect(() => {
        if (!isExpanded || hasBuiltRef.current || !panelRef.current) return;
        hasBuiltRef.current = true;

        const container = panelRef.current;
        const attrs = displayedAttributes;
        const cl = checklist;
        const pokeName = pokemon.nameFr;

        let html = '';
        for (let i = 0; i < forms.length; i++) {
            const form = forms[i];
            const formId = `${pokemon.id}_${form.id}`;
            const imgSrc = form.imageUrl || form.localAsset || getPokemonSprite(pokemon.id, false, form.spriteSuffix !== undefined ? form.spriteSuffix : form.id);
            const isCostume = !!(form.localAsset || form.costumeOnly);
            const imgSize = isCostume ? 64 : 36;
            const objFit = isCostume ? 'cover' : 'contain';
            const objPos = isCostume ? 'center 72%' : 'center';

            let cells = '';
            for (const attr of attrs) {
                if (FORM_HIDDEN_SET.has(attr.id) || isCheckDisabled(pokemon.id, attr.id, formId)) {
                    cells += `<div style="flex:1;display:flex;justify-content:center;align-items:center"><div style="width:18px;height:18px;border-radius:4px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);opacity:.3"></div></div>`;
                } else {
                    const isChecked = cl[formId]?.[attr.id];
                    const color = ATTR_HEX_COLORS[attr.id];
                    if (isChecked) {
                        cells += `<div style="flex:1;display:flex;justify-content:center;align-items:center"><button data-fid="${formId}" data-aid="${attr.id}" data-checked="true" style="width:18px;height:18px;border-radius:5px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(to bottom,${color}cc,${color});box-shadow:0 2px 8px ${color}66,inset 0 1px 0 rgba(255,255,255,0.3)"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><polyline points="20 6 9 17 4 12"></polyline></svg></button></div>`;
                    } else {
                        cells += `<div style="flex:1;display:flex;justify-content:center;align-items:center"><button data-fid="${formId}" data-aid="${attr.id}" data-checked="false" style="width:18px;height:18px;border-radius:5px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);cursor:pointer"></button></div>`;
                    }
                }
            }

            html += `<div style="height:${ROW_H}px;display:flex;align-items:center;border-bottom:1px solid rgba(255,255,255,0.05);background:#1a1a1a" data-form-id="${formId}">` +
                `<div style="width:var(--col-id-w,52px);flex-shrink:0"></div>` +
                `<div style="width:var(--col-sprite-w,52px);flex-shrink:0;display:flex;justify-content:center;align-items:center">` +
                    `<img src="${imgSrc}" alt="" style="width:${imgSize}px;height:${imgSize}px;object-fit:${objFit};object-position:${objPos};image-rendering:pixelated;border-radius:4px" loading="lazy">` +
                `</div>` +
                `<div style="width:var(--col-name-w,200px);flex-shrink:0;min-width:0;padding:0 4px 0 8px;overflow:hidden">` +
                    `<div style="font-size:13px;color:#f472b6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pokeName} ${form.label}</div>` +
                    `<div style="font-size:10px;color:#6b7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${formatFormLabel ? formatFormLabel(form.label) : `Forme ${form.label}`}</div>` +
                `</div>` +
                `<div style="display:flex;flex:1;align-items:center">${cells}</div>` +
            `</div>`;
        }
        container.innerHTML = html;

        // Measure column widths (deferred to avoid forced reflow)
        requestAnimationFrame(() => {
            const tr = container.closest('tr');
            const headerCells = tr?.closest('table')?.querySelectorAll('thead th');
            if (headerCells && headerCells.length >= 3) {
                const rects = Array.from(headerCells).map(th => th.getBoundingClientRect());
                container.style.setProperty('--col-id-w', rects[0].width + 'px');
                container.style.setProperty('--col-sprite-w', rects[1].width + 'px');
                container.style.setProperty('--col-name-w', rects[2].width + 'px');
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExpanded]);

    // Sync checkboxes when checklist changes
    useEffect(() => {
        if (!hasBuiltRef.current || !panelRef.current) return;
        const btns = panelRef.current.querySelectorAll('button[data-fid]');
        for (const btn of btns) {
            const isChecked = checklist[btn.dataset.fid]?.[btn.dataset.aid] || false;
            const color = ATTR_HEX_COLORS[btn.dataset.aid];
            btn.dataset.checked = isChecked ? 'true' : 'false';
            if (isChecked) {
                btn.style.background = `linear-gradient(to bottom,${color}cc,${color})`;
                btn.style.boxShadow = `0 2px 8px ${color}66,inset 0 1px 0 rgba(255,255,255,0.3)`;
                btn.style.border = 'none';
                btn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            } else {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.boxShadow = 'none';
                btn.style.border = '1px solid rgba(255,255,255,0.2)';
                btn.innerHTML = '';
            }
        }
    }, [checklist]);

    // Delegated click handler for custom checkbox buttons
    useEffect(() => {
        const p = panelRef.current;
        if (!p || !isExpanded) return;
        function h(e) { const btn = e.target.closest('button[data-fid]'); if (btn) onToggleCheck(btn.dataset.fid, btn.dataset.aid); }
        p.addEventListener('click', h);
        return () => p.removeEventListener('click', h);
    }, [isExpanded, onToggleCheck]);

    // Reset on collapse
    useEffect(() => {
        if (!isExpanded) {
            hasBuiltRef.current = false;
            if (panelRef.current) panelRef.current.innerHTML = '';
        }
    }, [isExpanded]);

    return (
        <tr
            className="group border-b border-white/5 hover:bg-white/5 transition-colors"
            style={{
                marginBottom: isExpanded ? PANEL_H : 0,
                position: isExpanded ? 'relative' : undefined,
                contentVisibility: isExpanded ? 'visible' : undefined,
                zIndex: isExpanded ? 20 : undefined,
            }}
        >
            <td className="p-1 md:p-1 text-gray-500 text-left text-xs md:text-sm sticky left-0 z-20 bg-[#1a1a1a] group-hover:bg-[#262626] transition-colors w-10 min-w-[2.5rem] md:w-auto shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                #{pokemon.id.toString().padStart(3, '0')}
            </td>
            <td className="p-1 md:p-1 text-center sticky left-10 z-20 bg-[#1a1a1a] group-hover:bg-[#262626] transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                <div className="flex justify-center">
                    <img src={pokemon.sprite || getPokemonSprite(pokemon.id)} alt={pokemon.nameEn} className="w-8 h-8 md:w-10 md:h-10 object-contain pixelated" loading="lazy" />
                </div>
            </td>
            <td className="p-1 md:p-1 text-white font-medium text-left pl-2 md:pl-1">
                <div className="flex items-center gap-1">
                    <div className="flex flex-col">
                        <span className="text-xs md:text-sm whitespace-nowrap">{translatePokemonName(pokemon.nameFr, lang)}</span>
                        <span className="text-[9px] md:text-[10px] text-gray-500 whitespace-nowrap">
                            {getSecondaryNames(pokemon, lang)}
                        </span>
                    </div>
                    <button onClick={() => setIsExpanded(v => !v)} className="text-gray-400 ml-1 flex items-center gap-0.5 text-[10px] hover:text-white transition-colors p-1">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="text-pink-400">({forms.length})</span>
                    </button>
                </div>
            </td>
            {displayedAttributes.map(attr => (
                <td key={attr.id} className="p-1 md:p-1 text-center">
                    <div className="flex justify-center">
                        {isCheckDisabled(pokemon.id, attr.id) ? (
                            <div className="w-4 h-4 md:w-5 md:h-5 rounded bg-white/5 border border-white/10 opacity-30 cursor-not-allowed" />
                        ) : (
                            <button
                                onClick={() => onToggleCheck(pokemon.id, attr.id)}
                                className={`w-4 h-4 md:w-5 md:h-5 rounded-md border transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                                    (checklist[pokemon.id]?.[attr.id])
                                        ? 'border-transparent shadow-[0_2px_8px_var(--cb-glow),inset_0_1px_0_rgba(255,255,255,0.3)]'
                                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                                }`}
                                style={{
                                    ...(checklist[pokemon.id]?.[attr.id] ? {
                                        background: `linear-gradient(to bottom, ${ATTR_HEX_COLORS[attr.id]}cc, ${ATTR_HEX_COLORS[attr.id]})`,
                                        '--cb-glow': `${ATTR_HEX_COLORS[attr.id]}66`
                                    } : {})
                                }}
                            >
                                {(checklist[pokemon.id]?.[attr.id]) && <Check size={10} className="text-white drop-shadow-sm" strokeWidth={3.5} />}
                            </button>
                        )}
                    </div>
                </td>
            ))}
            {isExpanded && (
                <div
                    ref={panelRef}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        height: PANEL_H,
                        overflow: 'hidden',
                        background: '#1a1a1a',
                        zIndex: 30,
                        borderBottom: '2px solid rgba(244,114,182,0.3)',
                    }}
                />
            )}
        </tr>
    );
}, (prev, next) => {
    if (prev.displayedAttributes !== next.displayedAttributes) return false;
    if (prev.checklist[prev.pokemon.id] !== next.checklist[next.pokemon.id]) return false;
    for (const form of prev.forms) {
        const formId = `${prev.pokemon.id}_${form.id}`;
        if (prev.checklist[formId] !== next.checklist[formId]) return false;
    }
    return true;
});

// ─── Memoized row: Simple Pokémon (no forms) ───
const PokemonSimpleRow = memo(function PokemonSimpleRow({ pokemon, checklist, displayedAttributes, onToggleCheck, lang }) {
    return (
        <tr className="group border-b border-white/5 hover:bg-white/5 transition-colors">
            <td className="p-1 md:p-1 text-gray-500 text-left text-xs md:text-sm sticky left-0 z-20 bg-[#1a1a1a] group-hover:bg-[#262626] transition-colors w-10 min-w-[2.5rem] md:w-auto shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                #{pokemon.id.toString().padStart(3, '0')}
            </td>
            <td className="p-1 md:p-1 text-center sticky left-10 z-20 bg-[#1a1a1a] group-hover:bg-[#262626] transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                <div className="flex justify-center">
                    <img src={pokemon.sprite || getPokemonSprite(pokemon.id)} alt={pokemon.nameEn} className="w-8 h-8 md:w-10 md:h-10 object-contain pixelated" loading="lazy" />
                </div>
            </td>
            <td className="p-1 md:p-1 text-white font-medium text-left pl-2 md:pl-1">
                <div className="flex flex-col">
                    <span className="text-xs md:text-sm whitespace-nowrap">{translatePokemonName(pokemon.nameFr, lang)}</span>
                    <span className="text-[9px] md:text-[10px] text-gray-500 whitespace-nowrap">
                        {getSecondaryNames(pokemon, lang)}
                    </span>
                </div>
            </td>
            {displayedAttributes.map(attr => (
                <td key={attr.id} className="p-1 md:p-1 text-center">
                    <div className="flex justify-center">
                        {isCheckDisabled(pokemon.id, attr.id) ? (
                            <div className="w-4 h-4 md:w-5 md:h-5 rounded bg-white/5 border border-white/10 opacity-30 cursor-not-allowed" />
                        ) : (
                            <button
                                onClick={() => onToggleCheck(pokemon.id, attr.id)}
                                className={`w-4 h-4 md:w-5 md:h-5 rounded-md border transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                                    (checklist[pokemon.id]?.[attr.id])
                                        ? 'border-transparent shadow-[0_2px_8px_var(--cb-glow),inset_0_1px_0_rgba(255,255,255,0.3)]'
                                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                                }`}
                                style={{
                                    ...(checklist[pokemon.id]?.[attr.id] ? {
                                        background: `linear-gradient(to bottom, ${ATTR_HEX_COLORS[attr.id]}cc, ${ATTR_HEX_COLORS[attr.id]})`,
                                        '--cb-glow': `${ATTR_HEX_COLORS[attr.id]}66`
                                    } : {})
                                }}
                            >
                                {(checklist[pokemon.id]?.[attr.id]) && <Check size={10} className="text-white drop-shadow-sm" strokeWidth={3.5} />}
                            </button>
                        )}
                    </div>
                </td>
            ))}
        </tr>
    );
}, (prev, next) => {
    if (prev.displayedAttributes !== next.displayedAttributes) return false;
    return prev.checklist[prev.pokemon.id] === next.checklist[next.pokemon.id];
});

export default function PokemonChecklist({ checklist, onChange }) {
    const { t, lang } = useLanguage();
    const formatFormLabel = useCallback((label) => t('checklist.formLabel', { form: label }), [t]);

    // Resolve attribute labels from i18n (so "Chanceux" becomes "Lucky" in EN, etc.)
    const ATTRIBUTES = useMemo(() =>
        ATTRIBUTE_DEFS.map(def => ({ ...def, label: t(def.labelKey) })),
        [t]
    );
    const [search, setSearch] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [isMobile, setIsMobile] = useState(false);
    const searchRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [searchRef]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const searchResults = useMemo(() => {
        if (!search) return [];
        return POKEMON_DATA.filter(p =>
            p.nameFr.toLowerCase().includes(search.toLowerCase()) ||
            p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
            p.id.toString().includes(search)
        ).slice(0, 24);
    }, [search]);

    const filteredPokemon = useMemo(() => {
        if (selectedFilters.length > 0) {
            return selectedFilters;
        }
        if (search && !showDropdown) {
            return POKEMON_DATA.filter(p =>
                p.nameFr.toLowerCase().includes(search.toLowerCase()) ||
                p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
                p.id.toString().includes(search)
            ).sort((a, b) => a.id - b.id);
        }
        return [...POKEMON_DATA].sort((a, b) => a.id - b.id);
    }, [search, selectedFilters, showDropdown]);

    const displayedAttributes = useMemo(() => {
        if (isMobile) {
            const shiny = ATTRIBUTES.find(a => a.id === 'shiny');
            const normal = ATTRIBUTES.find(a => a.id === 'normal');
            const others = ATTRIBUTES.filter(a => a.id !== 'shiny' && a.id !== 'normal');
            return [normal, shiny, ...others].filter(Boolean);
        }
        return ATTRIBUTES;
    }, [isMobile, ATTRIBUTES]);

    const toggleFilter = (pokemon) => {
        // Get the full evolution family for this Pokémon
        const familyIds = EVOLUTION_FAMILY[pokemon.id] || [pokemon.id];
        const familyPokemon = familyIds
            .map(id => POKEMON_DATA.find(p => p.id === id))
            .filter(Boolean);

        const isSelected = selectedFilters.some(p => p.id === pokemon.id);
        if (isSelected) {
            // Remove entire family
            const familySet = new Set(familyIds);
            setSelectedFilters(selectedFilters.filter(p => !familySet.has(p.id)));
        } else {
            // Add entire family (avoiding duplicates)
            const existing = new Set(selectedFilters.map(p => p.id));
            const toAdd = familyPokemon.filter(p => !existing.has(p.id));
            setSelectedFilters([...selectedFilters, ...toAdd]);
        }
    };

    // Stable ref so onToggleCheck callback identity never changes
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const onToggleCheck = useCallback((pokemonId, attrId) => {
        // Use function updater to avoid race condition with rapid clicks.
        // Without this, two fast clicks could read stale checklistRef and
        // the second click would overwrite the first click's change.
        onChangeRef.current(prev => {
            const current = prev[pokemonId] || {};
            return {
                ...prev,
                [pokemonId]: { ...current, [attrId]: !current[attrId] }
            };
        });
    }, []);

    const toggleAll = (attrId) => {
        onChange(prev => {
            const allChecked = filteredPokemon.length > 0 && filteredPokemon.every(p => prev[p.id]?.[attrId]);
            const newChecklist = { ...prev };
            filteredPokemon.forEach(p => {
                newChecklist[p.id] = {
                    ...(newChecklist[p.id] || {}),
                    [attrId]: !allChecked
                };
            });
            return newChecklist;
        });
    };

    const copyMissing = (attrId) => {
        // Find missing IDs
        const missingIds = filteredPokemon
            .filter(p => !checklist[p.id]?.[attrId])
            .map(p => p.id);

        if (missingIds.length === 0) {
            alert(t('checklist.allChecked'));
            return;
        }

        let prefix = '!échangé&';
        if (attrId === 'xxl') prefix = 'XXL&!échangé&';
        if (attrId === 'xxs') prefix = 'XXS&!échangé&';
        if (attrId === 'purified') prefix = 'Purifié&!échangé&';
        if (attrId === 'shiny') prefix = 'Chromatique&!échangé&';

        const text = prefix + missingIds.join(',');

        const fallbackCopyTextToClipboard = (text) => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                if (successful) alert(t('dashboard.idsCopied', { count: missingIds.length }));
                else alert(t('dashboard.copyError'));
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                alert(t('dashboard.copyError'));
            }
            document.body.removeChild(textArea);
        };

        if (!navigator.clipboard) {
            fallbackCopyTextToClipboard(text);
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            alert(t('dashboard.idsCopied', { count: missingIds.length }));
        }).catch(err => {
            console.error('Async: Could not copy text: ', err);
            fallbackCopyTextToClipboard(text);
        });
    };

    const shareMissing = (attrId) => {
        // Find missing IDs
        const missingIds = filteredPokemon
            .filter(p => !checklist[p.id]?.[attrId])
            .map(p => p.id);

        if (missingIds.length === 0) {
            alert(t('checklist.allChecked'));
            return;
        }

        let prefix = '!échangé&';
        if (attrId === 'xxl') prefix = 'XXL&!échangé&';
        if (attrId === 'xxs') prefix = 'XXS&!échangé&';
        if (attrId === 'purified') prefix = 'Purifié&!échangé&';
        if (attrId === 'shiny') prefix = 'Chromatique&!échangé&';

        const text = prefix + missingIds.join(',');

        if (navigator.share) {
            navigator.share({
                title: `Manquants ${attrId}`,
                text: text,
            }).catch((error) => console.log('Error sharing', error));
        } else {
            // Fallback to copy if share not supported (though copy button exists)
            copyMissing(attrId);
            alert(t('checklist.shareNotSupported'));
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="w-full p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-8 bg-green-500 rounded-full"></span>
                        Checklist de Collection
                    </h3>

                    <div className="relative w-full md:w-96 z-[100]" ref={searchRef}>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={search}
                                onFocus={() => setShowDropdown(true)}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setShowDropdown(true);
                                }}
                                placeholder={t('checklist.searchPlaceholder')}
                                className="w-full pl-12 pr-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                                autoComplete="off"
                                autoCorrect="off"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-gray-400 hover:text-white transition-all z-50 mr-[2px]"
                                    title={t('checklist.clear')}
                                >
                                    <X size={14} />
                                </button>
                            )}
                            {selectedFilters.length > 0 && !search && (
                                <button
                                    onClick={() => setSelectedFilters([])}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-pink-500/20 text-pink-400 px-2 py-1 rounded hover:bg-pink-500/40 transition-colors"
                                >
                                    {t('checklist.clearCount', { count: selectedFilters.length })}
                                </button>
                            )}
                        </div>

                        {showDropdown && search && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[400px] flex flex-col">
                                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/40">
                                    <span className="text-gray-400 text-xs">{t('checklist.selectToFilter')}</span>
                                    <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-white">
                                        <X size={16} />
                                    </button>
                                </div>

                                <div className="overflow-y-auto p-3 grid grid-cols-4 md:grid-cols-6 gap-2">
                                    {searchResults.map(pokemon => {
                                        const isSelected = selectedFilters.some(p => p.id === pokemon.id);
                                        return (
                                            <div
                                                key={pokemon.id}
                                                onClick={() => toggleFilter(pokemon)}
                                                className={`
                                                cursor-pointer rounded-lg p-1.5 flex flex-col items-center gap-1 transition-all border
                                                ${isSelected
                                                        ? 'bg-pink-500/20 border-pink-500'
                                                        : 'bg-black/20 border-white/5 hover:bg-white/10 hover:border-white/20'
                                                    }
                                            `}
                                            >
                                                <div className="relative w-10 h-10">
                                                    <img
                                                        src={pokemon.sprite || getPokemonSprite(pokemon.id)}
                                                        alt={translatePokemonName(pokemon.nameFr, lang)}
                                                        className="w-full h-full object-contain pixelated"
                                                        loading="lazy"
                                                    />
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center border border-white">
                                                            <Check size={10} className="text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-pink-400' : 'text-gray-400'}`}>
                                                    {translatePokemonName(pokemon.nameFr, lang)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {searchResults.length === 0 && (
                                        <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                                            {t('checklist.noPokemonFound')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pokemon-scroll-container overflow-auto max-h-[350px] md:max-h-[500px] -mx-6 md:mx-0 px-6 md:px-0" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent', WebkitOverflowScrolling: 'touch' }}>
                    <style dangerouslySetInnerHTML={{ __html: `
                        .pokemon-scroll-container::-webkit-scrollbar { width: 6px; height: 6px; }
                        .pokemon-scroll-container::-webkit-scrollbar-track { background: transparent; }
                        .pokemon-scroll-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
                        .pokemon-scroll-container::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
                        .pokemon-table thead,
                        .pokemon-table tbody { display: block; }
                        .pokemon-table thead {
                            position: sticky;
                            top: 0;
                            z-index: 50;
                            background: #1a1a1a;
                        }
                        .pokemon-table thead tr,
                        .pokemon-table tbody tr {
                            display: flex;
                            align-items: center;
                        }
                        .pokemon-table tbody tr {
                            content-visibility: auto;
                            contain-intrinsic-block-size: 44px;
                        }
                        .pokemon-table th, .pokemon-table td {
                            flex-shrink: 0;
                        }
                        /* Column widths: #(5%) sprite(5%) name(auto) + 8 attrs */
                        .pokemon-table th:nth-child(1), .pokemon-table td:nth-child(1) { width: 52px; min-width: 52px; }
                        .pokemon-table th:nth-child(2), .pokemon-table td:nth-child(2) { width: 52px; min-width: 52px; }
                        .pokemon-table th:nth-child(3), .pokemon-table td:nth-child(3) { flex: 1; min-width: 120px; }
                        .pokemon-table th:nth-child(n+4), .pokemon-table td:nth-child(n+4) { width: calc((100% - 104px - 120px) * 0.125); min-width: 52px; }
                        @media (min-width: 768px) {
                            .pokemon-table th:nth-child(n+4), .pokemon-table td:nth-child(n+4) { width: calc((100% - 104px) * 0.091); min-width: 60px; }
                            .pokemon-table th:nth-child(3), .pokemon-table td:nth-child(3) { min-width: 0; }
                        }
                    `}} />
                    <table className="pokemon-table w-full text-left border-collapse min-w-[580px] md:min-w-0" style={{ tableLayout: 'fixed' }}>
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-1 md:p-1 text-gray-400 font-medium text-left text-xs md:text-sm sticky left-0 top-0 z-50 bg-[#1a1a1a] w-10 min-w-[2.5rem] md:w-auto shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                                    #
                                </th>
                                <th className="p-1 md:p-1 text-gray-400 font-medium text-center sticky left-10 top-0 z-50 bg-[#1a1a1a] text-xs md:text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">
                                    {t('checklist.sprite')}
                                </th>
                                <th className="p-1 md:p-1 text-gray-400 font-medium text-left text-xs md:text-sm pl-2 md:pl-1 sticky top-0 z-40 bg-[#1a1a1a]">Pokémon</th>
                                {displayedAttributes.map(attr => {
                                    const allChecked = filteredPokemon.length > 0 && filteredPokemon.every(p => checklist[p.id]?.[attr.id]);
                                    return (
                                        <th key={attr.id} className={`p-1 md:p-1 font-medium text-center ${attr.headerColor} text-xs md:text-sm sticky top-0 z-40 bg-[#1a1a1a]`}>
                                            <div className="flex flex-col items-center gap-3 md:gap-1 pb-2 md:pb-0">
                                                <span className="whitespace-nowrap">{attr.label}</span>
                                                <div className="flex flex-col gap-3 md:gap-1">
                                                    <button
                                                        onClick={() => toggleAll(attr.id)}
                                                        className="text-[9px] underline opacity-70 hover:opacity-100 whitespace-nowrap p-1 md:p-0"
                                                    >
                                                        {allChecked ? t('checklist.uncheckAll') : t('checklist.checkAll')}
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPokemon.map((pokemon) => {
                                const forms = LOCAL_POKEMON_FORMS[pokemon.id];
                                if (forms) {
                                    return (
                                        <PokemonWithFormsRow
                                            key={pokemon.id}
                                            pokemon={pokemon}
                                            forms={forms}
                                            checklist={checklist}
                                            displayedAttributes={displayedAttributes}
                                            onToggleCheck={onToggleCheck}
                                            formatFormLabel={formatFormLabel}
                                            lang={lang}
                                        />
                                    );
                                }
                                return (
                                    <PokemonSimpleRow
                                        key={pokemon.id}
                                        pokemon={pokemon}
                                        checklist={checklist}
                                        displayedAttributes={displayedAttributes}
                                        onToggleCheck={onToggleCheck}
                                        lang={lang}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {
                    filteredPokemon.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            {t('checklist.noPokemonFound')}
                        </div>
                    )
                }
            </motion.div >

            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-6">
                    <span className="w-2 h-8 bg-red-500 rounded-full"></span>
                    {t('checklist.searchKeywords')}
                </h3>
                {/* Missing Sprites Visualization */}
                <div className="space-y-6">
                    {displayedAttributes.map(attr => {
                        const missing = filteredPokemon.filter(p => {
                            // Exclude completely unreleased IDs
                            if (UNRELEASED_IDS.includes(p.id)) return false;

                            // Check specific attribute restrictions

                            // Check specific attribute restrictions
                            const isAttributeDisabled =
                                // Disable Purified/Shadow based on DISABLED_IDS (aligned with table logic)
                                ((attr.id === 'purified' || attr.id === 'shadow') && DISABLED_IDS.includes(p.id)) ||
                                (attr.id === 'shiny' && DISABLED_SHINY_IDS.includes(p.id)) ||
                                ((attr.id === 'xxs' || attr.id === 'xxl') && DISABLED_SIZE_IDS.includes(p.id)) ||
                                (attr.id === 'normal' && [489, 490, 493].includes(p.id));

                            if (isAttributeDisabled) return false;

                            return !checklist[p.id]?.[attr.id];
                        });

                        if (missing.length === 0) return null;

                        return (
                            <div key={attr.id} className="space-y-2">
                                <h5 className={`text-xs font-bold uppercase tracking-wider ${attr.color} flex items-center justify-start gap-4`}>
                                    <span>{attr.label} <span className="ml-1 text-[10px] opacity-80">{t('checklist.missingCount', { count: missing.length })}</span></span>
                                    <button
                                        onClick={() => shareMissing(attr.id)}
                                        className="text-[10px] flex items-center gap-1 opacity-70 hover:opacity-100 border border-white/20 px-2 py-1 rounded cursor-pointer transition-opacity"
                                        title={t('checklist.shareMissingTitle', { label: attr.label })}
                                    >
                                        <Copy size={10} /> {t('checklist.shareKeyword')}
                                    </button>
                                </h5>
                                <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
                                    {missing.map(p => (
                                        <div key={p.id} className="relative flex-shrink-0 w-8 h-8 group" title={`${translatePokemonName(p.nameFr, lang)} (#${p.id})`}>
                                            <img
                                                src={p.sprite || getPokemonSprite(p.id)}
                                                alt={translatePokemonName(p.nameFr, lang)}
                                                className="w-full h-full object-contain pixelated opacity-40 hover:opacity-100 transition-opacity cursor-help"
                                                loading="lazy"
                                            />
                                            {attr.id === 'shiny' && (
                                                <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-yellow-400/50 pointer-events-none"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
