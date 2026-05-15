'use client';

import { useState, useEffect } from 'react';
// URL-based routing handled via window.history.replaceState
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, ChevronLeft, ChevronRight, Swords, Trophy, Shield, Zap, MessageCircle, Flame } from 'lucide-react';
import ChatPopup from '@/components/ChatPopup';
import { useSession } from "next-auth/react";
import { useLanguage } from '@/context/LanguageContext';
import ProgressionChart from '@/components/ProgressionChart';
import rocketData from '@/data/rocket_attackers.json';
import rocketDpsData from '@/data/rocket_dps.json';
import { POKEMON_DATA } from '@/data/pokemon';
import { moveTypeMapping } from '@/data/moveTypeMapping';
import PvpRankingList from '@/components/pokemon/PvpRankingList';
import PublicFavorites from '@/components/pokemon/PublicFavorites';
import PublicMedals from '@/components/pokemon/PublicMedals';
import ReportBlockButtons from '@/components/ReportBlockButtons';
import { DynamaxContent } from '@/app/attackers-dynamax/page';

// ─── Rocket helpers (from attackers-rocket) ───
const typeIcons = {
    "Insecte": "bug", "Ténèbres": "dark", "Dragon": "dragon", "Électrik": "electric",
    "Fée": "fairy", "Combat": "fighting", "Feu": "fire", "Vol": "flying",
    "Spectre": "ghost", "Plante": "grass", "Sol": "ground", "Glace": "ice",
    "Normal": "normal", "Poison": "poison", "Psy": "psychic", "Roche": "rock",
    "Acier": "steel", "Eau": "water"
};
const typeColors = {
    "Insecte": "#A8B820", "Ténèbres": "#705848", "Dragon": "#7038F8", "Électrik": "#F8D030",
    "Fée": "#EE99AC", "Combat": "#C03028", "Feu": "#F08030", "Vol": "#A890F0",
    "Spectre": "#705898", "Plante": "#78C850", "Sol": "#E0C068", "Glace": "#98D8D8",
    "Normal": "#A8A878", "Poison": "#A040A0", "Psy": "#F85888", "Roche": "#B8A038",
    "Acier": "#B8B8D0", "Eau": "#6890F0"
};
const getTypeColor = (t) => typeColors[t] || "#777";
const getTypeIcon = (typeName) => {
    const en = typeIcons[typeName];
    return en ? `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${en}.svg` : null;
};
const getPokemonInfo = (nameFr, form) => {
    const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace('-', '').replace(' ', '');
    const p = POKEMON_DATA.find(x => norm(x.nameFr) === norm(nameFr));
    if (!p) return { nameEn: nameFr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), id: 0 };
    let nameEn = p.nameEn.toLowerCase().replace(' ', '-').replace("'", "").replace('.', '').replace('♀', '-f').replace('♂', '-m').replace('é', 'e').replace('è', 'e').replace('î', 'i').replace('ô', 'o');
    if (form) {
        let fs = form.toLowerCase();
        if (fs.includes('alola')) fs = 'alolan';
        if (fs.includes('galar')) fs = 'galarian';
        if (fs.includes('hisui')) fs = 'hisuian';
        if (fs.includes('paldea')) fs = 'paldean';
        if (nameEn === 'darmanitan' && fs === 'galarian') fs = 'galarian-standard';
        nameEn += `-${fs}`;
    }
    return { ...p, nameEn };
};
const getMoveType = (moveName) => {
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
    return null;
};

