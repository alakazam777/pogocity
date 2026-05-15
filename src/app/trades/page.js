'use client';

import { useState, useRef, useEffect } from 'react';
import { POKEMON_DATA } from '@/data/pokemon';
import { COSTUME_DATA } from '@/data/costumes';
import { POKEMON_FORMS } from '@/data/pokemonForms';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { toBlob } from 'html-to-image';
import { Search, Download, Trash2, Plus, X, Check, Copy, Share2, ChevronLeft, MessageCircle, Sparkles, Shield, Star, Swords, Zap, Image, CircleDot } from 'lucide-react';
import ChatPopup from '@/components/ChatPopup';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import cityConfig from '@/lib/cityConfig';
import { POKEMON_TYPES } from '@/data/pokemonTypes';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

// Extracted modules
import EchangesErrorBoundary from './components/EchangesErrorBoundary';
import SortablePokemon from './components/SortablePokemon';
import ExportPokemonItem from './components/ExportPokemonItem';
import {
    GALARIAN_FORMS, LEGENDARY_IDS, GMAX_IDS, HISUIAN_FORMS, MISC_FORMS,
    COSTUME_POKEMON, SIGNATURE_MOVE_POKEMON, ELITE_TM_POKEMON,
    POKEMON_BACKGROUNDS, DISABLED_SHINY_IDS, SHADOW_ELIGIBLE_IDS, DISABLED_IDS
} from './constants';

