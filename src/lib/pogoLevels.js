/**
 * Pokemon GO trainer level thresholds (cumulative total XP required).
 *
 * Official values for L1–L50 match Niantic's published XP table.
 * Levels 51–80 use community-derived values that are realistic but
 * approximate (the post-2025 expansion doesn't publish exact numbers).
 *
 * These are used as a *sanity floor* for OCR detection: if an OCR scan
 * returns a level that's below the floor implied by the scanned XP, we
 * reject the OCR value rather than overwrite the trainer's real level
 * with a misread digit (e.g. storing "L2" for a L80 trainer).
 *
 * Index = level, value = total XP required to reach that level.
 * LEVEL_XP[0] is a placeholder — levels are 1-indexed.
 */
export const LEVEL_XP = [
    0,       // placeholder for index 0
    0,       // L1
    1000, 3000, 6000, 10000, 15000, 21000, 29000, 41000, 54000,          // L2..L10
    71500, 94000, 121000, 153000, 191500, 237000, 290000, 351500, 421000, 500000,        // L11..L20
    589000, 689000, 799500, 922000, 1058500, 1209500, 1377500, 1562500, 1766500, 1991500, // L21..L30
    2239000, 2511000, 2809500, 3136000, 3494500, 3887500, 4318000, 4789500, 5306000, 20000000, // L31..L40
    26000000, 33500000, 42500000, 53500000, 66500000, 82000000, 100000000, 121000000, 146000000, 176000000, // L41..L50
    // L51..L80 — post-2025 expansion, calibrated so L80 threshold ≈ 575M
    // (matching the real-world data point of a L80 trainer with that total XP).
    // Linear interpolation from L50=176M to L80=575M, ≈ +13.3M per level.
    189300000, 202600000, 215900000, 229200000, 242500000, 255800000, 269100000, 282400000, 295700000, 309000000, // L51..L60
    322300000, 335600000, 348900000, 362200000, 375500000, 388800000, 402100000, 415400000, 428700000, 442000000, // L61..L70
    455300000, 468600000, 481900000, 495200000, 508500000, 521800000, 535100000, 548400000, 561700000, 575000000  // L71..L80
];

export const MAX_LEVEL = 80;

/**
 * Given a total XP value, return the trainer level implied by it.
 * Returns 1 for falsy/zero input. Caps at MAX_LEVEL.
 *
 * Used as:
 *   - Sanity floor: if OCR-detected level < levelFromXp(xp), keep the stored value
 *   - Retroactive migration: recompute level for users whose stored level
 *     is clearly inconsistent with their XP
 */
export function levelFromXp(xp) {
    const x = Number(xp) || 0;
    if (x <= 0) return 1;
    // Walk from the top down — cheaper than binary search for small table,
    // and the distribution skews towards high levels in practice.
    for (let lvl = MAX_LEVEL; lvl >= 1; lvl--) {
        if (x >= LEVEL_XP[lvl]) return lvl;
    }
    return 1;
}

/**
 * Validate an OCR-detected level against the XP.
 * Returns the level to keep: the higher of (detected, floor-from-xp).
 * This prevents OCR misreads (e.g. "L2" for a L80 trainer) from overwriting.
 */
export function reconcileLevel(detectedLevel, xp, previousLevel) {
    const floor = levelFromXp(xp);
    const detected = Number(detectedLevel) || 0;
    const previous = Number(previousLevel) || 0;
    // Pick the highest plausible value, but don't exceed MAX_LEVEL.
    return Math.min(MAX_LEVEL, Math.max(floor, detected, previous));
}
