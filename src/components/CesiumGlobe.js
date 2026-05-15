'use client';

import { useEffect, useRef, useState } from 'react';
import { COUNTRIES } from '@/data/countries';
import { MAJOR_CITIES } from '@/data/majorCities';

const CESIUM_VERSION = '1.140';
const CESIUM_CDN = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium`;

// Minimalist glowing-dot sprite — white core with soft falloff, no color tint.
const buildOrbDataUrl = () => {
    const svg = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#ffffff" stop-opacity="1"/><stop offset="18%" stop-color="#ffffff" stop-opacity="0.92"/><stop offset="40%" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="70%" stop-color="#ffffff" stop-opacity="0.10"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(%23g)"/></svg>`;
    return 'data:image/svg+xml;utf8,' + svg.replace(/#/g, '%23').replace(/"/g, "'");
};
const CITY_ORB_URL = buildOrbDataUrl();

// Pokémon-GO-style raid beacon — colored teardrop pin with a glossy white core
// and a soft outer halo. Single static SVG (Cesium can't animate inside the texture);
// we add motion via animated halo entities + scale CallbackProperty on the billboard.
const buildEventBeaconSvg = (color) => {
    const c = color || '#22d3ee';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='160' viewBox='0 0 128 160'>
        <defs>
            <radialGradient id='haloG' cx='50%' cy='40%' r='55%'>
                <stop offset='0%' stop-color='${c}' stop-opacity='0.85'/>
                <stop offset='40%' stop-color='${c}' stop-opacity='0.45'/>
                <stop offset='100%' stop-color='${c}' stop-opacity='0'/>
            </radialGradient>
            <linearGradient id='pinBody' x1='0%' y1='0%' x2='0%' y2='100%'>
                <stop offset='0%' stop-color='${c}' stop-opacity='1'/>
                <stop offset='60%' stop-color='${c}' stop-opacity='0.95'/>
                <stop offset='100%' stop-color='#000000' stop-opacity='0.6'/>
            </linearGradient>
            <radialGradient id='gloss' cx='50%' cy='38%' r='38%'>
                <stop offset='0%' stop-color='#ffffff' stop-opacity='0.95'/>
                <stop offset='60%' stop-color='#ffffff' stop-opacity='0.35'/>
                <stop offset='100%' stop-color='#ffffff' stop-opacity='0'/>
            </radialGradient>
        </defs>
        <circle cx='64' cy='60' r='62' fill='url(%23haloG)'/>
        <path d='M64 14 C 36 14, 22 36, 22 60 C 22 84, 42 102, 64 146 C 86 102, 106 84, 106 60 C 106 36, 92 14, 64 14 Z'
              fill='url(%23pinBody)' stroke='#ffffff' stroke-width='3'/>
        <ellipse cx='64' cy='52' rx='30' ry='24' fill='url(%23gloss)'/>
        <circle cx='64' cy='58' r='20' fill='#ffffff' opacity='0.95'/>
        <circle cx='64' cy='58' r='12' fill='${c}'/>
        <circle cx='64' cy='58' r='5' fill='#ffffff'/>
    </svg>`.replace(/\n\s*/g, '').replace(/'/g, '"');
    return 'data:image/svg+xml;utf8,' + svg.replace(/#/g, '%23').replace(/"/g, "'");
};

function loadCesiumScript() {
    return new Promise((resolve, reject) => {
        if (window.Cesium) {
            resolve(window.Cesium);
            return;
        }

        window.CESIUM_BASE_URL = '/cesium/';

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${CESIUM_CDN}/Widgets/widgets.css`;
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = `${CESIUM_CDN}/Cesium.js`;
        script.onload = () => resolve(window.Cesium);
        script.onerror = () => reject(new Error('Failed to load CesiumJS'));
        document.head.appendChild(script);
    });
}