// Grunt groups (same data as attackers-rocket)
const gruntGroups = {
    "Feu": [
        {
            "quote": "Sais-tu que certains Pokémon soufflent le feu ?",
            "rewards": [
                { "nameFr": "Goupix", "maxPC": 119, "boostPC": 328 },
                { "nameFr": "Funécire", "maxPC": 135, "boostPC": 374 },
                { "nameFr": "Feunnec", "maxPC": 138, "boostPC": 381 }
            ]
        }
    ],
    "Vol": [
        {
            "quote": "Combats contre mes Pokémon de type Vol !",
            "rewards": [
                { "nameFr": "Nirondelle", "maxPC": 172, "boostPC": 284 },
                { "nameFr": "Tylton", "maxPC": 185, "boostPC": 306 },
                { "nameFr": "Roucool", "maxPC": 153, "boostPC": 252 }
            ]
        }
    ],
    "Poison": [
        {
            "quote": "Prêt à bondir sur l’adversaire !",
            "rewards": [
                { "nameFr": "Qwilfish", "maxPC": 462, "boostPC": 761 },
                { "nameFr": "Nosferapti", "maxPC": 150, "boostPC": 247 },
                { "nameFr": "Mystherbe", "maxPC": 277, "boostPC": 456 },
                { "nameFr": "Nidorino", "maxPC": 314, "boostPC": 517 },
                { "nameFr": "Nidorina", "maxPC": 295, "boostPC": 486 },
                { "nameFr": "Smogogo", "form": "Galar", "maxPC": 516, "boostPC": 851 }
            ]
        }
    ],
    "Plante": [
        {
            "quote": "Ne t’approche pas de nous !",
            "rewards": [
                { "nameFr": "Cacnea", "maxPC": 167, "boostPC": 461 },
                { "nameFr": "Marisson", "maxPC": 147, "boostPC": 407 },
                { "nameFr": "Brocélôme", "maxPC": 151, "boostPC": 417 }
            ]
        }
    ],
    "Insecte": [
        {
            "quote": "Montre-lui ce que les Pokémon insecte ont dans le ventre !",
            "rewards": [
                { "nameFr": "Mimitoss", "maxPC": 226, "boostPC": 373 },
                { "nameFr": "Carabing", "maxPC": 266, "boostPC": 439 },
                { "nameFr": "Escargaume", "maxPC": 188, "boostPC": 309 },
                { "nameFr": "Scarabrute", "maxPC": 667, "boostPC": 1099 },
                { "nameFr": "Caratroc", "maxPC": 91, "boostPC": 150 },
                { "nameFr": "Anorith", "maxPC": 344, "boostPC": 568 }
            ]
        }
    ],
    "Dragon": [
        {
            "quote": "Raaaahhh !!! … C’était bien ?",
            "rewards": [
                { "nameFr": "Solochi", "maxPC": 239, "boostPC": 394 },
                { "nameFr": "Draby", "maxPC": 260, "boostPC": 429 },
                { "nameFr": "Minidraco", "maxPC": 226, "boostPC": 673 }
            ]
        }
    ],
    "Normal": [
        {
            "quote": "Normal ne veut pas dire faible",
            "rewards": [
                { "nameFr": "Teddiursa", "maxPC": 299, "boostPC": 493 },
                { "nameFr": "Tylton", "maxPC": 185, "boostPC": 306 },
                { "nameFr": "Miaouss", "maxPC": 168, "boostPC": 278 }
            ]
        },
        {
            "quote": "La gagne, c’est pour les gagnants",
            "rewards": [
                { "nameFr": "Ronflex", "maxPC": 727, "boostPC": 1198 }
            ]
        },
        {
            "quote": "T’inquiète, j’ai gagné d’avance – Prêt pour la défaite ?",
            "rewards": [
                { "nameFr": "Carapuce", "maxPC": 213, "boostPC": 351 },
                { "nameFr": "Salamèche", "maxPC": 221, "boostPC": 364 },
                { "nameFr": "Bulbizarre", "maxPC": 251, "boostPC": 414 }
            ]
        }
    ],
    "Eau": [
        {
            "quote": "Ces eaux sont dangereuses",
            "rewards": [
                { "nameFr": "Grenousse", "maxPC": 223, "boostPC": 368 },
                { "nameFr": "Krabby", "maxPC": 351, "boostPC": 579 },
                { "nameFr": "Tentacool", "maxPC": 234, "boostPC": 386 },
                { "nameFr": "Magicarpe", "maxPC": 61, "boostPC": 102 },
                { "nameFr": "Barpau", "maxPC": 61, "boostPC": 102 }
            ]
        }
    ],
    "Psy": [
        {
            "quote": "As-tu peur des kinésistes qui ont des pouvoirs occultes ?",
            "rewards": [
                { "nameFr": "Balbuto", "maxPC": 177, "boostPC": 292 },
                { "nameFr": "Tarsal", "maxPC": 121, "boostPC": 200 }
            ]
        }
    ],
    "Roche": [
        {
            "quote": "Je vais te déc-rocher un coup de poing !",
            "rewards": [
                { "nameFr": "Kranidos", "maxPC": 410, "boostPC": 676 },
                { "nameFr": "Caratroc", "maxPC": 54, "boostPC": 150 },
                { "nameFr": "Amonita", "maxPC": 348, "boostPC": 573 },
                { "nameFr": "Gravalanch", "maxPC": 427, "boostPC": 705 },
                { "nameFr": "Dinoclier", "maxPC": 200, "boostPC": 330 }
            ]
        }
    ],
    "Fée": [
        {
            "quote": "Émerveille-toi devant mes adorables Pokémon !",
            "rewards": [
                { "nameFr": "Goupix", "form": "Alola", "maxPC": 199, "boostPC": 328 },
                { "nameFr": "Snubbull", "maxPC": 279, "boostPC": 459 },
                { "nameFr": "Tarsal", "maxPC": 121, "boostPC": 200 },
                { "nameFr": "Kirlia", "maxPC": 217, "boostPC": 359 },
                { "nameFr": "Smogogo", "form": "Galar", "maxPC": 516, "boostPC": 851 }
            ]
        }
    ],
    "Combat": [
        {
            "quote": "Mes biscoteaux ne sont pas seulement là pour faire joli !",
            "rewards": [
                { "nameFr": "Machoc", "maxPC": 288, "boostPC": 474 },
                { "nameFr": "Férosinge", "maxPC": 262, "boostPC": 432 },
                { "nameFr": "Charpenti", "maxPC": 296, "boostPC": 488 },
                { "nameFr": "Tygnon", "maxPC": 525, "boostPC": 866 },
                { "nameFr": "Kicklee", "maxPC": 580, "boostPC": 957 },
                { "nameFr": "Kapoera", "maxPC": 486, "boostPC": 801 }
            ]
        }
    ],
    "Sol": [
        {
            "quote": "Tu vas mordre la poussière !",
            "rewards": [
                { "nameFr": "Sabelette", "maxPC": 284, "boostPC": 468 },
                { "nameFr": "Kraknoix", "maxPC": 287, "boostPC": 473 },
                { "nameFr": "Scorplane", "maxPC": 418, "boostPC": 689 },
                { "nameFr": "Vibraninf", "maxPC": 276, "boostPC": 455 },
                { "nameFr": "Kaorine", "maxPC": 444, "boostPC": 732 }
            ]
        }
    ],
    "Glace": [
        {
            "quote": "Tu vas te geler sur place",
            "rewards": [
                { "nameFr": "Marcacrin", "maxPC": 167, "boostPC": 275 },
                { "nameFr": "Obalie", "maxPC": 217, "boostPC": 357 },
                { "nameFr": "Farfuret", "maxPC": 462, "boostPC": 762 }
            ]
        }
    ],
    "Ténèbres": [
        {
            "quote": "Comme on dit, là où il y a de la lumière, il y a de l’ombre",
            "rewards": [
                { "nameFr": "Medhyèna", "maxPC": 152, "boostPC": 252 },
                { "nameFr": "Rattata", "form": "Alola", "maxPC": 165, "boostPC": 273 },
                { "nameFr": "Carvanha", "maxPC": 230, "boostPC": 379 }
            ]
        }
    ],
    "Spectre": [
        {
            "quote": "Ké… Ké… Ké… Ké… Ké",
            "rewards": [
                { "nameFr": "Fantominus", "maxPC": 277, "boostPC": 456 },
                { "nameFr": "Tutafeh", "maxPC": 221, "boostPC": 364 },
                { "nameFr": "Skelénox", "maxPC": 159, "boostPC": 262 },
                { "nameFr": "Téraclope", "maxPC": 358, "boostPC": 591 },
                { "nameFr": "Ténéfix", "maxPC": 332, "boostPC": 548 },
                { "nameFr": "Tutankafer", "maxPC": 512, "boostPC": 844 }
            ]
        }
    ],
    "Électrik": [
        {
            "quote": "Prêt pour un choc !",
            "rewards": [
                { "nameFr": "Magnéti", "maxPC": 307, "boostPC": 506 },
                { "nameFr": "Lixy", "maxPC": 197, "boostPC": 325 },
                { "nameFr": "Voltorbe", "maxPC": 227, "boostPC": 375 }
            ]
        }
    ],
    "Acier": [
        {
            "quote": "Tu ne me surpasseras jamais, moi et ma volonté de fer !",
            "rewards": [
                { "nameFr": "Terhal", "maxPC": 220, "boostPC": 362 },
                { "nameFr": "Sabelette", "form": "Alola", "maxPC": 291, "boostPC": 480 },
                { "nameFr": "Galekid", "maxPC": 294, "boostPC": 485 }
            ]
        }
    ]
};

