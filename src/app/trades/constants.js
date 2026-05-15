// Constants extracted from page.js — trades page data definitions
// All Pokemon data constants: forms, costumes, moves, backgrounds, and ID lists

// Known Galarian Forms to auto-generate
export const GALARIAN_FORMS = [
    52, 77, 78, 79, 80, 83, 110, 122, 144, 145, 146, 199, 222, 263, 264, 554, 555, 562, 618
];
export const LEGENDARY_IDS = [
    144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
    716, 717, 718, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 1001, 1002, 1003, 1004
];

export const GMAX_IDS = [
    3, 6, 9, 12, 68, 94, 99, 131, 143, 569, 812, 815, 818, 849, 861
];

// Added Hisuian and Misc Forms
export const HISUIAN_FORMS = [
    58, 59, 100, 101, 157, 211, 215, 503, 549, 570, 571, 628, 713, 724
    // Removed: 705 (Sliggoo Hisui), 706 (Goodra Hisui) — not yet in Pokémon GO
];

export const MISC_FORMS = {
    351: ['SUNNY', 'RAINY', 'SNOWY'], // Castform (Morpheo)
    479: ['FAN', 'FROST', 'HEAT', 'MOW', 'WASH'], // Rotom
    128: ['PALDEA_AQUA', 'PALDEA_BLAZE', 'PALDEA_COMBAT'], // Tauros
    550: ['BLUE_STRIPED', 'WHITE_STRIPED'], // Basculin
    669: ['BLUE', 'ORANGE', 'RED', 'WHITE', 'YELLOW'], // Flabebe
    741: ['BAILE', 'PAU', 'POMPOM', 'SENSU'], // Oricorio
    744: ['DUSK'], // Rockruff
    745: ['DUSK'], // Lycanroc
    849: ['AMPED', 'LOW_KEY'], // Toxtricity
    876: ['FEMALE'], // Indeedee
    978: ['CURLY', 'DROOPY', 'STRETCHY'], // Tatsugiri (Nigirigon)
};

