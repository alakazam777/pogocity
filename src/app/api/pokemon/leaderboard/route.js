import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/pokemonStorage';
import { UNRELEASED_IDS } from '@/data/constants';

export const dynamic = 'force-dynamic';

// In-process cache for the leaderboard response. Computing this scans every
// user, walks their full checklist + history, and sums weekly deltas — not
// cheap. Cached for 30s so a burst of pageviews (page mounts on /rankings,
// /trainers, etc.) doesn't recompute identical data 10x. 30s is well below
// any user-perceivable staleness for a leaderboard.
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 30_000;

export async function GET() {
    const now = Date.now();
    if (_cache && (now - _cacheAt) < CACHE_TTL_MS) {
        return NextResponse.json(_cache);
    }

    try {
        const users = await getAllUsers();

        const leaderboardData = Object.values(users)
            // Exclude:
            //   - hidden:        explicit user/admin hide flag
            //   - _mergedInto:   stub records left behind by the
            //     link-discord/link-apple merge flow. Their data lives on
            //     the target account; showing them here causes duplicates
            //     in rankings (e.g. both "Maxime866" and "max866").
            .filter(user => !user.hidden && !user._mergedInto)
            .map(user => {
                // Calculate collection stats
                let collectionScore = 0;
                let pokedex = 0;
                let shinydex = 0;
                let xxldex = 0;
                let xxsdex = 0;

                let hundo = 0;
                let shadow = 0;
                let purified = 0;
                let luckydex = 0;

                if (user.checklist) {
                    const uniqueDexIds = new Set();
                    const uniqueShinyIds = new Set();
                    const uniqueLuckyIds = new Set();

                    Object.entries(user.checklist).forEach(([key, pokemon]) => {
                        // Handle forms: 201_00 -> baseId 201
                        const baseId = key.includes('_') ? key.split('_')[0] : key;
                        const numericId = parseInt(baseId);

                        // Skip unreleased Pokémon
                        if (UNRELEASED_IDS.includes(numericId)) return;

                        if (pokemon.normal) uniqueDexIds.add(baseId);

                        collectionScore += Object.values(pokemon).filter(Boolean).length;

                        // Count attributes (unique per base Pokémon for dex counts)
                        if (pokemon.shiny) uniqueShinyIds.add(baseId);
                        if (pokemon.lucky) uniqueLuckyIds.add(baseId);
                        if (pokemon.xxl) xxldex++;
                        if (pokemon.xxs) xxsdex++;
                        if (pokemon.hundo) hundo++;
                        if (pokemon.shadow) shadow++;
                        if (pokemon.purified) purified++;
                    });

                    pokedex = uniqueDexIds.size;
                    shinydex = uniqueShinyIds.size;
                    luckydex = uniqueLuckyIds.size;
                }

                // Calculate stats this week (since Monday)
                let caughtThisWeek = 0;
                let stopsThisWeek = 0;
                let xpThisWeek = 0;
                let distanceThisWeek = 0;

                const now = new Date();
                const dayOfWeek = now.getDay(); // 0 is Sunday
                const diffToMonday = (dayOfWeek + 6) % 7; // Calculate days since Monday
                const monday = new Date(now);
                monday.setDate(now.getDate() - diffToMonday);
                monday.setHours(0, 0, 0, 0);

                // Only calculate delta if the user has updated THIS week
                const lastUpdateDate = user.lastUpdated ? new Date(user.lastUpdated) : new Date(0);

                const currentCaught = parseInt(user.stats?.caught || 0);
                const currentStops = parseInt(user.stats?.stops || 0);
                const currentXp = parseInt(user.stats?.xp || 0);
                const currentDistance = parseInt(user.stats?.distance || 0);

                const calculateDelta = (current, old) => {
                    const val = parseInt(old);
                    return (!isNaN(val) && current > val) ? current - val : 0;
                };

                // Sort history by date ascending
                const sortedHistory = user.history ? [...user.history].sort((a, b) => new Date(a.date) - new Date(b.date)) : [];

                // Find the last entry BEFORE Monday
                const entryBeforeMonday = sortedHistory.filter(h => new Date(h.date) < monday).pop();

                // Find the first entry OF the week (on or after Monday)
                const firstEntryOfWeek = sortedHistory.find(h => new Date(h.date) >= monday);

                // Global weekly average from full history
                // Uses current stats as the newest data point for consistency (avoids race condition
                // where the newest history entry may or may not include the latest upload)
                let isWeeklyEstimated = false;

                // Find oldest entry that has valid caught stats (skip entries with undefined/0 caught)
                const validHistory = sortedHistory.filter(h => h.stats && parseInt(h.stats.caught || 0) > 0);

                if (validHistory.length >= 1) {
                    const oldest = validHistory[0];
                    const oldestDate = new Date(oldest.date);
                    const daysBetween = (now - oldestDate) / (1000 * 60 * 60 * 24);

                    if (daysBetween >= 1 && oldest.stats) {
                        const weeks = Math.max(daysBetween / 7, 1);
                        const totalCaughtDelta = calculateDelta(currentCaught, parseInt(oldest.stats.caught || 0));
                        const totalStopsDelta = calculateDelta(currentStops, parseInt(oldest.stats.stops || 0));
                        const totalXpDelta = calculateDelta(currentXp, parseInt(oldest.stats.xp || 0));
                        const totalDistDelta = calculateDelta(currentDistance, parseInt(oldest.stats.distance || 0));

                        if (totalCaughtDelta > 0) caughtThisWeek = Math.round(totalCaughtDelta / weeks);
                        if (totalStopsDelta > 0) stopsThisWeek = Math.round(totalStopsDelta / weeks);
                        if (totalXpDelta > 0) xpThisWeek = Math.round(totalXpDelta / weeks);
                        if (totalDistDelta > 0) distanceThisWeek = Math.round(totalDistDelta / weeks);
                        isWeeklyEstimated = true;
                    }
                }

                return {
                    username: user.username,
                    xp: parseInt(user.stats?.xp || 0),
                    caught: parseInt(user.stats?.caught || 0),
                    stops: parseInt(user.stats?.stops || 0),
                    distance: parseInt(user.stats?.distance || 0),
                    stardust: parseInt(String(user.stats?.stardust || 0).replace(/\s/g, '')) || 0,
                    collectionScore,
                    pokedex,
                    shinydex,
                    luckydex,
                    xxldex,
                    xxsdex,
                    hundo,
                    shadow,
                    purified,
                    caughtThisWeek,
                    isWeeklyEstimated,
                    stopsThisWeek,
                    xpThisWeek,
                    distanceThisWeek,
                    trainerColor: user.trainerColor || 'text-purple-400',
                    trainerImage: user.trainerImage || null,
                    lastUpdated: user.lastUpdated,
                    tradeList: user.tradeList || null,
                    level: user.stats?.level || 0,
                    city: user.stats?.city || '',
                    team: user.stats?.team || null,
                    // Honour the user's privacy preference: only expose
                    // friendCode if they haven't opted out. The frontend
                    // already gates on this, but enforcing at the API level
                    // means scraping the endpoint can't bypass the UI.
                    friendCode: user.settings?.showFriendCode !== false
                        ? (user.stats?.friendCode || null)
                        : null,
                    discordId: user.discordId || null,
                    settings: user.settings || {},
                    medals: user.medals || {},
                    history: user.history || [],
                    favorites: user.favorites || []
                };
            });

        // Sort by XP descending
        leaderboardData.sort((a, b) => b.xp - a.xp);

        // Cache the computed result for the next 30s of requests.
        _cache = leaderboardData;
        _cacheAt = Date.now();

        return NextResponse.json(leaderboardData);
    } catch (error) {
        console.error('Leaderboard error:', error);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