// ─── View modes ───
const VIEWS = [
    { id: 'trainers', labelKey: 'rankings.trainerRankings', icon: Trophy, color: 'gray', gradient: 'from-slate-500 to-slate-700', glow: 'rgba(148,163,184,VAR)' },
    { id: 'master', labelKey: 'rankings.masterLeague', icon: Shield, color: 'purple', gradient: 'from-purple-500 to-purple-700', glow: 'rgba(168,85,247,VAR)' },
    { id: 'hyper', labelKey: 'rankings.hyperLeague', icon: Zap, color: 'yellow', gradient: 'from-yellow-500 to-yellow-700', glow: 'rgba(234,179,8,VAR)' },
    { id: 'super', labelKey: 'rankings.superLeague', icon: Swords, color: 'blue', gradient: 'from-blue-500 to-blue-700', glow: 'rgba(37,99,235,VAR)' },
    { id: 'rocket', labelKey: 'rankings.rocketCounters', icon: Swords, color: 'red', gradient: 'from-red-600 to-red-800', glow: 'rgba(220,38,38,VAR)' },
    { id: 'dynamax', labelKey: 'rankings.dynamaxAttackers', icon: Flame, color: 'pink', gradient: 'from-pink-500 to-orange-600', glow: 'rgba(236,72,153,VAR)' },
];

