'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Swords, Info, ChevronDown } from 'lucide-react';
import dynamaxData from '@/data/dynamax_attackers.json';
import { useLanguage } from '@/context/LanguageContext';
import { translateMove } from '@/data/moveTranslations';
import { translatePokemonName } from '@/lib/pokemonNameI18n';

// ─── FR type name → i18n key ───
const typeFrToKey = {
    "Normal": "normal", "Feu": "fire", "Eau": "water", "Plante": "grass",
    "Électrik": "electric", "Glace": "ice", "Combat": "fighting", "Poison": "poison",
    "Sol": "ground", "Vol": "flying", "Psy": "psychic", "Insecte": "bug",
    "Roche": "rock", "Spectre": "ghost", "Dragon": "dragon", "Acier": "steel",
    "Ténèbres": "dark", "Fée": "fairy",
};

// ─── Type styling ───
const typeInfo = dynamaxData.typeInfo;
const getTypeColor = (t) => typeInfo[t]?.color || "#777";
const getTypeIcon = (typeName) => {
    const icon = typeInfo[typeName]?.icon;
    return icon ? `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${icon}.svg` : null;
};

// ─── GMAX local sprites ───
const gmaxSprites = {
    6: '/GMAX/dracaufeu.webp', 9: '/GMAX/tortank.webp', 3: '/GMAX/florizarre.webp',
    12: '/GMAX/papilusion.webp', 569: '/GMAX/miasmax.webp', 94: '/GMAX/ectoplasma.webp',
    68: '/GMAX/mackogneur.webp', 143: '/GMAX/ronflex.webp', 131: '/GMAX/lokhlass.webp',
    99: '/GMAX/krabboss.webp', 815: '/GMAX/pyrobut.webp', 812: '/GMAX/gorythmic.webp',
    879: '/GMAX/angoliath.webp', 849: '/GMAX/salarsen1.webp',
};

// Special form sprites
const formSprites = {
    888: 'https://img.pokemondb.net/sprites/home/normal/zacian-crowned.png',    // Zacian Épée Suprême
    889: 'https://img.pokemondb.net/sprites/home/normal/zamazenta-crowned.png', // Zamazenta Bouclier Suprême
};

