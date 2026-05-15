'use client';

import { useLanguage } from '@/context/LanguageContext';
import { MEDALS } from './PokemonMedals';

// ─── Sprite URL generator (mirrors PokemonMedals.js) ───
const BULBA_OVERRIDES = {
    'Fisher': 'Fisherman',
    'Kanto': 'Region',
    'Picnicker': 'Picknicker',
    'Butterfly Collector': 'Vivillon_Collector',
    'Rail Staff': 'Depot_Agent',
};
const BULBA_TIER = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum' };

function getMedalSpriteUrl(medalId, tier) {
    const bulbaName = BULBA_OVERRIDES[medalId] || medalId.replace(/ /g, '_');
    const bulbaTier = BULBA_TIER[tier] || 'Bronze';
    return `https://archives.bulbagarden.net/wiki/Special:FilePath/GO_${encodeURIComponent(bulbaName)}_${bulbaTier}_Medal.png`;
}

function parseVal(v) { return parseInt(String(v).replace(/[\s,]/g, '')) || 0; }

function getTier(value, thresholds) {
    const v = parseVal(value);
    if (v >= thresholds[3]) return 'platinum';
    if (v >= thresholds[2]) return 'gold';
    if (v >= thresholds[1]) return 'silver';
    if (v >= thresholds[0]) return 'bronze';
    return 'none';
}

const TIER_COLORS = {
    none: 'text-gray-600',
    bronze: 'text-amber-600',
    silver: 'text-gray-300',
    gold: 'text-yellow-400',
    platinum: 'text-cyan-300',
};
const TIER_BORDERS = {
    none: 'border-white/5',
    bronze: 'border-amber-700/40',
    silver: 'border-gray-300/30',
    gold: 'border-yellow-400/40',
    platinum: 'border-cyan-300/40',
};
const TIER_BG = {
    none: 'bg-white/[0.02]',
    bronze: 'bg-amber-900/10',
    silver: 'bg-gray-400/5',
    gold: 'bg-yellow-900/10',
    platinum: 'bg-cyan-900/10',
};

export default function PublicMedals({ medals }) {
    const { lang } = useLanguage();

    if (!medals || Object.keys(medals).length === 0) return null;

    // Only show medals that have a value > 0
    const activeMedals = MEDALS
        .filter(m => parseVal(medals[m.id]) > 0)
        .map(m => {
            const val = parseVal(medals[m.id]);
            const tier = getTier(val, m.thresholds);
            const displayTier = tier === 'none' ? 'bronze' : tier;
            return { ...m, val, tier, displayTier };
        });

    if (activeMedals.length === 0) return null;

    const getName = (m) => lang === 'ja' ? m.nameJa : lang === 'en' ? m.nameEn : m.name;

    return (
        <div className="mt-4 w-full">
            <h3 className="text-sm font-bold text-cyan-300 flex items-center gap-2 mb-3">
                <img
                    src={getMedalSpriteUrl('Champion', 'platinum')}
                    alt=""
                    className="w-4 h-4 object-contain"
                    referrerPolicy="no-referrer"
                />
                {lang === 'ja' ? 'メダル' : lang === 'en' ? 'Medals' : 'Médailles'} ({activeMedals.length})
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                {activeMedals.map(m => (
                    <div
                        key={m.id}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border ${TIER_BORDERS[m.tier]} ${TIER_BG[m.tier]} transition-colors hover:bg-white/5`}
                        title={`${getName(m)} — ${m.val.toLocaleString()}`}
                    >
                        <img
                            src={getMedalSpriteUrl(m.id, m.displayTier)}
                            alt={getName(m)}
                            className={`w-8 h-8 object-contain ${m.tier === 'none' ? 'opacity-30 grayscale' : ''}`}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                        />
                        <span className={`text-[8px] leading-tight text-center truncate w-full font-medium ${TIER_COLORS[m.tier]}`}>
                            {getName(m)}
                        </span>
                        <span className={`text-[9px] font-bold tabular-nums ${TIER_COLORS[m.tier]}`}>
                            {m.val.toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