// ─── Attacker Card ───
function AttackerCard({ category, isDps = false }) {
    const { t } = useLanguage();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative group overflow-hidden rounded-2xl border p-6 hover:border-white/20 transition-all duration-500 shadow-xl ${isDps ? 'border-red-500/20 bg-gradient-to-br from-red-950/60 to-gray-900' : 'border-white/10 bg-gradient-to-br from-gray-900 to-gray-800'}`}
        >
            <div className="flex flex-col items-center text-center">
                <div className={`flex items-center justify-center gap-3 mb-6 p-2 rounded-xl border w-full ${isDps ? 'bg-red-900/30 border-red-500/20' : 'bg-black/20 border-white/5'}`}>
                    {getTypeIcon(category.typeFr) && (
                        <div className="w-6 h-6 shrink-0" style={{ backgroundColor: getTypeColor(category.typeFr), maskImage: `url(${getTypeIcon(category.typeFr)})`, WebkitMaskImage: `url(${getTypeIcon(category.typeFr)})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                    )}
                    <h2 className="text-sm md:text-lg font-black uppercase tracking-tighter md:tracking-tight text-white whitespace-nowrap leading-tight">
                        {isDps ? `${t('rankings.dpsLabel')} ${category.typeFr}` : `${t('rankings.gruntCounterLabel')} ${category.typeFr}`}
                    </h2>
                    {isDps && <Zap size={14} className="text-yellow-400" />}
                </div>

                {!isDps && gruntGroups[category.typeFr]?.map((group, gIdx) => (
                    <div key={gIdx} className="mt-2 border-t border-white/5 pt-4 first:mt-0 first:border-0 first:pt-0 w-full flex flex-col items-center">
                        <p className="text-[10px] md:text-xs text-gray-400 font-medium italic leading-tight mb-3 px-2 text-center">{group.quote}</p>
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {group.rewards.map((reward, rIdx) => {
                                const pInfo = getPokemonInfo(reward.nameFr, reward.form);
                                return (
                                    <div key={rIdx} className="flex flex-col items-center bg-black/20 rounded-lg p-1.5 min-w-[75px] border border-white/5 transition-colors hover:bg-black/30">
                                        <div className="w-12 h-12 relative flex items-center justify-center">
                                            <img src={`https://img.pokemondb.net/sprites/home/normal/${pInfo.nameEn}.png`} alt={reward.nameFr} className="w-full h-full object-contain drop-shadow-md" onError={(e) => { e.target.onerror = null; e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pInfo.id}.png`; }} />
                                        </div>
                                        <div className="text-[10px] md:text-sm font-black text-white leading-tight mt-1.5 text-center px-1 uppercase tracking-tighter">{reward.nameFr}</div>
                                        <div className="flex flex-col mt-1 gap-0.5 items-center">
                                            <div className="text-[7px] text-gray-400 uppercase font-black">Max <span className="text-white ml-0.5">{reward.maxPC}</span></div>
                                            <div className="text-[9px] text-gray-400 uppercase font-black">Boost <span className="text-yellow-400 ml-0.5">{reward.boostPC}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="space-y-3 mt-4 w-full text-left">
                    {category.attackers.map((pokemon, pIdx) => {
                        const pInfo = getPokemonInfo(pokemon.nameFr, pokemon.form);
                        return (
                            <div key={`${pokemon.nameFr}-${pIdx}`} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group/item relative">
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    {pokemon.shadow && (<div className="absolute -top-1.5 -left-1.5 bg-purple-600/90 text-[7px] px-1 py-0.5 rounded shadow-lg text-white font-black border border-purple-400/50 z-30">OBSCUR</div>)}
                                    <div className="absolute inset-0 bg-white/5 rounded-lg border border-white/5 z-0" />
                                    <img src={`https://img.pokemondb.net/sprites/home/normal/${pInfo.nameEn}${pokemon.mega ? '-mega' : ''}.png`} alt={pokemon.nameFr} className="w-full h-full object-contain relative z-10 p-1 group-hover/item:scale-110 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pInfo.id}.png`; }} />
                                    {pokemon.mega && (<div className="absolute top-1 right-1 z-40 bg-black/60 rounded-full p-0.5 border border-pink-500/50"><img src="https://www.pokepedia.fr/images/thumb/5/5d/Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg/800px-Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg.png" className="w-3 h-3 object-contain" alt="Mega" /></div>)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-white tracking-tight flex items-center gap-1 flex-wrap">
                                        {pokemon.mega && <span className="text-pink-400">{t('rocket.mega')}</span>}
                                        {pokemon.primal && <span className="text-blue-400">{t('rocket.primal')}</span>}
                                        <span>{pokemon.nameFr}</span>
                                        {pokemon.form && <span className="text-gray-400 text-[10px] ml-1">({pokemon.form})</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium mt-0.5">
                                        {getMoveType(pokemon.moveFr) ? (
                                            <div className="w-3 h-3 shrink-0" style={{ backgroundColor: getTypeColor(getMoveType(pokemon.moveFr)), maskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, WebkitMaskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                        ) : (<Swords size={10} className="text-red-500" />)}
                                        <span className="truncate">{pokemon.moveFr}</span>
                                    </div>
                                </div>
                                {pokemon.score && (
                                    <div className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-black" style={{ backgroundColor: `${getTypeColor(category.typeFr)}20`, color: getTypeColor(category.typeFr), border: `1px solid ${getTypeColor(category.typeFr)}40` }}>
                                        {pokemon.score}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="absolute bottom-[-20px] right-[-10px] text-9xl font-black text-red-600/5 select-none pointer-events-none group-hover:text-red-600/10 transition-colors duration-500 italic">R</div>
        </motion.div>
    );
}

// ─── Main Page ───
export default function ClassementPage(props) {
    // `initialUsername` is passed by /u/[username]/page.js to deep-link directly
    // into a trainer's profile modal while keeping the rankings page in the
    // background. The URL bar stays at /u/<username>; we sync it via
    // history.replaceState as the user opens/closes profiles.
    const initialUsername = props?.initialUsername || null;
    const params = useParams();
    const { t, lang } = useLanguage();
    const { data: session } = useSession();
    const validViews = ['trainers', 'master', 'hyper', 'super', 'rocket', 'dynamax'];
    const [activeView, setActiveView] = useState('trainers');
    const [rocketSubView, setRocketSubView] = useState('contres');

    // Sync URL param to active view on mount only
    useEffect(() => {
        const viewParam = params?.view?.[0];
        if (viewParam && validViews.includes(viewParam)) {
            setActiveView(viewParam);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleViewChange = (viewId) => {
        setActiveView(viewId);
        window.history.replaceState(null, '', `/rankings/${viewId}`);
    };
    const [selectedTrainer, setSelectedTrainer] = useState(null);

    // Helpers that keep the URL in sync with the open/closed profile modal.
    const openTrainer = (trainer) => {
        setSelectedTrainer(trainer);
        if (trainer?.username) {
            window.history.replaceState(null, '', `/u/${encodeURIComponent(trainer.username)}`);
        }
    };
    const closeTrainer = () => {
        setSelectedTrainer(null);
        const target = activeView === 'trainers' ? '/rankings' : `/rankings/${activeView}`;
        window.history.replaceState(null, '', target);
    };
    const [chatTarget, setChatTarget] = useState(null);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'caughtThisWeek', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(c => ({ key, direction: c.key === key && c.direction === 'desc' ? 'asc' : 'desc' }));
    };

    const isLocalCity = (city) => {
        if (!city) return false;
        const c = city.toLowerCase();
        return c.includes('poitiers') || c.includes('buxerolles') || c.includes('migné') || c.includes('biard') || c.includes('vouneuil') || c.includes('chasseneuil') || c.includes('saint-benoît') || c.includes('fontaine-le-comte') || c.includes('montamisé') || c.includes('ligugé');
    };

    const formatFriendCode = (code) => code ? code.replace(/\D/g, '') : '';

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/pokemon/leaderboard');
                if (res.ok) setLeaders(await res.json());
            } catch (e) { console.error(e); }
            setLoading(false);
        })();
    }, []);

    // Open profile modal automatically when arriving via /u/<username>
    useEffect(() => {
        if (!initialUsername || leaders.length === 0) return;
        const target = leaders.find(
            (t) => t.username?.toLowerCase() === initialUsername.toLowerCase()
        );
        if (target) setSelectedTrainer(target);
    }, [initialUsername, leaders]);

    const sortedLeaders = [...leaders].sort((a, b) => {
        let aV = a[sortConfig.key] || 0, bV = b[sortConfig.key] || 0;
        if (typeof aV === 'string') return sortConfig.direction === 'asc' ? aV.localeCompare(bV) : bV.localeCompare(aV);
        return sortConfig.direction === 'asc' ? aV - bV : bV - aV;
    });

    const filteredLeaders = sortedLeaders.filter(t => {
        if (filterMode === 'all') return true;
        const local = isLocalCity(t.city);
        return filterMode === 'local' ? local : !local;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-2 md:px-4">
            <div className="w-full md:max-w-[90%] mx-auto">

                {/* Title */}
                <div className="mb-12 mt-4 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold uppercase tracking-normal bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] [word-spacing:0.5rem]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                        {t('rankings.title')}
                    </h1>
                </div>

                {/* View Toggle Buttons */}
                <div className="flex justify-center gap-2 md:gap-3 mt-6 mb-12 flex-wrap px-2">
                    {VIEWS.map(v => {
                        const Icon = v.icon;
                        const isActive = activeView === v.id;
                        const glowVal = v.glow.replace('VAR', isActive ? '0.6' : '0.3');
                        return (
                            <button
                                key={v.id}
                                onClick={() => handleViewChange(v.id)}
                                className={`px-3 md:px-5 py-1.5 md:py-2 text-[10px] md:text-sm rounded-full border transition-all duration-300 font-bold tracking-wide whitespace-nowrap flex items-center gap-1.5 hover:scale-105 active:scale-95
                                    ${isActive
                                        ? `bg-gradient-to-r ${v.gradient} border-white/30 text-white scale-105`
                                        : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10'}`}
                                style={{ boxShadow: `0 0 ${isActive ? '20' : '10'}px ${glowVal}` }}
                            >
                                <Icon size={14} />
                                {t(v.labelKey)}
                            </button>
                        );
                    })}
                </div>

                {/* ─── TOP DRESSEURS VIEW ─── */}
                {activeView === 'trainers' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        {/* PogoSphere is a global ranking — local/horizon trainer filter UI is intentionally
                            removed here. The underlying filterMode state stays in place so the same component
                            can still serve PogoPoitiers (where the filter is meaningful for local-vs-global). */}

                        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden relative z-10">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[850px]">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th onClick={() => handleSort('level')} className="p-1 md:p-4 text-center text-purple-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10 w-12">{t('rankings.level')}</th>
                                            <th onClick={() => handleSort('username')} className="p-1 md:p-3 text-center text-gray-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10 sticky left-0 bg-[#0a0a0a] md:bg-transparent z-20 w-[70px] md:w-[100px]">{t('common.trainer')}</th>
                                            <th onClick={() => handleSort('caughtThisWeek')} className="p-1 md:p-4 text-center text-emerald-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10 w-[90px] md:w-[140px]"><span className="hidden md:inline">{t('rankings.thisWeek')}</span><span className="md:hidden">{t('rankings.thisWeekShort')}</span></th>
                                            <th onClick={() => handleSort('caught')} className="p-1 md:p-4 text-center text-gray-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10">{t('rankings.catches')}</th>
                                            <th onClick={() => handleSort('stops')} className="p-1 md:p-4 text-center text-gray-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10">{t('rankings.stops')}</th>
                                            <th onClick={() => handleSort('xp')} className="p-1 md:p-4 text-center text-purple-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10">{t('rankings.xp')}</th>
                                            <th onClick={() => handleSort('pokedex')} className="p-1 md:p-4 text-center text-blue-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10">{t('rankings.pokedex')}</th>
                                            <th onClick={() => handleSort('shinydex')} className="p-1 md:p-4 text-center text-yellow-400 font-medium uppercase text-[10px] md:text-sm cursor-pointer hover:bg-white/10">{t('rankings.shinyDex')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredLeaders.map((trainer, index) => (
                                            <motion.tr key={trainer.username} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.03 }}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openTrainer(trainer)}>
                                                <td className="p-1 md:p-4 text-center font-mono text-purple-300 font-bold text-sm">{trainer.level}</td>
                                                <td className="p-1 md:p-3 text-center sticky left-0 bg-[#0a0a0a] md:bg-transparent z-20">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gray-800 border border-white/10 overflow-hidden relative flex-shrink-0">
                                                            {trainer.trainerImage ? (<img src={trainer.trainerImage} alt={trainer.username} className="w-full h-full object-cover absolute inset-0 scale-125" style={{ objectPosition: '55% 30%' }} />) : (<div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-sm">{trainer.username.charAt(0).toUpperCase()}</div>)}
                                                        </div>
                                                        <div className={`font-bold text-[9px] md:text-xs leading-tight ${
                                                            trainer.team
                                                                ? trainer.team.toLowerCase().includes('sagesse') || trainer.team.toLowerCase().includes('mystic') ? 'text-blue-400'
                                                                : trainer.team.toLowerCase().includes('bravoure') || trainer.team.toLowerCase().includes('valor') ? 'text-red-400'
                                                                : 'text-yellow-400'
                                                                : 'text-gray-200'
                                                        }`}>{trainer.username}</div>
                                                        {trainer.city && <div className="text-[7px] md:text-[9px] text-gray-500 truncate max-w-[70px] leading-tight">{trainer.city}</div>}
                                                    </div>
                                                </td>
                                                <td className="p-1 md:p-4 text-center font-mono text-xs">
                                                    {trainer.caughtThisWeek ? (
                                                        <span className={trainer.isWeeklyEstimated ? 'text-emerald-400/60' : 'text-emerald-400 font-bold'}>
                                                            {trainer.isWeeklyEstimated ? '~' : '+'}{trainer.caughtThisWeek.toLocaleString()}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="p-1 md:p-4 text-center font-mono text-gray-400 text-xs">{trainer.caught?.toLocaleString()}</td>
                                                <td className="p-1 md:p-4 text-center font-mono text-gray-400 text-xs">{trainer.stops?.toLocaleString()}</td>
                                                <td className="p-1 md:p-4 text-center font-mono text-purple-300 font-bold text-xs">{trainer.xp?.toLocaleString()}</td>
                                                <td className="p-1 md:p-4 text-center font-mono text-blue-300 text-xs">{trainer.pokedex || '-'}</td>
                                                <td className="p-1 md:p-4 text-center font-mono text-yellow-300 text-xs">{trainer.shinydex || '-'}</td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─── LEAGUE VIEWS ─── */}
                {(activeView === 'master' || activeView === 'hyper' || activeView === 'super') && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8">
                        <PvpRankingList filterName={activeView === 'master' ? 'Ligue Master' : activeView === 'hyper' ? 'Ligue Hyper' : 'Ligue Super'} />
                    </motion.div>
                )}

                {/* ─── TEAM ROCKET VIEW ─── */}
                {activeView === 'rocket' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rocketData.map((cat, idx) => <AttackerCard key={cat.typeFr} category={cat} />)}
                        </div>
                    </motion.div>
                )}

                {/* ─── DYNAMAX VIEW ─── */}
                {activeView === 'dynamax' && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
                        <DynamaxContent embedded={true} />
                    </motion.div>
                )}

                {/* ─── TRAINER MODAL ─── */}
                <AnimatePresence>
                    {selectedTrainer && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closeTrainer}>
                            <div className="bg-[#1a1a1a] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                <div className="p-6 border-b border-white/10 relative bg-black/20">
                                    <button onClick={closeTrainer} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><X size={24} /></button>
                                    <div className="flex flex-col md:flex-row items-center gap-4 pr-12">
                                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                                            {selectedTrainer.trainerImage ? (<img src={selectedTrainer.trainerImage} alt={selectedTrainer.username} className="w-full h-full rounded-full object-cover bg-[#0a0a0a] scale-125" style={{ objectPosition: '55% 30%' }} />) : (<div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center text-white font-bold text-2xl">{selectedTrainer.username.charAt(0).toUpperCase()}</div>)}
                                        </div>
                                        <div className="flex-1 min-w-0 text-center md:text-left">
                                            <div className="flex flex-col md:flex-row items-center gap-2">
                                                <h2 className="text-2xl font-bold text-white truncate">{selectedTrainer.username}</h2>
                                                {selectedTrainer.team && (
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? 'bg-red-500/20 border-red-500 text-red-400' : selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-yellow-500/20 border-yellow-500 text-yellow-400'}`}>
                                                        <img src={selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? '/teams/Team_Mystic.webp' : selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? '/teams/Team_Valor.webp' : '/teams/Team_Instinct.webp'} alt={selectedTrainer.team} className="w-4 h-4 object-contain" />
                                                        <span className="text-xs font-bold uppercase">{selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? t('rankings.teamMystic') : selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? t('rankings.teamValor') : t('rankings.teamInstinct')}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-gray-400 text-sm mt-1">{t('rankings.level')} {selectedTrainer.level || 1} — {(selectedTrainer.xp || 0).toLocaleString()} {t('rankings.xp')}</div>
                                            {selectedTrainer.friendCode && selectedTrainer.settings?.showFriendCode !== false && (
                                                <div className="flex items-center gap-2 text-gray-300 bg-white/5 px-3 py-1 rounded-lg border border-white/5 mt-2 w-fit mx-auto md:mx-0">
                                                    <span className="text-xs font-bold text-gray-500">{t('rankings.friendCode')} :</span>
                                                    <span className="font-mono font-bold tracking-wider text-xs">{formatFriendCode(selectedTrainer.friendCode)}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(selectedTrainer.friendCode.replace(/\D/g, '')); }} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"><Copy size={14} /></button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                {selectedTrainer.discordId && (
                                                    <button
                                                        onClick={() => window.open(`https://discord.com/users/${selectedTrainer.discordId}`, '_blank')}
                                                        className="flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/20 text-white px-3 h-8 rounded-lg transition-colors text-xs font-bold"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.966 2.419-2.176 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.946 2.418-2.157 2.418z" />
                                                        </svg>
                                                        {t('rankings.contactDiscord')}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setChatTarget(selectedTrainer.username)}
                                                    className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 h-8 rounded-lg transition-colors text-xs font-bold"
                                                >
                                                    <MessageCircle size={14} />
                                                    {t('rankings.sendDM')}
                                                </button>
                                                {/*
                                                 * App Store Guideline 1.2 — Report and Block buttons
                                                 * must be visible on every UGC surface. Trainer
                                                 * profiles surfaced from rankings count as UGC
                                                 * (username, bio, trainerImage, friendCode are all
                                                 * user-controlled), so we render the standard
                                                 * <ReportBlockButtons> next to the Discord/DM
                                                 * actions. The component talks to /api/report and
                                                 * /api/block which already exist.
                                                 */}
                                                <ReportBlockButtons
                                                    targetUsername={selectedTrainer.username}
                                                    contentType="profile"
                                                    contentId={selectedTrainer.username}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 md:p-8 space-y-6 overflow-y-auto flex-1 overscroll-contain">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {[
                                            { label: t('rankings.catches'), value: selectedTrainer.caught, color: 'green' },
                                            { label: t('rankings.stops'), value: selectedTrainer.stops, color: 'blue' },
                                            { label: t('rankings.pokedex'), value: selectedTrainer.pokedex, color: 'blue' },
                                            { label: t('rankings.shinyDex'), value: selectedTrainer.shinydex, color: 'yellow' },
                                            { label: t('rankings.xxlDex'), value: selectedTrainer.xxldex, color: 'orange' },
                                            { label: t('rankings.xxsDex'), value: selectedTrainer.xxsdex, color: 'cyan' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
                                                <p className={`text-xs text-${s.color}-400 uppercase tracking-wider mb-1`}>{s.label}</p>
                                                <p className={`text-lg font-bold text-${s.color}-300`}>{(s.value || 0).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <ProgressionChart history={selectedTrainer.history} height={150} />
                                    <PublicMedals medals={selectedTrainer.medals} />
                                    <PublicFavorites username={selectedTrainer.username} />
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

            </div>

            <ChatPopup
                isOpen={!!chatTarget}
                onClose={() => setChatTarget(null)}
                targetUser={chatTarget}
            />
        </div>
    );
}