function EchangesPage() {
    const { t, lang } = useLanguage();
    const pokeName = (p) => lang === 'en' ? (p.nameEn || p.nameFr) : p.nameFr;

    const [search, setSearch] = useState('');
    const [lookingFor, setLookingFor] = useState([]);
    const [forTrade, setForTrade] = useState([]);
    const [filters, setFilters] = useState([]); // Default to empty which means 'Tous' effectively in logic, but UI should reflect it.
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedPokemon, setSelectedPokemon] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [fullPokemonList, setFullPokemonList] = useState([]);
    const [username, setUsername] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [tradeWebhookMsgId, setTradeWebhookMsgId] = useState(null);
    const [isSharing, setIsSharing] = useState(false);
    const sharingLock = useRef(false);

    const [otherTraders, setOtherTraders] = useState([]);
    const [viewingTrader, setViewingTrader] = useState(null);
    const [showMatches, setShowMatches] = useState(false);
    const [chatTarget, setChatTarget] = useState(null);

    const exportRef = useRef(null);
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const defaultTrainerName = lang === 'en' ? 'Trainer' : 'Dresseur';
    const [trainerName, setTrainerName] = useState(defaultTrainerName); // Separate state for UI display

    // Filter label mapping for i18n
    const filterLabelMap = {
        'Normal': t('common.normal'),
        'Shiny': t('common.shiny'),
        'Costumés': t('common.costume'),
        'Légendaires': t('common.legendary'),
        'Purifiés': t('common.purified'),
        'Gigamax': t('common.gigamax'),
        'Dynamax': t('common.dynamax'),
        'Backgrounds': t('common.backgrounds'),
        'Attaques': t('common.attacks'),
    };

    // Fetch Other Traders & Init Name
    useEffect(() => {
        // Init trainer name from storage
        const storedUser = localStorage.getItem('pokemon_user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setTrainerName(parsed.username || defaultTrainerName);
        } else {
            setTrainerName(defaultTrainerName);
        }
        const fetchTraders = async () => {
            try {
                const res = await fetch('/api/pokemon/leaderboard');
                if (res.ok) {
                    const data = await res.json();
                    const traders = data.filter(u =>
                        (u.tradeList?.lookingFor?.length > 0 || u.tradeList?.forTrade?.length > 0) &&
                        u.username !== username &&
                        u.username !== 'snstvt'
                    );
                    setOtherTraders(traders);
                }
            } catch (e) { console.error(e); }
        };
        fetchTraders();
    }, [username]);

    // Initialize Pokemon List
    useEffect(() => {
        const list = [];
        const UNTRADABLE_IDS = [
            151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720, 721, 801, 802, 807, 893,
            772, 773, 896, 897, 898, 1001, 1002, 1003, 1004,
            967, 1005, 1006, 1007, 1008, 1009, 1010, 1014, 1015, 1016, 1017, 1018, 1020, 1021, 1022, 1023, 1024, 1025,
            746, 771, 774, 833, 834, 843, 844, 845, 846, 847, 868, 869, 871, 875, 878, 879, 880, 881, 882, 883, 902, 931,
            942, 943, 946, 947, 948, 949, 952, 953, 954, 955, 956, 963, 964, 968, 976, 981, 984, 985, 986, 987, 988, 989, 990, 991, 992, 993, 994, 995
        ];

        // Zarbi / Unown Forms (201)
        const generateUnown = (targetList) => {
            const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
            const others = ['EXCLAMATION', 'QUESTION'];
            const forms = [...letters, ...others];
            const unown = POKEMON_DATA.find(p => p.id === 201);
            if (!unown) return;

            forms.forEach(form => {
                const suffix = form.length === 1 && form !== '!' && form !== '?' ? `UNOWN_${form}` : (form === '!' || form === 'EXCLAMATION' ? 'UNOWN_EXCLAMATION' : 'UNOWN_QUESTION');
                const displayName = form === 'EXCLAMATION' ? '!' : form === 'QUESTION' ? '?' : form;

                let normalSprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm201.f${suffix}.icon.png`;
                let shinySprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm201.f${suffix}.s.icon.png`;

                if (displayName === '!') {
                    normalSprite = '/zarbi/zarbi exclamation.webp';
                    shinySprite = '/zarbi/zarbi exclamation shiny.webp';
                } else if (displayName === '?') {
                    // Filename check from list: "zarbi question.webp" and "zarbi question shiny.webp.webp" (double extension?)
                    // List said: "zarbi question shiny.webp.webp" - let's verify if that was a typo in my read or file.
                    // List output: "zarbi question shiny.webp.webp"
                    normalSprite = '/zarbi/zarbi question.webp';
                    shinySprite = '/zarbi/zarbi question shiny.webp.webp';
                }

                targetList.push({
                    ...unown,
                    uniqueKey: `201-${form}`,
                    originalId: 201,
                    nameFr: `Zarbi ${displayName}`,
                    nameEn: `Unown ${displayName}`,
                    isForm: true,
                    sprite: normalSprite,
                    isShiny: false
                });

                // Always Enable Shiny for Zarbi forms as requested
                targetList.push({
                    ...unown,
                    uniqueKey: `201-${form}-shiny`,
                    originalId: 201,
                    nameFr: `Zarbi ${displayName} (Shiny)`,
                    nameEn: `Unown ${displayName} (Shiny)`,
                    isForm: true,
                    sprite: shinySprite,
                    isShiny: true
                });
            });
        };


        const ALLOWED_COSTUMES = ['WINTER', 'NOEVOLVE', 'FALL', 'GOFEST', 'HOLIDAY', 'MAY', 'NOVEMBER', 'SPRING', '2022', 'SUMMER', 'ONE_YEAR_ANNIVERSARY', 'COSTUME', 'cHALLOWEEN_2017', 'ANNIVERSARY', 'NIGHTCAP', 'fWILDAREA_2024', 'MAY', 'PIKACHU'];

        // Initialize list and run generation
        const generateList = async () => {
            let costumeMapping = {};
            try {
                const res = await fetch('/api/admin/costumes/save'); // GET returns mapping
                if (res.ok) {
                    costumeMapping = await res.json();
                }
            } catch (e) {
                console.warn("Could not load costume mapping", e);
            }

            const list = []; // Initialize list here

            generateUnown(list);

            POKEMON_DATA.forEach(p => {
                if (UNTRADABLE_IDS.includes(p.id)) return;
                if (p.id === 201) return; // Handled above (Zarbi/Unown)
                if (p.id === 25 || p.id === 26) return; // Handled below (Pikachu/Raichu with costumes)

                p.isLegendary = LEGENDARY_IDS.includes(p.id);
                p.hasBackground = false;
                p.hasSignatureMove = false;
                p.hasEliteTM = false;
                p.isDynamax = false;
                p.isGmax = false;
                p.isPurified = false;
                const isLegendary = p.isLegendary;

                // Skip base entry for Pokémon whose forms replace the base entirely
                // (e.g. Nigirigon base = Curly form, so skip base to avoid duplicate)
                // Morpheo keeps its base Normal form since it's distinct from weather forms
                const SKIP_BASE_IDS = [978]; // Nigirigon only
                const hasReplacingForms = SKIP_BASE_IDS.includes(p.id);

                // Normal
                if (!hasReplacingForms) {
                    list.push({ ...p, uniqueKey: `${p.id}-normal`, originalId: p.id, isShiny: false, isCostume: false, isLegendary, sprite: getPokemonSprite(p.id, false) });
                }

                // Shiny
                if (!hasReplacingForms && !DISABLED_SHINY_IDS.includes(p.id)) {
                    list.push({ ...p, uniqueKey: `${p.id}-shiny`, originalId: p.id, isShiny: true, isCostume: false, isLegendary, sprite: getPokemonSprite(p.id, true) });

                    // Shiny + Purified — only for shadow-eligible Pokémon
                    if (SHADOW_ELIGIBLE_IDS.has(p.id)) {
                        list.push({ ...p, uniqueKey: `${p.id}-purified-shiny`, originalId: p.id, isShiny: true, isPurified: true, isCostume: false, isLegendary, nameFr: `${p.nameFr} (Purifié Shiny)`, nameEn: `${p.nameEn || p.nameFr} (Purified Shiny)`, sprite: getPokemonSprite(p.id, true) });
                    }
                }

                // Purified (Normal) — only for shadow-eligible Pokémon
                if (!hasReplacingForms && SHADOW_ELIGIBLE_IDS.has(p.id)) {
                    list.push({ ...p, uniqueKey: `${p.id}-purified`, originalId: p.id, isShiny: false, isPurified: true, isCostume: false, isLegendary, nameFr: `${p.nameFr} (Purifié)`, nameEn: `${p.nameEn || p.nameFr} (Purified)`, sprite: getPokemonSprite(p.id, false) });
                }

                // Galarian Forms
                if (GALARIAN_FORMS.includes(p.id)) {
                    list.push({
                        ...p,
                        uniqueKey: `${p.id}-galarian`,
                        originalId: p.id,
                        isShiny: false,
                        isForm: true,
                        nameFr: `${p.nameFr} de Galar`,
                        nameEn: `Galarian ${p.nameEn || p.nameFr}`,
                        formLabel: 'Galar',
                        formLabelEn: 'Galarian',
                        sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fGALARIAN.icon.png`
                    });
                    if (!DISABLED_SHINY_IDS.includes(p.id)) {
                        list.push({
                            ...p,
                            uniqueKey: `${p.id}-galarian-shiny`,
                            originalId: p.id,
                            isShiny: true,
                            isForm: true,
                            nameFr: `${p.nameFr} de Galar (Shiny)`,
                            nameEn: `Galarian ${p.nameEn || p.nameFr} (Shiny)`,
                            formLabel: 'Galar',
                            formLabelEn: 'Galarian',
                            sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fGALARIAN.s.icon.png`
                        });
                    }
                }

                // Other Forms
                const HAS_THERIAN = [641, 642, 645, 905]; // Boréas, Fulguris, Démétéros, Amovénus
                const HAS_ORIGIN = [483, 484, 487];

                if (HAS_THERIAN.includes(p.id)) {
                    list.push({ ...p, uniqueKey: `${p.id}-therian`, originalId: p.id, isShiny: false, isCostume: false, isForm: true, isLegendary: true, formLabel: 'Totémique', formLabelEn: 'Therian', nameFr: `${p.nameFr} Totémique`, nameEn: `${p.nameEn || p.nameFr} Therian`, sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fTHERIAN.icon.png` });
                    if (!DISABLED_SHINY_IDS.includes(p.id)) {
                        list.push({ ...p, uniqueKey: `${p.id}-therian-shiny`, originalId: p.id, isShiny: true, isCostume: false, isForm: true, isLegendary: true, formLabel: 'Totémique', formLabelEn: 'Therian', nameFr: `${p.nameFr} Totémique (Shiny)`, nameEn: `${p.nameEn || p.nameFr} Therian (Shiny)`, sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fTHERIAN.s.icon.png` });
                    }
                }
                if (HAS_ORIGIN.includes(p.id)) {
                    list.push({ ...p, uniqueKey: `${p.id}-origin`, originalId: p.id, isShiny: false, isCostume: false, isForm: true, isLegendary: true, formLabel: 'Originel', formLabelEn: 'Origin', nameFr: `${p.nameFr} Originel`, nameEn: `${p.nameEn || p.nameFr} Origin`, sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fORIGIN.icon.png` });
                    if (!DISABLED_SHINY_IDS.includes(p.id)) {
                        list.push({ ...p, uniqueKey: `${p.id}-origin-shiny`, originalId: p.id, isShiny: true, isCostume: false, isForm: true, isLegendary: true, formLabel: 'Originel', formLabelEn: 'Origin', nameFr: `${p.nameFr} Originel (Shiny)`, nameEn: `${p.nameEn || p.nameFr} Origin (Shiny)`, sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fORIGIN.s.icon.png` });
                    }
                }

                // Note: Primal forms (Kyogre/Groudon) are NOT tradeable in Pokémon GO

                // Hisuian Forms
                if (HISUIAN_FORMS.includes(p.id)) {
                    list.push({
                        ...p,
                        uniqueKey: `${p.id}-hisuian`,
                        originalId: p.id,
                        isShiny: false,
                        isForm: true,
                        nameFr: `${p.nameFr} de Hisui`,
                        nameEn: `Hisuian ${p.nameEn || p.nameFr}`,
                        formLabel: 'Hisui',
                        formLabelEn: 'Hisuian',
                        sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fHISUIAN.icon.png`
                    });
                    if (!DISABLED_SHINY_IDS.includes(p.id)) {
                        list.push({
                            ...p,
                            uniqueKey: `${p.id}-hisuian-shiny`,
                            originalId: p.id,
                            isShiny: true,
                            isForm: true,
                            nameFr: `${p.nameFr} de Hisui (Shiny)`,
                            nameEn: `Hisuian ${p.nameEn || p.nameFr} (Shiny)`,
                            formLabel: 'Hisui',
                            formLabelEn: 'Hisuian',
                            sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fHISUIAN.s.icon.png`
                        });
                    }
                }

                // Misc Forms
                if (MISC_FORMS[p.id]) {
                    MISC_FORMS[p.id].forEach(f => {
                        let displaySuffix = f.replace('_', ' ').replace('PALDEA ', '').replace('STRIPED', '').trim().toLowerCase();
                        displaySuffix = displaySuffix.charAt(0).toUpperCase() + displaySuffix.slice(1);

                        // Special translations (French)
                        const translations = {
                            'FAN': 'Ventilo', 'FROST': 'Froid', 'HEAT': 'Chaleur', 'MOW': 'Tonte', 'WASH': 'Lavage',
                            'DAWN': 'Crépuscule', 'DUSK': 'Crépusculaire', 'AMPED': 'Survoltée', 'LOW_KEY': 'Grave',
                            'FEMALE': 'Femelle', 'CURLY': 'Forme Courbée', 'DROOPY': 'Forme Affalée', 'STRETCHY': 'Forme Droite',
                            'BLUE_STRIPED': 'Motif Bleu', 'WHITE_STRIPED': 'Motif Blanc', 'RED': 'Rouge', 'YELLOW': 'Jaune', 'ORANGE': 'Orange', 'WHITE': 'Blanc',
                            'BAILE': 'Style Flamenco', 'POMPOM': 'Style Pom-Pom', 'PAU': 'Style Hula', 'SENSU': 'Style Buyô',
                            'PALDEA_AQUA': 'de Paldea (Aquatique)', 'PALDEA_BLAZE': 'de Paldea (Flamboyante)', 'PALDEA_COMBAT': 'de Paldea',
                            'SUNNY': 'Forme Solaire', 'RAINY': 'Forme Eau de Pluie', 'SNOWY': 'Forme Blizzard'
                        };
                        // English translations
                        const translationsEn = {
                            'FAN': 'Fan', 'FROST': 'Frost', 'HEAT': 'Heat', 'MOW': 'Mow', 'WASH': 'Wash',
                            'DAWN': 'Dawn', 'DUSK': 'Dusk', 'AMPED': 'Amped', 'LOW_KEY': 'Low Key',
                            'FEMALE': 'Female', 'CURLY': 'Curly Form', 'DROOPY': 'Droopy Form', 'STRETCHY': 'Stretchy Form',
                            'BLUE_STRIPED': 'Blue-Striped', 'WHITE_STRIPED': 'White-Striped', 'RED': 'Red', 'YELLOW': 'Yellow', 'ORANGE': 'Orange', 'WHITE': 'White',
                            'BAILE': 'Baile Style', 'POMPOM': 'Pom-Pom Style', 'PAU': "Pa'u Style", 'SENSU': 'Sensu Style',
                            'PALDEA_AQUA': 'Paldean (Aqua)', 'PALDEA_BLAZE': 'Paldean (Blaze)', 'PALDEA_COMBAT': 'Paldean (Combat)',
                            'SUNNY': 'Sunny Form', 'RAINY': 'Rainy Form', 'SNOWY': 'Snowy Form'
                        };

                        const frName = translations[f] || displaySuffix;
                        const enName = translationsEn[f] || displaySuffix;
                        const finalName = frName.includes('de Paldea') ? `${p.nameFr} ${frName}` : `${p.nameFr} (${frName})`;
                        const finalNameEn = enName.includes('Paldean') ? `${p.nameEn || p.nameFr} ${enName}` : `${p.nameEn || p.nameFr} (${enName})`;

                        // Special case for sprites not available on PogoAssets
                        let sprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.f${f}.icon.png`;
                        let shinySprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.f${f}.s.icon.png`;

                        if (p.id === 978) { // Tatsugiri (Nigirigon)
                            const formPart = f.toLowerCase();
                            sprite = `https://img.pokemondb.net/sprites/home/normal/tatsugiri-${formPart}.png`;
                            shinySprite = `https://img.pokemondb.net/sprites/home/shiny/tatsugiri-${formPart}.png`;
                        } else if (p.id === 351) { // Castform (Morpheo)
                            const suffixMap = { 'SUNNY': '_f30', 'RAINY': '_f31', 'SNOWY': '_f32' };
                            const suffix = suffixMap[f] || '';
                            sprite = `https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/pokemon/351${suffix}.png`;
                            shinySprite = `https://raw.githubusercontent.com/WatWowMap/wwm-uicons/main/pokemon/351${suffix}_s.png`;
                        }

                        list.push({
                            ...p,
                            uniqueKey: `${p.id}-${f}`,
                            originalId: p.id,
                            isShiny: false,
                            isForm: true,
                            nameFr: finalName,
                            nameEn: finalNameEn,
                            formLabel: frName,
                            formLabelEn: enName,
                            sprite: sprite
                        });

                        // Shiny versions
                        if (!DISABLED_SHINY_IDS.includes(p.id)) {
                            list.push({
                                ...p,
                                uniqueKey: `${p.id}-${f}-shiny`,
                                originalId: p.id,
                                isShiny: true,
                                isForm: true,
                                nameFr: `${finalName} (Shiny)`,
                                nameEn: `${finalNameEn} (Shiny)`,
                                formLabel: frName,
                                formLabelEn: enName,
                                sprite: shinySprite
                            });
                        }
                    });
                }

                // GMAX Logic (Existing)
                if (GMAX_IDS.includes(p.id)) {
                    // Map for local GMAX sprites
                    const gmaxMap = {
                        3: 'florizarre',
                        6: 'dracaufeu',
                        9: 'tortank',
                        12: 'papilusion',
                        68: 'mackogneur',
                        94: 'ectoplasma',
                        99: 'krabboss',
                        131: 'lokhlass',
                        143: 'ronflex',
                        569: 'miasmax',
                        812: 'gorythmic',
                        815: 'pyrobut',
                        818: 'lezargus',
                        849: 'salarsen1', // Normal form filename
                        861: 'angoliath'
                    };

                    // Map for local Shiny GMAX sprites (Specific filenames)
                    const gmaxShinyMap = {
                        3: 'florizarre sh',
                        6: 'dracaufeu sh',
                        9: 'tortank sh',
                        12: 'papilusion sh',
                        68: 'mackogneur sh',
                        94: 'ectoplasma sh',
                        99: 'krabboss sh',
                        131: 'lohklass sh', // Typo in filename
                        143: 'ronflex sh',
                        569: 'miasmax sh',
                        849: 'salarsen sh',
                        861: 'angoliath sh',
                        818: 'lezargus sh'
                    };

                    let localName = gmaxMap[p.id];
                    if (p.id === 818) localName = 'img22238_5';

                    const spriteUrl = (p.id === 818)
                        ? `/GMAX/img22238_5.webp`
                        : (localName ? `/GMAX/${localName}.webp` : `https://9db.jp/pokego/data/img/pokemon/${p.id}-gmax.png`);

                    list.push({
                        ...p,
                        uniqueKey: `${p.id}-gmax`,
                        originalId: p.id,
                        isShiny: false,
                        isCostume: false,
                        isForm: true,
                        isGmax: true,
                        nameFr: `${p.nameFr} Gigamax`,
                        sprite: spriteUrl
                    });
                    if (!DISABLED_SHINY_IDS.includes(p.id)) {
                        const localShinyName = gmaxShinyMap[p.id];
                        const shinySpriteUrl = localShinyName
                            ? `/Shiny Gigamax Sprites/${localShinyName}.webp`
                            : `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${p.id}.fGIGAMAX.s.icon.png`;

                        if (![812, 815, 818].includes(p.id)) {
                            list.push({
                                ...p,
                                uniqueKey: `${p.id}-gmax-shiny`,
                                originalId: p.id,
                                isShiny: true,
                                isCostume: false,
                                isForm: true,
                                isGmax: true,
                                nameFr: `${p.nameFr} Gigamax (Shiny)`,
                                sprite: shinySpriteUrl
                            });
                        }
                    }
                }

                // DMAX (Dynamax)
                // Removed: 83 (Canarticho), 110 (Smogogo) per request.
                const DMAX_IDS = [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 25, 26, 63, 64, 65, 66, 67, 68, 92, 93, 94, 98, 99, 106, 107, 113, 131, 138, 139, 140, 141, 143, 144, 145, 146, 213, 242, 243, 244, 245, 249, 250, 280, 281, 282, 302, 320, 321, 363, 364, 365, 374, 375, 376, 380, 381, 475, 519, 520, 521, 524, 525, 526, 527, 528, 529, 530, 554, 555, 568, 569, 615, 686, 687, 761, 762, 763, 766, 780, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 831, 832, 849, 856, 857, 858, 870, 884, 888, 889, 891, 892,
                    133, 134, 135, 136, 196, 197, 470, 471, 700 // Eeveelutions
                ];

                if (DMAX_IDS.includes(p.id)) {
                    // Normal DMAX
                    list.push({
                        ...p,
                        uniqueKey: `${p.id}-dynamax`,
                        originalId: p.id,
                        isShiny: false,
                        isCostume: false,
                        isForm: true,
                        isDynamax: true,
                        nameFr: `${p.nameFr} Dynamax`,
                        sprite: getPokemonSprite(p.id, false)
                    });
                    // Shiny DMAX (Requested)
                    if (!DISABLED_SHINY_IDS.includes(p.id)) {
                        list.push({
                            ...p,
                            uniqueKey: `${p.id}-dynamax-shiny`,
                            originalId: p.id,
                            isShiny: true,
                            isCostume: false,
                            isForm: true,
                            isDynamax: true,
                            nameFr: `${p.nameFr} Dynamax (Shiny)`,
                            sprite: getPokemonSprite(p.id, true)
                        });
                    }
                }

            });

            // ─── Pikachu Costumes avec Backgrounds spéciaux ───
            // Maps costume form IDs to their associated background names
            const PIKACHU_COSTUME_BACKGROUNDS = {
                'c_margxt_21': ['wcs2024'],                    // Championnats du Monde 2024
                'c_margxt_82': ['rt-paris', 'rt-london', 'rt-manchester', 'rt-berlin', 'rt-valencia', 'rt-thehague', 'rt-cologne', 'wcs2025'], // Estival (Road Trip + WCS 2025)
                'c_margxt_57': ['safari-incheon'],             // Safari
                'c_margxt_72': ['spring-blossom'],             // Coiffe de fleurs
                'c_margxt_20': ['festival-colors'],            // Sari
                'c_margxt_26': ['festival-colors'],            // Chemise Batik
                'c_margxt_6':  ['x-version', 'y-version'],    // Casquette de Kalem (GO Tour Kalos)
                'c_margxt_5':  ['x-version', 'y-version'],    // Casquette de Serena (GO Tour Kalos)
                'c_margxt_19': ['gold', 'silver'],             // Casquette de Ludwig (GO Tour Johto)
                'c_margxt_18': ['gold', 'silver'],             // Casquette de Ludvina (GO Tour Johto)
                'c_margxt_43': ['ruby', 'sapphire'],           // Chapeau de Brice (GO Tour Hoenn)
                'c_margxt_44': ['ruby', 'sapphire'],           // Ruban de Flora (GO Tour Hoenn)
                'c_margxt_31': ['diamond', 'pearl'],           // Béret de Louka (GO Tour Sinnoh)
                'c_margxt_30': ['diamond', 'pearl'],           // Bonnet de Aurore (GO Tour Sinnoh)
                'c_margxt_29': ['diamond', 'pearl'],           // Casquette de Aurel (GO Tour Sinnoh)
                'c_margxt_28': ['diamond', 'pearl'],           // Foulard de Lucia (GO Tour Sinnoh)
            };

            // Pikachu Costume Forms from POKEMON_FORMS
            const pikachuForms = POKEMON_FORMS[25];
            if (pikachuForms) {
                const pikachu = POKEMON_DATA.find(p => p.id === 25);
                const pikaClean = { isLegendary: false, hasBackground: false, hasSignatureMove: false, isDynamax: false, isGmax: false, isPurified: false };
                if (pikachu) {
                    pikachuForms.filter(f => f.costumeOnly).forEach(form => {
                        const enLabel = form.labelEn || form.label;
                        // Normal costume
                        list.push({
                            ...pikachu,
                            ...pikaClean,
                            uniqueKey: `25-costume-${form.id}`,
                            originalId: 25,
                            isShiny: false,
                            isCostume: true,
                            isForm: true,
                            nameFr: `Pikachu ${form.label}`,
                            nameEn: `Pikachu ${enLabel}`,
                            formLabel: form.label,
                            formLabelEn: enLabel,
                            sprite: form.localAsset
                        });
                        // Shiny costume
                        if (form.shinyAsset) {
                            list.push({
                                ...pikachu,
                                ...pikaClean,
                                uniqueKey: `25-costume-${form.id}-shiny`,
                                originalId: 25,
                                isShiny: true,
                                isCostume: true,
                                isForm: true,
                                nameFr: `Pikachu ${form.label} (Shiny)`,
                                nameEn: `Pikachu ${enLabel} (Shiny)`,
                                formLabel: form.label,
                                formLabelEn: enLabel,
                                sprite: form.shinyAsset
                            });
                        }

                        // Costume + Background variants
                        const costumeBgs = PIKACHU_COSTUME_BACKGROUNDS[form.id];
                        if (costumeBgs) {
                            costumeBgs.forEach(bgName => {
                                const bg = POKEMON_BACKGROUNDS.find(b => b.name === bgName);
                                if (!bg) return;
                                const bgLabelEn = bg.labelEn || bg.label;
                                // Normal costume + background
                                list.push({
                                    ...pikachu,
                                    ...pikaClean,
                                    uniqueKey: `25-costume-${form.id}-bg-${bgName}`,
                                    originalId: 25,
                                    isShiny: false,
                                    isCostume: true,
                                    isForm: true,
                                    hasBackground: true,
                                    backgroundImage: bg.image,
                                    backgroundLabel: bg.label,
                                    backgroundLabelEn: bgLabelEn,
                                    nameFr: `Pikachu ${form.label} (${bg.label})`,
                                    nameEn: `Pikachu ${enLabel} (${bgLabelEn})`,
                                    formLabel: `${form.label} · ${bg.label}`,
                                    formLabelEn: `${enLabel} · ${bgLabelEn}`,
                                    sprite: form.localAsset
                                });
                                // Shiny costume + background
                                if (form.shinyAsset) {
                                    list.push({
                                        ...pikachu,
                                        ...pikaClean,
                                        uniqueKey: `25-costume-${form.id}-bg-${bgName}-shiny`,
                                        originalId: 25,
                                        isShiny: true,
                                        isCostume: true,
                                        isForm: true,
                                        hasBackground: true,
                                        backgroundImage: bg.image,
                                        backgroundLabel: bg.label,
                                        backgroundLabelEn: bgLabelEn,
                                        nameFr: `Pikachu ${form.label} (${bg.label}) (Shiny)`,
                                        nameEn: `Pikachu ${enLabel} (${bgLabelEn}) (Shiny)`,
                                        formLabel: `${form.label} · ${bg.label}`,
                                        formLabelEn: `${enLabel} · ${bgLabelEn}`,
                                        sprite: form.shinyAsset
                                    });
                                }
                            });
                        }
                    });
                }
            }

            // Base Pikachu (normal + shiny, without costume)
            const pikachuBase = POKEMON_DATA.find(p => p.id === 25);
            if (pikachuBase) {
                const pikaFlags = { isLegendary: false, hasBackground: false, hasSignatureMove: false, isDynamax: false, isGmax: false, isPurified: false };
                list.push({ ...pikachuBase, ...pikaFlags, uniqueKey: '25-normal', originalId: 25, isShiny: false, isCostume: false, nameFr: 'Pikachu', sprite: getPokemonSprite(25, false) });
                list.push({ ...pikachuBase, ...pikaFlags, uniqueKey: '25-shiny', originalId: 25, isShiny: true, isCostume: false, nameFr: 'Pikachu (Shiny)', sprite: getPokemonSprite(25, true) });
            }

            // Base Raichu (normal + shiny)
            const raichuBase = POKEMON_DATA.find(p => p.id === 26);
            if (raichuBase) {
                const raichuFlags = { isLegendary: false, hasBackground: false, hasSignatureMove: false, isDynamax: false, isGmax: false, isPurified: false };
                list.push({ ...raichuBase, ...raichuFlags, uniqueKey: '26-normal', originalId: 26, isShiny: false, isCostume: false, nameFr: 'Raichu', sprite: getPokemonSprite(26, false) });
                list.push({ ...raichuBase, ...raichuFlags, uniqueKey: '26-shiny', originalId: 26, isShiny: true, isCostume: false, nameFr: 'Raichu (Shiny)', sprite: getPokemonSprite(26, true) });
            }

            // Raichu Alola Form
            const raichu = POKEMON_DATA.find(p => p.id === 26);
            const raichuClean = { isLegendary: false, hasBackground: false, hasSignatureMove: false, isDynamax: false, isGmax: false, isPurified: false };
            if (raichu) {
                list.push({
                    ...raichu,
                    ...raichuClean,
                    uniqueKey: `26-alola`,
                    originalId: 26,
                    isShiny: false,
                    isCostume: false,
                    isForm: true,
                    nameFr: `Raichu d'Alola`,
                    nameEn: `Alolan Raichu`,
                    formLabel: 'Alola',
                    sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm26.fALOLA.icon.png`
                });
                if (!DISABLED_SHINY_IDS.includes(26)) {
                    list.push({
                        ...raichu,
                        ...raichuClean,
                        uniqueKey: `26-alola-shiny`,
                        originalId: 26,
                        isShiny: true,
                        isCostume: false,
                        isForm: true,
                        nameFr: `Raichu d'Alola (Shiny)`,
                        nameEn: `Alolan Raichu (Shiny)`,
                        formLabel: 'Alola',
                        sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm26.fALOLA.s.icon.png`
                    });
                }
            }

            // Couaffarel (Furfrou) Forms from POKEMON_FORMS
            const furfouForms = POKEMON_FORMS[676];
            if (furfouForms) {
                const furfrou = POKEMON_DATA.find(p => p.id === 676);
                if (furfrou) {
                    furfouForms.filter(f => f.id !== '00').forEach(form => {
                        const enLabel = form.labelEn || form.label;
                        // Normal form
                        list.push({
                            ...furfrou,
                            uniqueKey: `676-form-${form.id}`,
                            originalId: 676,
                            isShiny: false,
                            isCostume: false,
                            isForm: true,
                            nameFr: `Couaffarel ${form.label}`,
                            nameEn: `Furfrou ${enLabel}`,
                            formLabel: form.label,
                            formLabelEn: enLabel,
                            sprite: form.pogoSuffix ? `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm676.f${form.pogoSuffix}.icon.png` : getPokemonSprite(676, false, form.id)
                        });
                        // Shiny form
                        list.push({
                            ...furfrou,
                            uniqueKey: `676-form-${form.id}-shiny`,
                            originalId: 676,
                            isShiny: true,
                            isCostume: false,
                            isForm: true,
                            nameFr: `Couaffarel ${form.label} (Shiny)`,
                            nameEn: `Furfrou ${enLabel} (Shiny)`,
                            formLabel: form.label,
                            formLabelEn: enLabel,
                            sprite: form.pogoSuffix ? `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm676.f${form.pogoSuffix}.s.icon.png` : getPokemonSprite(676, true, form.id)
                        });
                    });
                }
            }

            // Spinda Forms from POKEMON_FORMS
            const spindaForms = POKEMON_FORMS[327];
            if (spindaForms) {
                const spinda = POKEMON_DATA.find(p => p.id === 327);
                if (spinda) {
                    spindaForms.forEach(form => {
                        list.push({
                            ...spinda,
                            uniqueKey: `327-form-${form.id}`,
                            originalId: 327,
                            isShiny: false,
                            isForm: true,
                            nameFr: `Spinda ${form.label}`,
                            nameEn: `Spinda ${form.label}`,
                            formLabel: form.label,
                            sprite: form.localAsset || form.imageUrl || (form.pogoSuffix ? `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm327.f${form.pogoSuffix}.icon.png` : getPokemonSprite(327, false, form.id))
                        });
                        list.push({
                            ...spinda,
                            uniqueKey: `327-form-${form.id}-shiny`,
                            originalId: 327,
                            isShiny: true,
                            isForm: true,
                            nameFr: `Spinda ${form.label} (Shiny)`,
                            nameEn: `Spinda ${form.label} (Shiny)`,
                            formLabel: form.label,
                            sprite: form.shinyAsset || form.imageUrl || (form.pogoSuffix ? `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm327.f${form.pogoSuffix}.s.icon.png` : getPokemonSprite(327, true, form.id))
                        });
                    });
                }
            }

            // Lépidonille (664) + Prismillon (666) forms
            // Note: Scatterbug (664) looks identical for all patterns in PoGO — use base sprite
            [664, 666].forEach(id => {
                const forms = POKEMON_FORMS[id];
                if (forms) {
                    const species = POKEMON_DATA.find(p => p.id === id);
                    if (species) {
                        forms.forEach(form => {
                            const enLabel = form.labelEn || form.label;
                            const useBaseSprite = id === 664; // Scatterbug has no form-specific sprites
                            list.push({
                                ...species,
                                uniqueKey: `${id}-form-${form.id}`,
                                originalId: id,
                                isShiny: false,
                                isForm: true,
                                nameFr: `${species.nameFr} ${form.label}`,
                                nameEn: `${species.nameEn || species.nameFr} ${enLabel}`,
                                formLabel: form.label,
                                formLabelEn: enLabel,
                                sprite: useBaseSprite ? getPokemonSprite(id, false) : (form.localAsset || (form.pogoSuffix ? `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${id}.f${form.pogoSuffix}.icon.png` : getPokemonSprite(id, false, form.id)))
                            });
                            if (!DISABLED_SHINY_IDS.includes(id)) {
                                list.push({
                                    ...species,
                                    uniqueKey: `${id}-form-${form.id}-shiny`,
                                    originalId: id,
                                    isShiny: true,
                                    isForm: true,
                                    nameFr: `${species.nameFr} ${form.label} (Shiny)`,
                                    nameEn: `${species.nameEn || species.nameFr} ${enLabel} (Shiny)`,
                                    formLabel: form.label,
                                    formLabelEn: enLabel,
                                    sprite: useBaseSprite ? getPokemonSprite(id, true) : (form.shinyAsset || (form.pogoSuffix ? `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${id}.f${form.pogoSuffix}.s.icon.png` : getPokemonSprite(id, true, form.id)))
                                });
                            }
                        });
                    }
                }
            });

            Object.keys(COSTUME_DATA).forEach(id => {
                const species = POKEMON_DATA.find(p => p.id === parseInt(id));

                // Special handling for Generic Costumes (ID 9999) - NOW MAPPED
                if (parseInt(id) === 9999) {
                    const genericSpecies = species || {
                        id: 9999,
                        nameFr: "Costume Inconnu",
                        nameEn: "Unknown Costume",
                        sprite: "",
                        isCostume: true
                    };

                    COSTUME_DATA[id].forEach(c => {
                        if (c.filename === 'shiny.webp' || c.filename === 'model.webp') return;

                        const mappedName = costumeMapping[c.filename];
                        // Skip unmapped/unknown costumes that likely have no sprite
                        if (!mappedName) return;
                        const displayName = mappedName || c.form || "Costume";

                        list.push({
                            id: genericSpecies.id,
                            uniqueKey: `${genericSpecies.id}-${c.filename}`,
                            originalId: genericSpecies.id,
                            nameFr: mappedName || `${genericSpecies.nameFr} ${c.form}`,
                            nameEn: mappedName || `${genericSpecies.nameEn} ${c.form}`,
                            formLabel: displayName,
                            sprite: `/Costumes/${c.filename}`,
                            isShiny: c.isShiny,
                            isCostume: true,
                            isLegendary: false,
                            isForm: true
                        });
                    });
                    return;
                }

                if (species && !UNTRADABLE_IDS.includes(species.id)) {
                    // Skip Pikachu — already handled via POKEMON_FORMS[25] above
                    if (species.id === 25) return;
                    COSTUME_DATA[id].forEach(c => {
                        // Strict filtering logic (same as before)
                        if (/^pm\d+(\.g\d+)?(\.s)?\.icon\.png$/.test(c.filename)) return;

                        const BLACKLIST = [
                            'pm249.cONE_YEAR_ANNIVERSARY',
                            'pm239.cSPRING_2023_INSTINCT',
                            // Extensive Galarian Form Blacklist (Explicitly requested)
                            'pm52.fGALARIAN', 'pm52.fGALARIAN.s',
                            'pm77.fGALARIAN', 'pm77.fGALARIAN.s',
                            'pm78.fGALARIAN', 'pm78.fGALARIAN.s',
                            'pm79.fGALARIAN', 'pm79.fGALARIAN.s',
                            'pm80.fGALARIAN', 'pm80.fGALARIAN.s',
                            'pm83.fGALARIAN', 'pm83.fGALARIAN.s',
                            'pm110.fGALARIAN', 'pm110.fGALARIAN.s',
                            'pm122.fGALARIAN', 'pm122.fGALARIAN.s',
                            'pm144.fGALARIAN', 'pm144.fGALARIAN.s',
                            'pm145.fGALARIAN', 'pm145.fGALARIAN.s',
                            'pm146.fGALARIAN', 'pm146.fGALARIAN.s',
                            'pm199.fGALARIAN', 'pm199.fGALARIAN.s',
                            'pm222.fGALARIAN', 'pm222.fGALARIAN.s',
                            'pm263.fGALARIAN', 'pm263.fGALARIAN.s',
                            'pm264.fGALARIAN', 'pm264.fGALARIAN.s',
                            'pm554.fGALARIAN', 'pm554.fGALARIAN.s',
                            'pm555.fGALARIAN', 'pm555.fGALARIAN.s',
                            'pm562.fGALARIAN', 'pm562.fGALARIAN.s',
                            'pm618.fGALARIAN', 'pm618.fGALARIAN.s',
                            'GALARIAN' // Catch-all
                        ];

                        if (BLACKLIST.some(b => c.filename.includes(b))) return;
                        if ((species.id === 555 || species.id === 554) && c.filename.includes('GALARIAN')) return;

                        const isForm = ['.fALOLA', '.fGALARIAN', '.fHISUIAN', '.fPALDEA', '.fMEGA', '.fGIGANTAMAX', '.fPRIMAL', '.fNORMAL', '.fARCHETYPE'].some(f => c.filename.includes(f));
                        const isCostumeEncoded = c.filename.includes('.c') || ['.fFALL', '.fWINTER', '.fSUMMER', '.fSPRING', '.fHOLIDAY', '.fFASHION', '.fWILDAREA', '.fNIGHTCAP', '.f20'].some(k => c.filename.includes(k));
                        if (isForm && !isCostumeEncoded) return;

                        const upperFile = c.filename.toUpperCase();
                        const isPikachu = species.id === 25;
                        const matchesKeyword = ALLOWED_COSTUMES.some(k => upperFile.includes(k));
                        if (!isPikachu && !matchesKeyword && !c.filename.includes('.c')) return;

                        let vName = (c.variant || c.form || '').replace(/_/g, ' ').replace(/\./g, ' ');
                        list.push({
                            id: species.id,
                            uniqueKey: `${species.id}-${c.filename}`,
                            originalId: species.id,
                            nameFr: `${species.nameFr} ${vName}`,
                            nameEn: `${species.nameEn} ${vName}`,
                            formLabel: vName,
                            sprite: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/${c.filename}`,
                            isShiny: c.isShiny || c.filename.includes('_shiny') || c.filename.includes('.s.icon'),
                            isCostume: true,
                            isLegendary: LEGENDARY_IDS.includes(species.id)
                        });
                    });
                }
            });

            // ─── Non-Pikachu Costume Pokémon (from COSTUME_POKEMON constant) ───
            const POKEMINERS_BASE = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets';
            COSTUME_POKEMON.forEach(({ id, code, prefix, label, labelEn, shiny }) => {
                const species = POKEMON_DATA.find(p => p.id === id);
                if (!species) return;
                const spriteNormal = `${POKEMINERS_BASE}/pm${id}.${prefix}${code}.icon.png`;
                const spriteShiny = `${POKEMINERS_BASE}/pm${id}.${prefix}${code}.s.icon.png`;
                const enLabel = labelEn || label;
                // Normal costume
                list.push({
                    ...species,
                    uniqueKey: `${id}-costume-${code}`,
                    originalId: id,
                    isShiny: false,
                    isCostume: true,
                    isForm: true,
                    isLegendary: LEGENDARY_IDS.includes(id),
                    formLabel: label,
                    formLabelEn: enLabel,
                    nameFr: `${species.nameFr} ${label}`,
                    nameEn: `${species.nameEn} ${enLabel}`,
                    sprite: spriteNormal
                });
                // Shiny costume (default: shiny available unless explicitly false)
                if (shiny !== false && !DISABLED_SHINY_IDS.includes(id)) {
                    list.push({
                        ...species,
                        uniqueKey: `${id}-costume-${code}-shiny`,
                        originalId: id,
                        isShiny: true,
                        isCostume: true,
                        isForm: true,
                        isLegendary: LEGENDARY_IDS.includes(id),
                        formLabel: label,
                        formLabelEn: enLabel,
                        nameFr: `${species.nameFr} ${label} (Shiny)`,
                        nameEn: `${species.nameEn} ${enLabel} (Shiny)`,
                        sprite: spriteShiny
                    });
                }
            });

            // ─── Pokémon with Special Backgrounds ───
            const BG_ORIGIN_IDS = [483, 484, 487]; // Dialga, Palkia, Giratina
            const BG_THERIAN_IDS = [641, 642, 645, 905]; // Boréas, Fulguris, Démétéros, Amovénus
            // Note: Primal forms (Kyogre/Groudon) are NOT tradeable — no BG entries

            const addBgEntry = (species, pokemonId, bg, suffix, formName, spriteUrl, isShiny, extraFlags = {}, formNameEn = '') => {
                const bgLabelEn = bg.labelEn || bg.label;
                const enFormName = formNameEn || formName;
                list.push({
                    ...species,
                    uniqueKey: `${pokemonId}-bg-${bg.name}${suffix}${isShiny ? '-shiny' : ''}`,
                    originalId: pokemonId,
                    isShiny,
                    isCostume: false,
                    isForm: true,
                    hasBackground: true,
                    hasSignatureMove: false,
                    isDynamax: false,
                    isGmax: false,
                    isPurified: false,
                    backgroundImage: bg.image,
                    backgroundLabel: bg.label,
                    backgroundLabelEn: bgLabelEn,
                    formLabel: formName ? `${formName} · ${bg.label}` : bg.label,
                    formLabelEn: enFormName ? `${enFormName} · ${bgLabelEn}` : bgLabelEn,
                    nameFr: `${species.nameFr}${formName ? ` ${formName}` : ''} (${bg.label})${isShiny ? ' (Shiny)' : ''}`,
                    nameEn: `${species.nameEn}${enFormName ? ` ${enFormName}` : ''} (${bgLabelEn})${isShiny ? ' (Shiny)' : ''}`,
                    sprite: spriteUrl,
                    ...extraFlags
                });
            };

            // Max Finale: Gigamax forms
            const MAX_FINALE_GMAX_IDS = [3, 9, 6, 94, 99, 131, 143, 812, 815, 818, 861, 849]; // Florizarre, Tortank, Dracaufeu, Ectoplasma, Kraboss, Lokhlass, Ronflex, Gorythmic, PyroBut, Lézargus, Angoliath, Salarsen
            // All other Max Finale Pokemon get Dynamax form

            POKEMON_BACKGROUNDS.forEach(bg => {
                bg.pokemon.forEach(pokemonId => {
                    if (UNTRADABLE_IDS.includes(pokemonId)) return;
                    const species = POKEMON_DATA.find(p => p.id === pokemonId);
                    if (!species) return;

                    // For Max Finale: use Gigamax or Dynamax sprites with proper tags
                    if (bg.name === 'max-finale') {
                        const isGmax = MAX_FINALE_GMAX_IDS.includes(pokemonId);
                        const formSuffix = isGmax ? 'GIGANTAMAX' : 'DYNAMAX';
                        const spriteNormal = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${pokemonId}.f${formSuffix}.icon.png`;
                        const spriteShiny = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${pokemonId}.f${formSuffix}.s.icon.png`;
                        const maxFlags = isGmax ? { isGmax: true, isDynamax: false } : { isGmax: false, isDynamax: true };
                        addBgEntry(species, pokemonId, bg, isGmax ? '-gmax' : '-dmax', '', spriteNormal, false, maxFlags);
                        if (!DISABLED_SHINY_IDS.includes(pokemonId)) {
                            addBgEntry(species, pokemonId, bg, isGmax ? '-gmax' : '-dmax', '', spriteShiny, true, maxFlags);
                        }
                        return; // Skip base form for Max Finale
                    }

                    // Base form with background
                    addBgEntry(species, pokemonId, bg, '', '', getPokemonSprite(pokemonId, false), false);
                    if (!DISABLED_SHINY_IDS.includes(pokemonId)) {
                        addBgEntry(species, pokemonId, bg, '', '', getPokemonSprite(pokemonId, true), true);
                    }

                    // Origin forms (Dialga, Palkia, Giratina)
                    if (BG_ORIGIN_IDS.includes(pokemonId)) {
                        const originSprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${pokemonId}.fORIGIN.icon.png`;
                        const originShinySprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${pokemonId}.fORIGIN.s.icon.png`;
                        addBgEntry(species, pokemonId, bg, '-origin', 'Originel', originSprite, false, {}, 'Origin');
                        if (!DISABLED_SHINY_IDS.includes(pokemonId)) {
                            addBgEntry(species, pokemonId, bg, '-origin', 'Originel', originShinySprite, true, {}, 'Origin');
                        }
                    }

                    // Therian forms (Tornadus, Thundurus, Landorus, Amovénus)
                    if (BG_THERIAN_IDS.includes(pokemonId)) {
                        const therianSprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${pokemonId}.fTHERIAN.icon.png`;
                        const therianShinySprite = `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm${pokemonId}.fTHERIAN.s.icon.png`;
                        addBgEntry(species, pokemonId, bg, '-therian', 'Totémique', therianSprite, false, {}, 'Therian');
                        if (!DISABLED_SHINY_IDS.includes(pokemonId)) {
                            addBgEntry(species, pokemonId, bg, '-therian', 'Totémique', therianShinySprite, true, {}, 'Therian');
                        }
                    }

                    // Note: Primal forms are NOT tradeable — no background entries
                });
            });

            // ─── Pokémon avec Attaque Aventure (Signature Moves) ───
            SIGNATURE_MOVE_POKEMON.forEach(({ id, form, label, moveEn, sprite: spriteBase }) => {
                if (UNTRADABLE_IDS.includes(id)) return;
                const species = POKEMON_DATA.find(p => p.id === id);
                if (!species) return;
                const formSuffix = form ? `-${form}` : '';
                const normalSprite = spriteBase
                    ? `${POKEMINERS_BASE}/${spriteBase}.icon.png`
                    : getPokemonSprite(id, false);
                const shinySprite = spriteBase
                    ? `${POKEMINERS_BASE}/${spriteBase}.s.icon.png`
                    : getPokemonSprite(id, true);
                const formName = form === 'origin' ? 'Originel' : form === 'therian' ? 'Totémique' : '';
                const formNameEn = form === 'origin' ? 'Origin' : form === 'therian' ? 'Therian' : '';
                const enMove = moveEn || label;
                // Normal with move
                const moveFlags = { hasBackground: false, hasSignatureMove: true, isDynamax: false, isGmax: false, isPurified: false };
                list.push({
                    ...species,
                    ...moveFlags,
                    uniqueKey: `${id}${formSuffix}-move-${label.replace(/\s/g, '')}`,
                    originalId: id,
                    isShiny: false,
                    isCostume: false,
                    isForm: true,
                    isLegendary: true,
                    formLabel: `⚔️ ${label}`,
                    formLabelEn: `⚔️ ${enMove}`,
                    nameFr: `${species.nameFr}${formName ? ` ${formName}` : ''} (${label})`,
                    nameEn: `${species.nameEn}${formNameEn ? ` ${formNameEn}` : ''} (${enMove})`,
                    sprite: normalSprite
                });
                // Shiny with move
                if (!DISABLED_SHINY_IDS.includes(id)) {
                    list.push({
                        ...species,
                        ...moveFlags,
                        uniqueKey: `${id}${formSuffix}-move-${label.replace(/\s/g, '')}-shiny`,
                        originalId: id,
                        isShiny: true,
                        isCostume: false,
                        isForm: true,
                        isLegendary: true,
                        formLabel: `⚔️ ${label}`,
                        formLabelEn: `⚔️ ${enMove}`,
                        nameFr: `${species.nameFr}${formName ? ` ${formName}` : ''} (${label}) (Shiny)`,
                        nameEn: `${species.nameEn}${formNameEn ? ` ${formNameEn}` : ''} (${enMove}) (Shiny)`,
                        sprite: shinySprite
                    });
                }
            });

            // ─── Pokémon avec CT Elite (Elite TM exclusive moves) ───
            ELITE_TM_POKEMON.forEach(({ id, label, moveEn }) => {
                if (UNTRADABLE_IDS.includes(id)) return;
                const species = POKEMON_DATA.find(p => p.id === id);
                if (!species) return;
                const eliteFlags = { hasBackground: false, hasSignatureMove: false, hasEliteTM: true, isDynamax: false, isGmax: false, isPurified: false };
                const enEliteMove = moveEn || label;
                // Normal with Elite TM move
                list.push({
                    ...species,
                    ...eliteFlags,
                    uniqueKey: `${id}-elite-${label.replace(/\s/g, '')}`,
                    originalId: id,
                    isShiny: false,
                    isCostume: false,
                    isForm: true,
                    isLegendary: LEGENDARY_IDS.includes(id),
                    formLabel: `📀 ${label}`,
                    formLabelEn: `📀 ${enEliteMove}`,
                    nameFr: `${species.nameFr} (${label})`,
                    nameEn: `${species.nameEn} (${enEliteMove})`,
                    sprite: getPokemonSprite(id, false)
                });
                // Shiny with Elite TM move
                if (!DISABLED_SHINY_IDS.includes(id)) {
                    list.push({
                        ...species,
                        ...eliteFlags,
                        uniqueKey: `${id}-elite-${label.replace(/\s/g, '')}-shiny`,
                        originalId: id,
                        isShiny: true,
                        isCostume: false,
                        isForm: true,
                        isLegendary: LEGENDARY_IDS.includes(id),
                        formLabel: `📀 ${label}`,
                        formLabelEn: `📀 ${enEliteMove}`,
                        nameFr: `${species.nameFr} (${label}) (Shiny)`,
                        nameEn: `${species.nameEn} (${enEliteMove}) (Shiny)`,
                        sprite: getPokemonSprite(id, true)
                    });
                }
            });

            // Sort entire list by Pokédex number, then by variant type for same ID
            list.sort((a, b) => {
                const idA = a.originalId || a.id;
                const idB = b.originalId || b.id;
                if (idA !== idB) return idA - idB;
                // Same ID: normal before shiny, base before forms/costumes/backgrounds
                if (a.isShiny !== b.isShiny) return a.isShiny ? 1 : -1;
                if (a.isCostume !== b.isCostume) return a.isCostume ? 1 : -1;
                if (a.hasBackground !== b.hasBackground) return a.hasBackground ? 1 : -1;
                return 0;
            });

            setFullPokemonList(list);
        };

        generateList();
    }, []);

    const filteredPokemon = fullPokemonList.filter(p => {
        const normalize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const searchNorm = normalize(search.trim());

        // Multi-ID search: "1,25,73,157"
        if (search.includes(',')) {
            const ids = search.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            if (ids.length > 0 && !ids.some(id => id === p.id)) return false;
        } else {
            const pokemonTypes = POKEMON_TYPES[p.id] || [];
            const matchesType = pokemonTypes.some(t => normalize(t).includes(searchNorm));
            const matchesSearch = (normalize(p.nameFr).includes(searchNorm) || normalize(p.nameEn).includes(searchNorm) || p.id.toString().includes(searchNorm) || matchesType);
            if (!matchesSearch) return false;
        }

        // Type filter
        if (typeFilter !== 'all') {
            const pokemonTypes = POKEMON_TYPES[p.originalId || p.id] || [];
            if (!pokemonTypes.includes(typeFilter)) return false;
        }

        if (filters.length === 0) return true;

        // AND Logic: Must match ALL selected filters
        return filters.every(f => {
            if (f === 'Normal') return !p.isShiny && !p.isCostume && !p.isPurified && p.isGmax !== true && p.isDynamax !== true && !p.isLegendary && p.hasBackground !== true && p.hasSignatureMove !== true && p.hasEliteTM !== true;
            if (f === 'Shiny') return p.isShiny === true;
            if (f === 'Légendaires') return p.isLegendary === true;
            if (f === 'Costumés') return p.isCostume === true;
            if (f === 'Purifiés') return p.isPurified === true;
            if (f === 'Gigamax') return p.isGmax === true;
            if (f === 'Dynamax') return p.isDynamax === true;
            if (f === 'Backgrounds') return p.hasBackground === true;
            if (f === 'Attaques') return p.hasSignatureMove === true || p.hasEliteTM === true;
            return true;
        });
    });

    const toggleSelection = (pokemon) => {
        const isSelected = selectedPokemon.some(p => p.uniqueKey === pokemon.uniqueKey);
        setSelectedPokemon(isSelected ? selectedPokemon.filter(p => p.uniqueKey !== pokemon.uniqueKey) : [...selectedPokemon, pokemon]);
    };

    useEffect(() => {
        const syncUser = async () => {
            try {
                const savedUserStr = localStorage.getItem('pokemon_user');
                if (savedUserStr && savedUserStr !== "undefined" && savedUserStr !== "null") {
                    const localUser = JSON.parse(savedUserStr);
                    if (localUser && localUser.username) {
                        setUsername(localUser.username);
                    }
                    if (localUser && localUser.tradeList) {
                        setLookingFor((localUser.tradeList.lookingFor || []).filter(Boolean).map(p => ({ ...p, uniqueId: p.uniqueId || `${p.id}-${Math.random().toString(36).substr(2, 9)}` })));
                        setForTrade((localUser.tradeList.forTrade || []).filter(Boolean).map(p => ({ ...p, uniqueId: p.uniqueId || `${p.id}-${Math.random().toString(36).substr(2, 9)}` })));
                    }
                    try {
                        if (localUser && localUser.username) {
                            const res = await fetch(`/api/pokemon/user?username=${localUser.username}`);
                            if (res.ok) {
                                const apiUser = await res.json();
                                if (apiUser && apiUser.tradeList) {
                                    setLookingFor((apiUser.tradeList.lookingFor || []).filter(Boolean).map(p => ({ ...p, uniqueId: p.uniqueId || `${p.id}-${Math.random().toString(36).substr(2, 9)}` })));
                                    setForTrade((apiUser.tradeList.forTrade || []).filter(Boolean).map(p => ({ ...p, uniqueId: p.uniqueId || `${p.id}-${Math.random().toString(36).substr(2, 9)}` })));
                                    localStorage.setItem('pokemon_user', JSON.stringify({ ...localUser, ...apiUser }));
                                }
                                // Load server-side webhook message ID (works across devices)
                                if (apiUser && apiUser.tradeWebhookMsgId) {
                                    setTradeWebhookMsgId(apiUser.tradeWebhookMsgId);
                                    localStorage.setItem('trade_webhook_msg_id', apiUser.tradeWebhookMsgId);
                                }
                            }
                        }
                    } catch (error) { console.error('Sync failed:', error); }
                }
            } catch (err) {
                console.error('Fatal user sync error:', err);
                localStorage.removeItem('pokemon_user');
            }
        };
        syncUser();
    }, []);

    useEffect(() => {
        const saveLists = async () => {
            try {
                const savedUser = localStorage.getItem('pokemon_user');
                if (savedUser && savedUser !== "undefined" && savedUser !== "null") {
                    const user = JSON.parse(savedUser);
                    if (user && user.username) {
                        const updatedUser = { ...user, tradeList: { lookingFor, forTrade } };
                        localStorage.setItem('pokemon_user', JSON.stringify(updatedUser));
                        try {
                            await fetch('/api/pokemon/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: user.username, data: updatedUser, sessionToken: user.sessionToken }),
                            });
                        } catch (error) { console.error('Failed to save trade list:', error); }
                    }
                }
            } catch (err) {
                console.error('Fatal save error:', err);
            }
        };
        const timeoutId = setTimeout(saveLists, 1000);
        return () => clearTimeout(timeoutId);
    }, [lookingFor, forTrade]);

    const addSelectedToList = (listType) => {
        const newItems = selectedPokemon.map(p => ({
            ...p, originalId: p.id, uniqueId: `${p.id}-${Date.now()}-${Math.random()}`,
            sprite: p.sprite,
            quantity: 1, // Default quantity
            note: '' // Default note
        }));
        listType === 'lookingFor' ? setLookingFor([...lookingFor, ...newItems]) : setForTrade([...forTrade, ...newItems]);
        setSelectedPokemon([]);
        setSearch('');
        setShowDropdown(false);
    };

    const handleDragEnd = (event, listType) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const setter = listType === 'lookingFor' ? setLookingFor : setForTrade;
        setter((items) => {
            const oldIndex = items.findIndex(i => i.uniqueId === active.id);
            const newIndex = items.findIndex(i => i.uniqueId === over.id);
            if (oldIndex === -1 || newIndex === -1) return items;
            return arrayMove(items, oldIndex, newIndex);
        });
    };

    const copyKeyword = (items) => {
        if (!items || items.length === 0) return;
        const ids = Array.from(new Set(items.map(p => p.originalId).filter(id => String(id) !== '9999'))).join(',');
        navigator.clipboard.writeText(ids);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const removePokemon = (uniqueId, listType) => {
        listType === 'lookingFor' ? setLookingFor(lookingFor.filter(p => p.uniqueId !== uniqueId)) : setForTrade(forTrade.filter(p => p.uniqueId !== uniqueId));
    };

    const updatePokemon = (uniqueId, listType, updates) => {
        const setter = listType === 'lookingFor' ? setLookingFor : setForTrade;
        setter(prev => prev.map(p => p.uniqueId === uniqueId ? { ...p, ...updates } : p));
    };

    // Build auth header for webhook requests (fallback when cookies aren't sent on mobile)
    const getPogoAuthHeader = () => {
        try {
            const storedUser = localStorage.getItem('pokemon_user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed.username && parsed.sessionToken) {
                    return { 'x-pogo-auth': `${parsed.username}:${parsed.sessionToken}` };
                }
            }
        } catch (e) {}
        return {};
    };

    const manualSave = async () => {
        try {
            const savedUser = localStorage.getItem('pokemon_user');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                const updatedUser = { ...user, tradeList: { lookingFor, forTrade } };
                localStorage.setItem('pokemon_user', JSON.stringify(updatedUser));
                const res = await fetch('/api/pokemon/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user.username, data: updatedUser, sessionToken: user.sessionToken }),
                });
                if (!res.ok) {
                    console.error('Save failed:', res.status);
                    alert(t('trades.saveErrorStatus').replace('{status}', res.status));
                    return;
                }
            }
        } catch (error) {
            console.error('Save failed:', error);
            alert(t('trades.saveError'));
            return;
        }
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const exportImage = async () => {
        // Prevent double-click race condition
        if (sharingLock.current) return;
        sharingLock.current = true;
        setIsSharing(true);
        console.log("Attempting export...", exportRef.current);
        if (exportRef.current) {
            try {
                // Temporarily make the export div visible so images load on mobile
                exportRef.current.style.opacity = '1';
                exportRef.current.style.zIndex = '-999';

                // Pre-load all images in the export div
                const images = exportRef.current.querySelectorAll('img');
                await Promise.all(Array.from(images).map(img => {
                    if (img.complete) return Promise.resolve();
                    return new Promise(resolve => {
                        img.onload = resolve;
                        img.onerror = resolve;
                        // Force reload if needed
                        if (!img.complete && img.src) {
                            const src = img.src;
                            img.src = '';
                            img.src = src;
                        }
                    });
                }));

                // Small delay for rendering to complete on mobile
                await new Promise(r => setTimeout(r, 200));

                // Fix Quantity Text Visibility: Only target Headings and Paragraphs, NOT divs (which contain quantity)
                const texts = exportRef.current.querySelectorAll('p, h2, h3, span');
                texts.forEach(el => {
                    // Check if it's NOT a quantity badge
                    if (!el.textContent.includes('x') || el.textContent.length > 5) {
                        // Keep specific colored elements as is, only override if no inline style is present
                        if (!el.style.color) {
                            el.style.color = 'white';
                        }
                    }
                });

                // Determine pixelRatio based on device to prevent crashes on mobile
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const pixelRatio = isMobile ? 1.5 : 2;

                // Explicit font handling to avoid "font is undefined" error
                const blob = await toBlob(exportRef.current, {
                    quality: 0.95,
                    backgroundColor: '#1a0b2e',
                    pixelRatio: pixelRatio,
                    cacheBust: true,
                    skipAutoScale: true,
                    fontEmbedCSS: '', // Disable auto font embedding to prevent the error
                    style: {
                        transform: 'none',
                        visibility: 'visible',
                        opacity: '1',
                        fontFamily: 'Arial, sans-serif' // Enforce a safe font
                    },
                    filter: (node) => {
                        // Filter out any potential trouble nodes if needed
                        return true;
                    }
                });

                if (!blob) throw new Error(t('dashboard.blobError'));

                let avatarUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(trainerName);

                try {
                    const sessionRes = await fetch('/api/auth/session');
                    if (sessionRes.ok) {
                        const sess = await sessionRes.json();
                        if (sess?.user?.image) {
                            avatarUrl = sess.user.image;
                        }
                    }
                } catch (e) { console.error(e) }

                if (avatarUrl.includes('ui-avatars.com')) {
                    const storedUser = localStorage.getItem('pokemon_user');
                    if (storedUser) {
                        const parsed = JSON.parse(storedUser);
                        if (parsed.trainerImage) {
                            avatarUrl = parsed.trainerImage;
                            if (avatarUrl.startsWith('/')) avatarUrl = `https://${cityConfig.domain}` + avatarUrl;
                        }
                    }
                }

                let idsLookingFor = Array.from(new Set(lookingFor.map(p => p.originalId).filter(id => String(id) !== '9999'))).join(',');
                let idsForTrade = Array.from(new Set(forTrade.map(p => p.originalId).filter(id => String(id) !== '9999'))).join(',');
                if (idsLookingFor.length > 800) idsLookingFor = idsLookingFor.substring(0, 800) + '...';
                if (idsForTrade.length > 800) idsForTrade = idsForTrade.substring(0, 800) + '...';

                const content = `**Recherche** :\n\`${idsLookingFor || 'Rien'}\`\n\n**Propose** :\n\`${idsForTrade || 'Rien'}\``;

                const formData = new FormData();
                formData.append('payload_json', JSON.stringify({
                    content: content,
                    username: trainerName,
                    avatar_url: avatarUrl
                }));
                formData.append('file', blob, `echange-${trainerName}.png`);

                // Delete old message then post new one (via server-side proxy)
                const oldMsgId = tradeWebhookMsgId || localStorage.getItem('trade_webhook_msg_id');
                if (oldMsgId) {
                    try {
                        const delRes = await fetch('/api/discord-webhook', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ messageId: String(oldMsgId) })
                        });
                        const delData = await delRes.json().catch(() => ({}));
                        console.log("Delete old message result:", delRes.status, delData);
                    } catch (e) {
                        console.error("Suppression de l'ancien message échouée (ignoré)", e);
                    }
                }

                const res = await fetch('/api/discord-webhook', {
                    method: 'POST',
                    headers: getPogoAuthHeader(),
                    body: formData
                });

                if (res.ok) {
                    const data = await res.json();
                    const newMsgId = String(data.id);
                    setTradeWebhookMsgId(newMsgId);
                    localStorage.setItem('trade_webhook_msg_id', newMsgId);

                    // Persist webhook message ID server-side so it works across devices
                    try {
                        const savedUser = localStorage.getItem('pokemon_user');
                        if (savedUser) {
                            const user = JSON.parse(savedUser);
                            await fetch('/api/pokemon/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: user.username, data: { tradeWebhookMsgId: newMsgId }, sessionToken: user.sessionToken }),
                            });
                        }
                    } catch (e) { console.error("Failed to save webhook msg ID server-side:", e); }

                    setShowToast(true);
                    setTimeout(() => setShowToast(false), 3000);
                    console.log("Discord webhook send successful");
                } else {
                    const errText = await res.text();
                    console.error("Discord error:", errText);
                    throw new Error(t('dashboard.webhookError', { status: res.status }));
                }
            } catch (error) {
                console.error("Export error full details:", error);
                // Try fallback with lower quality if first attempt fails
                try {
                    const blobMb = await toBlob(exportRef.current, {
                        quality: 0.8,
                        backgroundColor: '#1a0b2e',
                        pixelRatio: 1, // Lowest ratio
                        cacheBust: true,
                        style: {
                            transform: 'none',
                            visibility: 'visible',
                            opacity: '1'
                        }
                    });

                    // Fallback Webhook request (via server-side proxy)
                    let avatarUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(trainerName);

                    try {
                        const sessionRes = await fetch('/api/auth/session');
                        if (sessionRes.ok) {
                            const sess = await sessionRes.json();
                            if (sess?.user?.image) {
                                avatarUrl = sess.user.image;
                            }
                        }
                    } catch (e) {}

                    if (avatarUrl.includes('ui-avatars.com')) {
                        const storedUser = localStorage.getItem('pokemon_user');
                        if (storedUser) {
                            const parsed = JSON.parse(storedUser);
                            if (parsed.trainerImage) {
                                avatarUrl = parsed.trainerImage;
                                if (avatarUrl.startsWith('/')) avatarUrl = `https://${cityConfig.domain}` + avatarUrl;
                            }
                        }
                    }

                    let idsLookingFor = Array.from(new Set(lookingFor.map(p => p.originalId))).join(',');
                    let idsForTrade = Array.from(new Set(forTrade.map(p => p.originalId))).join(',');
                    if (idsLookingFor.length > 800) idsLookingFor = idsLookingFor.substring(0, 800) + '...';
                    if (idsForTrade.length > 800) idsForTrade = idsForTrade.substring(0, 800) + '...';

                    const content = `**Recherche** :\n\`${idsLookingFor || 'Rien'}\`\n\n**Propose** :\n\`${idsForTrade || 'Rien'}\``;

                    const formData = new FormData();
                    formData.append('payload_json', JSON.stringify({
                        content: content,
                        username: trainerName,
                        avatar_url: avatarUrl
                    }));
                    formData.append('file', blobMb, `echange-${trainerName}.png`);

                    // Delete old message then post new one (via server-side proxy)
                    const oldMsgId2 = tradeWebhookMsgId || localStorage.getItem('trade_webhook_msg_id');
                    if (oldMsgId2) {
                        try {
                            const delRes2 = await fetch('/api/discord-webhook', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messageId: String(oldMsgId2) })
                            });
                            console.log("Fallback delete old message:", delRes2.status);
                        } catch (e) {
                            console.error("Suppression de l'ancien message échouée (ignoré)", e);
                        }
                    }

                    const res = await fetch('/api/discord-webhook', {
                        method: 'POST',
                        headers: getPogoAuthHeader(),
                        body: formData
                    });

                    if (res.ok) {
                        const data = await res.json();
                        const newMsgId = String(data.id);
                        setTradeWebhookMsgId(newMsgId);
                        localStorage.setItem('trade_webhook_msg_id', newMsgId);

                        // Persist webhook message ID server-side so it works across devices
                        try {
                            const savedUser = localStorage.getItem('pokemon_user');
                            if (savedUser) {
                                const user = JSON.parse(savedUser);
                                await fetch('/api/pokemon/save', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ username: user.username, data: { tradeWebhookMsgId: newMsgId }, sessionToken: user.sessionToken }),
                                });
                            }
                        } catch (e) { console.error("Failed to save webhook msg ID server-side:", e); }

                        setShowToast(true);
                        setTimeout(() => setShowToast(false), 3000);
                    } else {
                        const errText = await res.text();
                        console.error("Discord error (Mobile):", errText);
                        throw new Error(t('dashboard.webhookErrorMobile', { status: res.status }));
                    }
                } catch (retryError) {
                    alert(t('dashboard.exportError', { error: retryError.message }));
                }
            }
        } else {
            console.error("Export ref is null");
        }
        // Restore hidden state of export div
        if (exportRef.current) {
            exportRef.current.style.opacity = '0';
            exportRef.current.style.zIndex = '-1000';
        }
        sharingLock.current = false;
        setIsSharing(false);
    };

    // Compute matches between my lists and other traders
    const matches = (() => {
        if (!showMatches) return [];
        const results = [];
        const getMatchKey = (p) => {
            // Match by originalId + shiny status + costume + form label
            const id = p.originalId || p.id;
            const shiny = p.isShiny ? 'shiny' : 'normal';
            const costume = p.isCostume ? (p.costumeLabel || p.formLabel || 'costume') : '';
            const form = (!p.isCostume && p.formLabel) ? p.formLabel : '';
            const purified = p.isPurified ? 'purified' : '';
            const gmax = p.isGmax ? 'gmax' : '';
            const dynamax = p.isDynamax ? 'dynamax' : '';
            return `${id}-${shiny}-${costume}-${form}-${purified}-${gmax}-${dynamax}`;
        };
        for (const trader of otherTraders) {
            const traderLookingFor = trader.tradeList?.lookingFor || [];
            const traderForTrade = trader.tradeList?.forTrade || [];
            // What I'm looking for that they propose
            const theyHaveForMe = [];
            const traderForTradeKeys = new Map();
            traderForTrade.forEach(p => {
                const key = getMatchKey(p);
                if (!traderForTradeKeys.has(key)) traderForTradeKeys.set(key, []);
                traderForTradeKeys.get(key).push(p);
            });
            for (const myPoke of lookingFor) {
                const key = getMatchKey(myPoke);
                if (traderForTradeKeys.has(key)) {
                    theyHaveForMe.push({ mine: myPoke, theirs: traderForTradeKeys.get(key)[0] });
                }
            }
            // What they're looking for that I propose
            const iHaveForThem = [];
            const myForTradeKeys = new Map();
            forTrade.forEach(p => {
                const key = getMatchKey(p);
                if (!myForTradeKeys.has(key)) myForTradeKeys.set(key, []);
                myForTradeKeys.get(key).push(p);
            });
            for (const theirPoke of traderLookingFor) {
                const key = getMatchKey(theirPoke);
                if (myForTradeKeys.has(key)) {
                    iHaveForThem.push({ mine: myForTradeKeys.get(key)[0], theirs: theirPoke });
                }
            }
            if (theyHaveForMe.length > 0 || iHaveForThem.length > 0) {
                results.push({ trader, theyHaveForMe, iHaveForThem });
            }
        }
        // Sort by total matches descending
        results.sort((a, b) => (b.theyHaveForMe.length + b.iHaveForThem.length) - (a.theyHaveForMe.length + a.iHaveForThem.length));
        return results;
    })();

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-5xl mx-auto mb-8">
                {/* ... existing code ... */}
                {/* Main Page Title */}
                <h1
                    className="text-4xl md:text-5xl font-extrabold uppercase tracking-normal bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent mb-8 flex items-center gap-3 drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] py-2 pr-4 [word-spacing:0.5rem]"
                    style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                    {t('trades.tradeHall')}
                </h1>

                {/* Other Traders Row - Cards */}
                {otherTraders.length > 0 && (
                    <div className="mb-8 overflow-x-auto md:overflow-x-visible pb-6 scrollbar-hide">
                        <div className="flex gap-4 px-2 md:flex-wrap md:justify-start">
                            {otherTraders.map(tr => (
                                <button
                                    key={tr.username}
                                    onClick={() => setViewingTrader(tr)}
                                    className="flex-shrink-0 w-72 md:w-[calc(33.333%-1rem)] lg:w-[calc(25%-0.75rem)] bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-all group text-left relative overflow-hidden"
                                >
                                    <div className="flex items-center gap-3 mb-3 relative z-10">
                                        <div className="w-10 h-10 rounded-full bg-black/50 p-0.5 border border-white/10">
                                            <img src={(tr.username === 'Maxime866' ? null : tr.trainerImage) || `https://ui-avatars.com/api/?name=${tr.username}`} alt={tr.username} className="w-full h-full rounded-full object-cover object-[center_30%]" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-white block">{tr.username}</span>
                                            <span className="text-[10px] text-gray-400">{t('trades.viewFullList')}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 relative z-10">
                                        <div className="bg-black/20 rounded-lg p-2 overflow-hidden">
                                            <p className="text-[10px] uppercase text-blue-400 font-bold mb-1">{t('trades.lookingForShort')}</p>
                                            <div className="flex gap-0.5 h-7 items-center overflow-hidden">
                                                {tr.tradeList?.lookingFor?.slice(0, 3).map((p, i) => (
                                                    <img key={i} src={p.sprite} className="w-7 h-7 object-contain flex-shrink-0" />
                                                )) || <span className="text-[10px] text-gray-600 italic">{t('trades.nothing')}</span>}
                                                {tr.tradeList?.lookingFor?.length > 3 && (
                                                    <span className="text-[10px] text-blue-400 font-bold ml-0.5 flex-shrink-0">+{tr.tradeList.lookingFor.length - 3}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-black/20 rounded-lg p-2 overflow-hidden">
                                            <p className="text-[10px] uppercase text-green-400 font-bold mb-1">{t('trades.forTradeShort')}</p>
                                            <div className="flex gap-0.5 h-7 items-center overflow-hidden">
                                                {tr.tradeList?.forTrade?.slice(0, 3).map((p, i) => (
                                                    <img key={i} src={p.sprite} className="w-7 h-7 object-contain flex-shrink-0" />
                                                )) || <span className="text-[10px] text-gray-600 italic">{t('trades.nothing')}</span>}
                                                {tr.tradeList?.forTrade?.length > 3 && (
                                                    <span className="text-[10px] text-green-400 font-bold ml-0.5 flex-shrink-0">+{tr.tradeList.forTrade.length - 3}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Match Button */}
                {(lookingFor.length > 0 || forTrade.length > 0) && otherTraders.length > 0 && (
                    <div className="mb-8">
                        <button
                            onClick={() => setShowMatches(!showMatches)}
                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl hover:border-amber-400/50 hover:from-amber-600/30 hover:to-orange-600/30 transition-all group"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                                <path d="M16 16v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3" /><path d="M8 2h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3" /><path d="m10 11 3-3 3 3" /><path d="m10 11 3 3 3-3" />
                            </svg>
                            <span className="text-amber-300 font-bold text-lg">
                                {showMatches ? t('trades.hideMatches') : t('trades.seeMatches')}
                            </span>
                            {showMatches ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="m18 15-6-6-6 6"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="m6 9 6 6 6-6"/></svg>
                            )}
                        </button>

                        <AnimatePresence>
                            {showMatches && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-4 space-y-4">
                                        {matches.length === 0 ? (
                                            <div className="text-center py-12 bg-[#1a1a1a] rounded-2xl border border-white/10">
                                                <div className="text-4xl mb-3">😔</div>
                                                <p className="text-gray-400 text-lg">{t('trades.noMatchesFound')}</p>
                                                <p className="text-gray-600 text-sm mt-1">{t('trades.noMatchesHint')}</p>
                                            </div>
                                        ) : (
                                            matches.map(({ trader, theyHaveForMe, iHaveForThem }) => (
                                                <div key={trader.username} className="bg-[#1a1a1a] rounded-2xl border border-white/10 overflow-hidden">
                                                    {/* Trader header */}
                                                    <div className="flex items-center gap-3 p-4 border-b border-white/5 bg-white/[0.02]">
                                                        <div className="w-10 h-10 rounded-full bg-black/50 p-0.5 border border-white/10 flex-shrink-0">
                                                            <img src={(trader.username === 'Maxime866' ? null : trader.trainerImage) || `https://ui-avatars.com/api/?name=${trader.username}`} alt={trader.username} className="w-full h-full rounded-full object-cover object-[center_30%]" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-bold text-white">{trader.username}</span>
                                                            <span className="text-amber-400 text-sm ml-2">
                                                                {theyHaveForMe.length + iHaveForThem.length} {(theyHaveForMe.length + iHaveForThem.length) > 1 ? t('trades.matchPlural') : t('trades.match')}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setViewingTrader(trader)} className="text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                                                {t('trades.viewList')}
                                                            </button>
                                                            {trader.discordId && (
                                                                <button onClick={() => window.open(`https://discord.com/users/${trader.discordId}`, '_blank')} className="text-xs bg-[#5865F2]/20 hover:bg-[#5865F2]/40 text-[#5865F2] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-bold">
                                                                    {t('trades.contactDiscord')}
                                                                </button>
                                                            )}
                                                            <button onClick={() => setChatTarget(trader.username)} className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap font-bold flex items-center gap-1">
                                                                <MessageCircle size={12} />
                                                                {t('trades.dm')}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 grid md:grid-cols-2 gap-4">
                                                        {/* They have what I need */}
                                                        {theyHaveForMe.length > 0 && (
                                                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                                                                <p className="text-blue-400 text-xs font-bold uppercase mb-2 flex items-center gap-1.5">
                                                                    <Search size={12} />
                                                                    {t('trades.theyHaveWhatYouNeed').replace('{name}', trader.username)}
                                                                </p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {theyHaveForMe.map(({ mine }, i) => (
                                                                        <div key={i} className="relative group" title={mine.nameFr}>
                                                                            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                                                                                <img src={mine.sprite} alt={mine.nameFr} className="w-10 h-10 object-contain pixelated" />
                                                                            </div>
                                                                            {mine.isShiny && <div className="absolute -top-1 -right-1 text-[10px]">✨</div>}
                                                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 whitespace-nowrap hidden group-hover:block bg-black/80 px-1 rounded">{mine.nameFr}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* I have what they need */}
                                                        {iHaveForThem.length > 0 && (
                                                            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
                                                                <div className="text-green-400 text-xs font-bold uppercase mb-2 flex items-center gap-1.5">
                                                                    <span className="w-3 h-3 rounded-full border border-green-400 flex items-center justify-center text-[6px]">⇄</span>
                                                                    {t('trades.youHaveWhatTheyNeed').replace('{name}', trader.username)}
                                                                </div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {iHaveForThem.map(({ mine }, i) => (
                                                                        <div key={i} className="relative group" title={mine.nameFr}>
                                                                            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/20">
                                                                                <img src={mine.sprite} alt={mine.nameFr} className="w-10 h-10 object-contain pixelated" />
                                                                            </div>
                                                                            {mine.isShiny && <div className="absolute -top-1 -right-1 text-[10px]">✨</div>}
                                                                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 whitespace-nowrap hidden group-hover:block bg-black/80 px-1 rounded">{mine.nameFr}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:mt-12">
                    <div>
                        <h2
                            className="text-3xl md:text-4xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent mb-4 flex items-center gap-3 drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] py-2 pr-4"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            {t('trades.createYourList')}
                        </h2>
                        <p className="text-gray-400 mt-2 mb-8 md:mb-8 text-base">{t('trades.createYourListDesc')}</p>
                    </div>
                    <div className="hidden md:flex gap-4 mb-6 md:mb-0 flex-nowrap items-center">
                        <button onClick={manualSave} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full font-semibold text-white shadow-[0_4px_15px_rgba(59,130,246,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap"><Check size={20} /> {t('common.save')}</button>
                        <button onClick={exportImage} disabled={isSharing} className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full font-semibold text-white shadow-[0_4px_15px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_25px_rgba(139,92,246,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 whitespace-nowrap ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}><Share2 size={20} /> {isSharing ? t('trades.sending') : t('trades.shareDiscord')}</button>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                    {['lookingFor', 'forTrade'].map(type => (
                        <div key={type} className="bg-[#1a1a1a] p-6 border border-white/10 shadow-2xl rounded-3xl min-h-[400px]">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className={`text-xl font-bold flex items-center gap-2 ${type === 'lookingFor' ? 'text-blue-400' : 'text-green-400'}`}>
                                    {type === 'lookingFor' ? <Search size={24} /> : <span className="w-6 h-6 rounded-full border-2 border-green-400 flex items-center justify-center text-xs">⇄</span>}
                                    {type === 'lookingFor' ? t('trades.lookingFor') : t('trades.forTrade')}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => copyKeyword(type === 'lookingFor' ? lookingFor : forTrade)}
                                        className="text-[12px] md:text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors whitespace-nowrap font-medium"
                                        title={t('trades.copyIdsTitle')}
                                    >
                                        <Copy size={14} /> {t('trades.keyword')}
                                    </button>
                                    <button onClick={() => setShowDropdown(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors ml-1"><Plus size={20} className="text-gray-300" /></button>
                                </div>
                            </div>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, type)}>
                                <SortableContext items={(type === 'lookingFor' ? lookingFor : forTrade).map(p => p.uniqueId || `fallback-${Math.random()}`).filter(Boolean)} strategy={rectSortingStrategy}>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {(type === 'lookingFor' ? lookingFor : forTrade).map(p => (
                                            <SortablePokemon key={p.uniqueId} id={p.uniqueId} pokemon={p} onRemove={(id) => removePokemon(id, type)} onUpdate={(id, updates) => updatePokemon(id, type, updates)} type={type} />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                            {(type === 'lookingFor' ? lookingFor : forTrade).length === 0 && (
                                <div
                                    onClick={() => setShowDropdown(true)}
                                    className="h-40 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-xl mt-4 cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <Plus size={32} className="mb-2 opacity-50" />
                                    <span>{t('trades.addPokemons')}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex md:hidden w-full justify-center gap-4 mt-8 pb-8">
                    <button onClick={manualSave} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full font-semibold text-sm text-white shadow-[0_4px_15px_rgba(59,130,246,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_25px_rgba(59,130,246,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-95 transition-all duration-300 whitespace-nowrap"><Check size={18} /> {t('common.save')}</button>
                    <button onClick={exportImage} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full font-semibold text-sm text-white shadow-[0_4px_15px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_25px_rgba(139,92,246,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-95 transition-all duration-300"><Share2 size={18} /> {t('trades.shareDiscord')}</button>
                </div>
            </div>

            {/* Hidden Export Ref — used by html-to-image to render the
                shareable PNG when the user taps "Share to Discord".
                Previously this div was `position: fixed; left: 0;
                width: 800px` which made mobile browsers (Capacitor
                WebView included) think the page was 800px wide,
                producing a phantom horizontal scroll that dragged the
                floating bottom nav pill off-screen as the user dragged
                left/right. Pulling it 10000px above the viewport via
                a negative top offset keeps html-to-image happy (the
                element is still in the layout tree) without
                contributing to document overflow on mobile. */}
            <div
                ref={exportRef}
                className="fixed left-0 w-[800px] bg-[#1a0b2e] p-8 text-white z-[-1000] opacity-0 pointer-events-none"
                style={{ top: '-10000px' }}
            >
                {/* Ensure data is present */}
                <div className="flex flex-col gap-4">
                    <h1
                        className="text-3xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] mb-2"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {t('trades.tradeListOf').replace('{name}', trainerName)}
                    </h1>

                    {/* Looking For Section */}
                    {(lookingFor.length > 0) && (
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <h2 className="text-sm font-bold text-blue-400 mb-4 border-b border-blue-500/30 pb-2 uppercase tracking-wide flex items-center gap-2" style={{ color: '#60a5fa' }}>
                                <Search size={16} />
                                {t('trades.lookingFor')}
                            </h2>
                            <div className="grid grid-cols-6 gap-4">
                                {lookingFor.map((p, i) => (
                                    <ExportPokemonItem key={i} pokemon={p} showQuantity={false} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* For Trade Section */}
                    {(forTrade.length > 0) && (
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-8">
                            <h2 className="text-sm font-bold text-green-400 mb-4 border-b border-green-500/30 pb-2 uppercase tracking-wide flex items-center gap-2" style={{ color: '#4ade80' }}>
                                <span className="w-4 h-4 rounded-full border-2 border-green-400 flex items-center justify-center text-[8px]" style={{ borderColor: '#4ade80', color: '#4ade80' }}>⇄</span>
                                {t('trades.forTrade')}
                            </h2>
                            <div className="grid grid-cols-6 gap-4">
                                {forTrade.map((p, i) => (
                                    <ExportPokemonItem key={i} pokemon={p} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Watermark */}
                    <p className="text-center text-[11px] text-gray-500 mt-6 tracking-wide" style={{ color: '#6b7280' }}>
                        {t('trades.createdOn')}
                    </p>

                </div>
            </div>

            {showDropdown && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20 rounded-t-3xl">
                            <h3 className="text-xl font-bold text-white">{t('trades.select')}</h3>
                            <button onClick={() => setShowDropdown(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-4 border-b border-white/10 bg-black/10 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{t('trades.selection')}</span>
                            </div>
                            <div className="relative">
                                <ChevronLeft className="absolute left-4 top-1/2 -translate-y-1/2 text-white cursor-pointer" size={24} onClick={() => setShowDropdown(false)} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('trades.searchShort')}
                                    className="w-full pl-12 pr-12 py-3 rounded-full bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500 shadow-inner"
                                    ref={el => { if (el && window.innerWidth >= 768) el.focus(); }}
                                />
                                {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] z-[100]"
                                    title={t('trades.clear')}
                                >
                                    <X size={18} strokeWidth={3} />
                                </button>
                            )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setFilters([])}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${filters.length === 0 ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                >
                                    {t('trades.allFilter')}
                                </button>
                                {['Normal', 'Shiny', 'Costumés', 'Légendaires', 'Purifiés', 'Gigamax', 'Dynamax', 'Backgrounds', 'Attaques'].map(f => {
                                    const filterIcons = {
                                        'Normal': <CircleDot size={12} />,
                                        'Shiny': <Sparkles size={12} />,
                                        'Costumés': <span className="text-[11px]">🎭</span>,
                                        'Légendaires': <Star size={12} />,
                                        'Purifiés': <img src="https://cdn08.net/pokemongo/wiki/purified.png" className="w-3 h-3" alt="" />,
                                        'Gigamax': <span className="text-[8px] font-black bg-red-600 text-white px-1 rounded leading-none py-px">G</span>,
                                        'Dynamax': <img src="/dynamax-cloud.png" className="w-3.5 h-3.5 object-contain opacity-80" alt="" />,
                                        'Backgrounds': <Image size={12} />,
                                        'Attaques': <Swords size={12} />,
                                    };
                                    return (
                                    <button
                                        key={f}
                                        onClick={() => {
                                            if (filters.includes(f)) setFilters(filters.filter(x => x !== f));
                                            else setFilters([...filters, f]);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${filters.includes(f) ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        {filterIcons[f]}
                                        {filterLabelMap[f] || f}
                                    </button>
                                );})}
                            </div>
                            {/* Type filter buttons */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                <button
                                    onClick={() => setTypeFilter('all')}
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold transition-all ${typeFilter === 'all' ? 'bg-gray-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                                >
                                    {lang === 'en' ? 'All Types' : 'Tous types'}
                                </button>
                                {[
                                    { name: 'Normal', icon: 'normal', color: '#A8A77A' },
                                    { name: 'Feu', icon: 'fire', color: '#EE8130' },
                                    { name: 'Eau', icon: 'water', color: '#6390F0' },
                                    { name: 'Plante', icon: 'grass', color: '#7AC74C' },
                                    { name: 'Électrik', icon: 'electric', color: '#F7D02C' },
                                    { name: 'Glace', icon: 'ice', color: '#96D9D6' },
                                    { name: 'Combat', icon: 'fighting', color: '#C22E28' },
                                    { name: 'Poison', icon: 'poison', color: '#A33EA1' },
                                    { name: 'Sol', icon: 'ground', color: '#E2BF65' },
                                    { name: 'Vol', icon: 'flying', color: '#A98FF3' },
                                    { name: 'Psy', icon: 'psychic', color: '#F95587' },
                                    { name: 'Insecte', icon: 'bug', color: '#A6B91A' },
                                    { name: 'Roche', icon: 'rock', color: '#B6A136' },
                                    { name: 'Spectre', icon: 'ghost', color: '#735797' },
                                    { name: 'Dragon', icon: 'dragon', color: '#6F35FC' },
                                    { name: 'Ténèbres', icon: 'dark', color: '#705746' },
                                    { name: 'Acier', icon: 'steel', color: '#B7B7CE' },
                                    { name: 'Fée', icon: 'fairy', color: '#D685AD' },
                                ].map(({ name, icon, color: c }) => {
                                    const iconUrl = `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${icon}.svg`;
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => setTypeFilter(typeFilter === name ? 'all' : name)}
                                            title={name}
                                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${typeFilter === name ? 'scale-110 ring-2 ring-white/40' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                                            style={{ backgroundColor: typeFilter === name ? `${c}` : `${c}30` }}
                                        >
                                            <div className="w-4 h-4" style={{
                                                backgroundColor: typeFilter === name ? '#fff' : c,
                                                maskImage: `url(${iconUrl})`, WebkitMaskImage: `url(${iconUrl})`,
                                                maskSize: 'contain', WebkitMaskSize: 'contain',
                                                maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
                                                maskPosition: 'center', WebkitMaskPosition: 'center',
                                            }} />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                {filteredPokemon.map((pokemon) => {
                                    const isSelected = selectedPokemon.some(p => p.uniqueKey === pokemon.uniqueKey);
                                    return (
                                        <button key={pokemon.uniqueKey} onClick={() => toggleSelection(pokemon)} className={`relative group p-2 rounded-xl border transition-all flex flex-col items-center justify-center overflow-visible ${isSelected ? 'bg-purple-500/20 border-purple-500' : 'bg-black/20 border-white/5 hover:bg-white/10'}`}>
                                            <div className="w-full aspect-square relative flex items-center justify-center overflow-hidden rounded-lg">
                                                {pokemon.hasBackground && pokemon.backgroundImage && (
                                                    <img src={pokemon.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 z-0" loading="lazy" />
                                                )}
                                                <img src={pokemon.sprite} alt={pokemon.nameFr} className="w-full h-full object-contain pixelated relative z-10" style={pokemon.sprite?.includes('margxt.fr') ? { transform: 'scale(1.55) translate(-4%, -8%)' } : pokemon.sprite?.startsWith('/Prismillon/') ? { transform: 'scale(1.15)' } : {}} loading="lazy" onError={(e) => { if (pokemon.id === 9999 || pokemon.originalId === 9999) { e.target.closest('button')?.classList.add('hidden'); return; } if (e.target.src !== getPokemonSprite(pokemon.originalId || pokemon.id, pokemon.isShiny)) e.target.src = getPokemonSprite(pokemon.originalId || pokemon.id, pokemon.isShiny); }} />
                                                {pokemon.isDynamax && (
                                                    <img
                                                        src="/dynamax-cloud.png"
                                                        alt="Dynamax Aura"
                                                        className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 md:w-20 z-20 pointer-events-none opacity-80"
                                                    />
                                                )}
                                                {pokemon.isShiny && <div className={`absolute top-0 ${isSelected ? 'left-1' : 'right-0'} text-[10px] drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] z-30 transition-all`}>✨</div>}
                                                {pokemon.isPurified && <img src="https://cdn08.net/pokemongo/wiki/purified.png" className="absolute top-0 left-0 w-3 h-3 opacity-90 z-30" alt="Purified" />}
                                                {pokemon.isGmax && <div className="absolute bottom-0 right-0 text-[10px] bg-red-600 text-white px-1 rounded font-bold z-30">GMAX</div>}
                                            </div>
                                            {pokemon.formLabel && (
                                                <span className="text-[8px] font-bold text-gray-400 mt-1 w-full text-center group-hover:text-white transition-colors uppercase tracking-tighter line-clamp-2 leading-tight min-h-[1.6em]">
                                                    {lang === 'fr' ? pokemon.formLabel : (pokemon.formLabelEn || pokemon.formLabel)}
                                                </span>
                                            )}
                                            {isSelected && <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-[#1a1a1a]"><Check size={12} className="text-white" /></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 bg-black/20 rounded-b-3xl flex justify-between items-center">
                            <span className="text-gray-400 text-sm">{selectedPokemon.length} {t('trades.selected')}</span>
                            <div className="flex gap-3">
                                <button onClick={() => addSelectedToList('lookingFor')} disabled={selectedPokemon.length === 0} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors text-sm uppercase text-xs tracking-wider">+ {t('trades.lookingFor')}</button>
                                <button onClick={() => addSelectedToList('forTrade')} disabled={selectedPokemon.length === 0} className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors text-sm uppercase text-xs tracking-wider">+ {t('trades.forTrade')}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showToast && <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce z-50 flex items-center gap-2"><Check size={20} /> {t('trades.saveSuccess')}</div>}

            {/* Viewer Modal */}
            <AnimatePresence>
                {viewingTrader && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingTrader(null)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1a1a1a] w-full max-w-4xl rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-4 md:p-6 border-b border-white/10 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0">
                                        <img src={viewingTrader.trainerImage} alt={viewingTrader.username} className="w-full h-full rounded-full object-cover bg-black" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl md:text-2xl font-bold text-white truncate max-w-[200px] md:max-w-none">{viewingTrader.username}</h3>
                                        {viewingTrader.friendCode && (
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(viewingTrader.friendCode.replace(/\D/g, '')); }}
                                                className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 hover:text-white transition-colors group"
                                                title={t('trades.copyFriendCode')}
                                            >
                                                <span className="font-mono tracking-wider">{viewingTrader.friendCode}</span>
                                                <Copy size={11} className="text-gray-600 group-hover:text-white transition-colors" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                                    {viewingTrader.discordId && (
                                        <button
                                            onClick={() => window.open(`https://discord.com/users/${viewingTrader.discordId}`, '_blank')}
                                            className="flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/20 text-white px-3 md:px-4 h-8 md:h-10 rounded-full transition-colors text-xs md:text-sm font-bold whitespace-nowrap"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.966 2.419-2.176 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.946 2.418-2.157 2.418z" />
                                            </svg>
                                            {t('trades.contactDiscord')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setChatTarget(viewingTrader.username)}
                                        className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 md:px-4 h-8 md:h-10 rounded-full transition-colors text-xs md:text-sm font-bold whitespace-nowrap"
                                    >
                                        <MessageCircle size={16} />
                                        {t('trades.sendDm')}
                                    </button>
                                    <button onClick={() => setViewingTrader(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                            <div className="p-8 overflow-y-auto grid md:grid-cols-2 gap-8">
                                {['lookingFor', 'forTrade'].map(type => (
                                    <div key={type} className="bg-white/5 rounded-xl p-4 border border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className={`font-bold ${type === 'lookingFor' ? 'text-blue-400' : 'text-green-400'}`}>{type === 'lookingFor' ? t('trades.lookingForShort') : t('trades.forTradeShort')}</h4>
                                            <button
                                                onClick={() => copyKeyword(viewingTrader.tradeList?.[type] || [])}
                                                className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 px-2 py-1 rounded flex items-center gap-1 transition-colors whitespace-nowrap"
                                                title={t('trades.copyIdsTitle')}
                                            >
                                                <Copy size={10} /> {t('trades.copyKeyword')}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(viewingTrader.tradeList?.[type] || []).map((p, i) => (
                                                <div key={i} className="relative group p-1 flex flex-col items-center" title={p.nameFr}>
                                                    <div className="relative w-12 h-12">
                                                        <img src={p.sprite} alt={p.nameFr} className="w-full h-full object-contain pixelated" />
                                                        {p.isShiny && <div className="absolute top-0 right-0 text-[10px] drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">✨</div>}
                                                        {type === 'forTrade' && (p.quantity >= 1 || p.count >= 1) && (
                                                            <div className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-[8px] px-1 rounded-full border border-gray-500 drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]">
                                                                x{p.quantity || p.count}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {p.note && (
                                                        <span className="text-[9px] text-blue-300 mt-1 bg-blue-900/30 px-1 rounded text-center leading-tight break-all max-w-[5rem] block">
                                                            {p.note}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ChatPopup
                isOpen={!!chatTarget}
                onClose={() => setChatTarget(null)}
                targetUser={chatTarget}
            />
        </div>
    );
}

// Wrap with Error Boundary for production safety
export { EchangesPage as EchangesPageInner };
const WrappedEchangesPage = function WrappedEchangesPage() {
    return (
        <EchangesErrorBoundary>
            <EchangesPage />
        </EchangesErrorBoundary>
    );
};
export default WrappedEchangesPage;
