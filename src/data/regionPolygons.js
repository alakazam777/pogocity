// ─── Simplified Geographic Region Outlines ───
// Each region is an array of [lat, lng] coordinate pairs forming a closed polygon
// Used for highlighting regional Pokémon zones on the 3D globe

export const REGION_POLYGONS = {
    // ─── Continents ───
    europe: [
        [71, 28], [70, 32], [60, 30], [55, 37], [50, 40], [47, 42], [42, 42],
        [41, 29], [40, 26], [38, 24], [36, 28], [35, 25], [36, 15], [38, 0],
        [36, -5], [37, -9], [43, -9], [44, -1], [48, -5], [51, 2], [54, 8],
        [56, 12], [58, 6], [62, 5], [66, 14], [70, 20], [71, 28],
    ],
    asia: [
        [42, 42], [40, 55], [45, 60], [50, 70], [55, 80], [60, 90], [65, 110],
        [70, 130], [65, 140], [60, 150], [55, 135], [50, 130], [45, 130],
        [40, 125], [35, 128], [30, 122], [25, 118], [22, 114], [18, 108],
        [10, 106], [1, 104], [5, 100], [10, 98], [16, 96], [22, 88],
        [28, 85], [28, 70], [25, 62], [25, 56], [28, 50], [30, 48],
        [33, 44], [37, 36], [40, 30], [42, 42],
    ],
    africa: [
        [37, -10], [37, 10], [33, 10], [32, 32], [30, 33], [22, 37],
        [12, 44], [5, 42], [2, 42], [-5, 40], [-12, 40], [-17, 37],
        [-24, 36], [-30, 32], [-34, 26], [-35, 18], [-30, 17],
        [-22, 14], [-17, 12], [-12, 14], [-5, 10], [0, 10], [5, 8],
        [5, 1], [0, -5], [5, -8], [7, -15], [15, -18], [20, -18],
        [25, -15], [30, -10], [35, -5], [37, -10],
    ],
    north_america: [
        [72, -170], [72, -140], [70, -100], [65, -65], [60, -60],
        [50, -55], [47, -60], [44, -66], [40, -74], [35, -75],
        [30, -80], [25, -80], [25, -90], [28, -97], [30, -105],
        [32, -117], [37, -122], [42, -124], [48, -124], [55, -132],
        [58, -136], [60, -145], [65, -165], [72, -170],
    ],
    south_america: [
        [12, -72], [10, -62], [8, -60], [5, -52], [0, -50],
        [-5, -35], [-10, -37], [-18, -40], [-23, -42], [-30, -50],
        [-35, -57], [-42, -65], [-48, -70], [-55, -68], [-56, -70],
        [-50, -75], [-42, -73], [-35, -72], [-25, -70], [-18, -70],
        [-15, -76], [-5, -80], [0, -78], [5, -77], [8, -72], [12, -72],
    ],
    australia: [
        [-12, 131], [-12, 137], [-14, 142], [-18, 146], [-24, 152],
        [-28, 153], [-33, 152], [-38, 147], [-39, 146], [-38, 141],
        [-35, 137], [-32, 132], [-34, 136], [-35, 137], [-32, 132],
        [-30, 130], [-25, 128], [-22, 123], [-18, 122], [-15, 126],
        [-12, 131],
    ],

    // ─── Countries & Sub-regions ───
    japan: [
        [45, 142], [43, 145], [42, 143], [40, 140], [38, 140],
        [35, 137], [33, 131], [31, 131], [32, 132], [33, 134],
        [35, 135], [36, 137], [37, 140], [39, 140], [41, 141],
        [43, 144], [45, 142],
    ],
    south_korea: [
        [38, 126], [38, 129], [36, 130], [34, 129], [34, 126],
        [36, 126], [38, 126],
    ],
    taiwan: [
        [25, 121], [25, 122], [23, 121.5], [22, 121], [22, 120.5],
        [23, 120], [25, 121],
    ],
    uk: [
        [58, -6], [58, -3], [57, -2], [55, -1], [53, 0], [52, 1],
        [51, 1], [50, -1], [50, -5], [52, -5], [53, -3], [54, -3],
        [55, -5], [56, -6], [58, -6],
    ],
    france_area: [
        [51, 2], [50, 4], [49, 8], [48, 8], [47, 6.5], [46, 7],
        [44, 7.5], [43, 6], [43, 3], [42.5, 3], [42.5, -1.5],
        [44, -1.5], [46, -1], [47, -2], [48, -5], [49, -1], [51, 2],
    ],
    india: [
        [35, 75], [28, 88], [27, 92], [22, 92], [22, 88], [18, 84],
        [12, 80], [8, 77], [10, 76], [15, 74], [20, 73], [23, 68],
        [24, 68], [28, 70], [33, 74], [35, 75],
    ],
    middle_east: [
        [38, 26], [37, 36], [37, 40], [33, 44], [30, 48], [27, 50],
        [23, 55], [20, 55], [15, 44], [13, 43], [12, 44], [15, 50],
        [22, 59], [25, 62], [28, 65], [34, 52], [37, 44], [40, 40],
        [40, 30], [38, 26],
    ],
    egypt: [
        [31.5, 25], [31.5, 35], [29, 35], [22, 37], [22, 25], [31.5, 25],
    ],
    greece: [
        [42, 20], [42, 26], [40, 26], [38, 24], [37, 22], [36, 22],
        [36, 28], [35, 26], [35, 23], [37, 21], [38, 20], [40, 20],
        [42, 20],
    ],
    mexico: [
        [32, -117], [32, -108], [30, -105], [28, -97], [22, -97],
        [18, -92], [15, -92], [15, -96], [16, -98], [18, -105],
        [20, -105], [23, -110], [27, -112], [30, -114], [32, -117],
    ],
    hawaii: [
        [22, -160], [22, -155], [20, -155], [19, -156], [19, -160],
        [20, -160], [22, -160],
    ],
    new_zealand: [
        [-34, 172], [-37, 176], [-39, 178], [-42, 174], [-45, 170],
        [-47, 167], [-46, 166], [-44, 168], [-41, 172], [-38, 175],
        [-36, 175], [-34, 172],
    ],
    fiji: [
        [-16, 177], [-17, 179], [-19, 179], [-19, 177], [-18, 176],
        [-16, 177],
    ],
    southeast_us: [
        [36, -90], [36, -75], [32, -79], [30, -80], [25, -80],
        [25, -82], [28, -83], [30, -88], [32, -90], [36, -90],
    ],
    // New York / Northeast US (small area)
    new_york_area: [
        [42, -76], [42, -72], [40, -72], [40, -75], [41, -75], [42, -76],
    ],

    // ─── Special Zones ───
    // Equatorial belt (between ~30°N and ~30°S) - rendered as a latitude band
    equatorial_belt: 'EQUATORIAL',

    // Northern polar (above ~52°N)
    northern_polar: 'POLAR_NORTH',

    // Southern hemisphere (below equator)
    southern_hemisphere: 'HEMISPHERE_SOUTH',

    // Eastern hemisphere (lon 0 to 180)
    eastern_hemisphere: 'HEMISPHERE_EAST',

    // Western hemisphere (lon -180 to 0)
    western_hemisphere: 'HEMISPHERE_WEST',

    // ─── Compound regions (combine multiple keys) ───
    asia_pacific: 'COMPOUND:asia,australia,japan,south_korea,taiwan',
    americas: 'COMPOUND:north_america,south_america',
    emea: 'COMPOUND:europe,middle_east,africa',
};