const getPokemonSprite = (pokemon) => {
    if (pokemon.isGmax && gmaxSprites[pokemon.id]) return gmaxSprites[pokemon.id];
    if (formSprites[pokemon.id] && !pokemon.isGmax) return formSprites[pokemon.id];
    const nameEn = (pokemon.nameEn || '').toLowerCase()
        .replace(/\s+/g, '-').replace(/'/g, '').replace(/\./g, '')
        .replace(/é/g, 'e').replace(/è/g, 'e');
    return `https://img.pokemondb.net/sprites/home/normal/${nameEn}.png`;
};

const getFallbackSprite = (id) =>
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

// ─── Move type mapping ───
const moveTypeMap = {
    // Quick moves
    "Griffe Acier": "Acier", "Taillade": "Insecte", "Piqûre": "Insecte", "Balayage": "Combat",
    "Riposte": "Combat", "Pisto-Poing": "Acier", "Draco-Souffle": "Dragon", "Draco-Queue": "Dragon",
    "Pistolet à O": "Eau", "Écume": "Eau", "Cascade": "Eau", "Étincelle": "Électrik",
    "Éclair": "Électrik", "Charme": "Fée", "Charge": "Normal", "Danse Flammes": "Feu",
    "Crocs Feu": "Feu", "Calcination": "Feu", "Éclats Glace": "Glace", "Souffle Glacé": "Glace",
    "Léchouille": "Spectre", "Griffe Ombre": "Spectre", "Écras'Face": "Normal", "Griffe": "Normal",
    "Fouet Lianes": "Plante", "Tranch'Herbe": "Plante", "Direct Toxik": "Poison",
    "Dard-Venin": "Poison", "Harcèlement": "Ténèbres", "Coupe Psycho": "Psy", "Psykoud'Boul": "Psy",
    "Choc Mental": "Psy", "Anti-Air": "Roche", "Jet-Pierres": "Roche", "Tir de Boue": "Sol",
    "Coud'Boue": "Sol", "Cru-Ailes": "Vol", "Lame d'Air": "Vol", "Jet de Sable": "Sol",
    "Coup Bas": "Ténèbres", "Feinte": "Ténèbres", "Morsure": "Ténèbres", "Aboiement": "Ténèbres",
    "Poing Karaté": "Combat", "Double Pied": "Combat",
    // Charged moves
    "Gladius Maximus": "Acier", "Poing Météore": "Acier", "Tête de Fer": "Acier", "Aegis Maxima": "Acier",
    "Luminocanon": "Acier", "Frappe G-Max": "Combat", "Dynamo-Poing": "Combat", "Close Combat": "Combat",
    "Casse-Brique": "Combat", "Surpuissance": "Combat", "Canon Dynamax": "Dragon",
    "Draco-Griffe": "Dragon", "Colère": "Dragon", "Gâchette G-Max": "Eau", "Bulles G-Max": "Eau",
    "Canonnade G-Max": "Eau", "Hydrocanon": "Eau", "Vibraqua": "Eau", "Choc G-Max": "Électrik",
    "Tonnerre": "Électrik", "Éclair Fou": "Électrik", "Foudre G-Max": "Électrik",
    "Éclat Magique": "Fée", "Pyroball G-Max": "Feu", "Fournaise G-Max": "Feu",
    "Surchauffe": "Feu", "Déflagration": "Feu", "Rafale Feu": "Feu", "Résonance G-Max": "Glace",
    "Avalanche": "Glace", "Triple Axel": "Glace", "Illusion G-Max": "Insecte", "Bourdon": "Insecte",
    "Stockpile G-Max": "Normal", "Ultralaser": "Normal", "Jackpot G-Max": "Normal",
    "Percussion G-Max": "Plante", "Fouet G-Max": "Plante", "Végé-Attaque": "Plante",
    "Lame Feuille": "Plante", "Pestilence G-Max": "Poison", "Bombe Beurk": "Poison",
    "Psyko": "Psy", "Laser Météore": "Roche", "Éboulement": "Roche", "Lame de Roc": "Roche",
    "Sable Ardent": "Sol", "Hantise G-Max": "Spectre", "Ball'Ombre": "Spectre",
    "Torpeur G-Max": "Ténèbres", "Représailles": "Ténèbres", "Tricherie": "Ténèbres",
    "Mâchouille": "Ténèbres", "Piqué": "Vol",
};

// ─── Type Icon ───
function TypeIcon({ typeName, size = 24 }) {
    const iconUrl = getTypeIcon(typeName);
    if (!iconUrl) return null;
    return (
        <div className="shrink-0" style={{
            width: size, height: size, backgroundColor: getTypeColor(typeName),
            maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})`,
            maskSize: 'contain', WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center', WebkitMaskPosition: 'center'
        }} />
    );
}

// ─── DPS Tooltip ───
function DpsTooltip({ children, forceBelow = false }) {
    const { t } = useLanguage();
    const [show, setShow] = useState(false);
    const [below, setBelow] = useState(forceBelow);
    const ref = useRef(null);

    const handleOpen = () => {
        if (ref.current && !forceBelow) {
            const rect = ref.current.getBoundingClientRect();
            // If less than 200px above the element, show below
            setBelow(rect.top < 200);
        }
        setShow(true);
    };

    return (
        <div className="relative inline-flex" ref={ref}
            onMouseEnter={handleOpen} onMouseLeave={() => setShow(false)}
            onClick={() => show ? setShow(false) : handleOpen()}>
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: below ? -4 : 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: below ? -4 : 4 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-50 right-0 w-56 p-2.5 rounded-xl border border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md shadow-2xl text-[10px] text-gray-300 leading-relaxed ${below ? 'top-full mt-2' : 'bottom-full mb-2'}`}
                    >
                        <p className="font-bold text-white text-[11px] mb-1">{t('dynamax.dpsScore')}</p>
                        <p>{t('dynamax.dpsScoreDesc')}</p>
                        <ul className="mt-1 space-y-0.5 list-disc list-inside text-gray-400">
                            <li>{t('dynamax.fastAttackPower')}</li>
                            <li>{t('dynamax.maxAttackPower')}</li>
                            <li>{t('dynamax.stabBonus')}</li>
                            <li>{t('dynamax.baseStats')}</li>
                        </ul>
                        <p className="mt-1.5 text-gray-500 italic">{t('dynamax.scoreExplanation')}</p>
                        {/* Arrow */}
                        <div className={`absolute ${below ? 'top-[-5px] right-4 rotate-45 border-l border-t' : 'bottom-[-5px] right-4 rotate-45 border-r border-b'} w-2.5 h-2.5 bg-[#1a1a1a]/95 border-white/10`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── DPS Bar ───
function DpsBar({ dps, maxDps, color }) {
    const pct = Math.min((dps / maxDps) * 100, 100);
    return (
        <div className="flex items-center gap-2 w-full mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${color}90, ${color})` }}
                />
            </div>
            <DpsTooltip>
                <span className="text-[11px] font-black tabular-nums w-10 text-right cursor-help" style={{ color }}>
                    {dps.toFixed(1)}
                </span>
            </DpsTooltip>
        </div>
    );
}

// ─── Pokemon Row ───
function PokemonRow({ pokemon, idx, accent, maxDps }) {
    const { lang } = useLanguage();
    const displayName = translatePokemonName(pokemon.nameFr, lang);
    const quickMove = translateMove(pokemon.quickMoveFr, lang);
    const quickMove2 = translateMove(pokemon.quickMoveFr2, lang);
    const chargedMove = translateMove(pokemon.chargedMoveFr, lang);
    const maxMove = translateMove(pokemon.maxMoveFr, lang);
    return (
        <div className="flex items-center gap-2.5 p-2.5 md:p-3 rounded-xl border border-white/5 hover:bg-white/[0.03] transition-colors group/item relative"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
            {/* Rank */}
            <div className="w-5 text-center text-[10px] font-black text-gray-500 shrink-0">
                {idx + 1}
            </div>

            {/* Sprite */}
            <div className="relative w-11 h-11 md:w-12 md:h-12 flex-shrink-0">
                <img
                    src={getPokemonSprite(pokemon)}
                    alt={displayName}
                    className={`w-full h-full relative z-10 group-hover/item:scale-110 transition-transform duration-300 ${pokemon.isGmax ? 'object-cover rounded-lg' : 'object-contain'}`}
                    onError={(e) => { e.target.onerror = null; e.target.src = getFallbackSprite(pokemon.id); }}
                />
                {pokemon.isGmax && (
                    <div className="absolute -top-1.5 -right-1.5 z-20 bg-gradient-to-br from-pink-500 to-red-600 rounded-md px-1 py-px border border-white/30 shadow-lg">
                        <span className="text-[6px] font-black text-white leading-none">GMAX</span>
                    </div>
                )}
            </div>

            {/* Info + DPS bar */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="font-bold text-sm md:text-base text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{displayName}</span>
                            {pokemon.form && <span className="text-[9px] text-gray-500 font-medium">({pokemon.form})</span>}
                        </div>
                    </div>

                    {/* Moves */}
                    <div className="flex-shrink-0 text-right">
                        <div className="flex items-center gap-1 justify-end">
                            <TypeIcon typeName={moveTypeMap[pokemon.quickMoveFr] || ''} size={10} />
                            <span className="text-[10px] font-semibold text-gray-300">{quickMove}</span>
                            {pokemon.quickMoveFr2 && (
                                <>
                                    <span className="text-[8px] text-gray-500">/</span>
                                    <TypeIcon typeName={moveTypeMap[pokemon.quickMoveFr2] || ''} size={10} />
                                    <span className="text-[10px] font-semibold text-gray-400">{quickMove2}</span>
                                </>
                            )}
                            {pokemon.quickMoveSpeed && (
                                <span className={`text-[8px] font-black px-1 py-px rounded ${pokemon.quickMoveSpeed <= 0.5 ? 'bg-green-500/20 text-green-400' : pokemon.quickMoveSpeed <= 1.0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {pokemon.quickMoveSpeed}s
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                            {pokemon.chargedMoveFr && (
                                <>
                                    <TypeIcon typeName={moveTypeMap[pokemon.chargedMoveFr] || ''} size={10} />
                                    <span className="text-[10px] font-semibold text-cyan-300">{chargedMove}</span>
                                    <span className="text-[8px] text-gray-500 mx-0.5">→</span>
                                </>
                            )}
                            <TypeIcon typeName={moveTypeMap[pokemon.maxMoveFr] || ''} size={10} />
                            <span className={`text-[10px] font-semibold ${pokemon.isGmax ? 'text-pink-300' : 'text-cyan-300'}`}>
                                {maxMove}
                            </span>
                        </div>
                    </div>
                </div>

                {/* DPS bar */}
                <DpsBar dps={pokemon.dps} maxDps={maxDps} color={accent} />
            </div>
        </div>
    );
}

// ─── Type Card ───
function TypeCard({ typeName, pokemon, accent }) {
    const { t } = useLanguage();
    const maxDps = Math.max(...pokemon.map(p => p.dps));
    const sorted = [...pokemon].sort((a, b) => b.dps - a.dps);
    const typeKey = typeFrToKey[typeName];
    const typeLabel = typeKey ? t(`types.${typeKey}`) : typeName;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group overflow-visible rounded-2xl border p-4 md:p-5 hover:border-white/20 transition-all duration-500 shadow-xl"
            style={{ borderColor: `${accent}25`, background: `linear-gradient(145deg, ${accent}0D, #0d0d0d 60%)` }}
        >
            {/* Type header */}
            <div className="flex items-center justify-center gap-2.5 mb-4 p-2 rounded-xl w-full"
                style={{ backgroundColor: `${accent}0C`, border: `1px solid ${accent}18` }}>
                <TypeIcon typeName={typeName} size={22} />
                <h2 className="text-sm md:text-lg font-black uppercase tracking-tight text-white">
                    {typeLabel}
                </h2>
            </div>

            {/* All attackers sorted by DPS */}
            <div className="space-y-2">
                {sorted.map((p, idx) => (
                    <PokemonRow
                        key={`${p.nameFr}-${p.form || ''}-${p.isGmax}-${idx}`}
                        pokemon={p} idx={idx} accent={accent} maxDps={maxDps}
                    />
                ))}
            </div>

            {/* Bg deco */}
            <div className="absolute bottom-[-10px] right-[-3px] text-7xl font-black select-none pointer-events-none opacity-[0.025] group-hover:opacity-[0.05] transition-opacity duration-500 italic overflow-hidden"
                style={{ color: accent }}>
                D
            </div>
        </motion.div>
    );
}

// ─── Strategic Tips ───
function StrategicTips() {
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);
    const tips = [
        {
            title: t('dynamax.teamOrder'),
            text: t('dynamax.teamOrderDesc'),
            icon: "1️⃣"
        },
        {
            title: t('dynamax.tankRole'),
            text: t('dynamax.tankRoleDesc'),
            icon: "🛡️"
        },
        {
            title: t('dynamax.optimizeSwitch'),
            text: t('dynamax.optimizeSwitchDesc'),
            icon: "🔄"
        },
        {
            title: t('dynamax.gigamaxPower'),
            text: t('dynamax.gigamaxPowerDesc'),
            icon: "💪"
        },
        {
            title: t('dynamax.dodgeEnergy'),
            text: t('dynamax.dodgeEnergyDesc'),
            icon: "⚡"
        }
    ];

    return (
        <div className="mb-8 max-w-3xl mx-auto">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all group"
            >
                <span className="text-sm">⚔️</span>
                <span className="text-xs md:text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                    {t('dynamax.strategicTips')}
                </span>
                <ChevronDown
                    size={14}
                    className={`text-gray-500 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {tips.map((tip, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.07 }}
                                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-base">{tip.icon}</span>
                                        <h3 className="text-xs font-bold text-white uppercase tracking-wide">{tip.title}</h3>
                                    </div>
                                    <p className="text-[11px] leading-relaxed text-gray-400">{tip.text}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Dynamax Content (embeddable) ───
export function DynamaxContent({ embedded = false }) {
    const { t } = useLanguage();
    const [typeFilter, setTypeFilter] = useState('all');

    const typeEntries = useMemo(() =>
        Object.entries(dynamaxData.attackersByType)
            .map(([type, data]) => ({ type, pokemon: data.pokemon, color: typeInfo[type]?.color || '#777' }))
            .filter(e => e.pokemon.length > 0)
    , []);

    const filteredEntries = typeFilter === 'all'
        ? typeEntries
        : typeEntries.filter(e => e.type === typeFilter);

    const allTypes = Object.keys(dynamaxData.attackersByType).sort();

    return (
        <div className={embedded ? '' : 'min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-2 md:px-4'}>
            <div className={embedded ? '' : 'w-full md:max-w-[90%] mx-auto'}>

                {/* Title */}
                {!embedded && (
                <div className="mb-8 mt-4 text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <img src="/dynamax-cloud.png" alt="" className="w-10 h-10 md:w-12 md:h-12 object-contain opacity-70" />
                        <h1 className="text-3xl md:text-5xl font-extrabold uppercase tracking-normal bg-gradient-to-b from-pink-400 via-red-500 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_2px_15px_rgba(236,72,153,0.4)]"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                            {t('dynamax.title')}
                        </h1>
                    </div>
                    <p className="text-gray-500 mt-2 text-xs md:text-sm max-w-xl mx-auto">
                        {t('dynamax.subtitle')}
                    </p>
                    <div className="flex justify-center mt-3">
                        <DpsTooltip>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] cursor-help hover:bg-white/[0.06] transition-colors">
                                <Info size={12} className="text-gray-400" />
                                <span className="text-[10px] md:text-xs text-gray-400 font-semibold">{t('dynamax.dpsScore')}</span>
                            </div>
                        </DpsTooltip>
                    </div>
                </div>
                )}

                {/* Type Filter */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-3xl">
                        <button
                            onClick={() => setTypeFilter('all')}
                            className={`px-3 py-1 text-[10px] md:text-xs rounded-full border transition-all font-bold
                                ${typeFilter === 'all'
                                    ? 'bg-white/10 border-white/30 text-white'
                                    : 'bg-black/30 border-white/5 text-gray-500 hover:bg-white/5'}`}
                        >
                            {t('common.all')}
                        </button>
                        {allTypes.map(type => {
                            const c = getTypeColor(type);
                            const tKey = typeFrToKey[type];
                            const tLabel = tKey ? t(`types.${tKey}`) : type;
                            return (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
                                    className={`px-2 py-1 text-[10px] md:text-xs rounded-full border transition-all font-bold flex items-center gap-1
                                        ${typeFilter === type
                                            ? 'border-white/30 text-white scale-105'
                                            : 'border-white/5 text-gray-500 hover:bg-white/5'}`}
                                    style={typeFilter === type ? {
                                        backgroundColor: `${c}30`, borderColor: `${c}50`
                                    } : { backgroundColor: 'rgba(0,0,0,0.3)' }}
                                >
                                    <TypeIcon typeName={type} size={10} />
                                    {tLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Strategic Tips */}
                <StrategicTips />

                {/* Cards Grid */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={typeFilter}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                    >
                        {filteredEntries.map(({ type, pokemon, color }) => (
                            <TypeCard key={type} typeName={type} pokemon={pokemon} accent={color} />
                        ))}
                    </motion.div>
                </AnimatePresence>

                {filteredEntries.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-lg font-medium">{t('dynamax.noAttackerFound')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Default Page Export ───
export default function AttaquantsDynamaxPage() {
    return <DynamaxContent embedded={false} />;
}