// ─── Non-Pikachu Costume Pokémon ───
// { id, code, prefix ('c' or 'f'), label (FR), shiny (default true) }
// prefix 'c' = pm{id}.c{CODE}, prefix 'f' = pm{id}.f{CODE}
export const COSTUME_POKEMON = [
    // ── Bulbasaur (#1) ──
    { id: 1, code: 'FALL_2019', prefix: 'f', label: 'Halloween 2019', labelEn: 'Halloween 2019' },
    { id: 1, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    { id: 1, code: 'SPRING_2020_NOEVOLVE', prefix: 'c', label: 'Visière Pikachu', labelEn: 'Pikachu Visor' },
    // ── Ivysaur (#2) ──
    { id: 2, code: 'ANNIVERSARY_2025', prefix: 'c', label: 'Chapeau Anniversaire', labelEn: 'Anniversary Hat' },
    // ── Venusaur (#3) ──
    { id: 3, code: 'COPY_2020', prefix: 'f', label: 'Clone', labelEn: 'Clone', shiny: false },
    { id: 3, code: 'ANNIVERSARY_2025', prefix: 'c', label: 'Chapeau Anniversaire', labelEn: 'Anniversary Hat' },
    // ── Charmander (#4) ──
    { id: 4, code: 'FALL_2019', prefix: 'f', label: 'Halloween 2019', labelEn: 'Halloween 2019' },
    { id: 4, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    { id: 4, code: 'SPRING_2020_NOEVOLVE', prefix: 'c', label: 'Visière Pikachu', labelEn: 'Pikachu Visor' },
    // ── Charmeleon (#5) ──
    { id: 5, code: 'ANNIVERSARY_2022', prefix: 'c', label: 'Chapeau Anniversaire', labelEn: 'Anniversary Hat' },
    // ── Charizard (#6) ──
    { id: 6, code: 'COPY_2020', prefix: 'f', label: 'Clone', labelEn: 'Clone', shiny: false },
    { id: 6, code: 'ANNIVERSARY_2022', prefix: 'c', label: 'Chapeau Anniversaire', labelEn: 'Anniversary Hat' },
    // ── Squirtle (#7) ──
    { id: 7, code: 'FALL_2019', prefix: 'f', label: 'Halloween 2019', labelEn: 'Halloween 2019' },
    { id: 7, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    { id: 7, code: 'SPRING_2020_NOEVOLVE', prefix: 'c', label: 'Visière Pikachu', labelEn: 'Pikachu Visor' },
    { id: 7, code: 'SUMMER_2018', prefix: 'c', label: 'Lunettes de Soleil', labelEn: 'Sunglasses' },
    // ── Wartortle (#8) ──
    { id: 8, code: 'SUMMER_2018', prefix: 'c', label: 'Lunettes de Soleil', labelEn: 'Sunglasses' },
    { id: 8, code: 'ANNIVERSARY_2023', prefix: 'c', label: 'Chapeau Anniversaire', labelEn: 'Anniversary Hat' },
    // ── Blastoise (#9) ──
    { id: 9, code: 'COPY_2020', prefix: 'f', label: 'Clone', labelEn: 'Clone', shiny: false },
    { id: 9, code: 'SUMMER_2018', prefix: 'c', label: 'Lunettes de Soleil', labelEn: 'Sunglasses' },
    { id: 9, code: 'ANNIVERSARY_2023', prefix: 'c', label: 'Chapeau Anniversaire', labelEn: 'Anniversary Hat' },
    // ── Butterfree (#12) ──
    { id: 12, code: 'FASHION_2021_NOEVOLVE', prefix: 'c', label: 'Fashion Week', labelEn: 'Fashion Week' },
    // ── Raticate (#20) ──
    { id: 20, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    // ── Nidorino (#33) ──
    { id: 33, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    // ── Vulpix (#37) ──
    { id: 37, code: 'FALL_2022', prefix: 'c', label: 'Halloween 2022', labelEn: 'Halloween 2022' },
    // ── Ninetales (#38) ──
    { id: 38, code: 'FALL_2022', prefix: 'c', label: 'Halloween 2022', labelEn: 'Halloween 2022' },
    // ── Diglett (#50) ──
    { id: 50, code: 'FALL_2022', prefix: 'c', label: 'Fashion Week 2022', labelEn: 'Fashion Week 2022' },
    // ── Dugtrio (#51) ──
    { id: 51, code: 'FALL_2022', prefix: 'c', label: 'Fashion Week 2022', labelEn: 'Fashion Week 2022' },
    // ── Psyduck (#54) ──
    { id: 54, code: 'HOLIDAY_2023', prefix: 'c', label: 'Noël 2023', labelEn: 'Christmas 2023' },
    // ── Golduck (#55) ──
    { id: 55, code: 'HOLIDAY_2023', prefix: 'c', label: 'Noël 2023', labelEn: 'Christmas 2023' },
    // ── Ponyta (#77) ──
    { id: 77, code: 'SPRING_2023_VALOR', prefix: 'c', label: 'Bravoure', labelEn: 'Bravery' },
    // ── Rapidash (#78) ──
    { id: 78, code: 'SPRING_2023_VALOR', prefix: 'c', label: 'Bravoure', labelEn: 'Bravery' },
    // ── Slowpoke (#79) ──
    { id: 79, code: 'PI_NOEVOLVE', prefix: 'c', label: 'Nouvel An 2021', labelEn: 'New Year 2021' },
    // ── Slowbro (#80) ──
    { id: 80, code: 'PI_NOEVOLVE', prefix: 'c', label: 'Nouvel An 2021', labelEn: 'New Year 2021' },
    // ── Grimer (#88) ──
    { id: 88, code: 'ANNIVERSARY_2024', prefix: 'c', label: '8e Anniversaire', labelEn: '8th Anniversary' },
    // ── Muk (#89) ──
    { id: 89, code: 'ANNIVERSARY_2024', prefix: 'c', label: '8e Anniversaire', labelEn: '8th Anniversary' },
    // ── Gengar (#94) ──
    { id: 94, code: 'COSTUME_2020', prefix: 'f', label: 'Halloween 2020', labelEn: 'Halloween 2020' },
    { id: 94, code: 'FALL_2022_NOEVOLVE', prefix: 'c', label: 'Halloween 2022', labelEn: 'Halloween 2022' },
    { id: 94, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    // ── Cubone (#104) ──
    { id: 104, code: 'FALL_2023', prefix: 'c', label: 'Día de Muertos', labelEn: 'Day of the Dead' },
    // ── Marowak (#105) ──
    { id: 105, code: 'FALL_2023', prefix: 'c', label: 'Día de Muertos', labelEn: 'Day of the Dead' },
    // ── Chansey (#113) ──
    { id: 113, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Eevee (#133) ──
    { id: 133, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    { id: 133, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    { id: 133, code: 'SPRING_2023', prefix: 'c', label: 'Couronne Soleil/Lune', labelEn: 'Sun/Moon Crown' },
    { id: 133, code: 'HOLIDAY_2022', prefix: 'c', label: 'Noël 2022', labelEn: 'Christmas 2022' },
    // ── Vaporeon (#134) ──
    { id: 134, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Jolteon (#135) ──
    { id: 135, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Flareon (#136) ──
    { id: 136, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Lapras (#131) ──
    { id: 131, code: 'COSTUME_2020', prefix: 'f', label: 'Écharpe', labelEn: 'Scarf' },
    { id: 131, code: 'SPRING_2023_MYSTIC', prefix: 'c', label: 'Sagesse', labelEn: 'Wisdom' },
    // ── Snorlax (#143) ──
    { id: 143, code: 'GOFEST_2022_NOEVOLVE', prefix: 'c', label: 'Chapeau Cowboy', labelEn: 'Cowboy Hat' },
    { id: 143, code: 'NIGHTCAP', prefix: 'c', label: 'Bonnet de Nuit', labelEn: 'Nightcap' },
    { id: 143, code: 'WILDAREA_2024', prefix: 'f', label: 'Blouson', labelEn: 'Jacket' },
    // ── Aerodactyl (#142) ──
    { id: 142, code: 'SUMMER_2023', prefix: 'f', label: 'GO Fest 2023', labelEn: 'GO Fest 2023' },
    // ── Dragonite (#149) ──
    { id: 149, code: 'FALL_2023', prefix: 'c', label: 'Fashion Week 2023', labelEn: 'Fashion Week 2023' },
    // ── Hoothoot (#163) ──
    { id: 163, code: 'JAN_2022_NOEVOLVE', prefix: 'c', label: 'Nouvel An 2022', labelEn: 'New Year 2022' },
    // ── Noctowl (#164) ──
    { id: 164, code: 'JAN_2022_NOEVOLVE', prefix: 'c', label: 'Nouvel An 2022', labelEn: 'New Year 2022' },
    // ── Togepi (#175) ──
    { id: 175, code: 'APRIL_2020_NOEVOLVE', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Togetic (#176) ──
    { id: 176, code: 'APRIL_2020_NOEVOLVE', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Espeon (#196) ──
    { id: 196, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Umbreon (#197) ──
    { id: 197, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Slowking (#199) ──
    { id: 199, code: 'PI_NOEVOLVE', prefix: 'c', label: 'Nouvel An 2021', labelEn: 'New Year 2021' },
    // ── Wobbuffet (#202) ──
    { id: 202, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    // ── Sneasel (#215) ──
    { id: 215, code: 'FASHION_2021_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2021', labelEn: 'Fashion Week 2021' },
    // ── Stantler (#234) ──
    { id: 234, code: 'WINTER_2018', prefix: 'c', label: 'Clochettes de Noël', labelEn: 'Christmas Bells' },
    // ── Smoochum (#238) ──
    { id: 238, code: 'FALL_2020_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2020', labelEn: 'Fashion Week 2020' },
    // ── Elekid (#239) ──
    { id: 239, code: 'SPRING_2023_INSTINCT', prefix: 'c', label: 'Intuition', labelEn: 'Instinct' },
    // ── Electabuzz (#125) ──
    { id: 125, code: 'SPRING_2023_INSTINCT', prefix: 'c', label: 'Intuition', labelEn: 'Instinct' },
    // ── Electivire (#466) ──
    { id: 466, code: 'SPRING_2023_INSTINCT', prefix: 'c', label: 'Intuition', labelEn: 'Instinct' },
    // ── Wurmple (#265) ──
    { id: 265, code: 'JAN_2020_NOEVOLVE', prefix: 'c', label: 'Chapeau de Fête', labelEn: 'Party Hat' },
    // ── Kirlia (#281) ──
    { id: 281, code: 'FALL_2020_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2020', labelEn: 'Fashion Week 2020' },
    // ── Sableye (#302) ──
    { id: 302, code: 'COSTUME_2020', prefix: 'f', label: 'Halloween 2020', labelEn: 'Halloween 2020' },
    // ── Duskull (#355) ──
    { id: 355, code: 'FALL_2022_NOEVOLVE', prefix: 'c', label: 'Día de Muertos', labelEn: 'Day of the Dead' },
    // ── Dusclops (#356) ──
    { id: 356, code: 'FALL_2022_NOEVOLVE', prefix: 'c', label: 'Día de Muertos', labelEn: 'Day of the Dead' },
    // ── Absol (#359) ──
    { id: 359, code: 'FALL_2022_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2022', labelEn: 'Fashion Week 2022' },
    // ── Spheal (#363) ──
    { id: 363, code: 'HOLIDAY_2021_NOEVOLVE', prefix: 'c', label: 'Noël 2021', labelEn: 'Christmas 2021' },
    // ── Piplup (#393) ──
    { id: 393, code: 'HALLOWEEN_2021_NOEVOLVE', prefix: 'c', label: 'Halloween 2021', labelEn: 'Halloween 2021' },
    // ── Shinx (#403) ──
    { id: 403, code: 'FALL_2020_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2020', labelEn: 'Fashion Week 2020' },
    // ── Buneary (#427) ──
    { id: 427, code: 'APRIL_2020_NOEVOLVE', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Lopunny (#428) ──
    { id: 428, code: 'APRIL_2020_NOEVOLVE', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Happiny (#440) ──
    { id: 440, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Croagunk (#453) ──
    { id: 453, code: 'FALL_2020_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2020', labelEn: 'Fashion Week 2020' },
    // ── Toxicroak (#454) ──
    { id: 454, code: 'FALL_2020_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2020', labelEn: 'Fashion Week 2020' },
    // ── Leafeon (#470) ──
    { id: 470, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Glaceon (#471) ──
    { id: 471, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Dusknoir (#477) ──
    { id: 477, code: 'FALL_2022_NOEVOLVE', prefix: 'c', label: 'Día de Muertos', labelEn: 'Day of the Dead' },
    // ── Togekiss (#468) ──
    { id: 468, code: 'APRIL_2020_NOEVOLVE', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Blitzle (#522) ──
    { id: 522, code: 'FASHION_2021_NOEVOLVE', prefix: 'c', label: 'Fashion Week 2021', labelEn: 'Fashion Week 2021' },
    // ── Cottonee (#546) ──
    { id: 546, code: 'SPRING_2024', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Whimsicott (#547) ──
    { id: 547, code: 'SPRING_2024', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Minccino (#572) ──
    { id: 572, code: 'FASHION_2025', prefix: 'c', label: 'Fashion Week 2025', labelEn: 'Fashion Week 2025' },
    // ── Cinccino (#573) ──
    { id: 573, code: 'FASHION_2025', prefix: 'c', label: 'Fashion Week 2025', labelEn: 'Fashion Week 2025' },
    // ── Cubchoo (#613) ──
    { id: 613, code: 'WINTER_2020', prefix: 'f', label: 'Noël 2020', labelEn: 'Christmas 2020' },
    // ── Beartic (#614) ──
    { id: 614, code: 'WINTER_2020', prefix: 'f', label: 'Noël 2020', labelEn: 'Christmas 2020' },
    // ── Froakie (#656) ──
    { id: 656, code: 'FALL_2024', prefix: 'c', label: 'Halloween 2024', labelEn: 'Halloween 2024' },
    // ── Frogadier (#657) ──
    { id: 657, code: 'FALL_2024', prefix: 'c', label: 'Halloween 2024', labelEn: 'Halloween 2024' },
    // ── Greninja (#658) ──
    { id: 658, code: 'FALL_2024', prefix: 'c', label: 'Halloween 2024', labelEn: 'Halloween 2024' },
    // ── Sylveon (#700) ──
    { id: 700, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Rowlet (#722) ──
    { id: 722, code: 'FALL_2024', prefix: 'c', label: 'Halloween 2024', labelEn: 'Halloween 2024' },
    // ── Dartrix (#723) ──
    { id: 723, code: 'FALL_2024', prefix: 'c', label: 'Halloween 2024', labelEn: 'Halloween 2024' },
    // ── Decidueye (#724) ──
    { id: 724, code: 'FALL_2024', prefix: 'c', label: 'Halloween 2024', labelEn: 'Halloween 2024' },
    // ── Wooloo (#831) ──
    { id: 831, code: 'WINTER_2024', prefix: 'c', label: 'Noël 2024', labelEn: 'Christmas 2024' },
    // ── Dubwool (#832) ──
    { id: 832, code: 'WINTER_2024', prefix: 'c', label: 'Noël 2024', labelEn: 'Christmas 2024' },
    // ── Drifblim (#426) ──
    { id: 426, code: 'HALLOWEEN_2021_NOEVOLVE', prefix: 'c', label: 'Halloween 2021', labelEn: 'Halloween 2021' },
    // ── Wooper (#194) ──
    { id: 194, code: 'FALL_2023', prefix: 'c', label: 'Fashion Week 2023', labelEn: 'Fashion Week 2023' },
    // ── Quagsire (#195) ──
    { id: 195, code: 'FALL_2023', prefix: 'c', label: 'Fashion Week 2023', labelEn: 'Fashion Week 2023' },
    // ── Blissey (#242) ──
    { id: 242, code: 'NOVEMBER_2018', prefix: 'c', label: 'Couronne de Fleurs', labelEn: 'Flower Crown' },
    // ── Delibird (#225) ──
    { id: 225, code: 'HOLIDAY_2020', prefix: 'c', label: 'Noël 2020', labelEn: 'Christmas 2020' },
    // ── Nidoqueen (#31) ──
    { id: 31, code: 'ROYAL_NOEVOLVE', prefix: 'c', label: 'Couronne', labelEn: 'Crown' },
    // ── Nidoking (#34) ──
    { id: 34, code: 'ROYAL_NOEVOLVE', prefix: 'c', label: 'Couronne', labelEn: 'Crown' },
    // ── Jigglypuff (#39) ──
    { id: 39, code: 'JAN_2024', prefix: 'c', label: 'Ruban', labelEn: 'Ribbon' },
    // ── Psyduck Bouée (#54) ──
    { id: 54, code: 'SWIM_2025', prefix: 'f', label: 'Bouée', labelEn: 'Float Ring' },
    // ── Espeon (#196) — additional costumes ──
    { id: 196, code: 'GOFEST_2024_SSCARF', prefix: 'f', label: 'Écharpe de Jour', labelEn: 'Day Scarf' },
    { id: 196, code: 'HOLIDAY_2022', prefix: 'c', label: 'Noël 2022', labelEn: 'Christmas 2022' },
    // ── Umbreon (#197) — additional costumes ──
    { id: 197, code: 'GOFEST_2024_MSCARF', prefix: 'f', label: 'Écharpe de Nuit', labelEn: 'Night Scarf' },
    { id: 197, code: 'HOLIDAY_2022', prefix: 'c', label: 'Noël 2022', labelEn: 'Christmas 2022' },
    // ── Slakoth (#287) ──
    { id: 287, code: 'SUMMER_2024', prefix: 'c', label: 'Visière', labelEn: 'Visor' },
    // ── Dedenne (#702) ──
    { id: 702, code: 'WINTER_2024', prefix: 'c', label: 'Noël 2024', labelEn: 'Christmas 2024' },
    // ── Pumpkaboo (#710) ──
    { id: 710, code: 'FALL_2022', prefix: 'fAVERAGE.c', label: 'Halloween 2022', labelEn: 'Halloween 2022' },
    // ── Falinks (#870) ──
    { id: 870, code: 'GOFEST_2025_TRAIN_CONDUCTOR', prefix: 'f', label: 'Train', labelEn: 'Train' },
    // ── Meowscarada (#907) ──
    { id: 907, code: 'HORIZONS_2025_NOEVOLVE', prefix: 'c', label: 'Épingle de Liko', labelEn: 'Liko\'s Pin' },
    // ── Gholdengo (#999) ──
    { id: 999, code: 'COIN_A1', prefix: 'f', label: '9e Anniversaire', labelEn: '9th Anniversary' },
];

// ─── Pokémon avec Attaque Aventure (signature/exclusive moves) ───
// These create entries with a special move indicator background
export const SIGNATURE_MOVE_POKEMON = [
    // Origin forms with signature moves
    { id: 483, form: 'origin', label: 'Hurle-Temps', moveEn: 'Roar of Time', sprite: 'pm483.fORIGIN' },          // Dialga Origin → Roar of Time
    { id: 484, form: 'origin', label: 'Spatio-Rift', moveEn: 'Spacial Rend', sprite: 'pm484.fORIGIN' },           // Palkia Origin → Spacial Rend
    // Mewtwo
    { id: 150, form: null, label: 'Frappe Psy', moveEn: 'Psystrike', sprite: null },                             // Mewtwo → Psystrike
    { id: 150, form: null, label: 'Ball\'Ombre', moveEn: 'Shadow Ball', sprite: null },                             // Mewtwo → Shadow Ball
    // Legendary birds (signature moves from GO Tour)
    { id: 249, form: null, label: 'Aéroblast', moveEn: 'Aeroblast', sprite: null },                              // Lugia → Aeroblast
    { id: 250, form: null, label: 'Feu Sacré', moveEn: 'Sacred Fire', sprite: null },                              // Ho-Oh → Sacred Fire
    // Weather trio
    { id: 382, form: null, label: 'Onde Originelle', moveEn: 'Origin Pulse', sprite: null },                        // Kyogre → Origin Pulse
    { id: 383, form: null, label: 'Lame Pangéenne', moveEn: 'Precipice Blades', sprite: null },                         // Groudon → Precipice Blades
    { id: 384, form: null, label: 'Draco Ascension', moveEn: 'Dragon Ascent', sprite: null },                        // Rayquaza → Dragon Ascent
    // Tao trio
    { id: 643, form: null, label: 'Flamme Croix', moveEn: 'Fusion Flare', sprite: null },                            // Reshiram → Fusion Flare
    { id: 644, form: null, label: 'Éclair Croix', moveEn: 'Fusion Bolt', sprite: null },                           // Zekrom → Fusion Bolt
    // Swords of Justice
    { id: 638, form: null, label: 'Lame Sainte', moveEn: 'Sacred Sword', sprite: null },                            // Cobalion → Sacred Sword
    { id: 639, form: null, label: 'Lame Sainte', moveEn: 'Sacred Sword', sprite: null },                            // Terrakion → Sacred Sword
    { id: 640, form: null, label: 'Lame Sainte', moveEn: 'Sacred Sword', sprite: null },                            // Virizion → Sacred Sword
    // Giratina
    { id: 487, form: 'origin', label: 'Revenant', moveEn: 'Shadow Force', sprite: 'pm487.fORIGIN' },               // Giratina Origin → Shadow Force
    // Forces of Nature (Therian)
    { id: 641, form: 'therian', label: 'Typhon Hivernal', moveEn: 'Bleakwind Storm', sprite: 'pm641.fTHERIAN' },        // Tornadus → Bleakwind Storm
    { id: 642, form: 'therian', label: 'Typhon Fulgurant', moveEn: 'Wildbolt Storm', sprite: 'pm642.fTHERIAN' },      // Thundurus → Wildbolt Storm
    { id: 645, form: 'therian', label: 'Typhon Pyrosable', moveEn: 'Sandsear Storm', sprite: 'pm645.fTHERIAN' },      // Landorus → Sandsear Storm
];

// ─── Pokémon avec CT Elite (Elite TM exclusive moves) ───
// Community Day moves, Raid Day moves, and other legacy moves obtainable only via Elite TM
export const ELITE_TM_POKEMON = [
    // ── Starters: Végé-Attak (Frenzy Plant) ──
    { id: 3, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },          // Florizarre
    { id: 154, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Méganium
    { id: 254, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Jungko
    { id: 389, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Torterra
    { id: 497, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Majaspic
    { id: 652, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Blindépique
    { id: 724, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Archéduc
    { id: 812, label: 'Végé-Attak', moveEn: 'Frenzy Plant' },         // Gorythmic
    // ── Starters: Rafale Feu (Blast Burn) ──
    { id: 6, label: 'Rafale Feu', moveEn: 'Blast Burn' },           // Dracaufeu
    { id: 157, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Typhlosion
    { id: 257, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Braségali
    { id: 392, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Simiabraz
    { id: 500, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Roitiflam
    { id: 655, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Goupelin
    { id: 727, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Félinferno
    { id: 815, label: 'Rafale Feu', moveEn: 'Blast Burn' },         // Pyrobut
    // ── Starters: Hydroblast (Hydro Cannon) ──
    { id: 9, label: 'Hydroblast', moveEn: 'Hydro Cannon' },           // Tortank
    { id: 160, label: 'Hydroblast', moveEn: 'Hydro Cannon' },         // Aligatueur
    { id: 260, label: 'Hydroblast', moveEn: 'Hydro Cannon' },         // Laggron
    { id: 395, label: 'Hydroblast', moveEn: 'Hydro Cannon' },         // Pingoléon
    { id: 503, label: 'Hydroblast', moveEn: 'Hydro Cannon' },         // Clamiral
    { id: 658, label: 'Hydroblast', moveEn: 'Hydro Cannon' },         // Amphinobi
    { id: 730, label: 'Hydroblast', moveEn: 'Hydro Cannon' },         // Oratoria
    // ── Community Day exclusives ──
    { id: 149, label: 'Draco Météore', moveEn: 'Draco Meteor' },       // Dracolosse
    { id: 181, label: 'Dracochoc', moveEn: 'Dragon Pulse' },           // Pharamp
    { id: 248, label: 'Anti-Air', moveEn: 'Sky Attack' },            // Tyranocif
    { id: 376, label: 'Poing Météore', moveEn: 'Meteor Mash' },       // Métalosse
    { id: 373, label: 'Colère', moveEn: 'Outrage' },              // Drattak
    { id: 282, label: 'Synchropeine', moveEn: 'Synchronoise' },        // Gardevoir
    { id: 475, label: 'Synchropeine', moveEn: 'Synchronoise' },        // Gallame
    { id: 330, label: 'Telluriforce', moveEn: 'Earth Power' },        // Libégon
    { id: 464, label: 'Roc-Boulet', moveEn: 'Rock Wrecker' },          // Rhinastoc
    { id: 65, label: 'Contre', moveEn: 'Counter' },               // Alakazam
    { id: 15, label: 'Tunnelier', moveEn: 'Drill Run' },            // Dardargnan
    { id: 94, label: 'Poing Ombre', moveEn: 'Shadow Punch' },          // Ectoplasma
    { id: 130, label: 'Hydroqueue', moveEn: 'Aqua Tail' },          // Léviator
    { id: 474, label: 'Triplattaque', moveEn: 'Tri Attack' },        // Porygon-Z
    { id: 663, label: 'Calcination', moveEn: 'Incinerate' },         // Flambusard
    { id: 334, label: 'Pouvoir Lunaire', moveEn: 'Moonblast' },     // Altaria
    { id: 445, label: 'Telluriforce', moveEn: 'Earth Power' },        // Carchacrok
    { id: 477, label: "Ball'Ombre", moveEn: 'Shadow Ball' },          // Noctunoir
    { id: 405, label: 'Crocs Psy', moveEn: 'Psychic Fangs' },           // Luxray
    { id: 365, label: 'Stalactite', moveEn: 'Icicle Spear' },          // Kaimorse
    { id: 189, label: 'Acrobatie', moveEn: 'Acrobatics' },           // Cotovol
    { id: 760, label: 'Drainopoing', moveEn: 'Drain Punch' },         // Chelours
    { id: 635, label: 'Oscillation', moveEn: 'Superpower' },         // Trioxhydre
    { id: 398, label: 'Tornade', moveEn: 'Hurricane' },             // Étouraptor
    { id: 862, label: 'Blocage', moveEn: 'Obstruct' },             // Ixon
    { id: 526, label: 'Laser Météore', moveEn: 'Meteor Beam' },       // Gigalithe
    { id: 609, label: 'Poltergeist', moveEn: 'Poltergeist' },         // Lugulabre
    { id: 715, label: 'Bang Sonique', moveEn: 'Boomburst' },        // Bruyverne
    { id: 468, label: 'Aurasphère', moveEn: 'Aura Sphere' },          // Togekiss
    { id: 612, label: 'Abattage', moveEn: 'Brutal Swing' },            // Tranchodon
    { id: 534, label: 'Oscillation', moveEn: 'Superpower' },         // Bétochef
    { id: 738, label: 'Change Éclair', moveEn: 'Volt Switch' },       // Lucanon
    { id: 784, label: 'Dracaclang', moveEn: 'Clanging Scales' },          // Ékaïser
    { id: 823, label: "Lame d'Air", moveEn: 'Air Slash' },          // Corvaillus
    { id: 733, label: 'Bec-Canon', moveEn: 'Beak Blast' },           // Bazoucan
    { id: 979, label: 'Poing de Colère', moveEn: 'Rage Fist' },     // Courrousinge
    { id: 589, label: 'Coqui-Lame', moveEn: 'Razor Shell' },          // Lançargot
    { id: 617, label: 'Éco-Sphère', moveEn: 'Energy Ball' },          // Limaspeed
    { id: 584, label: 'Avalanche', moveEn: 'Avalanche' },           // Sorbouboul
    // ── Dracaufeu attaques rapides CT Elite ──
    { id: 6, label: 'Souffle Dragon', moveEn: 'Dragon Breath' },        // Dracaufeu — Dragon Breath (Fast)
    // ── Ectoplasma legacy ──
    { id: 94, label: 'Léchouille', moveEn: 'Lick' },           // Ectoplasma — Lick (Fast)
    // ── Autres legacy notables ──
    { id: 131, label: 'Éclats Glace', moveEn: 'Ice Shard' },        // Lokhlass — Ice Shard (Fast)
    { id: 68, label: 'Représailles', moveEn: 'Payback' },         // Mackogneur — Payback
    { id: 289, label: 'Plaquage', moveEn: 'Body Slam' },            // Monaflèmit — Body Slam
    { id: 407, label: 'Balle Graine', moveEn: 'Bullet Seed' },        // Roserade — Bullet Seed (Fast)
    { id: 62, label: 'Contre', moveEn: 'Counter' },               // Tartard — Counter (Fast)
    { id: 80, label: 'Surf', moveEn: 'Surf' },                 // Flagadoss — Surf
    { id: 199, label: 'Surf', moveEn: 'Surf' },                // Roigada — Surf
    { id: 186, label: 'Laser Glace', moveEn: 'Ice Beam' },         // Tarpaud — Ice Beam
    { id: 195, label: 'Hydroqueue', moveEn: 'Aqua Tail' },          // Maraiste — Aqua Tail
    { id: 242, label: 'Éclair Fou', moveEn: 'Wild Charge' },          // Leuphorie — Wild Charge
    { id: 71, label: 'Feuille Magik', moveEn: 'Magical Leaf' },        // Empiflor — Magical Leaf
    { id: 604, label: 'Change Éclair', moveEn: 'Volt Switch' },       // Ohmassacre — Volt Switch (Fast)
    { id: 542, label: 'Griffe Ombre', moveEn: 'Shadow Claw' },        // Manternel — Shadow Claw (Fast)
    { id: 671, label: 'Eau Glacée', moveEn: 'Chilling Water' },          // Florges — Chilling Water
    { id: 579, label: 'Charme', moveEn: 'Charm' },              // Symbios — Charm (Fast)
    { id: 706, label: 'Poing Éclair', moveEn: 'Thunder Punch' },        // Goodra — Thunder Punch
    { id: 466, label: 'Lance-Flammes', moveEn: 'Flamethrower' },       // Élekable — Flamethrower
    { id: 467, label: 'Tonnerre', moveEn: 'Thunderbolt' },            // Maganon — Thunderbolt
    // ── Légendaires CT Elite (non-signature, raid day exclusives) ──
    { id: 145, label: 'Éclair', moveEn: 'Thunder Shock' },              // Électhor — Thunder Shock (Fast)
    { id: 146, label: 'Rapace', moveEn: 'Sky Attack' },              // Sulfura — Sky Attack
    { id: 377, label: 'Séisme', moveEn: 'Earthquake' },              // Regirock — Earthquake
    { id: 378, label: 'Fatal-Foudre', moveEn: 'Thunder' },        // Regice — Thunder
    { id: 379, label: 'Électro-Canon', moveEn: 'Zap Cannon' },       // Registeel — Zap Cannon
    { id: 485, label: 'Vortex Magma', moveEn: 'Magma Storm' },        // Heatran — Magma Storm
    { id: 646, label: 'Ère Glaciaire', moveEn: 'Glaciate' },       // Kyurem — Glaciate
    { id: 716, label: 'Géo-Contrôle', moveEn: 'Geomancy' },        // Xerneas — Geomancy (Fast)
    { id: 717, label: 'Mort-Ailes', moveEn: 'Oblivion Wing' },          // Yveltal — Oblivion Wing
    { id: 380, label: 'Brume', moveEn: 'Mist Ball' },               // Latias — Mist Ball
    { id: 381, label: 'Lumi-Éclat', moveEn: 'Luster Purge' },          // Latios — Luster Purge
    { id: 809, label: 'Coup Double', moveEn: 'Double Iron Bash' },         // Melmetal — Double Iron Bash
    { id: 785, label: 'Ire de la Nature', moveEn: 'Nature\'s Madness' },    // Tokorico — Nature's Madness
    { id: 786, label: 'Ire de la Nature', moveEn: 'Nature\'s Madness' },    // Tokopiyon — Nature's Madness
    { id: 787, label: 'Ire de la Nature', moveEn: 'Nature\'s Madness' },    // Tokotoro — Nature's Madness
    { id: 788, label: 'Ire de la Nature', moveEn: 'Nature\'s Madness' },    // Tokopisco — Nature's Madness
];


// ─── Special Backgrounds (event/location souvenirs) ───
// Each entry: { name, label (shown in UI), image (local path), pokemon (array of dex IDs) }
// Source: https://pokemongo.fandom.com/wiki/Special_background — Updated March 2026
export const POKEMON_BACKGROUNDS = [
    // ── Team backgrounds ──
    { name: 'valor', label: 'Fond Bravoure', labelEn: 'Valor BG', image: '/backgrounds/valor.webp', pokemon: [77, 146] },
    { name: 'mystic', label: 'Fond Sagesse', labelEn: 'Mystic BG', image: '/backgrounds/mystic.webp', pokemon: [131, 144] },
    { name: 'instinct', label: 'Fond Intuition', labelEn: 'Instinct BG', image: '/backgrounds/instinct.webp', pokemon: [239, 145] },
    // ── GO Fest 2024 ──
    { name: 'gofest2024-radiance', label: 'Fond GO Fest 2024 Éclat', labelEn: 'GO Fest 2024 Radiance BG', image: '/backgrounds/gofest2024-radiance.webp', pokemon: [791] },
    { name: 'gofest2024-umbra', label: 'Fond GO Fest 2024 Ombre', labelEn: 'GO Fest 2024 Umbra BG', image: '/backgrounds/gofest2024-umbra.webp', pokemon: [792] },
    { name: 'gofest2024-wormhole', label: 'Fond GO Fest 2024 Ultra-Brèche', labelEn: 'GO Fest 2024 Wormhole BG', image: '/backgrounds/gofest2024-wormhole.webp', pokemon: [793, 794, 795, 796, 797, 798, 799, 800, 805, 806] },
    // ── GO Fest 2025 ──
    { name: 'gofest2025', label: 'Fond GO Fest 2025', labelEn: 'GO Fest 2025 BG', image: '/backgrounds/gofest2025.webp', pokemon: [377, 378, 379, 486, 894, 895] },
    { name: 'gofest2025-sword', label: 'Fond GO Fest 2025 Épée', labelEn: 'GO Fest 2025 Sword BG', image: '/backgrounds/gofest2025-sword.webp', pokemon: [888] },
    { name: 'gofest2025-shield', label: 'Fond GO Fest 2025 Bouclier', labelEn: 'GO Fest 2025 Shield BG', image: '/backgrounds/gofest2025-shield.webp', pokemon: [889] },
    // ── GO Tour Unys ──
    { name: 'gotour-black', label: 'Fond Version Noire', labelEn: 'Black Version BG', image: '/backgrounds/black-version.webp', pokemon: [495, 498, 501, 509, 519, 525, 527, 532, 535, 551, 554, 555, 559, 561, 570, 595, 597, 599, 638, 639, 640, 641, 643, 645, 646, 649] },
    { name: 'gotour-white', label: 'Fond Version Blanche', labelEn: 'White Version BG', image: '/backgrounds/white-version.webp', pokemon: [495, 498, 501, 509, 519, 525, 527, 532, 535, 551, 554, 555, 559, 561, 570, 595, 597, 599, 638, 639, 640, 642, 644, 645, 646, 649] },
    { name: 'gotour-grey', label: 'Fond Version Grise', labelEn: 'Grey Version BG', image: '/backgrounds/grey-version.webp', pokemon: [646] },
    // ── GO Tour Johto ──
    { name: 'gold', label: 'Fond Or', labelEn: 'Gold BG', image: '/backgrounds/gold.webp', pokemon: [250] },
    { name: 'silver', label: 'Fond Argent', labelEn: 'Silver BG', image: '/backgrounds/silver.webp', pokemon: [249] },
    // ── GO Tour Hoenn ──
    { name: 'ruby', label: 'Fond Rubis', labelEn: 'Ruby BG', image: '/backgrounds/ruby.webp', pokemon: [383] },
    { name: 'sapphire', label: 'Fond Saphir', labelEn: 'Sapphire BG', image: '/backgrounds/sapphire.webp', pokemon: [382] },
    // ── GO Tour Sinnoh ──
    { name: 'diamond', label: 'Fond Diamant', labelEn: 'Diamond BG', image: '/backgrounds/diamond.webp', pokemon: [483] },
    { name: 'pearl', label: 'Fond Perle', labelEn: 'Pearl BG', image: '/backgrounds/pearl.webp', pokemon: [484] },
    // ── GO Tour Kalos ──
    { name: 'x-version', label: 'Fond Version X', labelEn: 'X Version BG', image: '/backgrounds/x-version.webp', pokemon: [650, 653, 656, 679, 716] },
    { name: 'y-version', label: 'Fond Version Y', labelEn: 'Y Version BG', image: '/backgrounds/y-version.webp', pokemon: [650, 653, 656, 679, 717] },
    // ── Mega ──
    { name: 'mega', label: 'Fond Méga', labelEn: 'Mega BG', image: '/backgrounds/mega.webp', pokemon: [3, 6, 9, 18, 71, 115, 149, 212, 214, 248, 254, 257, 260, 282, 359, 373, 376, 380, 381, 445, 448, 475, 687] },
    // ── GO Tour Unys — Enigma ──
    { name: 'enigma', label: 'Fond Enigma', labelEn: 'Enigma BG', image: '/backgrounds/enigma.webp', pokemon: [509, 519, 525, 527, 532, 535, 551, 554, 555, 559, 561, 570, 595, 597, 599] },
    // ── Max Finale ──
    { name: 'max-finale', label: 'Fond Max Finale', labelEn: 'Max Finale BG', image: '/backgrounds/max-finale.webp', pokemon: [1, 3, 4, 6, 7, 9, 10, 12, 66, 68, 92, 94, 98, 99, 113, 131, 138, 140, 143, 144, 145, 146, 213, 243, 244, 245, 302, 320, 374, 380, 381, 519, 529, 554, 568, 615, 766, 810, 812, 813, 815, 816, 818, 819, 821, 831, 849, 856, 870] },
    // ── Concierge ──
    { name: 'concierge', label: 'Fond Concierge', labelEn: 'Concierge BG', image: '/backgrounds/concierge.webp', pokemon: [54] },
    // ── 9e Anniversaire ──
    { name: '9th-anniversary', label: 'Fond 9e Anniversaire', labelEn: '9th Anniversary BG', image: '/backgrounds/9th-anniversary.webp', pokemon: [1] },
    // ── Terres Sauvages ──
    { name: 'wildarea2024', label: 'Fond Terres Sauvages 2024', labelEn: 'Wild Area 2024 BG', image: '/backgrounds/wildarea2024.webp', pokemon: [382, 383, 483, 484, 849] },
    // 382=Kyogre, 383=Groudon, 483=Dialga, 484=Palkia, 849=Toxtricity
    { name: 'wildarea2025', label: 'Fond Terres Sauvages 2025', labelEn: 'Wild Area 2025 BG', image: '/backgrounds/wildarea2025.webp', pokemon: [249, 250, 488, 491, 760, 785, 786, 787, 788, 800, 861] },
    // ── Location backgrounds — GO Fest 2024 cities ──
    { name: 'sendai-gofest2024', label: 'Fond GO Fest Sendai', labelEn: 'GO Fest Sendai BG', image: '/backgrounds/sendai-gofest2024.webp', pokemon: [791, 792, 793, 796, 798, 799, 800, 805] },
    // 791=Solgaleo, 792=Lunala, 793=Nihilego, 796=Xurkitree, 798=Kartana, 799=Guzzlord, 800=Necrozma, 805=Stakataka
    { name: 'madrid-gofest2024', label: 'Fond GO Fest Madrid', labelEn: 'GO Fest Madrid BG', image: '/backgrounds/madrid-gofest2024.webp', pokemon: [791, 792, 793, 794, 798, 799, 800, 805] },
    // 791=Solgaleo, 792=Lunala, 793=Nihilego, 794=Buzzwole, 798=Kartana, 799=Guzzlord, 800=Necrozma, 805=Stakataka
    { name: 'nyc-gofest2024', label: 'Fond GO Fest New York', labelEn: 'GO Fest New York BG', image: '/backgrounds/nyc-gofest2024.webp', pokemon: [791, 792, 793, 794, 798, 799, 800, 806] },
    // 791=Solgaleo, 792=Lunala, 793=Nihilego, 794=Buzzwole, 798=Kartana, 799=Guzzlord, 800=Necrozma, 806=Blacephalon
    // ── Location backgrounds — GO Fest 2025 cities ──
    { name: 'paris', label: 'Fond GO Fest Paris', labelEn: 'GO Fest Paris BG', image: '/backgrounds/paris.webp', pokemon: [25, 818, 888, 889] },
    { name: 'osaka-gofest2025', label: 'Fond GO Fest Osaka', labelEn: 'GO Fest Osaka BG', image: '/backgrounds/osaka-gofest2025.webp', pokemon: [812, 888, 889] },
    { name: 'jersey-city', label: 'Fond GO Fest Jersey City', labelEn: 'GO Fest Jersey City BG', image: '/backgrounds/jersey-city.webp', pokemon: [815, 888, 889] },
    // ── City Safari ──
    { name: 'safari-milan', label: 'Fond Safari Milan', labelEn: 'Safari Milan BG', image: '/backgrounds/safari-milan.webp', pokemon: [133] },
    // 133=Evoli (costumé Explorateur)
    { name: 'safari-valencia', label: 'Fond Safari Valencia', labelEn: 'Safari Valencia BG', image: '/backgrounds/safari-valencia.webp', pokemon: [133] },
    // 133=Evoli (costumé Explorateur)
    // ── Pokopia ──
    { name: 'pokopia', label: 'Fond Pokopia', labelEn: 'Pokopia BG', image: '/backgrounds/pokopia.webp', pokemon: [131, 132, 143, 149] },
    // ── Community Day ──
    { name: 'community-day', label: 'Fond Community Day', labelEn: 'Community Day BG', image: '/backgrounds/community-day.webp', pokemon: [37, 152, 158, 255, 393, 434, 580, 582, 588, 616, 661, 669, 731, 747, 909, 921, 935] },
    // 37=Goupix, 152=Germignon, 158=Kaiminus, 255=Poussifeu (Chochodile=Not in GO yet, using available CDs)
    // 393=Tiplouf, 434=Moufouette, 580=Couaneton, 582=Sorbébé, 588=Carabing, 616=Escargaume
    // 661=Passerouge, 669=Flabébé, 731=Picassaut, 747=Vorastérie, 909=Chochodile, 921=Famignol, 935=Tapatoès
    // ── Transformations Fabuleuses ──
    { name: 'transformations-fabuleuses', label: 'Fond Transformations Fabuleuses', labelEn: 'Wondrous Transformations BG', image: '/backgrounds/transformations-fabuleuses.webp', pokemon: [152, 155, 158, 577, 669, 731] },
    // 152=Germignon, 155=Héricendre, 158=Kaiminus, 577=Nucléos, 669=Flabébé, 731=Picassaut
    // ── Journées Enchantées ──
    { name: 'delightful-days', label: 'Fond Journées Enchantées', labelEn: 'Delightful Days BG', image: '/backgrounds/delightful-days.webp', pokemon: [131, 580, 731] },
    // 131=Lokhlass (écharpe), 580=Couaneton, 731=Picassaut (Minisange=évol)
    // ── Dual Destiny (CD Carabing/Escargaume) ──
    { name: 'dual-destiny', label: 'Fond Dual Destiny', labelEn: 'Dual Destiny BG', image: '/backgrounds/dual-destiny.webp', pokemon: [588, 616] },
    // 588=Carabing, 616=Escargaume
    // ── Force & Maîtrise ──
    { name: 'might-mastery', label: 'Fond Force & Maîtrise', labelEn: 'Might & Mastery BG', image: '/backgrounds/might-mastery.webp', pokemon: [66, 158, 307, 434, 582, 747, 909, 921, 935] },
    // ── Pikachu Location Backgrounds ──
    // Road Trip 2025 (Europe)
    { name: 'rt-paris', label: 'Fond Road Trip Paris', labelEn: 'Road Trip Paris BG', image: '/backgrounds/pika-rt-paris.webp', pokemon: [25] },
    { name: 'rt-london', label: 'Fond Road Trip Londres', labelEn: 'Road Trip London BG', image: '/backgrounds/pika-rt-london.webp', pokemon: [25] },
    { name: 'rt-manchester', label: 'Fond Road Trip Manchester', labelEn: 'Road Trip Manchester BG', image: '/backgrounds/pika-rt-manchester.webp', pokemon: [25] },
    { name: 'rt-berlin', label: 'Fond Road Trip Berlin', labelEn: 'Road Trip Berlin BG', image: '/backgrounds/pika-rt-berlin.webp', pokemon: [25] },
    { name: 'rt-valencia', label: 'Fond Road Trip Valencia', labelEn: 'Road Trip Valencia BG', image: '/backgrounds/pika-rt-valencia.webp', pokemon: [25] },
    { name: 'rt-thehague', label: 'Fond Road Trip La Haye', labelEn: 'Road Trip The Hague BG', image: '/backgrounds/pika-rt-thehague.webp', pokemon: [25] },
    { name: 'rt-cologne', label: 'Fond Road Trip Cologne', labelEn: 'Road Trip Cologne BG', image: '/backgrounds/pika-rt-cologne.webp', pokemon: [25] },
    // World Championships
    { name: 'wcs2024', label: 'Fond Worlds 2024 Honolulu', labelEn: 'Worlds 2024 Honolulu BG', image: '/backgrounds/pika-wcs2024.webp', pokemon: [25] },
    { name: 'wcs2025', label: 'Fond Worlds 2025 Anaheim', labelEn: 'Worlds 2025 Anaheim BG', image: '/backgrounds/pika-wcs2025.webp', pokemon: [25] },
    // GO Fest 2025 Paris (Pikachu-specific background)
    { name: 'gofest2025-paris-pika', label: 'Fond GO Fest Paris (Pikachu)', labelEn: 'GO Fest Paris (Pikachu) BG', image: '/backgrounds/pika-gofest-paris-pika.webp', pokemon: [25] },
    // Safari Zone
    { name: 'safari-incheon', label: 'Fond Safari Incheon', labelEn: 'Safari Incheon BG', image: '/backgrounds/pika-safari-incheon.webp', pokemon: [25] },
    // PokePark Kanto
    { name: 'pokepark-kanto', label: 'Fond PokéPark Kanto', labelEn: 'PokePark Kanto BG', image: '/backgrounds/pika-pokepark.webp', pokemon: [25, 144, 145, 146] },
    // Events
    { name: 'festival-colors', label: 'Fond Festival des Couleurs', labelEn: 'Festival of Colors BG', image: '/backgrounds/pika-festivalcolors.webp', pokemon: [25] },
    { name: 'spring-blossom', label: 'Fond Floraison Printanière', labelEn: 'Spring Blossom BG', image: '/backgrounds/pika-springblossom.webp', pokemon: [25] },
    { name: 'expo2025-osaka', label: 'Fond Expo 2025 Osaka', labelEn: 'Expo 2025 Osaka BG', image: '/backgrounds/pika-expo2025.webp', pokemon: [25] },
    { name: 'pyeongchang', label: 'Fond Pyeongchang Hiver', labelEn: 'Pyeongchang Winter BG', image: '/backgrounds/pika-pyeongchang.webp', pokemon: [25] },
    { name: 'pika-concierge', label: 'Fond Pokémon Concierge', labelEn: 'Pokemon Concierge BG', image: '/backgrounds/pika-concierge-pika.webp', pokemon: [25] },
    // Pokelid (Japon — fonds de préfectures)
    { name: 'pokelid-tokyo', label: 'Fond Pokélid Tokyo', labelEn: 'Pokelid Tokyo BG', image: '/backgrounds/pika-pokelid-tokyo.webp', pokemon: [25] },
    { name: 'pokelid-aomori', label: 'Fond Pokélid Aomori', labelEn: 'Pokelid Aomori BG', image: '/backgrounds/pika-pokelid-aomori.webp', pokemon: [25] },
    { name: 'pokelid-kyoto', label: 'Fond Pokélid Kyoto', labelEn: 'Pokelid Kyoto BG', image: '/backgrounds/pika-pokelid-kyoto.webp', pokemon: [25] },
    { name: 'pokelid-osaka', label: 'Fond Pokélid Osaka', labelEn: 'Pokelid Osaka BG', image: '/backgrounds/pika-pokelid-osaka.webp', pokemon: [25] },
    { name: 'pokelid-hokkaido', label: 'Fond Pokélid Hokkaido', labelEn: 'Pokelid Hokkaido BG', image: '/backgrounds/pika-pokelid-hokkaido.webp', pokemon: [25] },
    { name: 'pokelid-okinawa', label: 'Fond Pokélid Okinawa', labelEn: 'Pokelid Okinawa BG', image: '/backgrounds/pika-pokelid-okinawa.webp', pokemon: [25] },
    { name: 'pokelid-fukuoka', label: 'Fond Pokélid Fukuoka', labelEn: 'Pokelid Fukuoka BG', image: '/backgrounds/pika-pokelid-fukuoka.webp', pokemon: [25] },
    { name: 'pokelid-kagoshima', label: 'Fond Pokélid Kagoshima', labelEn: 'Pokelid Kagoshima BG', image: '/backgrounds/pika-pokelid-kagoshima.webp', pokemon: [25] },
    { name: 'pokelid-miyazaki', label: 'Fond Pokélid Miyazaki', labelEn: 'Pokelid Miyazaki BG', image: '/backgrounds/pika-pokelid-miyazaki.webp', pokemon: [25] },
    { name: 'pokelid-nagasaki', label: 'Fond Pokélid Nagasaki', labelEn: 'Pokelid Nagasaki BG', image: '/backgrounds/pika-pokelid-nagasaki.webp', pokemon: [25] },
    { name: 'pokelid-saga', label: 'Fond Pokélid Saga', labelEn: 'Pokelid Saga BG', image: '/backgrounds/pika-pokelid-saga.webp', pokemon: [25] },
    { name: 'pokelid-aichi', label: 'Fond Pokélid Aichi', labelEn: 'Pokelid Aichi BG', image: '/backgrounds/pika-pokelid-aichi.webp', pokemon: [25] },
    { name: 'pokelid-akita', label: 'Fond Pokélid Akita', labelEn: 'Pokelid Akita BG', image: '/backgrounds/pika-pokelid-akita.webp', pokemon: [25] },
    { name: 'pokelid-chiba', label: 'Fond Pokélid Chiba', labelEn: 'Pokelid Chiba BG', image: '/backgrounds/pika-pokelid-chiba.webp', pokemon: [25] },
    { name: 'pokelid-ehime', label: 'Fond Pokélid Ehime', labelEn: 'Pokelid Ehime BG', image: '/backgrounds/pika-pokelid-ehime.webp', pokemon: [25] },
    { name: 'pokelid-fukui', label: 'Fond Pokélid Fukui', labelEn: 'Pokelid Fukui BG', image: '/backgrounds/pika-pokelid-fukui.webp', pokemon: [25] },
    { name: 'pokelid-fukushima', label: 'Fond Pokélid Fukushima', labelEn: 'Pokelid Fukushima BG', image: '/backgrounds/pika-pokelid-fukushima.webp', pokemon: [25] },
    { name: 'pokelid-gifu', label: 'Fond Pokélid Gifu', labelEn: 'Pokelid Gifu BG', image: '/backgrounds/pika-pokelid-gifu.webp', pokemon: [25] },
    { name: 'pokelid-hyogo', label: 'Fond Pokélid Hyōgo', labelEn: 'Pokelid Hyōgo BG', image: '/backgrounds/pika-pokelid-hyogo.webp', pokemon: [25] },
    { name: 'pokelid-ibaraki', label: 'Fond Pokélid Ibaraki', labelEn: 'Pokelid Ibaraki BG', image: '/backgrounds/pika-pokelid-ibaraki.webp', pokemon: [25] },
    { name: 'pokelid-ishikawa', label: 'Fond Pokélid Ishikawa', labelEn: 'Pokelid Ishikawa BG', image: '/backgrounds/pika-pokelid-ishikawa.webp', pokemon: [25] },
    { name: 'pokelid-iwate', label: 'Fond Pokélid Iwate', labelEn: 'Pokelid Iwate BG', image: '/backgrounds/pika-pokelid-iwate.webp', pokemon: [25] },
    { name: 'pokelid-kagawa', label: 'Fond Pokélid Kagawa', labelEn: 'Pokelid Kagawa BG', image: '/backgrounds/pika-pokelid-kagawa.webp', pokemon: [25] },
    { name: 'pokelid-kanagawa', label: 'Fond Pokélid Kanagawa', labelEn: 'Pokelid Kanagawa BG', image: '/backgrounds/pika-pokelid-kanagawa.webp', pokemon: [25] },
    { name: 'pokelid-kochi', label: 'Fond Pokélid Kōchi', labelEn: 'Pokelid Kōchi BG', image: '/backgrounds/pika-pokelid-kochi.webp', pokemon: [25] },
    { name: 'pokelid-mie', label: 'Fond Pokélid Mie', labelEn: 'Pokelid Mie BG', image: '/backgrounds/pika-pokelid-mie.webp', pokemon: [25] },
    { name: 'pokelid-miyagi', label: 'Fond Pokélid Miyagi', labelEn: 'Pokelid Miyagi BG', image: '/backgrounds/pika-pokelid-miyagi.webp', pokemon: [25] },
    { name: 'pokelid-nara', label: 'Fond Pokélid Nara', labelEn: 'Pokelid Nara BG', image: '/backgrounds/pika-pokelid-nara.webp', pokemon: [25] },
    { name: 'pokelid-niigata', label: 'Fond Pokélid Niigata', labelEn: 'Pokelid Niigata BG', image: '/backgrounds/pika-pokelid-niigata.webp', pokemon: [25] },
    { name: 'pokelid-saitama', label: 'Fond Pokélid Saitama', labelEn: 'Pokelid Saitama BG', image: '/backgrounds/pika-pokelid-saitama.webp', pokemon: [25] },
    { name: 'pokelid-shiga', label: 'Fond Pokélid Shiga', labelEn: 'Pokelid Shiga BG', image: '/backgrounds/pika-pokelid-shiga.webp', pokemon: [25] },
    { name: 'pokelid-shimane', label: 'Fond Pokélid Shimane', labelEn: 'Pokelid Shimane BG', image: '/backgrounds/pika-pokelid-shimane.webp', pokemon: [25] },
    { name: 'pokelid-shizuoka', label: 'Fond Pokélid Shizuoka', labelEn: 'Pokelid Shizuoka BG', image: '/backgrounds/pika-pokelid-shizuoka.webp', pokemon: [25] },
    { name: 'pokelid-tochigi', label: 'Fond Pokélid Tochigi', labelEn: 'Pokelid Tochigi BG', image: '/backgrounds/pika-pokelid-tochigi.webp', pokemon: [25] },
    { name: 'pokelid-tokushima', label: 'Fond Pokélid Tokushima', labelEn: 'Pokelid Tokushima BG', image: '/backgrounds/pika-pokelid-tokushima.webp', pokemon: [25] },
    { name: 'pokelid-tottori', label: 'Fond Pokélid Tottori', labelEn: 'Pokelid Tottori BG', image: '/backgrounds/pika-pokelid-tottori.webp', pokemon: [25] },
    { name: 'pokelid-toyama', label: 'Fond Pokélid Toyama', labelEn: 'Pokelid Toyama BG', image: '/backgrounds/pika-pokelid-toyama.webp', pokemon: [25] },
    { name: 'pokelid-wakayama', label: 'Fond Pokélid Wakayama', labelEn: 'Pokelid Wakayama BG', image: '/backgrounds/pika-pokelid-wakayama.webp', pokemon: [25] },
    { name: 'pokelid-yamaguchi', label: 'Fond Pokélid Yamaguchi', labelEn: 'Pokelid Yamaguchi BG', image: '/backgrounds/pika-pokelid-yamaguchi.webp', pokemon: [25] },
    // ── MLB & Sports Events ──
    { name: 'mlb-marlins', label: 'Fond MLB Marlins', labelEn: 'MLB Marlins BG', image: '/backgrounds/pika-mlbmarlins.webp', pokemon: [25] },
    { name: 'mlb-mariners', label: 'Fond MLB Mariners', labelEn: 'MLB Mariners BG', image: '/backgrounds/pika-mlbmariners.webp', pokemon: [25] },
    { name: 'seattle-mariners', label: 'Fond Seattle Mariners 2025', labelEn: 'Seattle Mariners 2025 BG', image: '/backgrounds/pika-seattlemariners.webp', pokemon: [25] },
    { name: 'miami-marlins', label: 'Fond Miami Marlins 2025', labelEn: 'Miami Marlins 2025 BG', image: '/backgrounds/pika-miamimarlins.webp', pokemon: [25] },
    { name: 'tampa-bay-rays', label: 'Fond Tampa Bay Rays', labelEn: 'Tampa Bay Rays BG', image: '/backgrounds/pika-tampabayrays.webp', pokemon: [25] },
    { name: 'milwaukee-brewers', label: 'Fond Milwaukee Brewers', labelEn: 'Milwaukee Brewers BG', image: '/backgrounds/pika-milwaukeebrewers.webp', pokemon: [25] },
    { name: 'washington-nationals', label: 'Fond Washington Nationals', labelEn: 'Washington Nationals BG', image: '/backgrounds/pika-washingtonnationals.webp', pokemon: [25] },
    { name: 'arizona-dbacks', label: 'Fond Arizona Diamondbacks', labelEn: 'Arizona Diamondbacks BG', image: '/backgrounds/pika-arizonadiamondbacks.webp', pokemon: [25] },
    { name: 'chicago-whitesox', label: 'Fond Chicago White Sox', labelEn: 'Chicago White Sox BG', image: '/backgrounds/pika-chicagowhitesox.webp', pokemon: [25] },
    { name: 'baltimore-orioles', label: 'Fond Baltimore Orioles', labelEn: 'Baltimore Orioles BG', image: '/backgrounds/pika-baltimoreorioles.webp', pokemon: [25] },
    { name: 'cleveland-guardians', label: 'Fond Cleveland Guardians', labelEn: 'Cleveland Guardians BG', image: '/backgrounds/pika-clevelandguardians.webp', pokemon: [25] },
    { name: 'new-york-mets', label: 'Fond New York Mets', labelEn: 'New York Mets BG', image: '/backgrounds/pika-newyorkmets.webp', pokemon: [25] },
    { name: 'boston-redsox', label: 'Fond Boston Red Sox', labelEn: 'Boston Red Sox BG', image: '/backgrounds/pika-bostonredsox.webp', pokemon: [25] },
    { name: 'sf-giants', label: 'Fond San Francisco Giants', labelEn: 'San Francisco Giants BG', image: '/backgrounds/pika-sanfranciscogiants.webp', pokemon: [25] },
    { name: 'minnesota-twins', label: 'Fond Minnesota Twins', labelEn: 'Minnesota Twins BG', image: '/backgrounds/pika-minnesotatwins.webp', pokemon: [25] },
    { name: 'texas-rangers', label: 'Fond Texas Rangers', labelEn: 'Texas Rangers BG', image: '/backgrounds/pika-texasrangers.webp', pokemon: [25] },
    { name: 'lotte-giants', label: 'Fond Lotte Giants', labelEn: 'Lotte Giants BG', image: '/backgrounds/pika-lottegiants.webp', pokemon: [25] },
    // ── Autres événements Pikachu ──
    { name: 'suita-city', label: 'Fond Suita City', labelEn: 'Suita City BG', image: '/backgrounds/pika-suitacity.webp', pokemon: [25] },
];

export const DISABLED_SHINY_IDS = [
    479, 489, 490, 493, 494, 718, 719, 720, 721, 772, 773, 789, 790, 791, 792, 801, 802, 807, 890, 891, 892, 893, 896, 897, 898, 902, 905, 1001, 1002, 1003, 1004, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019,
    351, 978, // Morpheo, Nigirigon — shiny not available in Pokémon GO
    839, 844, 869, 879, // Monthracite, Dunaconda, Charmilly, Pachyradjah
    818 // Lézargus (Inteleon) — shiny not yet available
];

// Pokémon that CAN be Shadow in Pokémon GO (and therefore Purified + tradeable)
// Source: Serebii + Bulbapedia Shadow Pokémon list, verified March 2026
export const SHADOW_ELIGIBLE_IDS = new Set([
    // Gen 1
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    23, 24, 27, 28, 29, 30, 31, 32, 33, 34, 37, 38, 41, 42, 43, 44, 45, 48, 49,
    50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
    69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 88, 89, 90, 91,
    92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 109, 110,
    111, 112, 114, 115, 116, 117, 120, 121, 122, 123, 125, 126, 127, 129, 130, 131,
    137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
    // Gen 2
    152, 153, 154, 155, 156, 157, 158, 159, 160, 165, 166, 169, 177, 178, 179, 180, 181,
    182, 185, 186, 187, 188, 189, 190, 194, 195, 198, 199, 200, 202, 203, 204, 205,
    207, 208, 209, 210, 211, 212, 213, 215, 216, 217, 220, 221, 225, 227, 228, 229,
    230, 231, 232, 233, 234, 237, 243, 244, 245, 246, 247, 248, 249, 250,
    // Gen 3
    252, 253, 254, 255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 273, 274, 275,
    276, 277, 280, 281, 282, 287, 288, 289, 293, 294, 295, 296, 297, 299, 302, 303,
    304, 305, 306, 309, 310, 318, 319, 320, 321, 322, 323, 325, 326, 328, 329, 330,
    331, 332, 333, 334, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350,
    353, 354, 355, 356, 359, 361, 362, 363, 364, 365, 371, 372, 373, 374, 375, 376,
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    // Gen 4
    387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 400, 403, 404,
    405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 417, 418, 419, 420, 421,
    422, 423, 424, 425, 426, 427, 428, 429, 430, 431, 432, 433, 434, 435, 436, 437,
    438, 439, 440, 441, 442, 443, 444, 445, 446, 447, 448, 449, 450, 451, 452, 453,
    454, 458, 459, 460, 461, 462, 463, 464, 465, 466, 467, 468, 469, 470, 471, 472,
    473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488,
    489, 490, 491,
    // Gen 5+
    495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 509, 510, 522, 523, 524,
    525, 526, 529, 530, 532, 533, 534, 543, 544, 545, 551, 552, 553, 557, 558, 559,
    560, 564, 565, 566, 567, 568, 569, 580, 581, 588, 589, 590, 591, 595, 596, 597,
    598, 607, 608, 609, 616, 617, 624, 625, 629, 630, 633, 634, 635, 641, 642, 650,
    651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662, 663, 674, 675, 686,
    687, 696, 697, 698, 699, 731, 732, 733, 736, 737, 738, 757, 758, 915, 916, 965, 966
]);

export const DISABLED_IDS = [
    25, 26, 27, 28, 35, 36, 39, 40, 46, 47, 84, 85, 86, 87, 108, 113, 118, 119, 124, 128, 132, 133, 134, 135, 136, 137, 151, 161, 162, 163, 164, 167, 168, 170, 171, 172, 173, 174, 175, 176, 183, 184, 191, 192, 193, 196, 197, 201, 206, 218, 219, 222, 223, 224, 226, 236, 238, 239, 240, 241, 242, 265, 266, 267, 268, 269, 270, 271, 272, 278, 279, 283, 284, 285, 286, 290, 298, 300, 301, 307, 308, 311, 312, 313, 314, 315, 316, 317, 324, 327, 335, 336, 337, 338, 352, 358, 360, 366, 367, 368, 369, 370, 406, 407, 412, 417, 418, 419, 420, 421, 422, 423, 427, 428, 433, 438, 439, 440, 441, 442, 443, 446, 447, 455, 458, 463, 468, 485, 486, 487, 489, 490, 491, 492, 493, 494, 512, 513, 514, 517, 518, 523, 537, 541, 542, 546, 547, 548, 552, 553, 556, 559, 592, 593, 599, 600, 605, 606, 610, 611, 612, 619, 620, 621, 625, 626, 627, 630, 631, 632, 634, 635, 636, 637, 638, 642, 643, 644, 645, 646, 648, 649, 650, 651, 652, 653, 654, 655, 657, 658, 664, 665, 671, 672, 673, 674, 675, 677, 678, 679, 680, 681, 682, 683, 684, 685, 688, 689, 690, 691, 692, 695, 700, 702, 703, 704, 705, 706, 710, 711, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721, 722, 723, 724, 725, 726, 727, 728, 729, 730, 734, 735, 739, 740, 742, 743, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 850, 851, 852, 853, 854, 855, 856, 857, 858, 859, 860, 861, 862, 863, 864, 865, 866, 867, 870, 871, 872, 873, 874, 877, 878, 879, 880, 881, 882, 883, 885, 886, 887, 888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898, 899, 900, 901, 902, 903, 904, 906, 907, 908, 909, 910, 911, 912, 913, 914, 916, 917, 918, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 930, 931, 932, 933, 934, 935, 936, 937, 938, 939, 940, 941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958, 959, 960, 961, 962, 963, 964, 965, 966, 967, 968, 969, 970, 971, 972, 973, 974, 975, 976, 977, 979, 980, 981, 982, 983, 984, 985, 986, 987, 988, 990, 991, 992, 993, 994, 995, 996, 997, 998, 999, 1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035
];