// ─── Regional Pokémon → Region mapping ───
export const REGIONAL_ZONE_MAP = {
    83:  ['japan', 'south_korea', 'taiwan'],              // Canarticho
    122: ['europe'],                                       // M. Mime
    115: ['australia'],                                    // Kangourex
    128: ['north_america'],                                // Tauros
    214: ['south_america'],                                // Scarhino
    222: ['equatorial_belt'],                              // Corayon
    324: ['india'],                                        // Chartor
    335: ['europe', 'asia', 'australia'],                   // Mangriff
    336: ['africa', 'north_america', 'south_america'],     // Séviper
    357: ['africa', 'middle_east'],                        // Tropius
    369: ['fiji', 'new_zealand'],                           // Relicanth
    417: ['northern_polar'],                                // Pachirisu
    439: ['europe'],                                       // Mime Jr.
    441: ['southern_hemisphere'],                           // Pijako
    455: ['southeast_us'],                                 // Vortente
    480: ['asia', 'australia', 'japan'],                    // Créhelf (Asia-Pacific)
    481: ['europe', 'middle_east', 'africa'],              // Créfollet
    482: ['north_america', 'south_america'],               // Créfadet
    511: ['asia', 'australia', 'japan'],                    // Feuillajou (Asia-Pacific)
    513: ['europe', 'middle_east', 'africa'],              // Flamajou
    515: ['north_america', 'south_america'],               // Flotajou
    556: ['southeast_us', 'mexico'],                       // Maracachi
    561: ['egypt', 'greece'],                              // Cryptéro
    626: ['new_york_area'],                                // Frison
    631: ['europe', 'asia', 'africa', 'australia'],        // Aflamanoir (Eastern hemisphere)
    632: ['north_america', 'south_america'],               // Fermite (Western hemisphere)
    707: ['france_area'],                                  // Trousselin
    701: ['mexico'],                                       // Brutalibré
    764: ['hawaii'],                                       // Guérilande
    874: ['uk'],                                           // Dolman
};
