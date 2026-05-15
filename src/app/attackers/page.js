'use client';

import React, { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { topPokemon } from '@/data/topPokemon';
import { raidAttackers } from '@/data/raidAttackers';
import { moveTypeMapping } from '@/data/moveTypeMapping';
import { POKEMON_DATA } from '@/data/pokemon';
import rocketData from '@/data/rocket_attackers.json';
import rocketDpsData from '@/data/rocket_dps.json';
import { Search, ChevronDown, ChevronUp, Swords, Shield, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { translateMove } from '@/data/moveTranslations';
import { translatePokemonName } from '@/lib/pokemonNameI18n';

const gruntGroups = {
    "Feu": [
        {
            "quoteKey": "quoteFire",
            "rewards": [
                { "nameFr": "Goupix", "maxPC": 119, "boostPC": 328 },
                { "nameFr": "Funécire", "maxPC": 135, "boostPC": 374 },
                { "nameFr": "Feunnec", "maxPC": 138, "boostPC": 381 }
            ]
        }
    ],
    "Vol": [
        {
            "quoteKey": "quoteFlying",
            "rewards": [
                { "nameFr": "Nirondelle", "maxPC": 172, "boostPC": 284 },
                { "nameFr": "Tylton", "maxPC": 185, "boostPC": 306 },
                { "nameFr": "Roucool", "maxPC": 153, "boostPC": 252 }
            ]
        }
    ],
    "Poison": [
        {
            "quoteKey": "quotePoison",
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
            "quoteKey": "quoteGrass",
            "rewards": [
                { "nameFr": "Cacnea", "maxPC": 167, "boostPC": 461 },
                { "nameFr": "Marisson", "maxPC": 147, "boostPC": 407 },
                { "nameFr": "Brocélôme", "maxPC": 151, "boostPC": 417 }
            ]
        }
    ],
    "Insecte": [
        {
            "quoteKey": "quoteBug",
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
            "quoteKey": "quoteDragon",
            "rewards": [
                { "nameFr": "Solochi", "maxPC": 239, "boostPC": 394 },
                { "nameFr": "Draby", "maxPC": 260, "boostPC": 429 },
                { "nameFr": "Minidraco", "maxPC": 226, "boostPC": 673 }
            ]
        }
    ],
    "Normal": [
        {
            "quoteKey": "quoteNormal1",
            "rewards": [
                { "nameFr": "Teddiursa", "maxPC": 299, "boostPC": 493 },
                { "nameFr": "Tylton", "maxPC": 185, "boostPC": 306 },
                { "nameFr": "Miaouss", "maxPC": 168, "boostPC": 278 }
            ]
        },
        {
            "quoteKey": "quoteNormal2",
            "rewards": [
                { "nameFr": "Ronflex", "maxPC": 727, "boostPC": 1198 }
            ]
        },
        {
            "quoteKey": "quoteNormal3",
            "rewards": [
                { "nameFr": "Carapuce", "maxPC": 213, "boostPC": 351 },
                { "nameFr": "Salamèche", "maxPC": 221, "boostPC": 364 },
                { "nameFr": "Bulbizarre", "maxPC": 251, "boostPC": 414 }
            ]
        }
    ],
    "Eau": [
        {
            "quoteKey": "quoteWater",
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
            "quoteKey": "quotePsychic",
            "rewards": [
                { "nameFr": "Balbuto", "maxPC": 177, "boostPC": 292 },
                { "nameFr": "Tarsal", "maxPC": 121, "boostPC": 200 }
            ]
        }
    ],
    "Roche": [
        {
            "quoteKey": "quoteRock",
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
            "quoteKey": "quoteFairy",
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
            "quoteKey": "quoteFighting",
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
            "quoteKey": "quoteGround",
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
            "quoteKey": "quoteIce",
            "rewards": [
                { "nameFr": "Marcacrin", "maxPC": 167, "boostPC": 275 },
                { "nameFr": "Obalie", "maxPC": 217, "boostPC": 357 },
                { "nameFr": "Farfuret", "maxPC": 462, "boostPC": 762 }
            ]
        }
    ],
    "Ténèbres": [
        {
            "quoteKey": "quoteDark",
            "rewards": [
                { "nameFr": "Medhyèna", "maxPC": 152, "boostPC": 252 },
                { "nameFr": "Rattata", "form": "Alola", "maxPC": 165, "boostPC": 273 },
                { "nameFr": "Carvanha", "maxPC": 230, "boostPC": 379 }
            ]
        }
    ],
    "Spectre": [
        {
            "quoteKey": "quoteGhost",
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
            "quoteKey": "quoteElectric",
            "rewards": [
                { "nameFr": "Magnéti", "maxPC": 307, "boostPC": 506 },
                { "nameFr": "Lixy", "maxPC": 197, "boostPC": 325 },
                { "nameFr": "Voltorbe", "maxPC": 227, "boostPC": 375 }
            ]
        }
    ],
    "Acier": [
        {
            "quoteKey": "quoteSteel",
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
    if (!p) return { nameEn: nameFr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") };

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

        // Darmanitan specific case: pokemondb uses -galarian-standard
        if (nameEn === 'darmanitan' && formSuffix === 'galarian') formSuffix = 'galarian-standard';

        nameEn += `-${formSuffix}`;
    }
    return { ...p, nameEn };
};

export default function TopPokemonPage() {
    const { t, lang } = useLanguage();
    const [filter, setFilter] = useState('Team Rocket');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [selectedType, setSelectedType] = useState(null);

    const filters = ['Team Rocket', 'Attaquants', 'Ligue Master', 'Ligue Hyper', 'Ligue Super'];
    const filterLabels = {
        'Team Rocket': t('rocket.teamRocket'),
        'Attaquants': t('rocket.attackersFilter'),
        'Ligue Master': t('rocket.masterLeague'),
        'Ligue Hyper': t('rocket.hyperLeague'),
        'Ligue Super': t('rocket.superLeague'),
    };

    // Translate a French type name to the current language
    const typeFrToKey = {
        'Normal': 'normal', 'Feu': 'fire', 'Eau': 'water', 'Plante': 'grass',
        'Électrik': 'electric', 'Glace': 'ice', 'Combat': 'fighting', 'Poison': 'poison',
        'Sol': 'ground', 'Vol': 'flying', 'Psy': 'psychic', 'Insecte': 'bug',
        'Roche': 'rock', 'Spectre': 'ghost', 'Dragon': 'dragon', 'Acier': 'steel',
        'Ténèbres': 'dark', 'Fée': 'fairy',
    };
    const typeLabel = (frType) => {
        const key = typeFrToKey[frType];
        return key ? t(`types.${key}`) : frType;
    };

    // Build a lookup map for English -> French name translation
    const pokedexMap = useMemo(() => {
        const map = new Map();
        POKEMON_DATA.forEach(p => {
            if (p.nameEn && p.nameFr) {
                map.set(p.nameEn.toLowerCase(), { nameFr: p.nameFr, id: p.id });
            }
        });
        return map;
    }, []);

    // Helper to translate opponent names from English/speciesId to French
    const translateOpponentName = (rawName) => {
        if (!rawName) return rawName;

        let name = rawName;
        let suffix = '';

        // Handle underscore-separated IDs like "dialga_origin", "kyurem_black"
        if (name.includes('_')) {
            const parts = name.split('_');
            const baseName = parts[0];
            const formPart = parts.slice(1).join('_');

            // Form suffix translations
            const formTranslations = {
                'origin': ' (Originel)',
                'black': ' (Noir)',
                'white': ' (Blanc)',
                'shadow': ' (Obscur)',
                'alolan': ' (Alola)',
                'galarian': ' (Galar)',
                'hisuian': ' (Hisui)',
                'paldean': ' (Paldea)',
                'therian': ' (Totémique)',
                'incarnate': ' (Avatar)',
                'crowned': ' (Couronné)',
                'altered': ' (Altéré)',
                'attack': ' (Attaque)',
                'defense': ' (Défense)',
                'speed': ' (Vitesse)',
                'normal': '',
                'sky': ' (Céleste)',
                'land': ' (Terrestre)',
                'primal': 'Primo-',
                'mega': 'Méga-'
            };

            suffix = formTranslations[formPart.toLowerCase()] || '';
            name = baseName;

            // Handle prefix forms like mega/primal
            if (formPart.toLowerCase() === 'primal' || formPart.toLowerCase() === 'mega') {
                suffix = '';
                name = formTranslations[formPart.toLowerCase()] + baseName;
            }
        }

        // Try to find French name in pokedex
        const entry = pokedexMap.get(name.toLowerCase());
        if (entry && entry.nameFr) {
            // Capitalize first letter
            let frenchName = entry.nameFr;
            return frenchName + suffix;
        }

        // Fallback: Capitalize first letter and clean up
        const capitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
        return capitalized + suffix;
    };

    // Helper to get sprite URL for opponent
    const getOpponentSprite = (rawName) => {
        if (!rawName) return null;

        let name = rawName;

        // Handle underscore-separated IDs
        if (name.includes('_')) {
            const parts = name.split('_');
            name = parts[0];
        }

        // Try to find in pokedex
        const entry = pokedexMap.get(name.toLowerCase());
        if (entry && entry.id) {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`;
        }

        return null;
    };

    // Map French Types to English for Icon URLs
    const typeMapFrToEn = {
        "Normal": "normal", "Feu": "fire", "Eau": "water", "Plante": "grass",
        "Électrik": "electric", "Glace": "ice", "Combat": "fighting", "Poison": "poison",
        "Sol": "ground", "Vol": "flying", "Psy": "psychic", "Insecte": "bug",
        "Roche": "rock", "Spectre": "ghost", "Dragon": "dragon", "Acier": "steel",
        "Ténèbres": "dark", "Fée": "fairy",
        // Also map English types
        "normal": "normal", "fire": "fire", "water": "water", "grass": "grass",
        "electric": "electric", "ice": "ice", "fighting": "fighting", "poison": "poison",
        "ground": "ground", "flying": "flying", "psychic": "psychic", "bug": "bug",
        "rock": "rock", "ghost": "ghost", "dragon": "dragon", "steel": "steel",
        "dark": "dark", "fairy": "fairy"
    };

    const getTypeIcon = (t) => {
        if (!t) return null;
        const en = typeMapFrToEn[t];
        return en ? `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${en}.svg` : null;
    };

    // Map Types to Colors for UI
    const getTypeColor = (t) => {
        if (!t) return "#777";
        const colors = {
            "Normal": "#A8A878", "Feu": "#F08030", "Eau": "#6890F0", "Plante": "#78C850",
            "Électrik": "#F8D030", "Glace": "#98D8D8", "Combat": "#C03028", "Poison": "#A040A0",
            "Sol": "#E0C068", "Vol": "#A890F0", "Psy": "#F85888", "Insecte": "#A8B820",
            "Roche": "#B8A038", "Spectre": "#705898", "Dragon": "#7038F8", "Acier": "#B8B8D0",
            "Ténèbres": "#705848", "Fée": "#EE99AC",
            "normal": "#A8A878", "fire": "#F08030", "water": "#6890F0", "grass": "#78C850",
            "electric": "#F8D030", "ice": "#98D8D8", "fighting": "#C03028", "poison": "#A040A0",
            "ground": "#E0C068", "flying": "#A890F0", "psychic": "#F85888", "bug": "#A8B820",
            "rock": "#B8A038", "ghost": "#705898", "dragon": "#7038F8", "steel": "#B8B8D0",
            "dark": "#705848", "fairy": "#EE99AC"
        };
        return colors[t] || "#777";
    };

    const [displayCount, setDisplayCount] = useState(100);

    const filteredPokemon = useMemo(() => {
        if (filter === 'Attaquants') {
            const getMoveType = (moveName, fallbackType) => {
                if (!moveName) return fallbackType;
                const name = moveName.trim();
                if (moveTypeMapping[name]) return moveTypeMapping[name];
                if (name.endsWith('*')) {
                    const clean = name.slice(0, -1).trim();
                    if (moveTypeMapping[clean]) return moveTypeMapping[clean];
                }
                return fallbackType;
            };

            let data = raidAttackers.map((p, index) => {
                const source = topPokemon.find(tp => tp.id === p.id || tp.name === p.name);
                const stats = source?.stats || {};
                const mainType = p.type?.[0] || '';

                return {
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    categories: ['Raids'],
                    bestMoves: p.movePool?.[0] ? {
                        fast: p.movePool[0].fast,
                        fastType: getMoveType(p.movePool[0].fast, mainType),
                        charge: p.movePool[0].charge,
                        chargeType: getMoveType(p.movePool[0].charge, mainType)
                    } : {},
                    movePool: p.movePool || [],
                    stats: { atk: stats.atk || '?', def: stats.def || '?', sta: stats.sta || '?' },
                    rankings: { Attaquants: index + 1 },
                    imageUrl: p.imageUrl,
                    bgGradient: getTypeGradient(p.type?.[0]),
                    raidDps: p.dps
                };
            });

            if (search) {
                const q = search.toLowerCase();
                data = data.filter(p => p.name.toLowerCase().includes(q));
            }

            if (selectedType) {
                data = data.filter(p => p.type?.includes(selectedType));
            }

            return data;
        }

        // Filter out bad data (English names, untranslated forms) for PvP
        let data = topPokemon.filter(p => {
            if (!p.categories?.includes(filter)) return false;

            // Filter out raw IDs
            if (p.name.includes('_') && !p.name.includes(' ')) return false;

            // Filter out known English untranslated forms & duplicates
            const englishSignatures = [
                '(Crowned', '(Therian', '(Incarnate', '(Origin', ' Shadow', '(Hero',
                '(Dawn', '(Dusk', '(Zen', ' Black', ' White', ' Obscur', ' (Galar',
                ' (Alola)', ' (Hisui)', ' (Paldea)', ' Kyurem', ' Tyranitar', ' Eternatus',
                '(Aria)', '(Dawn Wings)', '(Dusk Mane)', '(Standard)'
            ];

            // Check for English signatures or untranslated forms
            if (englishSignatures.some(sig => p.name.includes(sig))) {
                // But keep it if it's a valid Shadow (Obscur) that we want but maybe the name is malformed?
                // Actually, if it has "Obscur" in French, we keep it, but if it's "Shadow" we drop it.
                // The list above includes " Obscur", so we should be careful.
                // Let's refine:
                if (p.name.includes('Shadow')) return false;
                if (p.name.includes('Crowned')) return false;
                if (p.name.includes('Therian')) return false;
                if (p.name.includes('Incarnate')) return false;
                if (p.name.includes('Origin')) return false; // This might kill "Originel", check carefully. "Originel" is fine. "Origin" is danger.
            }

            // Remove specific known duplicates or English leaks based on user feedback
            if (p.name.includes('Kyurem Black')) return false;
            if (p.name.includes('Kyurem White')) return false;
            if (p.name.includes('Kyurem (Black)')) return false;
            if (p.name.includes('Kyurem (White)')) return false;
            if (p.name.includes('Tyranitar')) return false;
            if (p.name.includes('Éternatos')) return false;
            if (p.name.includes('Eternatus')) return false;
            if (p.name.includes('Metagross')) return false; // Métalosse
            if (p.name.includes('Annihilape')) return false; // Courrousinge
            if (p.name.includes('Dragonite')) return false; // Dracolosse
            if (p.name.includes('Gyarados')) return false; // Léviator
            if (p.name.includes('Garchomp')) return false; // Carchacrok
            if (p.name.includes('Zapdos')) return false; // Électhor
            if (p.name.includes('Rhyperior')) return false; // Rhinastoc
            if (p.name.includes('Salamence')) return false; // Drattak
            if (p.name.includes('Avalugg')) return false; // Séracrawl
            if (p.name.includes('Hydreigon')) return false; // Trioxhydre
            if (p.name.includes('Metagross Obscur')) return false;
            if (p.name.includes('Meloetta (Aria)')) return false;
            if (p.name.toLowerCase().includes('shadow')) return false;
            if (p.name.toLowerCase().includes('obscur') && !p.name.includes('(')) return false; // "Tyranitar Obscur" vs "Tyranocif (Obscur)"

            return true;
        });

        // Deduplicate based on base ID or cleaned name if multiple variants exist in same list improperly
        const uniqueData = [];
        const seenNames = new Set();

        for (const p of data) {
            // Create a normalized key for deduplication
            // e.g. "Mewtwo (Obscur)" -> "Mewtwo" to see if we have duplicates? 
            // No, Obscur and Normal are different. 
            // But "Kyurem (Noir)" and "Kyurem Black" are duplicates. 
            // We already filtered specific bad names, but let's be safe.
            if (seenNames.has(p.name)) continue;
            seenNames.add(p.name);
            uniqueData.push(p);
        }
        data = uniqueData;

        if (search) {
            const q = search.toLowerCase();
            data = data.filter(p => p.name.toLowerCase().includes(q));
        }

        data.sort((a, b) => (a.rankings?.[filter] || 999) - (b.rankings?.[filter] || 999));

        return data;
    }, [filter, search, selectedType]);

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

    React.useEffect(() => { setDisplayCount(100); }, [filter, search, selectedType]);

    const visiblePokemon = filteredPokemon.slice(0, displayCount);

    const toggleExpand = (id) => { setExpandedId(expandedId === id ? null : id); };

    // Helper to get move type icon
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
        // Specific fix for "Force Paume" / "Forte-Paume"
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
        return (
            <div className={`${sizeClasses} shrink-0`} style={{ backgroundColor: color, maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
        );
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <Header />

            <main className="pt-24 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
                <header className="text-center mb-12 mt-4">
                    <h1
                        className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] mb-8"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {t('rocket.pageTitle')}
                    </h1>
                    {filter === 'Team Rocket' && (
                        <p className="text-gray-400 max-w-3xl mx-auto text-sm md:text-base font-medium mb-8">
                            {t('rocket.pageDesc')}
                        </p>
                    )}
                </header>

                <div className="flex flex-col gap-1 md:gap-6 mb-4 md:mb-12 bg-white/5 p-3 md:p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                    <div className="relative flex flex-col items-center group w-full">
                        <div className="flex flex-wrap gap-2 justify-center w-full">
                            {filters.map((f, idx) => (
                                <button
                                    key={f}
                                    onClick={() => { setFilter(f); setSelectedType(null); }}
                                    className={`
                                        rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shrink-0 text-[10px] sm:text-xs md:text-sm px-2 py-2 md:px-4 md:py-2
                                        ${idx < 2 ? 'w-[48%] md:w-auto' : 'w-[30%] md:w-auto'}
                                        ${filter === f ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-900/40' : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/10'}
                                    `}
                                >
                                    {filterLabels[f] || f}
                                </button>
                            ))}
                        </div>

                        {filter !== 'Team Rocket' && (
                            <div className="relative w-full xl:w-80 mt-4 xl:mt-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input type="text" placeholder={t('rocket.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" />
                            </div>
                        )}
                    </div>

                </div>

                <div className="min-h-[400px]">
                    {filter === 'Team Rocket' ? (
                        <div className="flex flex-col gap-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {rocketData.map((category, idx) => (
                                    <motion.div layout key={category.typeFr} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 p-6 hover:border-white/20 transition-all duration-500 shadow-xl">
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex items-center justify-center gap-3 mb-6 bg-black/20 p-2 rounded-xl border border-white/5">
                                                {getTypeIcon(category.typeFr) && (
                                                    <div className="w-6 h-6 shrink-0" style={{ backgroundColor: getTypeColor(category.typeFr), maskImage: `url(${getTypeIcon(category.typeFr)})`, WebkitMaskImage: `url(${getTypeIcon(category.typeFr)})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                )}
                                                <h2 className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap leading-tight">{t('rocket.gruntCounters', { type: typeLabel(category.typeFr) })}</h2>
                                            </div>

                                            {gruntGroups[category.typeFr]?.map((group, gIdx) => (
                                                <div key={gIdx} className="mt-2 pt-0 w-full flex flex-col items-center">
                                                    <p className="text-[10px] md:text-xs text-gray-400 font-medium italic leading-tight mb-3 px-2 text-center">{t(`rocket.${group.quoteKey}`)}</p>
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
                                                                    <div className="text-[10px] md:text-xs font-black text-white leading-tight mt-1.5 text-center px-1 uppercase tracking-tighter">
                                                                        {reward.nameFr}
                                                                    </div>
                                                                    <div className="flex flex-col mt-1 gap-0.5 items-center">
                                                                        <div className="text-[9px] text-gray-400 uppercase font-black">Max <span className="text-white ml-0.5">{reward.maxPC}</span></div>
                                                                        <div className="text-[9px] text-gray-400 uppercase font-black">Boost <span className="text-yellow-400 ml-0.5">{reward.boostPC}</span></div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}

                                            <div className="space-y-3 mt-4 w-full">
                                                {category.attackers.map((pokemon, pIdx) => {
                                                    const pInfo = getPokemonInfo(pokemon.nameFr, pokemon.form);
                                                    return (
                                                        <div key={`${pokemon.nameFr}-${pIdx}`} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group/item relative">
                                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                                {pokemon.shadow && (
                                                                    <div className="absolute -top-1.5 -left-1.5 bg-purple-600/90 text-[7px] px-1 py-0.5 rounded shadow-lg shadow-purple-900/40 text-white font-black border border-purple-400/50 backdrop-blur-sm z-30">{t('rocket.shadow')}</div>
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
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <div className="font-bold text-sm text-white uppercase tracking-tighter flex items-center gap-1 flex-wrap">
                                                                    {pokemon.mega && <span className="text-pink-400">{t('rocket.mega')}</span>}
                                                                    {pokemon.primal && <span className="text-blue-400">{t('rocket.primal')}</span>}
                                                                    <span>{translatePokemonName(pokedexMap.get(pokemon.nameEn.toLowerCase())?.nameFr || pokemon.nameFr, lang)}</span>
                                                                    {pokemon.form && <span className="text-gray-400 text-[10px] ml-1">({pokemon.form})</span>}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 uppercase font-black flex items-center gap-1.5 mt-1">
                                                                    {getMoveType(pokemon.moveFr) ? (
                                                                        <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: getTypeColor(getMoveType(pokemon.moveFr)), maskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, WebkitMaskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                                    ) : (
                                                                        <Swords size={8} className="text-red-500" />
                                                                    )}
                                                                    {translateMove(pokemon.moveFr, lang)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mb-12 pt-12 border-t border-white/10">
                                <h2 className="text-3xl md:text-5xl font-black text-center mb-12">
                                    <span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">{t('rocket.topDpsTitle')}</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {rocketDpsData.map((category, idx) => (
                                        <motion.div key={category.typeFr} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }} className="relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 to-gray-800 p-6 hover:border-white/20 transition-all duration-500 shadow-xl">
                                            <div className="flex items-center gap-3 mb-6 bg-black/20 p-2 rounded-xl border border-white/5">
                                                {getTypeIcon(category.typeFr) && (
                                                    <div className="w-6 h-6 shrink-0" style={{ backgroundColor: getTypeColor(category.typeFr), maskImage: `url(${getTypeIcon(category.typeFr)})`, WebkitMaskImage: `url(${getTypeIcon(category.typeFr)})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                )}
                                                <h2 className="text-sm md:text-lg font-black uppercase tracking-tighter md:tracking-tight text-white whitespace-nowrap leading-tight">{t('rocket.topDpsType', { type: typeLabel(category.typeFr) })}</h2>
                                            </div>
                                            <div className="space-y-3">
                                                {category.attackers.map((pokemon, pIdx) => (
                                                    <div key={`${pokemon.nameFr}-${pIdx}`} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl border border-white/5 hover:bg-white/5 transition-colors group/item">
                                                        <div className="relative w-12 h-12 flex-shrink-0">
                                                            {pokemon.shadow && <div className="absolute -top-1.5 -left-1.5 bg-purple-600/90 text-[7px] px-1 py-0.5 rounded shadow-lg shadow-purple-900/40 text-white font-black border border-purple-400/50 backdrop-blur-sm z-20">{t('rocket.shadow')}</div>}
                                                            <img src={`https://img.pokemondb.net/sprites/home/normal/${pokemon.nameEn.toLowerCase().replace(' ', '-').replace("'", "").replace('.', '').replace('♀', '-f').replace('♂', '-m').replace("é", "e").replace("ô", "o")}.png`} alt={pokemon.nameFr} className="w-full h-full object-contain relative z-10 drop-shadow-lg group-hover/item:scale-110 transition-transform duration-300" onError={(e) => { e.target.onerror = null; e.target.src = `https://img.pokemondb.net/sprites/go/normal/${pokemon.nameEn.toLowerCase().replace(' ', '-').replace("'", "").replace('.', '')}.png`; }} />
                                                            {pokemon.mega && (
                                                                <div className="absolute top-1 right-1 z-40 bg-black/60 rounded-full p-0.5 border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                                                                    <img src="https://www.pokepedia.fr/images/thumb/5/5d/Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg/800px-Symbole_M%C3%A9ga-%C3%89volution_LPZA.svg.png" className="w-4 h-4 object-contain" alt="Mega" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0 text-left">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <span className="font-bold text-sm md:text-base text-gray-100 truncate group-hover/item:text-white transition-colors">{translatePokemonName(pokemon.nameFr, lang)}</span>
                                                                {pokemon.form && <span className="text-[10px] uppercase tracking-wider text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">{pokemon.form}</span>}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                                {getMoveType(pokemon.moveFr) ? (
                                                                    <div className="w-3 h-3 shrink-0" style={{ backgroundColor: getTypeColor(getMoveType(pokemon.moveFr)), maskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, WebkitMaskImage: `url(${getTypeIcon(getMoveType(pokemon.moveFr))})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                                ) : (
                                                                    <Swords size={12} className="text-yellow-400" />
                                                                )}
                                                                <span className="truncate">{translateMove(pokemon.moveFr, lang)}</span>
                                                            </div>
                                                        </div>

                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <footer className="text-center text-gray-500 mt-8 pt-8 border-t border-white/10 mb-8">
                                    <p className="flex items-center justify-center gap-2">{t('rocket.credits')} <a href="https://github.com/Ginden" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors font-bold">Ginden</a> {t('rocket.creditsEnd')}</p>
                                </footer>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <motion.div layout className="flex flex-col space-y-4">
                                <AnimatePresence mode='popLayout'>
                                    {visiblePokemon.map((pokemon, index) => {
                                        const rank = filter === 'Raids' ? (index + 1) : pokemon.rankings?.[filter];
                                        const isExpanded = expandedId === pokemon.name;
                                        return (
                                            <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }} key={`${filter}-${pokemon.id || pokemon.name}-${index}`} onClick={() => toggleExpand(pokemon.name)} className="relative group rounded-2xl overflow-hidden border border-white/10 bg-[#121212] hover:border-white/20 transition-all duration-300 hover:shadow-xl hover:shadow-purple-900/10 cursor-pointer">
                                                <div className={`absolute inset-0 bg-gradient-to-r ${pokemon.bgGradient} opacity-[0.15] group-hover:opacity-[0.25] transition-opacity`}></div>
                                                <div className="flex flex-row items-center md:items-stretch min-h-[80px] md:min-h-[120px] p-3 md:p-4">
                                                    <div className="relative z-10 w-16 md:w-32 shrink-0 bg-transparent flex items-center justify-center">
                                                        {rank && <div className="absolute -top-1 -left-1 md:top-0 md:left-0 text-lg md:text-3xl font-black text-white/10 select-none">#{rank}</div>}
                                                        <div className="w-12 h-12 md:w-20 md:h-20 relative transform group-hover:scale-105 transition-transform duration-300"><img src={pokemon.imageUrl} alt={translatePokemonName(pokemon.name, lang)} className="w-full h-full object-contain drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]" /></div>
                                                    </div>
                                                    <div className="relative z-10 flex-1 px-3 md:px-4 flex flex-col justify-center border-none md:border-l border-white/5 min-w-0">
                                                        <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-1 md:mb-2">
                                                            <h2 className="text-sm md:text-2xl font-bold text-white flex items-center gap-2 truncate">{translatePokemonName(pokemon.name, lang)}</h2>
                                                            <div className="flex gap-1 flex-wrap items-center">
                                                                {pokemon.type?.map(typeFr => (
                                                                    <div key={typeFr} className="w-4 h-4 md:w-auto md:h-auto md:px-1.5 md:py-0.5 rounded md:rounded text-[10px] uppercase font-bold text-white shadow-sm border bg-black/40 flex items-center justify-center" style={{ borderColor: getTypeColor(typeFr) }}>
                                                                        <div className="w-3 h-3 md:hidden" style={{ backgroundColor: getTypeColor(typeFr), maskImage: `url(${getTypeIcon(typeFr)})`, WebkitMaskImage: `url(${getTypeIcon(typeFr)})`, maskSize: 'contain', WebkitMaskSize: 'contain', maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskPosition: 'center' }} />
                                                                        <span className="hidden md:inline" style={{ color: getTypeColor(typeFr) }}>{typeLabel(typeFr)}</span>
                                                                    </div>
                                                                ))}
                                                                {filter === 'Raids' && pokemon.raidDps && (
                                                                    <div className={`px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold shrink-0 ml-2 ${pokemon.isEstimatedDps ? 'bg-amber-900/30 border border-amber-500/30 text-amber-400' : 'bg-green-900/30 border border-green-500/30 text-green-400'}`}>{pokemon.raidDps} DPS{pokemon.isEstimatedDps ? '~' : ''}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10 w-32 md:w-96 bg-transparent p-2 md:p-3 flex flex-col justify-center gap-1 md:border-l border-white/5 shrink-0">
                                                        <div className="flex flex-col gap-1 items-end md:items-stretch">
                                                            <div className="flex items-center gap-1 md:gap-2 justify-end md:justify-start w-full">
                                                                <div className="hidden md:block text-[9px] text-gray-500 uppercase w-12 text-right shrink-0">{t('rocket.fastMove')}</div>
                                                                <div className="bg-white/5 px-2 py-1 rounded flex items-center gap-1.5 flex-1 max-w-[120px] md:max-w-none"><MoveTypeIcon type={pokemon.bestMoves?.fastType} size="sm" /><span className="text-[9px] md:text-xs font-medium text-white truncate flex-1">{translateMove(pokemon.bestMoves?.fast, lang) || '-'}</span></div>
                                                            </div>
                                                            <div className="flex items-center gap-1 md:gap-2 justify-end md:justify-start w-full">
                                                                <div className="hidden md:block text-[9px] text-gray-500 uppercase w-12 text-right shrink-0">{t('rocket.chargeMove')}</div>
                                                                <div className="bg-white/5 px-2 py-1 rounded flex items-center gap-1.5 flex-1 max-w-[120px] md:max-w-none"><MoveTypeIcon type={pokemon.bestMoves?.chargeType} size="sm" /><span className="text-[9px] md:text-xs font-medium text-white truncate flex-1">{translateMove(pokemon.bestMoves?.charge, lang) || '-'}</span></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="relative z-10 flex items-center justify-center px-2 md:px-4">{isExpanded ? <ChevronUp className="text-gray-400" size={20} /> : <ChevronDown className="text-gray-400" size={20} />}</div>
                                                </div>
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                            <div className="p-6 border-t border-white/10 space-y-6">
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Shield size={16} /> {t('rocket.baseStats')}</h4>
                                                                    <div className="grid grid-cols-3 gap-4">
                                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center"><div className="text-xs text-gray-500 uppercase mb-1">{t('rocket.statAtk')}</div><div className="text-xl font-bold text-red-400">{pokemon.stats?.atk || '?'}</div></div>
                                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center"><div className="text-xs text-gray-500 uppercase mb-1">{t('rocket.statDef')}</div><div className="text-xl font-bold text-blue-400">{pokemon.stats?.def || '?'}</div></div>
                                                                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center"><div className="text-xs text-gray-500 uppercase mb-1">{t('rocket.statSta')}</div><div className="text-xl font-bold text-green-400">{pokemon.stats?.sta || '?'}</div></div>
                                                                    </div>
                                                                </div>
                                                                {filter === 'Raids' && pokemon.movePool?.length > 0 && (
                                                                    <div className="border-t border-white/5 pt-6">
                                                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Swords size={16} /> {t('rocket.availableMovesets')}</h4>
                                                                        <div className="space-y-2">
                                                                            {pokemon.movePool.map((move, idx) => (
                                                                                <div key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                                                                    <div className="flex items-center gap-3"><span className="text-xs font-medium text-white">{translateMove(move.fast, lang)}</span><span className="text-gray-500">+</span><span className="text-xs font-medium text-white">{translateMove(move.charge, lang)}</span></div>
                                                                                    {move.dps && <div className="bg-green-900/30 border border-green-500/30 px-2 py-1 rounded text-sm font-bold text-green-400">{move.dps} DPS</div>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                {filter.includes('Ligue') && pokemon.detailedStats?.[filter] && (
                                                                    <div className="border-t border-white/5 pt-6">
                                                                        <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Zap size={16} /> {t('rocket.pvpPerformance', { filter: filterLabels[filter] || filter })}</h4>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            <div>
                                                                                <h5 className="text-sm font-bold text-green-400 uppercase mb-4">{t('rocket.keyMatchups')}</h5>
                                                                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                                                    {pokemon.detailedStats[filter].matchups?.map((m, idx) => {
                                                                                        const displayName = translateOpponentName(m.name);
                                                                                        const spriteUrl = m.imageUrl || getOpponentSprite(m.name);
                                                                                        return (
                                                                                            <div key={idx} className="flex flex-col items-center gap-2 min-w-[80px]">
                                                                                                <div className="w-16 h-16 bg-green-900/10 border border-green-500/20 rounded-xl flex items-center justify-center p-2">{spriteUrl ? <img src={spriteUrl} className="w-full h-full object-contain" /> : <div className="w-8 h-8 bg-green-500/20 rounded-full" />}</div>
                                                                                                <span className="text-xs font-bold text-green-200 text-center leading-tight">{displayName}</span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <h5 className="text-sm font-bold text-red-400 uppercase mb-4">{t('rocket.countersTitle')}</h5>
                                                                                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                                                                    {pokemon.detailedStats[filter].counters?.map((c, idx) => {
                                                                                        const displayName = translateOpponentName(c.name);
                                                                                        const spriteUrl = c.imageUrl || getOpponentSprite(c.name);
                                                                                        return (
                                                                                            <div key={idx} className="flex flex-col items-center gap-2 min-w-[80px]">
                                                                                                <div className="w-16 h-16 bg-red-900/10 border border-red-500/20 rounded-xl flex items-center justify-center p-2">{spriteUrl ? <img src={spriteUrl} className="w-full h-full object-contain" /> : <div className="w-8 h-8 bg-red-500/20 rounded-full" />}</div>
                                                                                                <span className="text-xs font-bold text-red-200 text-center leading-tight">{displayName}</span>
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
                                    <span className="text-gray-400 font-medium">{t('rocket.showingCount', { shown: Math.min(displayCount, filteredPokemon.length), total: filteredPokemon.length })}</span>
                                    <button onClick={() => setDisplayCount(prev => prev + 100)} className="mx-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-red-900/50 transform hover:scale-105">{t('rocket.loadMore')}</button>
                                </div>
                            )}

                            {filter !== 'Team Rocket' && (
                                <div className="mt-12 text-center text-gray-500 text-sm opacity-60">
                                    <p>{t('rocket.pvpFooter')} <a href="https://fr.pvpoke-re.com/" target="_blank" rel="noopener noreferrer" className="hover:text-red-400 transition-colors">PvPoke-re.com</a></p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
