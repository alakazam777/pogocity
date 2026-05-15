'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Swords, Shield, Zap } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { topPokemon } from '@/data/topPokemon';
import { POKEMON_DATA } from '@/data/pokemon';
import { moveTypeMapping } from '@/data/moveTypeMapping';
import { translateMove } from '@/data/moveTranslations';
import { translatePokemonName } from '@/lib/pokemonNameI18n';

export default function PvpRankingList({ filterName }) {
    const { t, lang } = useLanguage();
    const leagueDisplayLabel = (
        filterName === 'Ligue Master' ? t('rankings.masterLeague') :
        filterName === 'Ligue Hyper' ? t('rankings.hyperLeague') :
        filterName === 'Ligue Super' ? t('rankings.superLeague') :
        filterName
    );
    const [displayCount, setDisplayCount] = useState(50);
    const [expandedId, setExpandedId] = useState(null);
    const [search, setSearch] = useState('');

    // Retry handler for images that fail due to rate limiting
    const handleImgError = (e) => {
        const img = e.target;
        const retries = parseInt(img.dataset.retries || '0');
        if (retries < 3) {
            img.dataset.retries = retries + 1;
            setTimeout(() => {
                img.src = img.src; // Re-trigger load
            }, 1000 * (retries + 1));
        }
    };

    const pokedexMap = useMemo(() => {
        const map = new Map();
        POKEMON_DATA.forEach(p => {
            if (p.nameEn && p.nameFr) {
                map.set(p.nameEn.toLowerCase(), { nameFr: p.nameFr, id: p.id });
                // Also index by French name for opponent lookups
                map.set(p.nameFr.toLowerCase(), { nameFr: p.nameFr, id: p.id });
            }
        });
        return map;
    }, []);

    // First convert raw underscore-form or hyphen-form opponent name to a canonical
    // FR name, then pass through translatePokemonName to handle the current UI language.
    const toCanonicalFrName = (rawName) => {
        if (!rawName) return rawName;
        let name = rawName;
        let suffix = '';
        // Normalize separators: snake_case and kebab-case form suffixes are both used.
        // Pokémon base name can itself contain hyphens (e.g. "ho-oh", "kommo-o"),
        // so we only split on the LAST separator and verify the suffix is a known form.
        const formTranslations = {
            'origin': ' (Originelle)', 'black': ' (Noir)', 'white': ' (Blanc)',
            'shadow': ' (Obscur)', 'alolan': ' (Alola)', 'galarian': ' (Galar)',
            'hisuian': ' (Hisui)', 'paldean': ' (Paldea)', 'therian': ' (Totémique)',
            'incarnate': ' (Avatar)', 'crowned': ' (Couronné)', 'altered': ' (Altéré)',
            'attack': ' (Attaque)', 'defense': ' (Défense)', 'speed': ' (Vitesse)',
            'normal': '', 'sky': ' (Céleste)', 'land': ' (Terrestre)',
            'sunny': ' (Soleil)', 'rainy': ' (Pluie)', 'snowy': ' (Neige)',
            'super': ' (Maxi)', 'small': ' (Mini)', 'large': ' (Étiré)',
            'ordinary': '', 'resolute': ' (Résolu)',
            'full-belly': ' (Plein le Bide)', 'hangry': ' (Flemme au Ventre)',
            'single-strike': ' (Poing Final)', 'rapid-strike': ' (Mille Poings)',
            'chill': '', 'shock': '',
            'primal': 'Primo-', 'mega': 'Méga-',
        };
        const knownForms = Object.keys(formTranslations);
        // Try each known form suffix against the raw name.
        let formPart = null;
        let baseName = name;
        for (const form of knownForms) {
            const rxU = new RegExp('[-_]' + form.replace(/-/g, '[-_]') + '$', 'i');
            if (rxU.test(name)) {
                formPart = form;
                baseName = name.replace(rxU, '');
                break;
            }
        }
        if (formPart) {
            suffix = formTranslations[formPart];
            if (formPart === 'primal' || formPart === 'mega') {
                suffix = '';
                baseName = formTranslations[formPart] + baseName;
            }
            name = baseName;
        }
        // Normalize remaining hyphens to spaces for lookup (e.g. "ho-oh" → "ho oh")
        const lookupKey = name.replace(/-/g, ' ').toLowerCase();
        const entry = pokedexMap.get(lookupKey) || pokedexMap.get(name.toLowerCase());
        if (entry && entry.nameFr) {
            return entry.nameFr + suffix;
        }
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        return capitalized + suffix;
    };

    const translateOpponentName = (rawName) => {
        const canonicalFr = toCanonicalFrName(rawName);
        return translatePokemonName(canonicalFr, lang);
    };

    const getOpponentSprite = (rawName) => {
        if (!rawName) return null;
        let name = rawName;
        // Strip form suffixes (underscore or hyphen-based)
        if (name.includes('_')) name = name.split('_')[0];
        // Try direct lookup (works for both English and French names now)
        let entry = pokedexMap.get(name.toLowerCase());
        if (!entry) {
            // Try replacing hyphens with spaces (e.g. "Tapu-bulu" -> "tapu bulu")
            entry = pokedexMap.get(name.replace(/-/g, ' ').toLowerCase());
        }
        if (!entry) {
            // Try stripping parenthetical forms: "Smogogo (Galar)" -> "Smogogo"
            const base = name.replace(/\s*\(.*?\)\s*/g, '').trim();
            entry = pokedexMap.get(base.toLowerCase());
        }
        if (entry && entry.id) {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`;
        }
        return null;
    };

    const typeMapFrToEn = {
        "Normal": "normal", "Feu": "fire", "Eau": "water", "Plante": "grass",
        "Électrik": "electric", "Glace": "ice", "Combat": "fighting", "Poison": "poison",
        "Sol": "ground", "Vol": "flying", "Psy": "psychic", "Insecte": "bug",
        "Roche": "rock", "Spectre": "ghost", "Dragon": "dragon", "Acier": "steel",
        "Ténèbres": "dark", "Fée": "fairy"
    };
    const getTypeIcon = (t) => {
        if (!t) return null;
        const en = typeMapFrToEn[t] || t.toLowerCase();
        return en ? `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${en}.svg` : null;
    };
    const getTypeColor = (t) => {
        if (!t) return "#777";
        const colors = {
            "Normal": "#A8A878", "Feu": "#F08030", "Eau": "#6890F0", "Plante": "#78C850",
            "Électrik": "#F8D030", "Glace": "#98D8D8", "Combat": "#C03028", "Poison": "#A040A0",
            "Sol": "#E0C068", "Vol": "#A890F0", "Psy": "#F85888", "Insecte": "#A8B820",
            "Roche": "#B8A038", "Spectre": "#705898", "Dragon": "#7038F8", "Acier": "#B8B8D0",
            "Ténèbres": "#705848", "Fée": "#EE99AC"
        };
        return colors[t] || colors[t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()] || "#777";
    };
    function getTypeGradient(type) {
        const gradients = {
            'Dragon': 'from-indigo-700 to-purple-500', 'Feu': 'from-orange-600 to-red-500',
            'Eau': 'from-blue-600 to-cyan-400', 'Plante': 'from-green-600 to-emerald-400',
            'Électrik': 'from-yellow-500 to-amber-300', 'Glace': 'from-cyan-400 to-blue-200',
            'Combat': 'from-red-700 to-orange-500', 'Poison': 'from-purple-600 to-fuchsia-400',
            'Sol': 'from-amber-700 to-yellow-500', 'Vol': 'from-sky-400 to-indigo-300',
            'Psy': 'from-pink-500 to-purple-400', 'Insecte': 'from-lime-600 to-green-400',
            'Roche': 'from-amber-800 to-stone-500', 'Spectre': 'from-purple-800 to-indigo-600',
            'Ténèbres': 'from-gray-800 to-slate-600', 'Acier': 'from-gray-500 to-slate-400',
            'Fée': 'from-pink-400 to-rose-300', 'Normal': 'from-gray-400 to-stone-300'
        };
        return gradients[type] || 'from-gray-600 to-gray-400';
    }

    const filteredPokemon = useMemo(() => {
        let data = topPokemon.filter(p => {
            if (!p.categories?.includes(filterName)) return false;
            // Internal IDs with underscores (not display names)
            if (p.name.includes('_') && !p.name.includes(' ')) return false;

            const nameLower = p.name.toLowerCase();

            // ── Filter out English form names that slipped through ──
            const englishForms = [
                'Crowned', 'Therian', 'Incarnate', 'Origin Forme', 'Hero',
                'Dawn Wings', 'Dusk Mane', 'Standard', 'Aria',
                'Black', 'White', 'Zen',
            ];
            if (englishForms.some(f => p.name.includes(f))) return false;

            return true;
        });

        // ── Deduplicate: normalize name for comparison ──
        // Handles cases like "Smogogo (Galar)" appearing twice with different IDs
        const uniqueData = [];
        const seenNormalized = new Set();
        for (const p of data) {
            // Normalize: sort parenthetical forms alphabetically for consistent comparison
            const parts = p.name.match(/^([^(]+)(.*)$/);
            const baseName = parts ? parts[1].trim() : p.name;
            const forms = (p.name.match(/\(([^)]+)\)/g) || []).map(f => f.toLowerCase()).sort().join('|');
            const key = baseName.toLowerCase() + '|' + forms;

            if (seenNormalized.has(key)) continue;
            seenNormalized.add(key);
            uniqueData.push(p);
        }
        data = uniqueData;

        if (search) {
            const q = search.toLowerCase();
            data = data.filter(p => {
                if (p.name.toLowerCase().includes(q)) return true;
                const translated = translatePokemonName(p.name, lang);
                return translated && translated.toLowerCase().includes(q);
            });
        }
        data.sort((a, b) => (a.rankings?.[filterName] || 999) - (b.rankings?.[filterName] || 999));
        return data;
    }, [filterName, search, lang]);

    React.useEffect(() => { setDisplayCount(100); }, [filterName, search]);
    const visiblePokemon = filteredPokemon.slice(0, displayCount);
    const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); };

    const getMoveTypeFn = (moveName) => {
        if (!moveName) return null;
        let name = moveName.trim();
        if (moveTypeMapping[name]) return moveTypeMapping[name];
        const clean = name.replace(/[*†‡]/g, '').trim();
        if (moveTypeMapping[clean]) return moveTypeMapping[clean];
        const normalized = clean.toLowerCase();
        const entry = Object.keys(moveTypeMapping).find(k => k.toLowerCase() === normalized);
        if (entry) return moveTypeMapping[entry];
        if (normalized === "force paume" || normalized === "forte paume") return "Combat";
        if (normalized === "calcination") return "Feu";
        if (normalized === "crocs givré" || normalized === "crocs givre") return "Glace";
        return null;
    };

    const MoveTypeIcon = ({ type, size = "md" }) => {
        if (!type) return null;
        const iconUrl = getTypeIcon(type);
        const color = getTypeColor(type);
        if (!iconUrl) return null;
        const sizeClasses = size === "sm" ? "w-3 h-3" : "w-4 h-4";
        return (<div className={`${sizeClasses} shrink-0`} style={{ backgroundColor: color, maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />);
    };

    return (
        <div>
            <div className="mb-6">
                <div className="relative w-full md:max-w-md mx-auto">
                    <input type="text" placeholder={t('pvp.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" />
                </div>
            </div>
            <motion.div layout className="flex flex-col space-y-4">
                <AnimatePresence mode='popLayout'>
                    {visiblePokemon.map((pokemon, index) => {
                        const rank = pokemon.rankings?.[filterName];
                        const isExpanded = expandedId === pokemon.name;
                        return (
                            <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} key={`${filterName}-${pokemon.id || pokemon.name}-${index}`} onClick={() => toggleExpand(pokemon.name)} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#121212] hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 cursor-pointer">
                                <div className={`absolute inset-0 bg-gradient-to-r ${getTypeGradient(pokemon.type?.[0])} opacity-[0.15] group-hover:opacity-[0.25] transition-opacity`}></div>
                                <div className="flex flex-row items-center md:items-stretch min-h-[80px] md:min-h-[120px] p-3 md:p-4">
                                    <div className="relative z-10 w-16 md:w-32 shrink-0 bg-transparent flex items-center justify-center">
                                        {rank && <div className="absolute -top-1 -left-1 md:top-0 md:left-0 text-lg md:text-3xl font-black text-white/10 select-none">#{rank}</div>}
                                        <div className="w-12 h-12 md:w-20 md:h-20 relative transform group-hover:scale-105 transition-transform duration-300"><img src={pokemon.imageUrl} alt={translatePokemonName(pokemon.name, lang)} loading="lazy" onError={handleImgError} className="w-full h-full object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]" /></div>
                                    </div>
                                    <div className="relative z-10 flex-1 px-3 md:px-4 flex flex-col justify-center border-none md:border-l border-white/5 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-1 md:mb-2">
                                            <h2 className="text-sm md:text-2xl font-bold text-white flex items-center gap-2 truncate">{translatePokemonName(pokemon.name, lang)}</h2>
                                            <div className="flex gap-1 flex-wrap items-center">
                                                {pokemon.type?.map(typeFr => {
                                                    const typeKey = typeMapFrToEn[typeFr];
                                                    const typeLabel = typeKey ? t(`types.${typeKey}`) : typeFr;
                                                    return (
                                                        <div key={typeFr} className="w-4 h-4 md:w-auto md:h-auto md:px-1.5 md:py-0.5 rounded text-[10px] uppercase font-bold text-white shadow-sm border bg-black/40 flex items-center justify-center" style={{ borderColor: getTypeColor(typeFr) }}>
                                                            <div className="w-3 h-3 md:hidden" style={{ backgroundColor: getTypeColor(typeFr), maskImage: `url(${getTypeIcon(typeFr)})`, WebkitMaskImage: `url(${getTypeIcon(typeFr)})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                            <span className="hidden md:inline" style={{ color: getTypeColor(typeFr) }}>{typeLabel}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative z-10 w-36 md:w-96 bg-transparent p-2 md:p-3 flex flex-col justify-center gap-1 md:border-l border-white/5 shrink-0">
                                        <div className="flex flex-col gap-1 items-end md:items-stretch">
                                            <div className="flex items-center gap-1 md:gap-2 justify-end md:justify-start w-full">
                                                <div className="hidden md:block text-[9px] text-gray-500 uppercase w-12 text-right shrink-0">{t('rankings.fastMove')}</div>
                                                <div className="bg-white/5 px-2 py-1 rounded flex items-center gap-1.5 flex-1 max-w-[140px] md:max-w-none"><MoveTypeIcon type={getMoveTypeFn(pokemon.bestMoves?.fast)} size="sm" /><span className="text-[9px] md:text-xs font-medium text-white truncate flex-1">{translateMove(pokemon.bestMoves?.fast, lang) || '-'}</span></div>
                                            </div>
                                            <div className="flex items-center gap-1 md:gap-2 justify-end md:justify-start w-full">
                                                <div className="hidden md:block text-[9px] text-gray-500 uppercase w-12 text-right shrink-0">{t('rankings.chargeMove')}</div>
                                                <div className="bg-white/5 px-2 py-1 rounded flex items-center gap-1.5 flex-1 max-w-[140px] md:max-w-none"><MoveTypeIcon type={getMoveTypeFn(pokemon.bestMoves?.charge)} size="sm" /><span className="text-[9px] md:text-xs font-medium text-white truncate flex-1">{translateMove(pokemon.bestMoves?.charge, lang) || '-'}</span></div>
                                            </div>
                                            {pokemon.bestMoves?.charge2 && (
                                                <div className="flex items-center gap-1 md:gap-2 justify-end md:justify-start w-full">
                                                    <div className="hidden md:block text-[9px] text-gray-500 uppercase w-12 text-right shrink-0">{t('rankings.chargeMove')}</div>
                                                    <div className="bg-white/5 px-2 py-1 rounded flex items-center gap-1.5 flex-1 max-w-[140px] md:max-w-none"><MoveTypeIcon type={getMoveTypeFn(pokemon.bestMoves?.charge2)} size="sm" /><span className="text-[9px] md:text-xs font-medium text-white/60 truncate flex-1">{translateMove(pokemon.bestMoves.charge2, lang)}</span></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative z-10 flex items-center justify-center px-2 md:px-4">{isExpanded ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}</div>
                                </div>
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                            <div className="p-6 border-t border-white/10 space-y-6">
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield size={16} /> {t('rankings.baseStats')}</h4>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center"><div className="text-xs text-gray-500 uppercase mb-1">{t('rankings.attack')}</div><div className="text-xl font-bold text-red-400">{pokemon.stats?.atk || '?'}</div></div>
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center"><div className="text-xs text-gray-500 uppercase mb-1">{t('rankings.defense')}</div><div className="text-xl font-bold text-blue-400">{pokemon.stats?.def || '?'}</div></div>
                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center"><div className="text-xs text-gray-500 uppercase mb-1">{t('rankings.hp')}</div><div className="text-xl font-bold text-green-400">{pokemon.stats?.sta || '?'}</div></div>
                                                    </div>
                                                </div>
                                                {pokemon.detailedStats?.[filterName] && (
                                                    <div className="border-t border-white/5 pt-6">
                                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Zap size={16} /> {t('rankings.pvpPerformance', { league: leagueDisplayLabel })}</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            <div>
                                                                <h5 className="text-sm font-bold text-green-400 uppercase mb-4">{t('rankings.keyMatchups')}</h5>
                                                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                                    {pokemon.detailedStats[filterName].matchups?.map((m, idx) => {
                                                                        const displayName = translateOpponentName(m.name);
                                                                        const spriteUrl = m.imageUrl || getOpponentSprite(m.name);
                                                                        return (
                                                                            <div key={idx} className="flex flex-col items-center min-w-[56px]">
                                                                                <div className="w-14 h-14 bg-green-900/10 border border-green-500/20 rounded-xl flex items-center justify-center p-1.5" title={displayName}>{spriteUrl ? <img src={spriteUrl} loading="lazy" onError={handleImgError} className="w-full h-full object-contain" /> : <div className="w-8 h-8 bg-green-500/20 rounded-full" />}</div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h5 className="text-sm font-bold text-red-400 uppercase mb-4">{t('rankings.counters')}</h5>
                                                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                                    {pokemon.detailedStats[filterName].counters?.map((c, idx) => {
                                                                        const displayName = translateOpponentName(c.name);
                                                                        const spriteUrl = c.imageUrl || getOpponentSprite(c.name);
                                                                        return (
                                                                            <div key={idx} className="flex flex-col items-center min-w-[56px]">
                                                                                <div className="w-14 h-14 bg-red-900/10 border border-red-500/20 rounded-xl flex items-center justify-center p-1.5" title={displayName}>{spriteUrl ? <img src={spriteUrl} loading="lazy" onError={handleImgError} className="w-full h-full object-contain" /> : <div className="w-8 h-8 bg-red-500/20 rounded-full" />}</div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
            {displayCount < filteredPokemon.length && (
                <div className="flex flex-col items-center mt-12 gap-4">
                    <span className="text-gray-400 font-medium">{t('pvp.showingCount').replace('{shown}', Math.min(displayCount, filteredPokemon.length)).replace('{total}', filteredPokemon.length)}</span>
                    <button onClick={() => setDisplayCount(prev => prev + 100)} className="mx-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-red-900/50 transform hover:scale-105">{t('rankings.loadMoreHundred')}</button>
                </div>
            )}
        </div>
    );
}
