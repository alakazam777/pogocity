
'use client';

import { motion } from 'framer-motion';
import rocketData from '@/data/rocket_attackers.json';
import rocketDpsData from '@/data/rocket_dps.json';
import { Sword, Swords, Zap, Shield, Flame, Droplets, Leaf, Snowflake, Bug, Ghost, Moon, Compass, Star, Skull, Mountain, Waves, Circle, Wind, Sparkles } from 'lucide-react';
import { POKEMON_DATA } from '@/data/pokemon';
import { moveTypeMapping } from '@/data/moveTypeMapping';
import { useLanguage } from '@/context/LanguageContext';

const typeIcons = {
    "Insecte": "bug", "Ténèbres": "dark", "Dragon": "dragon", "Électrik": "electric",
    "Fée": "fairy", "Combat": "fighting", "Feu": "fire", "Vol": "flying",
    "Spectre": "ghost", "Plante": "grass", "Sol": "ground", "Glace": "ice",
    "Normal": "normal", "Poison": "poison", "Psy": "psychic", "Roche": "rock",
    "Acier": "steel", "Eau": "water"
};

const typeNamesEn = {
    "Insecte": "Bug", "Ténèbres": "Dark", "Dragon": "Dragon", "Électrik": "Electric",
    "Fée": "Fairy", "Combat": "Fighting", "Feu": "Fire", "Vol": "Flying",
    "Spectre": "Ghost", "Plante": "Grass", "Sol": "Ground", "Glace": "Ice",
    "Normal": "Normal", "Poison": "Poison", "Psy": "Psychic", "Roche": "Rock",
    "Acier": "Steel", "Eau": "Water"
};

const typeNamesJa = {
    "Insecte": "むし", "Ténèbres": "あく", "Dragon": "ドラゴン", "Électrik": "でんき",
    "Fée": "フェアリー", "Combat": "かくとう", "Feu": "ほのお", "Vol": "ひこう",
    "Spectre": "ゴースト", "Plante": "くさ", "Sol": "じめん", "Glace": "こおり",
    "Normal": "ノーマル", "Poison": "どく", "Psy": "エスパー", "Roche": "いわ",
    "Acier": "はがね", "Eau": "みず"
};

const getTranslatedType = (typeFr, lang) => {
    if (lang === 'en') return typeNamesEn[typeFr] || typeFr;
    if (lang === 'ja') return typeNamesJa[typeFr] || typeFr;
    return typeFr;
};

