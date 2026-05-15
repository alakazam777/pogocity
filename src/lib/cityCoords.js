// Hardcoded city → {lat, lng} dictionary used to render community pins
// on the homepage Cesium globe AND on /globe (the alternative planet
// view). Both pages used to keep their own local copy of this table —
// every time a new city was approved in /admin/communities the pin
// silently failed to appear unless someone remembered to add it in
// BOTH files. This shared module is the single source of truth so
// adding a city in one place is enough.
//
// City keys are stored lowercase and match the keys persisted in
// data/city_communities.json (which come straight from the city
// field on community submissions). Accented and unaccented variants
// are both included where common ("orléans" and "orleans") so we
// don't drop pins on minor casing/diacritic differences.

export const CITY_COORDS = {
    // ─── France ─────────────────────────────────────────────────
    'poitiers':          { lat: 46.58, lng:   0.34 },
    'paris':             { lat: 48.86, lng:   2.35 },
    'lyon':              { lat: 45.76, lng:   4.83 },
    'marseille':         { lat: 43.30, lng:   5.37 },
    'toulouse':          { lat: 43.60, lng:   1.44 },
    'bordeaux':          { lat: 44.84, lng:  -0.58 },
    'lille':             { lat: 50.63, lng:   3.06 },
    'nantes':            { lat: 47.22, lng:  -1.55 },
    'strasbourg':        { lat: 48.57, lng:   7.75 },
    'nice':              { lat: 43.71, lng:   7.27 },
    'montpellier':       { lat: 43.61, lng:   3.88 },
    'rennes':            { lat: 48.11, lng:  -1.68 },
    'grenoble':          { lat: 45.19, lng:   5.72 },
    'rouen':             { lat: 49.44, lng:   1.10 },
    'tours':             { lat: 47.39, lng:   0.69 },
    'dijon':             { lat: 47.32, lng:   5.04 },
    'angers':            { lat: 47.47, lng:  -0.56 },
    'reims':             { lat: 49.25, lng:   4.03 },
    'le mans':           { lat: 48.00, lng:   0.20 },
    'clermont-ferrand':  { lat: 45.78, lng:   3.08 },
    'brest':             { lat: 48.39, lng:  -4.49 },
    'limoges':           { lat: 45.83, lng:   1.26 },
    'niort':             { lat: 46.32, lng:  -0.46 },
    'la rochelle':       { lat: 46.16, lng:  -1.15 },
    'angoulême':         { lat: 45.65, lng:   0.16 },
    'angouleme':         { lat: 45.65, lng:   0.16 },
    'châtellerault':     { lat: 46.82, lng:   0.55 },
    'chatellerault':     { lat: 46.82, lng:   0.55 },
    'nancy':             { lat: 48.69, lng:   6.18 },
    'metz':              { lat: 49.12, lng:   6.18 },
    'orléans':           { lat: 47.90, lng:   1.91 },
    'orleans':           { lat: 47.90, lng:   1.91 },
    'caen':              { lat: 49.18, lng:  -0.37 },
    'cannes':            { lat: 43.55, lng:   7.02 },
    'pau':               { lat: 43.30, lng:  -0.37 },
    'colmar':            { lat: 48.08, lng:   7.36 },
    'annecy':            { lat: 45.90, lng:   6.13 },

    // ─── United Kingdom ──────────────────────────────────────────
    'london':            { lat: 51.51, lng:  -0.13 },
    'cambridge':         { lat: 52.21, lng:   0.12 },
    'colchester':        { lat: 51.89, lng:   0.90 },
    'edinburgh':         { lat: 55.95, lng:  -3.19 },
    'isle of man':       { lat: 54.24, lng:  -4.55 },
    'leicester':         { lat: 52.63, lng:  -1.13 },
    'liverpool':         { lat: 53.41, lng:  -2.99 },
    'newcastle':         { lat: 54.98, lng:  -1.61 },
    'macclesfield':      { lat: 53.26, lng:  -2.13 },
    'manchester':        { lat: 53.48, lng:  -2.24 },
    'newton abbot':      { lat: 50.53, lng:  -3.61 },
    'norwich':           { lat: 52.63, lng:   1.29 },
    'plymouth':          { lat: 50.37, lng:  -4.14 },
    'portsmouth':        { lat: 50.82, lng:  -1.09 },
    'swindon':           { lat: 51.56, lng:  -1.78 },
    'york':              { lat: 53.96, lng:  -1.08 },

    // ─── Rest of Europe ──────────────────────────────────────────
    'berlin':            { lat: 52.52, lng:  13.41 },
    'madrid':            { lat: 40.42, lng:  -3.70 },
    'rome':              { lat: 41.90, lng:  12.50 },
    'bruxelles':         { lat: 50.85, lng:   4.35 },
    'amsterdam':         { lat: 52.37, lng:   4.90 },
    'lisbonne':          { lat: 38.72, lng:  -9.14 },
    'lisbon':            { lat: 38.72, lng:  -9.14 },

    // ─── North America ───────────────────────────────────────────
    'new york':          { lat: 40.71, lng: -74.01 },
    'chicago':           { lat: 41.88, lng: -87.63 },
    'san francisco':     { lat: 37.77, lng:-122.42 },
    'seattle':           { lat: 47.61, lng:-122.33 },
    'austin':            { lat: 30.27, lng: -97.74 },
    'san diego':         { lat: 32.72, lng:-117.16 },
    'sacramento':        { lat: 38.58, lng:-121.49 },
    'denver':            { lat: 39.74, lng:-104.99 },
    'portland':          { lat: 45.52, lng:-122.68 },
    'montréal':          { lat: 45.50, lng: -73.57 },
    'montreal':          { lat: 45.50, lng: -73.57 },
    'toronto':           { lat: 43.65, lng: -79.38 },
    'ottawa':            { lat: 45.42, lng: -75.70 },

    // ─── Latin America ───────────────────────────────────────────
    'mexico city':       { lat: 19.43, lng: -99.13 },
    'são paulo':         { lat:-23.55, lng: -46.63 },
    'sao paulo':         { lat:-23.55, lng: -46.63 },
    'rio de janeiro':    { lat:-22.91, lng: -43.17 },
    'buenos aires':      { lat:-34.61, lng: -58.38 },

    // ─── Eastern / Northern Europe ───────────────────────────────
    'warsaw':            { lat: 52.23, lng:  21.01 },
    'warszawa':          { lat: 52.23, lng:  21.01 },
    'poznań':            { lat: 52.41, lng:  16.93 },
    'poznan':            { lat: 52.41, lng:  16.93 },
    'stockholm':         { lat: 59.33, lng:  18.07 },
    'oslo':              { lat: 59.91, lng:  10.75 },
    'copenhagen':        { lat: 55.68, lng:  12.57 },
    'helsinki':          { lat: 60.17, lng:  24.94 },

    // ─── Asia / Pacific ──────────────────────────────────────────
    'tokyo':             { lat: 35.68, lng: 139.69 },
    'singapore':         { lat:  1.35, lng: 103.82 },
    'sydney':            { lat:-33.87, lng: 151.21 },
    'brisbane':          { lat:-27.47, lng: 153.03 },
    'seoul':             { lat: 37.57, lng: 126.98 },
    'taipei':            { lat: 25.03, lng: 121.57 },
    'hong kong':         { lat: 22.32, lng: 114.17 },
    'bangkok':           { lat: 13.76, lng: 100.50 },
    'mumbai':            { lat: 19.08, lng:  72.88 },
    'delhi':             { lat: 28.61, lng:  77.21 },
    'auckland':          { lat:-36.85, lng: 174.76 },

    // ─── Country-level pins ──────────────────────────────────────
    // Used when a community is national-scope (no single city) — we
    // park them at the capital so the pin is recognisable on the map.
    // If a city-specific Discord is added later for the same place
    // the two pins will overlap visually (acceptable trade-off).
    'germany':           { lat: 52.52, lng:  13.41 }, // Berlin
    'spain':             { lat: 40.42, lng:  -3.70 }, // Madrid
    'italy':             { lat: 41.90, lng:  12.50 }, // Rome
    'japan':             { lat: 35.68, lng: 139.69 }, // Tokyo
    'philippines':       { lat: 14.60, lng: 120.98 }, // Manila
    'france':            { lat: 46.60, lng:   2.50 }, // geographic centre (distinct from Paris pin)
    'brazil':            { lat:-15.78, lng: -47.93 }, // Brasília
    'argentina':         { lat:-34.61, lng: -58.38 }, // Buenos Aires
    'poland':            { lat: 52.23, lng:  21.01 }, // Warsaw
    'sweden':            { lat: 59.33, lng:  18.07 }, // Stockholm
    'south korea':       { lat: 37.57, lng: 126.98 }, // Seoul
    'taiwan':            { lat: 25.03, lng: 121.57 }, // Taipei
    'thailand':          { lat: 13.76, lng: 100.50 }, // Bangkok
    'india':             { lat: 28.61, lng:  77.21 }, // Delhi
    'new zealand':       { lat:-36.85, lng: 174.76 }, // Auckland
};