export default function CesiumGlobe({ onReady, playerMarkers = [], regionalPokemon = [], cities = [], events = [], onHover, onCityClick, onPokemonClick, onEventClick }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const cesiumRef = useRef(null);
    const handlersRef = useRef({ onHover, onCityClick, onPokemonClick, onEventClick });
    const [error, setError] = useState(null);
    const [viewerReady, setViewerReady] = useState(false);

    useEffect(() => {
        handlersRef.current = { onHover, onCityClick, onPokemonClick, onEventClick };
    }, [onHover, onCityClick, onPokemonClick, onEventClick]);

    useEffect(() => {
        if (!containerRef.current) return;

        let viewer;
        let destroyed = false;
        let onVisible;

        async function init() {
            try {
                const Cesium = await loadCesiumScript();
                cesiumRef.current = Cesium;

                const token = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
                if (token) {
                    Cesium.Ion.defaultAccessToken = token;
                }

                if (destroyed) return;

                const satelliteLayer = new Cesium.ImageryLayer(
                    new Cesium.UrlTemplateImageryProvider({
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        maximumLevel: 19,
                        credit: '© Esri',
                    })
                );

                // Detect mobile/coarse-pointer devices — iOS Safari has tight GPU memory limits.
                // Lower resolution + disable preserveDrawingBuffer + reduce imagery LOD on mobile.
                const isMobile = typeof window !== 'undefined' && (
                    window.matchMedia?.('(max-width: 768px), (pointer: coarse)')?.matches
                );
                // Android-specific: WebView GPUs are usually fine with 1.5× DPI + tighter LOD.
                // We only had to throttle hard for iOS Safari (which kills tabs on memory pressure)
                // and for Capacitor on iOS later. Android Chrome / Capacitor Android can do better.
                const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
                const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
                const isAndroid = /Android/.test(ua);

                viewer = new Cesium.Viewer(containerRef.current, {
                    terrain: token
                        ? Cesium.Terrain.fromWorldTerrain()
                        : undefined,
                    baseLayer: token ? undefined : satelliteLayer,
                    animation: false,
                    timeline: false,
                    baseLayerPicker: false,
                    geocoder: false,
                    homeButton: false,
                    navigationHelpButton: false,
                    sceneModePicker: false,
                    fullscreenButton: false,
                    infoBox: false,
                    selectionIndicator: false,
                    creditContainer: document.createElement('div'),
                    skyAtmosphere: new Cesium.SkyAtmosphere(),
                    // alpha: true so non-globe areas of the canvas are transparent and
                    // the CSS starfield rendered behind shows through (much sharper than Cesium's SkyBox JPGs).
                    contextOptions: {
                        webgl: {
                            alpha: true,
                            preserveDrawingBuffer: false,
                            powerPreference: isMobile ? 'low-power' : 'high-performance',
                        },
                    },
                });
                viewer.__isMobile = isMobile;

                viewerRef.current = viewer;

                window.__cesiumViewer = viewer;
                viewer.scene.globe.enableLighting = false;
                viewer.scene.globe.showGroundAtmosphere = false;
                viewer.scene.fog.enabled = !isMobile;
                // Disable Cesium's blurry low-res SkyBox stars — we render a sharper SVG starfield in CSS instead.
                viewer.scene.skyBox.show = false;
                viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
                // No sun / moon glare — keeps the globe presentation clean and saves a few
                // GPU cycles per frame. On mobile this also fixes the visible "extra planet"
                // (the rendered Sun was peeking into the viewport at certain angles).
                viewer.scene.sun.show = false;
                viewer.scene.moon.show = false;
                // Atmosphere shader is expensive on mobile — disable entirely for smoother frames.
                if (isMobile) {
                    viewer.scene.skyAtmosphere.show = false;
                }

                // Slightly darken the atmospheric haze so stars stand out more against deep space.
                // (Bloom post-process was too aggressive — it lit up the Sahara, so removed.)
                if (!isMobile) {
                    viewer.scene.skyAtmosphere.brightnessShift = -0.3;
                }

                // Render-quality / perf knobs. iOS Safari kills the tab if pixel
                // ratio is too high (memory pressure → refresh loop), so iOS stays
                // capped tightly with aggressive LOD. Desktop / Android Chrome /
                // Capacitor Android can do better but we still cap at 1.5× DPR
                // because retina displays at 2× quadruple the pixel count for an
                // imperceptible visual gain — the bottleneck for "smoothness" is
                // raw fill-rate, not resolution.
                viewer.useBrowserRecommendedResolution = false;
                if (isMobile) {
                    // Mobile: max-out canvas DPR for sharper rendering at all zoom levels —
                    // critical for the "unzoomed" wide-globe view where low DPR made imagery
                    // look pixelated. SSE 3 also forces higher LOD tiles even at distance,
                    // so country contours stay visible at the global view.
                    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.75);
                    viewer.scene.globe.maximumScreenSpaceError = 3;
                    viewer.scene.fog.enabled = false;
                    viewer.scene.globe.showSkirts = false;
                    // Kill expensive per-frame work that doesn't visibly help
                    viewer.scene.globe.dynamicAtmosphereLighting = false;
                    viewer.scene.globe.atmosphereLightIntensity = 0;
                } else {
                    // Desktop: 1.5× DPR ceiling (was 2×). On a 4K retina display
                    // this is a ~44% drop in pixel count vs. 2× — visually
                    // indistinguishable for a globe at typical viewing distance,
                    // but the framerate gain is significant.
                    viewer.resolutionScale = Math.min(window.devicePixelRatio || 1, 1.5);
                    // 2.5 (was 2) loads ~30% fewer terrain/imagery tiles at far
                    // zooms with no visible difference for the Earth view.
                    viewer.scene.globe.maximumScreenSpaceError = 2.5;
                }

                // Render-on-demand: only redraw when the scene actually changes
                // (camera input, entity update, animated property tick). Cesium's
                // default is to render every requestAnimationFrame even when
                // nothing changed, which pegs the GPU at 60Hz forever. Enabling
                // this globally is THE biggest single win for "smoothness" because
                // the rest of the page gets back the GPU/CPU budget Cesium was
                // burning on idle frames. Camera inputs auto-mark the scene dirty
                // so rotation/zoom stays butter-smooth.
                viewer.scene.requestRenderMode = true;
                viewer.scene.maximumRenderTimeChange = Infinity;

                // FXAA antialiasing post-process: an extra full-screen pass that
                // we don't visually need (the globe is mostly large smooth
                // surfaces; jaggies are not a problem at our DPR cap). Disabling
                // it removes one render pass per frame.
                if (viewer.scene.postProcessStages?.fxaa) {
                    viewer.scene.postProcessStages.fxaa.enabled = false;
                }

                // Tile fetch concurrency. Default `maximumRequestsPerServer` is
                // 6 — bottlenecks the satellite imagery server when the camera
                // is panned fast, leading to blurry "loading" tiles staying on
                // screen for too long. 18 lines up with Chrome's per-host
                // connection ceiling. Total concurrent requests stays at the
                // default 50, so we don't blow up RAM.
                Cesium.RequestScheduler.maximumRequestsPerServer = 18;

                // Defensive WebGL context-loss handler — prevent default browser auto-reload behavior.
                viewer.canvas.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault();
                    console.warn('WebGL context lost — Cesium will attempt recovery');
                }, false);

                if (token) {
                    try {
                        const buildings = await Cesium.createOsmBuildingsAsync();
                        if (!destroyed) {
                            viewer.scene.primitives.add(buildings);
                        }
                    } catch (e) {
                        console.warn('OSM Buildings not available:', e.message);
                    }
                }

                // Hero camera — tilted to show globe in lower 60% with stars above
                viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(8, 25, 9_500_000),
                    orientation: {
                        heading: 0,
                        pitch: Cesium.Math.toRadians(-68),
                        roll: 0,
                    },
                });

                // Force synchronous renders to bypass Chrome rAF throttling
                [100, 300, 600, 1000, 2000, 3500].forEach(delay => {
                    setTimeout(() => {
                        if (!destroyed && !viewer.isDestroyed()) {
                            viewer.render();
                        }
                    }, delay);
                });

                // Hover tooltip — pick entity under cursor and notify parent
                viewer.screenSpaceEventHandler.setInputAction((movement) => {
                    if (destroyed || viewer.isDestroyed()) return;
                    const picked = viewer.scene.pick(movement.endPosition);
                    const entity = Cesium.defined(picked) ? picked.id : null;
                    const fn = handlersRef.current.onHover;
                    if (!fn) return;
                    if (entity?.cityName) {
                        fn({ kind: 'city', name: entity.cityName, x: movement.endPosition.x, y: movement.endPosition.y });
                    } else if (entity?.pokemonData) {
                        fn({ kind: 'pokemon', data: entity.pokemonData, x: movement.endPosition.x, y: movement.endPosition.y });
                    } else if (entity?.eventData) {
                        fn({ kind: 'event', data: entity.eventData, x: movement.endPosition.x, y: movement.endPosition.y });
                    } else {
                        fn(null);
                    }
                }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

                // Single click on city/pokemon/event entity — trigger callback
                viewer.screenSpaceEventHandler.setInputAction((click) => {
                    if (destroyed || viewer.isDestroyed()) return;
                    const picked = viewer.scene.pick(click.position);
                    const entity = Cesium.defined(picked) ? picked.id : null;
                    if (entity?.eventData) {
                        const h = handlersRef.current.onEventClick;
                        if (h) h({ event: entity.eventData });
                    } else if (entity?.cityName) {
                        const h = handlersRef.current.onCityClick;
                        if (h) h({ name: entity.cityName, lng: entity.cityCoords.lng, lat: entity.cityCoords.lat });
                    } else if (entity?.pokemonData) {
                        const h = handlersRef.current.onPokemonClick;
                        if (h) h({ data: entity.pokemonData, position: entity.position?.getValue(viewer.clock.currentTime) });
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

                // Also re-render when tab becomes visible (handles background-tab loading)
                onVisible = () => {
                    if (document.visibilityState === 'visible' && !destroyed && !viewer.isDestroyed()) {
                        viewer.render();
                        setTimeout(() => {
                            if (!destroyed && !viewer.isDestroyed()) viewer.render();
                        }, 200);
                    }
                };
                document.addEventListener('visibilitychange', onVisible);

                // In hero state (scrollY < 70vh):
                //   - Globe is fully interactive for ROTATION (drag with mouse/finger) so
                //     users can spin the planet without committing to scroll
                //   - Wheel/scroll inputs trigger an instant smooth-scroll to globe state
                //     (no need to manually scroll a full viewport — any scroll wheel input
                //     fires the same animation as tapping "Scroll to explore")
                //   - Zoom/tilt/translate are disabled so accidental wheel-zooms or
                //     two-finger pinches don't break the hero camera setup
                const inHeroState = () => window.scrollY < window.innerHeight * 0.7;

                const onWheel = (e) => {
                    if (inHeroState() && e.deltaY > 0) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
                    }
                };
                viewer.canvas.addEventListener('wheel', onWheel, { passive: false, capture: true });

                // Camera input gating — separate flags per axis so rotation stays available
                // while zoom/tilt/translate are blocked in hero state.
                const sync = () => {
                    if (viewer.isDestroyed()) return;
                    const inHero = inHeroState();
                    const c = viewer.scene.screenSpaceCameraController;
                    c.enableInputs = true;
                    c.enableRotate = true;
                    c.enableLook = false;
                    if (inHero) {
                        c.enableZoom = false;
                        c.enableTilt = false;
                        c.enableTranslate = false;
                    } else {
                        c.enableZoom = true;
                        c.enableTilt = true;
                        c.enableTranslate = true;
                    }
                    // touch-action: 'none' lets Cesium fully handle touches for rotation
                    viewer.canvas.style.touchAction = 'none';
                };
                sync();
                window.addEventListener('scroll', sync, { passive: true });

                // Touch handlers (capture phase, override Cesium's native touch listeners):
                // a single down-swipe on the globe in hero state triggers the full
                // "scroll to explore" smooth-scroll, identical to tapping the button.
                let touchStartY = null;
                let touchTriggered = false;
                const onTouchStart = (e) => {
                    if (inHeroState() && e.touches.length === 1) {
                        touchStartY = e.touches[0].clientY;
                        touchTriggered = false;
                    } else {
                        touchStartY = null;
                    }
                };
                const onTouchMove = (e) => {
                    if (touchStartY == null || touchTriggered || !inHeroState() || e.touches.length !== 1) return;
                    const dy = touchStartY - e.touches[0].clientY;
                    // 25px threshold = real intent to scroll, ignore micro-movements
                    if (dy > 25) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        touchTriggered = true;
                        window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
                    }
                };
                const onTouchEnd = () => { touchStartY = null; touchTriggered = false; };
                viewer.canvas.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
                viewer.canvas.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
                viewer.canvas.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
                viewer.canvas.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });

                if (!destroyed) {
                    setViewerReady(true);
                    if (onReady) onReady(viewer, Cesium);
                }
            } catch (e) {
                console.error('Cesium init error:', e);
                if (!destroyed) setError(e.message);
            }
        }

        init();

        return () => {
            destroyed = true;
            if (onVisible) document.removeEventListener('visibilitychange', onVisible);
            if (viewer && !viewer.isDestroyed()) {
                viewer.destroy();
            }
            viewerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;
        // Players are no longer rendered as individual dots — community info is shown in the city panel only.
        const existing = viewer.entities.values.filter(e => e.id?.startsWith('player-'));
        existing.forEach(e => viewer.entities.remove(e));
    }, [playerMarkers, viewerReady]);

    // Country labels — crisp vector text, visible at far altitudes
    useEffect(() => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium || !viewerReady) return;

        const existing = viewer.entities.values.filter(e => e.id?.startsWith('country-'));
        existing.forEach(e => viewer.entities.remove(e));

        // Tier-based visibility windows: prevents label overlap at far zoom
        const TIER_RANGE = {
            1: [1_500_000, 22_000_000], // always
            2: [1_200_000, 12_000_000],
            3: [800_000, 5_500_000],
        };

        // Country labels removed — keeping the globe clean per user request.
        // (COUNTRIES list still imported in case we want to bring them back tier-gated later.)

        // Major-city labels — skip entirely on mobile (too many entities for iOS GPU).
        // Skip any city already in the cities prop (CITY_COORDS) to avoid duplicates.
        if (viewer.__isMobile) return;
        const cityNames = new Set(cities.map(c => c.name.toLowerCase().trim()));
        MAJOR_CITIES.forEach((c, i) => {
            if (cityNames.has(c.name.toLowerCase().trim())) return;
            viewer.entities.add({
                id: `major-city-${i}`,
                position: Cesium.Cartesian3.fromDegrees(c.lng, c.lat, 30_000),
                billboard: {
                    image: CITY_ORB_URL,
                    width: 10,
                    height: 10,
                    scaleByDistance: new Cesium.NearFarScalar(1e5, 1.0, 5e6, 0.5),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(50_000, 5_000_000),
                },
                label: {
                    text: c.name,
                    font: '400 11px "Outfit", system-ui, sans-serif',
                    fillColor: Cesium.Color.fromCssColorString('#fce96a').withAlpha(0.92),
                    outlineColor: Cesium.Color.BLACK.withAlpha(0.45),
                    outlineWidth: 1,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -12),
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(50_000, 4_500_000),
                    translucencyByDistance: new Cesium.NearFarScalar(3_000_000, 1.0, 4_500_000, 0),
                },
            });
        });
    }, [viewerReady]);

    useEffect(() => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium || !cities.length) return;

        const existing = viewer.entities.values.filter(e => e.id?.startsWith('city-'));
        existing.forEach(e => viewer.entities.remove(e));

        const titleCase = (s) => s.replace(/\b\w/g, c => c.toUpperCase());
        cities.forEach((c, i) => {
            const entity = viewer.entities.add({
                id: `city-${i}`,
                position: Cesium.Cartesian3.fromDegrees(c.lng, c.lat, 0),
                billboard: {
                    image: CITY_ORB_URL,
                    // Bigger on mobile so dots stay crisp at lower resolutionScale
                    width: viewer.__isMobile ? 20 : 14,
                    height: viewer.__isMobile ? 20 : 14,
                    scaleByDistance: new Cesium.NearFarScalar(1e5, 1.2, 3e7, 0.55),
                    disableDepthTestDistance: 0,
                    // Hide only at extreme zoom-out (way past the normal globe view).
                    // Visible at default 15M altitude; fade 28→38M so they only vanish
                    // when the globe is a small marble in space.
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 38_000_000),
                    translucencyByDistance: new Cesium.NearFarScalar(28_000_000, 1.0, 38_000_000, 0),
                },
                label: {
                    // Uppercase + bold + Outfit font, pure white, no outline, no background
                    text: c.name.toUpperCase(),
                    font: '700 14px "Outfit", system-ui, sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    style: Cesium.LabelStyle.FILL,
                    pixelOffset: new Cesium.Cartesian2(0, -18),
                    // Show only at very close zoom so neighboring cities (Poitiers/Châtellerault/etc.) don't overlap
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 900_000),
                    translucencyByDistance: new Cesium.NearFarScalar(700_000, 1.0, 900_000, 0),
                },
            });
            entity.cityName = c.name;
            entity.cityCoords = { lng: c.lng, lat: c.lat };
        });
    }, [cities, viewerReady]);

    useEffect(() => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium) return;

        // Always clear existing regional/vivillon entities (so toggling OFF clears the globe)
        const existing = viewer.entities.values.filter(e => e.id?.startsWith('regional-'));
        existing.forEach(e => viewer.entities.remove(e));

        if (!regionalPokemon.length) return;
        // Mobile renders smaller sprites to save GPU + memory budget.
        const sprSize = viewer.__isMobile ? 40 : 56;
        regionalPokemon.forEach((poke, i) => {
            poke.points?.forEach((pt, j) => {
                const entity = viewer.entities.add({
                    id: `regional-${i}-${j}`,
                    position: Cesium.Cartesian3.fromDegrees(pt.lng, pt.lat, 500),
                    billboard: {
                        image: poke.spriteUrl,
                        width: sprSize,
                        height: sprSize,
                        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                        scaleByDistance: new Cesium.NearFarScalar(1e3, 1.5, 1e7, 0.5),
                        // Hide only at extreme zoom-out (way past the normal globe view).
                        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 45_000_000),
                        translucencyByDistance: new Cesium.NearFarScalar(30_000_000, 1.0, 45_000_000, 0),
                    },
                });
                // Pass the FULL poke object (kind, slug, countries, highlights, etc.) so the click
                // handler can distinguish vivillon vs regional and fetch friend codes accordingly.
                entity.pokemonData = { ...poke, lng: pt.lng, lat: pt.lat };
            });
        });
    }, [regionalPokemon, viewerReady]);

    // Events — render a Pokémon-GO-style raid beacon (pin + pulsing halo)
    useEffect(() => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium) return;

        // Always clear existing event entities first
        const existing = viewer.entities.values.filter(e => e.id?.startsWith('event-'));
        existing.forEach(e => viewer.entities.remove(e));

        if (!events.length) return;

        const visible = events.filter(ev => ev && ev.showFlashingDot !== false && Number.isFinite(ev.lat) && Number.isFinite(ev.lng));
        if (!visible.length) return;

        const startTime = Date.now();

        visible.forEach((ev, i) => {
            const color = Cesium.Color.fromCssColorString(ev.color || '#22d3ee');
            const beaconUrl = buildEventBeaconSvg(ev.color || '#22d3ee');

            // Pulsing ring — drawn on the ground using EllipseGraphics.
            // Animated alpha + radii via CallbackProperty for a sonar/raid-beacon vibe.
            //
            // Visibility: only show when camera is reasonably far away (≥ 300 km altitude).
            // When the user clicks an event, the camera flies down to ~6.5 km — at that close
            // range the 25-95 km ring fills the entire screen and looks like a flashing color
            // wash. The icon itself becomes the visible marker at close zoom.
            const ringEntity = viewer.entities.add({
                id: `event-ring-${ev.id || i}`,
                position: Cesium.Cartesian3.fromDegrees(ev.lng, ev.lat, 0),
                ellipse: {
                    semiMajorAxis: new Cesium.CallbackProperty(() => {
                        const t = (Date.now() - startTime) / 1000;
                        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
                        return 25_000 + pulse * 70_000;
                    }, false),
                    semiMinorAxis: new Cesium.CallbackProperty(() => {
                        const t = (Date.now() - startTime) / 1000;
                        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
                        return 25_000 + pulse * 70_000;
                    }, false),
                    material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(() => {
                        const t = (Date.now() - startTime) / 1000;
                        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
                        return color.withAlpha(0.45 * (1 - pulse));
                    }, false)),
                    height: 0,
                    outline: false,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(300_000, 38_000_000),
                },
            });
            ringEntity.eventData = ev;

            // Primary marker — the event hero image as the main billboard,
            // bottom-anchored so it stands ON the city. The title label sits
            // directly under it (TOP-anchored, no gap), like a logo + caption pair.
            //
            // When zoomed out: image is the visual marker (recognizable from far).
            // When zoomed in: image + title are tightly stacked.
            //
            // If no heroImage, fall back to the colored pin beacon.
            // GO Fest icon is 645×715 (slightly taller than wide).
            // Preserve natural aspect ratio so the artwork doesn't look squished.
            // Smaller on mobile so it doesn't dominate the smaller viewport.
            const ICON_W = viewer.__isMobile ? 50 : 70;
            const ICON_H = Math.round(ICON_W * (715 / 645));
            const useHeroImage = !!ev.heroImage;
            const primary = viewer.entities.add({
                id: `event-${ev.id || i}`,
                position: Cesium.Cartesian3.fromDegrees(ev.lng, ev.lat, 0),
                billboard: {
                    image: useHeroImage ? ev.heroImage : beaconUrl,
                    width: useHeroImage ? ICON_W : 56,
                    height: useHeroImage ? ICON_H : 70,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    scale: new Cesium.CallbackProperty(() => {
                        const t = (Date.now() - startTime) / 1000;
                        return 1.0 + 0.04 * Math.sin(t * 1.8);
                    }, false),
                    scaleByDistance: new Cesium.NearFarScalar(1e5, 1.4, 3e7, 0.55),
                    // No disableDepthTestDistance → icon respects globe geometry
                    // and hides when behind the back side of the planet.
                    // Hide only at extreme zoom-out (way past the normal globe view).
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 45_000_000),
                    translucencyByDistance: new Cesium.NearFarScalar(30_000_000, 1.0, 45_000_000, 0),
                },
                label: {
                    text: ev.title || 'Event',
                    font: '700 13px "Outfit", system-ui, sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    // Pure white fill, no outline, no background
                    style: Cesium.LabelStyle.FILL,
                    pixelOffset: new Cesium.Cartesian2(0, 6),
                    verticalOrigin: Cesium.VerticalOrigin.TOP,
                    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 8_000_000),
                    translucencyByDistance: new Cesium.NearFarScalar(5_000_000, 1.0, 8_000_000, 0),
                    // Same: hide label when behind the globe
                },
            });
            primary.eventData = ev;
        });

        // Drive the animation — request renders so CallbackProperty values are sampled.
        // 60ms ≈ 16 fps — enough for a smooth pulse and gentle on the GPU.
        const tick = setInterval(() => {
            if (viewer.isDestroyed()) return;
            viewer.scene.requestRender();
        }, 60);
        return () => clearInterval(tick);
    }, [events, viewerReady]);

    if (error) {
        return (
            <div className="fixed inset-0 bg-[#050510] flex items-center justify-center text-white/60 text-center p-8">
                <div>
                    <p className="text-lg mb-2">Globe non disponible</p>
                    <p className="text-sm text-white/40">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 0 }}
        />
    );
}