const gruntGroups = {
    "Feu": [
        {
            "quote": "Sais-tu que certains Pokémon soufflent le feu ?",
            "quoteEn": "Did you know some Pokémon breathe fire?",
            "quoteJa": "ポケモンの中には火を吹くものがいるって知ってた？",
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
            "quoteEn": "Battle against my Flying-type Pokémon!",
            "quoteJa": "ひこうタイプのポケモンと勝負だ！",
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
            "quoteEn": "Ready to pounce on the opponent!",
            "quoteJa": "相手に飛びかかる準備はできたぞ！",
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
            "quoteEn": "Don’t tangle with us!",
            "quoteJa": "私たちに絡むんじゃないよ！",
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
            "quoteEn": "Show them what Bug-type Pokémon are made of!",
            "quoteJa": "むしタイプのポケモンの実力を見せてやれ！",
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
            "quoteEn": "Raaaahhh!!! ...Was that good?",
            "quoteJa": "ガオオオ！！…どうだった？",
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
            "quoteEn": "Normal doesn't mean weak",
            "quoteJa": "ノーマルは弱いって意味じゃないぞ",
            "rewards": [
                { "nameFr": "Teddiursa", "maxPC": 299, "boostPC": 493 },
                { "nameFr": "Tylton", "maxPC": 185, "boostPC": 306 },
                { "nameFr": "Miaouss", "maxPC": 168, "boostPC": 278 }
            ]
        },
        {
            "quote": "La gagne, c’est pour les gagnants",
            "quoteEn": "Winning is for winners",
            "quoteJa": "勝つのは勝者のためにある",
            "rewards": [
                { "nameFr": "Ronflex", "maxPC": 727, "boostPC": 1198 }
            ]
        },
        {
            "quote": "T’inquiète, j’ai gagné d’avance – Prêt pour la défaite ?",
            "quoteEn": "Don’t worry, I’ve already won – Ready to lose?",
            "quoteJa": "心配するな、もう勝ったも同然だ",
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
            "quoteEn": "These waters are dangerous",
            "quoteJa": "この海域は危険だぞ",
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
            "quoteEn": "Are you afraid of psychics with occult powers?",
            "quoteJa": "オカルトパワーを持つエスパーが怖いか？",
            "rewards": [
                { "nameFr": "Balbuto", "maxPC": 177, "boostPC": 292 },
                { "nameFr": "Tarsal", "maxPC": 121, "boostPC": 200 }
            ]
        }
    ],
    "Roche": [
        {
            "quote": "Je vais te déc-rocher un coup de poing !",
            "quoteEn": "I'm gonna rock your world!",
            "quoteJa": "いわタイプでぶっ飛ばしてやるぜ！",
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
            "quoteEn": "Marvel at my adorable Pokémon!",
            "quoteJa": "私の可愛いポケモンに見とれなさい！",
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
            "quoteEn": "My muscles aren't just for show!",
            "quoteJa": "この筋肉は飾りじゃないぞ！",
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
            "quoteEn": "You're gonna bite the dust!",
            "quoteJa": "砂を噛むことになるぞ！",
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
            "quoteEn": "You're gonna freeze in place",
            "quoteJa": "その場で凍りつくがいい",
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
            "quoteEn": "As they say, where there is light, there is shadow",
            "quoteJa": "光あるところに影あり、と言うだろう",
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
            "quoteEn": "Ke ke ke ke ke ke!",
            "quoteJa": "ケケケケケケ！",
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
            "quoteEn": "Get ready for a Pokemon that shocks!",
            "quoteJa": "電撃のポケモンを覚悟しろ！",
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
            "quoteEn": "You'll never crush my steel will!",
            "quoteJa": "鋼の意志は砕けないぞ！",
            "rewards": [
                { "nameFr": "Terhal", "maxPC": 220, "boostPC": 362 },
                { "nameFr": "Sabelette", "form": "Alola", "maxPC": 291, "boostPC": 480 },
                { "nameFr": "Galekid", "maxPC": 294, "boostPC": 485 }
            ]
        }
    ]
};

const getPokemonInfo = (nameFr, form) => {
    // Normalization for search
    const norm = (s) => s.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace('-', '')
        .replace(' ', '');

    const p = POKEMON_DATA.find(x => norm(x.nameFr) === norm(nameFr));
    if (!p) return { nameEn: nameFr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), id: 0 };

    let nameEn = p.nameEn.toLowerCase()
        .replace(' ', '-')
        .replace("'", "")
        .replace('.', '')
        .replace('♀', '-f')
        .replace('♂', '-m')
        .replace('é', 'e')
        .replace('è', 'e')
        .replace('î', 'i')
        .replace('ô', 'o');

    if (form) {
        let formSuffix = form.toLowerCase();
        // Specific form translations for sprites
        if (formSuffix === 'alola' || formSuffix.includes('alola')) formSuffix = 'alolan';
        if (formSuffix === 'galar' || formSuffix.includes('galar')) formSuffix = 'galarian';
        if (formSuffix === 'hisui' || formSuffix.includes('hisui')) formSuffix = 'hisuian';
        if (formSuffix === 'paldea' || formSuffix.includes('paldea')) formSuffix = 'paldean';
        if (formSuffix === 'blanc' || formSuffix === 'white') formSuffix = 'white';
        if (formSuffix === 'noir' || formSuffix === 'black') formSuffix = 'black';
        if (formSuffix === 'déchaîné' || formSuffix === 'unbound') formSuffix = 'unbound';

        // Darmanitan specific case
        if (nameEn === 'darmanitan' && formSuffix === 'galarian') formSuffix = 'galarian-standard';

        nameEn += `-${formSuffix}`;
    }
    return { ...p, nameEn };
};

const getTypeIcon = (typeName) => {
    const en = typeIcons[typeName];
    if (en) {
        return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${en}.svg`;
    }
    return null;
};

const typeColors = {
    "Insecte": "#A8B820", "Ténèbres": "#705848", "Dragon": "#7038F8", "Électrik": "#F8D030",
    "Fée": "#EE99AC", "Combat": "#C03028", "Feu": "#F08030", "Vol": "#A890F0",
    "Spectre": "#705898", "Plante": "#78C850", "Sol": "#E0C068", "Glace": "#98D8D8",
    "Normal": "#A8A878", "Poison": "#A040A0", "Psy": "#F85888", "Roche": "#B8A038",
    "Acier": "#B8B8D0", "Eau": "#6890F0"
};

const getTypeColor = (t) => typeColors[t] || "#777";

const getMoveType = (moveName) => {
    if (!moveName) return null;
    let name = moveName.trim();
    if (moveTypeMapping[name]) return moveTypeMapping[name];

    // Try without trailing * or special chars
    const clean = name.replace(/[*†‡]/g, '').trim();
    if (moveTypeMapping[clean]) return moveTypeMapping[clean];

    // Case insensitive and hyphen check
    const normalized = clean.toLowerCase();
    const entry = Object.keys(moveTypeMapping).find(k => k.toLowerCase() === normalized);
    if (entry) return moveTypeMapping[entry];

    // Specific fix for "Force Paume" / "Forte-Paume"
    if (normalized === "force paume" || normalized === "forte paume") return "Combat";
    if (normalized === "calcination") return "Feu";

    return null;
};

export default function RocketPage() {
    const { t, lang } = useLanguage();

    const getQuote = (group) => {
        if (lang === 'en') return group.quoteEn || group.quote;
        if (lang === 'ja') return group.quoteJa || group.quote;
        return group.quote;
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 text-center relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] pointer-events-none"
                    />
                    <h1
                        className="text-4xl md:text-5xl md:text-6xl font-extrabold uppercase tracking-tighter mb-2"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        <span className="bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.35)]">
                            {t('rocket.pageTitle')}
                        </span>
                        <br />
                        <span className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                            Team Rocket
                        </span>
                    </h1>
                    <p className="text-gray-400 max-w-3xl mx-auto text-sm md:text-base font-medium">
                        {t('rocket.pageDesc')}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {rocketData.map((category, idx) => (
                        <motion.div
                            key={category.typeFr}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 p-6 hover:border-white/20 transition-all duration-500 shadow-xl"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="flex items-center justify-center gap-3 mb-6 bg-black/20 p-2 rounded-xl border border-white/5 w-full">
                                    {getTypeIcon(category.typeFr) && (
                                        <div
                                            className="w-6 h-6 shrink-0"
                                            style={{
                                                backgroundColor: getTypeColor(category.typeFr),
                                                maskImage: `url(${getTypeIcon(category.typeFr)})`,
                                                WebkitMaskImage: `url(${getTypeIcon(category.typeFr)})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center'
                                            }}
                                        />
                                    )}
                                    <h2 className="text-sm md:text-lg font-black uppercase tracking-tighter md:tracking-tight text-white whitespace-nowrap leading-tight">
                                        {t('rocket.gruntCounters').replace('{type}', getTranslatedType(category.typeFr, lang))}
                                    </h2>
                                </div>

                                {gruntGroups[category.typeFr]?.map((group, gIdx) => (
                                    <div key={gIdx} className="mt-2 border-t border-white/5 pt-4 first:mt-0 first:border-0 first:pt-0 w-full flex flex-col items-center">
                                        <p className="text-[10px] md:text-xs text-gray-400 font-medium italic leading-tight mb-3 px-2 text-center">
                                            {getQuote(group)}
                                        </p>
                                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                                            {group.rewards.map((reward, rIdx) => {
                                                const pInfo = getPokemonInfo(reward.nameFr, reward.form);
                                                return (
                                                    <div key={rIdx} className="flex flex-col items-center bg-black/20 rounded-lg p-1.5 min-w-[75px] border border-white/5 transition-colors hover:bg-black/30">
                                                        <div className="w-12 h-12 relative flex items-center justify-center">
                                                            <img
                                                                src={`https://img.pokemondb.net/sprites/home/normal/${pInfo.nameEn}.png`}
                                                                alt={reward.nameFr}
                                                                className="w-full h-full object-contain drop-shadow-md"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pInfo.id}.png`;
                                                                    e.target.onerror = (e2) => {
                                                                        e2.target.onerror = null;
                                                                        e2.target.src = `https://img.pokemondb.net/sprites/go/normal/${pInfo.nameEn}.png`;
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="text-[10px] md:text-sm font-black text-white leading-tight mt-1.5 text-center px-1 uppercase tracking-tighter">
                                                            {reward.nameFr}
                                                        </div>
                                                        <div className="flex flex-col mt-1 gap-0.5 items-center">
                                                            <div className="text-[7px] text-gray-400 uppercase font-black">
                                                                Max <span className="text-white ml-0.5">{reward.maxPC}</span>
                                                            </div>
                                                            <div className="text-[9px] text-gray-400 uppercase font-black">
                                                                Boost <span className="text-yellow-400 ml-0.5">{reward.boostPC}</span>
                                                            </div>
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
                                            <div
                                                key={`${pokemon.nameFr}-${pIdx}`}
                                                className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group/item relative"
                                            >
                                                <div className="relative w-12 h-12 flex-shrink-0">
                                                    {pokemon.shadow && (
                                                        <div className="absolute -top-1.5 -left-1.5 bg-purple-600/90 text-[7px] px-1 py-0.5 rounded shadow-lg shadow-purple-900/40 text-white font-black border border-purple-400/50 backdrop-blur-sm z-30">
                                                            {t('rocket.shadow')}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-white/5 rounded-lg border border-white/5 z-0" />
                                                    <img
                                                        src={`https://img.pokemondb.net/sprites/home/normal/${pInfo.nameEn}${pokemon.mega ? '-mega' : ''}.png`}
                                                        alt={pokemon.nameFr}
                                                        className="w-full h-full object-contain relative z-10 p-1 group-hover/item:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pInfo.id}.png`;
                                                            e.target.onerror = (e2) => {
                                                                e2.target.onerror = null;
                                                                e2.target.src = `https://img.pokemondb.net/sprites/go/normal/${pInfo.nameEn}.png`;
                                                            }
                                                        }}
                                                    />
                                                    {pokemon.mega && (
                                                        <div className="absolute top-1 right-1 z-40 bg-black/60 rounded-full p-0.5 border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                                                            <img src="https://www.pokepedia.fr/images/thumb/5/5d/Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg/800px-Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg.png" className="w-3 h-3 object-contain" alt="Mega" />
                                                        </div>
                                                    )}
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
                                                        ) : (
                                                            <Swords size={10} className="text-red-500" />
                                                        )}
                                                        <span className="truncate">{pokemon.moveFr}</span>
                                                    </div>
                                                </div>
                                                {/* DPS Score Badge */}
                                                {pokemon.score && (
                                                    <div className="flex-shrink-0 ml-auto">
                                                        <div className={`text-xs font-black px-2 py-1 rounded-lg border ${
                                                            parseInt(pokemon.score) >= 95 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                            parseInt(pokemon.score) >= 85 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                            parseInt(pokemon.score) >= 75 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                                        }`}>
                                                            {pokemon.score}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Background "R" branding */}
                            <div className="absolute bottom-[-20px] right-[-10px] text-9xl font-black text-red-600/5 select-none pointer-events-none group-hover:text-red-600/10 transition-colors duration-500 italic">
                                R
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Section Meilleurs DPS par type */}
                <div className="mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-center mb-12">
                        <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                            {t('rocket.topDpsTitle')}
                        </span>
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rocketDpsData.map((category, idx) => (
                            <motion.div
                                key={category.typeFr}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 p-6 hover:border-white/20 transition-all duration-500 shadow-xl"
                            >
                                <div className="flex items-center justify-center gap-3 mb-6 bg-black/20 p-2 rounded-xl border border-white/5 w-full">
                                    {getTypeIcon(category.typeFr) && (
                                        <div
                                            className="w-6 h-6 shrink-0"
                                            style={{
                                                backgroundColor: getTypeColor(category.typeFr),
                                                maskImage: `url(${getTypeIcon(category.typeFr)})`,
                                                WebkitMaskImage: `url(${getTypeIcon(category.typeFr)})`,
                                                maskSize: 'contain',
                                                WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat',
                                                WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center',
                                                WebkitMaskPosition: 'center'
                                            }}
                                        />
                                    )}
                                    <h2 className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap leading-tight">
                                        Top DPS {getTranslatedType(category.typeFr, lang)}
                                    </h2>
                                </div>

                                <div className="space-y-3">
                                    {category.attackers.map((pokemon, pIdx) => {
                                        const pInfo = getPokemonInfo(pokemon.nameFr, pokemon.form);
                                        return (
                                            <div
                                                key={`${pokemon.nameFr}-${pIdx}`}
                                                className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group/item relative"
                                            >
                                                <div className="relative w-12 h-12 flex-shrink-0">
                                                    {pokemon.shadow && (
                                                        <div className="absolute -top-1.5 -left-1.5 bg-purple-600/90 text-[7px] px-1 py-0.5 rounded shadow-lg shadow-purple-900/40 text-white font-black border border-purple-400/50 backdrop-blur-sm z-30">
                                                            {t('rocket.shadow')}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-white/5 rounded-lg border border-white/5 z-0" />
                                                    <img
                                                        src={`https://img.pokemondb.net/sprites/home/normal/${pInfo.nameEn}${pokemon.mega ? '-mega' : ''}.png`}
                                                        alt={pokemon.nameFr}
                                                        className="w-full h-full object-contain relative z-10 p-1 group-hover/item:scale-110 transition-transform duration-300"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pInfo.id}.png`;
                                                            e.target.onerror = (e2) => {
                                                                e2.target.onerror = null;
                                                                e2.target.src = `https://img.pokemondb.net/sprites/go/normal/${pInfo.nameEn}.png`;
                                                            }
                                                        }}
                                                    />
                                                    {pokemon.mega && (
                                                        <div className="absolute top-1 right-1 z-40 bg-black/60 rounded-full p-0.5 border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                                                            <img src="https://www.pokepedia.fr/images/thumb/5/5d/Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg/800px-Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg.png" className="w-3 h-3 object-contain" alt="Mega" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-white tracking-tight flex items-center gap-1 flex-wrap text-left">
                                                        {pokemon.mega && <span className="text-pink-400">{t('rocket.mega')}</span>}
                                                        {pokemon.primal && <span className="text-blue-400">{t('rocket.primal')}</span>}
                                                        {pokemon.shadow && <span className="text-purple-400">{t('rocket.shadowLabel')}</span>}
                                                        <span>{pokemon.nameFr}</span>
                                                        {pokemon.form && <span className="text-gray-400 text-[10px] ml-1">({pokemon.form})</span>}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium mt-0.5">
                                                        {getMoveType(pokemon.moveFr) ? (
                                                            <div className="w-3 h-3 shrink-0" style={{ backgroundColor: getTypeColor(getMoveType(pokemon.moveFr)), maskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, WebkitMaskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                        ) : (
                                                            <Swords size={10} className="text-yellow-500" />
                                                        )}
                                                        <span className="truncate text-left">{pokemon.moveFr}</span>
                                                    </div>
                                                </div>
                                                {/* DPS Score Badge */}
                                                {pokemon.score && (
                                                    <div className="flex-shrink-0 ml-auto">
                                                        <div className={`text-xs font-black px-2 py-1 rounded-lg border ${
                                                            parseInt(pokemon.score) >= 95 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                            parseInt(pokemon.score) >= 85 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                            parseInt(pokemon.score) >= 75 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                                        }`}>
                                                            {pokemon.score}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <footer className="text-center text-gray-500 mt-16 pt-8 border-t border-white/10">
                    <p className="flex items-center justify-center gap-2">
                        {t('rocket.credits')} <a href="https://github.com/Ginden" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-bold">Ginden</a> {t('rocket.creditsEnd')}
                    </p>
                </footer>
            </div>
        </div>
    );
}
