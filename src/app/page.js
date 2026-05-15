'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, ExternalLink, ArrowRightLeft, MessageCircle, QrCode } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { REGIONAL_POKEMON } from '@/data/regionalPokemon';
import { PRISMILLON_FORMS, getFormSprite } from '@/data/prismillonForms';
import SuggestCommunityModal from '@/components/SuggestCommunityModal';
import CommunityIcon from '@/components/CommunityIcon';

import { CITY_COORDS } from '@/lib/cityCoords';
import cityConfig from '@/lib/cityConfig';

function GlobeLoader() {
    return (
        <div className="fixed inset-0 bg-[#050510] flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white/40 text-sm" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    Chargement du globe...
                </p>
            </div>
        </div>
    );
}

const CesiumGlobe = dynamic(() => import('@/components/CesiumGlobe'), {
    ssr: false,
    loading: () => <GlobeLoader />,
});

export default function Homepage() {
    const { t } = useLanguage();
    const [introPhase, setIntroPhase] = useState(0);
    const [playerMarkers, setPlayerMarkers] = useState([]);
    const [regionalsForGlobe, setRegionalsForGlobe] = useState([]);
    const [cityInfo, setCityInfo] = useState(null);
    const viewerRef = useRef(null);
    const cesiumRef = useRef(null);
    const playerMarkersRef = useRef([]);
    const cityInfoRef = useRef(null);
    const approvedCitiesRef = useRef([]);

    useEffect(() => {
        playerMarkersRef.current = playerMarkers;
    }, [playerMarkers]);
    useEffect(() => { cityInfoRef.current = cityInfo; }, [cityInfo]);

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10);
        const lastSeen = localStorage.getItem('pogosphere_welcome_date');
        if (lastSeen === today) {
            setIntroPhase(2);
            return;
        }
        localStorage.setItem('pogosphere_welcome_date', today);
        const t1 = setTimeout(() => setIntroPhase(1), 1050);
        const t2 = setTimeout(() => setIntroPhase(2), 2450);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    useEffect(() => {
        fetch('/api/pokemon/leaderboard')
            .then(res => res.json())
            .then(data => {
                const users = Array.isArray(data) ? data : [];
                const markers = users
                    .filter(u => u.city)
                    .map(u => {
                        const coords = CITY_COORDS[u.city.toLowerCase().trim()];
                        if (!coords) return null;
                        const teamColors = { 'Mystic': '#4a90d9', 'Valor': '#e74c3c', 'Instinct': '#f1c40f', 'Sagesse': '#4a90d9', 'Bravoure': '#e74c3c', 'Intuition': '#f1c40f' };
                        return {
                            username: u.username,
                            city: u.city.toLowerCase().trim(),
                            team: u.team,
                            lat: coords.lat + (Math.random() - 0.5) * 0.8,
                            lng: coords.lng + (Math.random() - 0.5) * 0.8,
                            color: teamColors[u.team] || '#a78bfa',
                        };
                    })
                    .filter(Boolean);
                setPlayerMarkers(markers);
            })
            .catch(() => {});
    }, []);

    // Regional Pokémon + Vivillon (prismillon) sprites are always visible — no toggle.
    // Each entry carries `color` for modal accent + `id` for sprite + region/countries metadata.
    //
    // Anti-overlap: when a Vivillon shares exact coords with a Regional (e.g. Mime Jr.
    // and Continent both at 52°N 10°E), the icons render on top of each other. We shift
    // any conflicting Vivillon point by a few degrees so both remain clickable and visible.
    useEffect(() => {
        const regionals = REGIONAL_POKEMON.map(p => ({
            kind: 'regional',
            id: p.id,
            name: p.name,
            region: p.region,
            color: p.color,
            points: p.points,
            spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${p.id}.png`,
        }));
        // Build a Set of taken "near-coord" cells (rounded to nearest degree) from regionals
        const takenCells = new Set();
        const cellKey = (lat, lng) => `${Math.round(lat)},${Math.round(lng)}`;
        regionals.forEach(r => r.points?.forEach(pt => takenCells.add(cellKey(pt.lat, pt.lng))));

        const vivillon = PRISMILLON_FORMS.map(f => {
            // For each Vivillon point, if a regional already occupies that cell, push it
            // ~3° south + 3° east. The shift is small enough to stay within the same
            // country/region but large enough to be visually distinct on the globe.
            const adjustedPoints = (f.points || []).map(pt => {
                if (takenCells.has(cellKey(pt.lat, pt.lng))) {
                    return { lat: pt.lat - 3, lng: pt.lng + 3 };
                }
                return pt;
            });
            adjustedPoints.forEach(pt => takenCells.add(cellKey(pt.lat, pt.lng)));
            return {
                kind: 'vivillon',
                id: `vivillon-${f.slug}`,
                name: f.name,
                slug: f.slug,
                spriteCode: f.spriteCode,
                color: f.color,
                region: f.zone,
                countries: f.countries,
                highlights: f.highlights,
                points: adjustedPoints,
                spriteUrl: getFormSprite(f.spriteCode),
            };
        });
        setRegionalsForGlobe([...regionals, ...vivillon]);
    }, []);

    // Only show orbs for cities that have approved community links — fetched once on mount.
    const [approvedCityNames, setApprovedCityNames] = useState([]);
    useEffect(() => {
        fetch('/api/community')
            .then(r => r.json())
            .then(data => {
                if (data && typeof data === 'object') {
                    setApprovedCityNames(Object.keys(data));
                }
            })
            .catch(() => {});
    }, []);

    const citiesForGlobe = useMemo(() => {
        return approvedCityNames
            .map(name => CITY_COORDS[name] ? { name, ...CITY_COORDS[name] } : null)
            .filter(Boolean);
    }, [approvedCityNames]);

    useEffect(() => { approvedCitiesRef.current = citiesForGlobe; }, [citiesForGlobe]);

    const [hoverInfo, setHoverInfo] = useState(null);
    const [pokemonInfo, setPokemonInfo] = useState(null);
    const [communityLinks, setCommunityLinks] = useState([]);
    const [suggestModalCity, setSuggestModalCity] = useState(null);
    const [showAddCommunity, setShowAddCommunity] = useState(false);

    // Events — fetched once on mount
    const [eventsMap, setEventsMap] = useState({});
    const [activeEventId, setActiveEventId] = useState(null);
    const [eventBusy, setEventBusy] = useState(false);
    useEffect(() => {
        fetch('/api/events').then(r => r.json()).then(d => setEventsMap(d || {})).catch(() => {});
    }, []);
    const eventsList = useMemo(() => Object.values(eventsMap), [eventsMap]);
    const activeEvent = activeEventId ? eventsMap[activeEventId] : null;

    // Current logged-in username (used for participating in events)
    const [currentUsername, setCurrentUsername] = useState(null);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('pokemon_user');
            if (raw) setCurrentUsername(JSON.parse(raw)?.username || null);
        } catch {}
    }, []);
    const isParticipating = activeEvent && currentUsername
        ? (activeEvent.participants || []).includes(currentUsername)
        : false;

    const toggleParticipate = async () => {
        if (!activeEvent || !currentUsername) return;
        setEventBusy(true);
        try {
            const res = await fetch(`/api/events/${activeEvent.id}/participate`, {
                method: isParticipating ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUsername }),
            });
            if (res.ok) {
                // Re-fetch events to refresh the participant list
                const fresh = await fetch('/api/events').then(r => r.json());
                setEventsMap(fresh || {});
            }
        } finally {
            setEventBusy(false);
        }
    };

    // CSS starfield — generates a dense, crisp SVG of randomly-placed stars. Sharper than
    // Cesium's default Tycho cube map (which is JPG-compressed and blurry at high zoom).
    // Computed once on mount so positions don't reshuffle on re-render.
    const starsBg = useMemo(() => {
        const stars = [];
        for (let i = 0; i < 480; i++) {
            const x = (Math.random() * 100).toFixed(2);
            const y = (Math.random() * 100).toFixed(2);
            const r = (Math.random() * 1.0 + 0.25).toFixed(2);
            const o = (Math.random() * 0.7 + 0.25).toFixed(2);
            stars.push(`<circle cx="${x}%" cy="${y}%" r="${r}" fill="white" opacity="${o}"/>`);
        }
        // A handful of slightly bigger "bright" stars for depth
        for (let i = 0; i < 25; i++) {
            const x = (Math.random() * 100).toFixed(2);
            const y = (Math.random() * 100).toFixed(2);
            const r = (Math.random() * 0.8 + 1.4).toFixed(2);
            stars.push(`<circle cx="${x}%" cy="${y}%" r="${r}" fill="white" opacity="0.95"/>`);
        }
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" width="2000" height="2000">${stars.join('')}</svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }, []);
    const [scrollProgress, setScrollProgress] = useState(0);

    // Lightweight fallback detection.
    //
    // Historically we showed the simple homepage to ALL phones because Cesium
    // crashes on iOS Safari due to per-tab memory limits (~300-500 MB). But
    // showing the lightweight version in the browser hides the actual product
    // (the 3D globe) and feels cheap to mobile-web visitors.
    //
    // New rule: lightweight fallback ONLY inside the Capacitor iOS/Android
    // wrapper (`window.Capacitor.isNativePlatform()`), where we control the
    // memory budget and the fallback view is part of the native UX. Every
    // browser — desktop AND mobile Safari/Chrome on iPhone/iPad — gets the
    // full Cesium globe. iOS Safari can still OOM-crash, but that's the
    // user's explicit choice now.
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const check = () => {
            if (typeof window === 'undefined') return;
            const ua = navigator.userAgent || '';
            const cap = window.Capacitor;
            const isCapacitorNative = !!(
                cap?.isNativePlatform?.() ||
                cap?.isNative ||
                /Capacitor/i.test(ua)
            );
            setIsMobile(isCapacitorNative);
        };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Body-scroll lock for the Capacitor app homepage. The mobile landing
    // is a fixed-viewport screen — but Footer / ChatBubble / etc. live
    // OUTSIDE this page in the root layout, so without locking the body
    // the user could still drag the page upward (revealing the footer +
    // a rubber-band bounce). Locking `overflow: hidden` on html + body
    // pins the entire document. Restored on unmount so navigating to
    // /pokematos / /trades / etc. scrolls normally again.
    useEffect(() => {
        if (!isMobile) return;
        const prevHtmlOverflow = document.documentElement.style.overflow;
        const prevBodyOverflow = document.body.style.overflow;
        const prevBodyOverscroll = document.body.style.overscrollBehavior;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        return () => {
            document.documentElement.style.overflow = prevHtmlOverflow;
            document.body.style.overflow = prevBodyOverflow;
            document.body.style.overscrollBehavior = prevBodyOverscroll;
        };
    }, [isMobile]);

    // Per-link Discord member counts: { [url]: { members, online, guildName } }
    const [memberCounts, setMemberCounts] = useState({});

    useEffect(() => {
        if (!cityInfo?.name) {
            setCommunityLinks([]);
            setMemberCounts({});
            return;
        }
        let cancelled = false;
        fetch(`/api/community?city=${encodeURIComponent(cityInfo.name)}`)
            .then(r => r.json())
            .then(async (links) => {
                const list = Array.isArray(links) ? links : [];
                if (cancelled) return;
                setCommunityLinks(list);

                // Fetch Discord member counts for all Discord links in one batch.
                const discordLinks = list.filter(l => l.type === 'discord' && l.url);
                if (!discordLinks.length) { setMemberCounts({}); return; }
                try {
                    const r = await fetch('/api/community/member-counts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ links: discordLinks }),
                    });
                    if (!r.ok || cancelled) return;
                    const data = await r.json();
                    const map = {};
                    (data.results || []).forEach(res => { if (res?.url) map[res.url] = res; });
                    if (!cancelled) setMemberCounts(map);
                } catch {}
            })
            .catch(() => { if (!cancelled) setCommunityLinks([]); });
        return () => { cancelled = true; };
    }, [cityInfo?.name]);

    useEffect(() => {
        const onScroll = () => {
            const h = window.innerHeight;
            setScrollProgress(Math.min(1, window.scrollY / h));
            const v = viewerRef.current;
            if (v && !v.isDestroyed()) v.scene.requestRender();
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Toggle Cesium scroll-zoom based on hero state — disable scroll-zoom while hero is visible.
    // Aligned at 0.7 with the wheel-bubble handler in CesiumGlobe so there's no dead zone.
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;
        viewer.scene.screenSpaceCameraController.enableZoom = scrollProgress > 0.7;
    }, [scrollProgress]);

    // One-shot transition: when scrolling past 0.7 the FIRST time, fly to top-down globe view.
    // Never auto-flies back to hero — that fought against scroll-zoom. Use "← Accueil" button to return.
    const inGlobeStateRef = useRef(false);
    useEffect(() => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium) return;
        if (viewer.__flyingToCity) return;
        if (scrollProgress > 0.7 && !inGlobeStateRef.current) {
            inGlobeStateRef.current = true;
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(2.35, 46.5, 15_000_000),
                orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
                duration: 1.4,
                easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            });
        }
    }, [scrollProgress]);

    const heroOpacity = Math.max(0, 1 - scrollProgress * 1.4);
    // Hide hero whenever a right-side panel or modal is open (city/event/pokemon)
    // so the overlay's z-index doesn't fight the popup content. Without this,
    // clicking a regional Pokémon on the homepage shows the hero buttons over the modal.
    const anyOverlayOpen = !!(pokemonInfo || cityInfo || activeEventId);
    const heroVisible = heroOpacity > 0.05 && !anyOverlayOpen;

    const handleGlobeReady = useCallback((viewer, Cesium) => {
        viewerRef.current = viewer;
        cesiumRef.current = Cesium;

        // Slow auto-rotation — only when not zoomed in on a city, not during a flyTo.
        // Skipped on mobile — would force a render every tick, draining battery and risking
        // iOS Safari memory-kill / refresh loops.
        if (!viewer.__isMobile) {
            viewer.clock.onTick.addEventListener(() => {
                if (viewer.isDestroyed()) return;
                if (viewer.__flyingToCity) return;
                const altitude = viewer.camera.positionCartographic?.height ?? 0;
                if (altitude > 5_000_000) {
                    viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -0.00012);
                }
            });
        }

        // Auto-recenter: when user zooms out far from a city click, snap back to centered globe view.
        // Auto-show city panel: when user manually zooms close to an approved-community city,
        // pop the city panel as if they had clicked the orb.
        viewer.camera.moveEnd.addEventListener(() => {
            if (viewer.isDestroyed() || viewer.__flyingToCity || viewer.__autoRecentering) return;
            const cp = viewer.camera.positionCartographic;
            if (!cp) return;
            const altitude = cp.height;

            // Auto-close right-side panels when zooming out from city/event view.
            // 600 km — just past the 500 km auto-show threshold for tight response.
            if (viewer.__zoomedToCity && altitude > 600_000) {
                setCityInfo(null);
                setActiveEventId(null);
                setHoverInfo(null);
            }

            // Auto-recenter logic (existing)
            if (viewer.__zoomedToCity && altitude > 4_000_000) {
                viewer.__zoomedToCity = false;
                viewer.__autoRecentering = true;
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(2.35, 46.5, 15_000_000),
                    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
                    duration: 1.5,
                    easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
                    complete: () => { viewer.__autoRecentering = false; },
                });
                return;
            }

            // Auto-show city panel on close zoom (no click required).
            // 500 km — panel appears early so less scrolling is needed.
            if (altitude < 500_000 && !cityInfoRef.current) {
                const camLat = Cesium.Math.toDegrees(cp.latitude);
                const camLng = Cesium.Math.toDegrees(cp.longitude);
                // Find the closest approved-community city within ~300 km (~3°)
                let nearest = null;
                let minDist = Infinity;
                for (const c of approvedCitiesRef.current) {
                    const dLng = (c.lng - camLng) * Math.cos(((c.lat + camLat) * Math.PI) / 360);
                    const dLat = c.lat - camLat;
                    const dist = Math.sqrt(dLng * dLng + dLat * dLat);
                    if (dist < minDist) { minDist = dist; nearest = c; }
                }
                if (nearest && minDist < 3.0) {
                    const players = playerMarkersRef.current.filter(p => p.city === nearest.name);
                    const teams = players.reduce((acc, p) => {
                        const k = p.team || 'Sans équipe';
                        acc[k] = (acc[k] || 0) + 1;
                        return acc;
                    }, {});
                    setCityInfo({ name: nearest.name, players, teams, coords: { lat: nearest.lat, lng: nearest.lng } });
                    viewer.__zoomedToCity = true;
                }
            }
        });

        // camera.changed fires DURING movement (unlike moveEnd which fires after).
        // Both auto-show and auto-close run here for instant response while scrolling.
        viewer.camera.percentageChanged = 0.01;
        viewer.camera.changed.addEventListener(() => {
            if (viewer.isDestroyed() || viewer.__flyingToCity || viewer.__autoRecentering) return;
            const cp = viewer.camera.positionCartographic;
            if (!cp) return;
            const alt = cp.height;

            // Auto-close — fires during zoom-out so the panel vanishes immediately
            if (viewer.__zoomedToCity && alt > 600_000) {
                setCityInfo(null);
                setActiveEventId(null);
                setHoverInfo(null);
                return;
            }

            // Auto-show — fires during zoom-in so the panel appears without waiting
            if (alt < 500_000 && !cityInfoRef.current) {
                const camLat = Cesium.Math.toDegrees(cp.latitude);
                const camLng = Cesium.Math.toDegrees(cp.longitude);
                let nearest = null;
                let minDist = Infinity;
                for (const c of approvedCitiesRef.current) {
                    const dLng = (c.lng - camLng) * Math.cos(((c.lat + camLat) * Math.PI) / 360);
                    const dLat = c.lat - camLat;
                    const dist = Math.sqrt(dLng * dLng + dLat * dLat);
                    if (dist < minDist) { minDist = dist; nearest = c; }
                }
                if (nearest && minDist < 3.0) {
                    const players = playerMarkersRef.current.filter(p => p.city === nearest.name);
                    const teams = players.reduce((acc, p) => {
                        const k = p.team || 'Sans équipe';
                        acc[k] = (acc[k] || 0) + 1;
                        return acc;
                    }, {});
                    setCityInfo({ name: nearest.name, players, teams, coords: { lat: nearest.lat, lng: nearest.lng } });
                    viewer.__zoomedToCity = true;
                }
            }
        });
    }, []);

    const flyToCity = useCallback((cityName, lng, lat) => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium) return;

        setCityInfo(null);
        setPokemonInfo(null);
        setHoverInfo(null);
        // Hide hero so the city view is unobstructed
        if (window.scrollY < window.innerHeight * 0.7) {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
        }
        viewer.__flyingToCity = true;

        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(lng, lat - 0.04, 6500),
            orientation: {
                heading: Cesium.Math.toRadians(0),
                pitch: Cesium.Math.toRadians(-55),
                roll: 0,
            },
            duration: 2.0,
            easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            complete: () => {
                viewer.__flyingToCity = false;
                viewer.__zoomedToCity = true;
                if (cityName) {
                    const players = playerMarkersRef.current.filter(p => p.city === cityName);
                    const teams = players.reduce((acc, p) => {
                        const t = p.team || 'Sans équipe';
                        acc[t] = (acc[t] || 0) + 1;
                        return acc;
                    }, {});
                    setCityInfo({ name: cityName, players, teams, coords: { lat, lng } });
                }
            },
        });
    }, []);

    // Close-and-zoom-out helper: fly the camera back to the globe-state view
    // (high altitude, top-down) so it looks like we "un-zoomed" the globe.
    // Used by all popup-close handlers (Pokémon modal, city panel, event panel)
    // for consistent UX — closing any of them returns to the wide globe view.
    const flyToGlobeView = useCallback(() => {
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (!viewer || viewer.isDestroyed() || !Cesium) return;
        viewer.__zoomedToCity = false;
        viewer.__autoRecentering = false;
        viewer.__flyingToCity = true;
        viewer.camera.cancelFlight();
        viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(2.35, 46.5, 15_000_000),
            orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 },
            duration: 1.4,
            easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
            complete: () => { viewer.__flyingToCity = false; },
            cancel: () => { viewer.__flyingToCity = false; },
        });
    }, []);

    const closePokemonModal = useCallback(() => {
        setPokemonInfo(null);
        setQrCode(null);
        setHoverInfo(null);
        flyToGlobeView();
    }, [flyToGlobeView]);

    const closeCityInfo = useCallback(() => {
        setCityInfo(null);
        setHoverInfo(null);
        flyToGlobeView();
    }, [flyToGlobeView]);

    const closeEventPanel = useCallback(() => {
        setActiveEventId(null);
        setHoverInfo(null);
        flyToGlobeView();
    }, [flyToGlobeView]);

    const handleCityClick = useCallback(({ name, lng, lat }) => {
        flyToCity(name, lng, lat);
    }, [flyToCity]);

    const [pokemonFriendCodes, setPokemonFriendCodes] = useState(null);
    const [pokemonCodesLoading, setPokemonCodesLoading] = useState(false);

    // Traders ("Disponible à l'échange" panel) — fetched once on mount, then filtered per
    // selected Pokémon. Mirrors PogoPoitiers /regionals behavior — same shared leaderboard
    // API (POGO_DATA_DIR points to the same data store as PogoPoitiers).
    const [allTraders, setAllTraders] = useState([]);
    const [tradersForPokemon, setTradersForPokemon] = useState([]);
    const [loadingTraders, setLoadingTraders] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);
    const [qrCode, setQrCode] = useState(null);

    useEffect(() => {
        fetch('/api/pokemon/leaderboard')
            .then(r => r.json())
            .then(data => {
                const users = Array.isArray(data) ? data : (data.users || []);
                setAllTraders(users.filter(u => u.tradeList?.forTrade?.length > 0));
            })
            .catch(() => {});
    }, []);

    // Compute traders for the currently selected Pokémon.
    // Match by id for regionals; by name fragment + Vivillon id (666) for prismillon.
    useEffect(() => {
        if (!pokemonInfo || allTraders.length === 0) {
            setTradersForPokemon([]);
            return;
        }
        setLoadingTraders(true);
        const pokemonId = pokemonInfo.kind === 'regional' ? pokemonInfo.id : null;
        const pokemonName = pokemonInfo.name?.toLowerCase();
        const matches = allTraders.filter(trader => {
            return trader.tradeList.forTrade.some(item => {
                if (pokemonId && (item.id === pokemonId || item.originalId === pokemonId)) return true;
                if (pokemonInfo.kind === 'vivillon') {
                    const itemName = (item.nameFr || item.nameEn || '').toLowerCase();
                    if ((itemName.includes('prismillon') || itemName.includes('vivillon')) && itemName.includes(pokemonName)) return true;
                    if (item.id === 666 || item.originalId === 666) return true;
                }
                return false;
            });
        }).map(trader => ({
            username: trader.username,
            avatar: trader.avatar,
            isShiny: trader.tradeList.forTrade.some(item => {
                const matchId = pokemonId && (item.id === pokemonId || item.originalId === pokemonId);
                return matchId && item.isShiny;
            }),
        }));
        setTradersForPokemon(matches);
        setLoadingTraders(false);
    }, [pokemonInfo, allTraders]);

    const copyCode = useCallback(async (code) => {
        const raw = code.replace(/\s/g, '');
        try {
            await navigator.clipboard.writeText(raw);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = raw;
            ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); } catch {}
            document.body.removeChild(ta);
        }
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    }, []);

    const handlePokemonClick = useCallback(({ data }) => {
        // Open the modal immediately — camera zoom happens in the background behind it.
        setPokemonInfo(data);
        setPokemonFriendCodes(null);
        // Close other right-side panels so the modal is unobstructed
        setCityInfo(null);
        setActiveEventId(null);
        setHoverInfo(null);

        // If we're still in hero state (page scrollY < 70%), force-scroll to globe state
        // so the rest of the page chrome doesn't fight the modal/camera
        if (window.scrollY < window.innerHeight * 0.7) {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
        }

        // Camera zoom-in to the Pokémon's location — happens behind the modal
        const viewer = viewerRef.current;
        const Cesium = cesiumRef.current;
        if (viewer && !viewer.isDestroyed() && Cesium && Number.isFinite(data.lng) && Number.isFinite(data.lat)) {
            viewer.__flyingToCity = true;
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(data.lng, data.lat - 0.04, 6500),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-55),
                    roll: 0,
                },
                duration: 1.8,
                easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
                complete: () => {
                    viewer.__flyingToCity = false;
                    viewer.__zoomedToCity = true;
                },
            });
        }

        // Vivillon: fetch friend codes from /api/vivillon?slug=...
        if (data.kind === 'vivillon' && data.slug) {
            setPokemonCodesLoading(true);
            fetch(`/api/vivillon?slug=${encodeURIComponent(data.slug)}`)
                .then(r => r.json())
                .then(codes => setPokemonFriendCodes(Array.isArray(codes) ? codes : []))
                .catch(() => setPokemonFriendCodes([]))
                .finally(() => setPokemonCodesLoading(false));
        }
    }, []);

    const handleHover = useCallback((info) => {
        setHoverInfo(info);
    }, []);

    // Mobile fallback — Cesium is too heavy for iOS Safari WebView (memory limits).
    // Render a lightweight landing page with starfield + nav cards instead.
    // Desktop (and the in-app webview on tablets/iPads with enough memory) gets the full globe.
    if (isMobile) {
        return (
            // `h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden` +
            // `overscroll-none` lock the homepage to the visible viewport in
            // the Capacitor app — no vertical scroll, no rubber-band bounce.
            // Subtracting the safe-area inset is necessary because globals.css
            // shifts <body> down by env(safe-area-inset-top); without the
            // subtraction the wrapper would extend below the visible viewport
            // and the bottom button row could be clipped on notch devices.
            // The 4 nav buttons are designed to fit fully within the
            // remaining space on every supported iPhone. Desktop falls through
            // to the Cesium globe below, unaffected.
            <div className="relative w-full h-[calc(100dvh-env(safe-area-inset-top))] overflow-hidden overscroll-none">
                <div
                    className="fixed inset-0 z-0 pointer-events-none"
                    style={{ background: `#000 url("${starsBg}") center/cover no-repeat` }}
                    aria-hidden="true"
                />
                <main
                    className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-24"
                    style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                    <h1
                        className="text-5xl sm:text-6xl font-black tracking-tight text-center mb-3 bg-gradient-to-b from-white via-white to-purple-300 bg-clip-text text-transparent"
                        style={{ filter: 'drop-shadow(0 0 30px rgba(168,85,247,0.45))' }}
                    >
                        POGOSPHERE
                    </h1>
                    <p className="text-white/60 text-sm text-center mb-10 max-w-xs">
                        La communauté Pokémon GO mondiale
                    </p>
                    <nav className="grid grid-cols-1 gap-3 w-full max-w-sm">
                        {[
                            { href: '/pokematos', label: t('nav.pokematos'), color: 'from-blue-500 to-blue-700' },
                            { href: '/rankings', label: t('nav.rankings'), color: 'from-violet-500 to-violet-700' },
                            { href: '/trades', label: t('nav.trades'), color: 'from-emerald-500 to-emerald-700' },
                            { href: '/events', label: t('nav.events'), color: 'from-rose-500 to-rose-700' },
                        ].map(({ href, label, color }) => (
                            <a
                                key={href}
                                href={href}
                                className={`block px-6 py-4 rounded-2xl bg-gradient-to-r ${color} text-white font-semibold text-center text-lg shadow-lg active:scale-95 transition-transform border border-white/10`}
                            >
                                {label}
                            </a>
                        ))}
                    </nav>
                    <p className="text-white/30 text-xs text-center mt-10 max-w-xs">
                        Pour une expérience complète avec le globe 3D, ouvre {cityConfig.siteName} sur ordinateur.
                    </p>
                </main>
            </div>
        );
    }

    return (
        <div className="relative w-full">
            {/* Starfield — fixed full-viewport, behind the Cesium canvas (which is now transparent in space areas) */}
            <div
                className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    background: `#000 url("${starsBg}") center/cover no-repeat`,
                }}
                aria-hidden="true"
            />
            <CesiumGlobe
                onReady={handleGlobeReady}
                playerMarkers={playerMarkers}
                regionalPokemon={regionalsForGlobe}
                cities={citiesForGlobe}
                events={eventsList}
                onHover={handleHover}
                onCityClick={handleCityClick}
                onPokemonClick={handlePokemonClick}
                onEventClick={({ event }) => {
                    setCityInfo(null);
                    setPokemonInfo(null);
                    setHoverInfo(null);
                    setActiveEventId(event.id);
                    flyToCity(null, event.lng, event.lat);
                }}
            />

            {/* Hover tooltip */}
            {hoverInfo && (
                <div
                    className="fixed z-40 pointer-events-none px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-white text-sm shadow-xl"
                    style={{
                        left: hoverInfo.x + 14,
                        top: hoverInfo.y + 14,
                        fontFamily: 'var(--font-outfit), sans-serif',
                    }}
                >
                    {hoverInfo.kind === 'city' ? (
                        <span className="capitalize">{hoverInfo.name}</span>
                    ) : hoverInfo.kind === 'event' ? (
                        <span>{hoverInfo.data.title} <span className="text-white/50 text-xs">· {hoverInfo.data.city}</span></span>
                    ) : (
                        <span>{hoverInfo.data.name} <span className="text-white/50 text-xs">· {hoverInfo.data.region}</span></span>
                    )}
                </div>
            )}

            {/* Pokémon modal — centered popup mirroring PogoPoitiers /regionals page */}
            <AnimatePresence>
                {pokemonInfo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={closePokemonModal}
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="bg-[#12122a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md sm:max-w-lg max-h-[78vh] overflow-y-auto pokemon-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header — sticky so close button stays accessible while scrolling */}
                            <div className="sticky top-0 z-20 p-5 pb-3 flex items-center gap-4 bg-[#12122a]/95 backdrop-blur-2xl rounded-t-3xl">
                                <div
                                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden flex-shrink-0"
                                    style={{
                                        borderColor: pokemonInfo.color || '#a855f7',
                                        background: `${pokemonInfo.color || '#a855f7'}10`,
                                        boxShadow: `0 0 30px ${pokemonInfo.color || '#a855f7'}20`,
                                    }}
                                >
                                    <img src={pokemonInfo.spriteUrl} alt={pokemonInfo.name} className="w-12 h-12 md:w-14 md:h-14 object-contain" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg md:text-xl font-bold text-white">
                                        {pokemonInfo.kind === 'vivillon' ? (
                                            <>Prismillon <span style={{ color: pokemonInfo.color || '#a855f7' }}>{pokemonInfo.name}</span></>
                                        ) : (
                                            <span style={{ color: pokemonInfo.color || '#a855f7' }}>
                                                {pokemonInfo.name}
                                                {typeof pokemonInfo.id === 'number' && (
                                                    <span className="text-gray-500 text-sm font-normal ml-1.5">#{pokemonInfo.id}</span>
                                                )}
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        {pokemonInfo.kind === 'vivillon' && Array.isArray(pokemonInfo.countries)
                                            ? `${pokemonInfo.countries.length} ${t('regional.countriesRegions').replace('{count}', '').replace(/^\s+/, '').trim() || 'pays / régions'}`
                                            : pokemonInfo.region}
                                    </p>
                                </div>
                                <button
                                    onClick={closePokemonModal}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors flex-shrink-0"
                                    aria-label="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="h-px bg-white/5 mx-5" />

                            {/* Vivillon: Friend Codes */}
                            {pokemonInfo.kind === 'vivillon' && (
                                <div className="p-5 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('regional.friendCodes')}</h4>
                                        {pokemonInfo.slug && (
                                            <a
                                                href={`https://www.pokemon-friends.eu/fr/vivillon/${pokemonInfo.slug}/`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] text-gray-600 hover:text-gray-300 flex items-center gap-1 transition-colors"
                                            >
                                                {t('regional.seeMore')} <ExternalLink size={10} />
                                            </a>
                                        )}
                                    </div>
                                    {pokemonCodesLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                            <span className="text-gray-500 text-xs ml-2">{t('common.loading')}</span>
                                        </div>
                                    ) : pokemonFriendCodes && pokemonFriendCodes.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                            {pokemonFriendCodes.map((entry, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => copyCode(entry.code)}
                                                            className="flex-1 flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl px-3 py-2.5 transition-all group text-left min-w-0"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                {entry.country && (
                                                                    <img
                                                                        src={`https://flagcdn.com/24x18/${entry.country.toLowerCase()}.png`}
                                                                        alt={entry.country}
                                                                        className="w-6 h-4 object-cover rounded-sm flex-shrink-0 border border-white/10"
                                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                                    />
                                                                )}
                                                                <div className="min-w-0">
                                                                    <span className="font-mono text-sm text-gray-100 tracking-wider block">{entry.code}</span>
                                                                    {entry.time && <span className="text-[10px] text-gray-600 block">{entry.time}</span>}
                                                                </div>
                                                            </div>
                                                            {copiedCode === entry.code ? (
                                                                <Check size={16} className="text-green-400 flex-shrink-0" />
                                                            ) : (
                                                                <Copy size={14} className="text-gray-700 group-hover:text-gray-400 flex-shrink-0 transition-colors" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setQrCode(qrCode === entry.code ? null : entry.code); }}
                                                            className={`p-2.5 rounded-xl border transition-all flex-shrink-0 ${qrCode === entry.code ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-white/5 border-white/5 text-gray-700 hover:bg-white/10 hover:text-gray-400'}`}
                                                            title="QR Code"
                                                        >
                                                            <QrCode size={14} />
                                                        </button>
                                                    </div>
                                                    <AnimatePresence>
                                                        {qrCode === entry.code && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="flex flex-col items-center gap-2 py-3 px-2 bg-white rounded-xl mt-1.5">
                                                                    <img
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(entry.code.replace(/\s/g, ''))}`}
                                                                        alt={`QR Code: ${entry.code}`}
                                                                        className="w-[180px] h-[180px]"
                                                                    />
                                                                    <span className="font-mono text-xs text-gray-800 tracking-wider">{entry.code}</span>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6">
                                            <p className="text-gray-600 text-sm">{t('regional.noCodesAvailable')}</p>
                                            {pokemonInfo.slug && (
                                                <a
                                                    href={`https://www.pokemon-friends.eu/fr/vivillon/${pokemonInfo.slug}/`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs mt-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                                                >
                                                    {t('regional.searchOnSite')} <ExternalLink size={12} />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Regional: Info */}
                            {pokemonInfo.kind === 'regional' && (
                                <div className="p-5 pt-4">
                                    <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <img src={pokemonInfo.spriteUrl} alt={pokemonInfo.name} className="w-20 h-20 object-contain flex-shrink-0" />
                                        <div>
                                            <p className="text-white font-bold text-lg">{pokemonInfo.name}</p>
                                            <p className="text-gray-400 text-sm mt-1">{pokemonInfo.region}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Traders who have this Pokémon for trade */}
                            <div className="px-5 pb-5">
                                <div className="h-px bg-white/5 mb-4" />
                                <div className="flex items-center gap-2 mb-3">
                                    <ArrowRightLeft size={14} className="text-amber-400" />
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('regional.availableForTrade')}</h4>
                                </div>
                                {loadingTraders ? (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                        <span className="text-gray-500 text-xs ml-2">{t('regional.searching')}</span>
                                    </div>
                                ) : tradersForPokemon.length > 0 ? (
                                    <div className="flex flex-col gap-1.5">
                                        {tradersForPokemon.map((trader) => (
                                            <div key={trader.username} className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl px-3 py-2.5 transition-all group">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    {trader.avatar ? (
                                                        <img src={trader.avatar} alt="" className="w-7 h-7 rounded-full flex-shrink-0 border border-white/10" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full flex-shrink-0 bg-gradient-to-br from-amber-500/30 to-orange-600/30 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                                                            {trader.username.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-semibold text-gray-200 truncate">{trader.username}</span>
                                                    {trader.isShiny && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">✨ Shiny</span>}
                                                </div>
                                                <a
                                                    href={`/trades?user=${encodeURIComponent(trader.username)}`}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
                                                >
                                                    <MessageCircle size={12} />
                                                    {t('regional.viewProfile')}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-600 text-xs">{t('regional.noTraderAvailable')}</p>
                                        <a href="/trades" className="inline-flex items-center gap-1 text-xs mt-2 text-amber-500 hover:text-amber-400 transition-colors">
                                            {t('regional.viewTradeHall')} <ExternalLink size={10} />
                                        </a>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Initial blur intro overlay (first visit of day) */}
            {introPhase === 0 && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-all duration-[1400ms] ease-in-out"
                    style={{
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        background: 'rgba(0,0,0,0.5)',
                    }}
                />
            )}

            {/* Hero overlay — title + buttons in upper portion, globe horizon below */}
            {heroVisible && (
                <div
                    className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
                    style={{
                        height: '100vh',
                        opacity: heroOpacity,
                        transform: `translateY(${-scrollProgress * 40}px)`,
                        transition: 'opacity 200ms ease-out',
                    }}
                >
                    <div className="h-full flex flex-col items-center pt-[14vh] sm:pt-[18vh] md:pt-[20vh] px-3 sm:px-6 pointer-events-none">
                        <div className="pointer-events-auto text-center w-full max-w-6xl">
                            <p
                                className="text-[13px] sm:text-base md:text-lg font-medium tracking-[0.08em] mx-auto mb-5 sm:mb-7 md:mb-9 whitespace-nowrap px-2 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent"
                                style={{
                                    fontFamily: 'var(--font-outfit), sans-serif',
                                    filter: 'drop-shadow(0 2px 12px rgba(255,255,255,0.35))',
                                }}
                            >
                                {t('home.portalWelcome')}
                            </p>

                            {/* Main nav buttons (5) — colored gradient with premium polish.
                                Mobile: flex-wrap-justify-center with each button capped at
                                ~50% of row width so 2 fit per row evenly and the 5th wraps
                                centered on its own row. Larger screens: flex sizes naturally. */}
                            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2.5 md:gap-3 mb-3 md:mb-4 mx-auto max-w-[320px] sm:max-w-none">
                                {[
                                    // Communauté is intentionally absent — that page is PogoPoitiers-specific
                                    { href: '/pokematos', label: 'Pokématos', from: '#3b82f6', to: '#06b6d4', glow: '14,165,233' },
                                    { href: '/rankings', label: 'Classements', from: '#8b5cf6', to: '#a855f7', glow: '168,85,247' },
                                    { href: '/trades', label: 'Échanges', from: '#10b981', to: '#22c55e', glow: '34,197,94' },
                                    { href: '/events', label: 'Évènements', from: '#f43f5e', to: '#ec4899', glow: '236,72,153' },
                                ].map(b => {
                                    // Mobile: each button takes 50% of row minus half the gap (3px),
                                    // so two fit evenly per row regardless of label length. The 5th button
                                    // wraps to its own row and the parent's justify-center centers it.
                                    // sm+: revert to natural width.
                                    const sharedClass = "relative min-w-0 w-[calc(50%-3px)] sm:w-auto px-2.5 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 rounded-full text-white text-[13px] sm:text-sm md:text-[15px] font-semibold transition-all duration-300 hover:scale-[1.05] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center text-center whitespace-nowrap overflow-hidden";
                                    const sharedStyle = {
                                        fontFamily: 'var(--font-outfit), sans-serif',
                                        background: `linear-gradient(135deg, ${b.from}, ${b.to})`,
                                        border: '1px solid rgba(255,255,255,0.22)',
                                        boxShadow: `0 6px 18px rgba(${b.glow},0.35), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18)`,
                                        textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                                    };
                                    return (
                                        <a
                                            key={b.href}
                                            href={b.href}
                                            className={sharedClass}
                                            style={sharedStyle}
                                        >
                                            {b.label}
                                        </a>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                                className="text-xs sm:text-sm text-white/75 hover:text-white mt-5 sm:mt-10 md:mt-14 transition-all flex flex-col items-center gap-1 mx-auto group"
                                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                            >
                                <span className="tracking-wider uppercase font-medium text-white/70 group-hover:text-white">{t('home.scrollToExplore')}</span>
                                <span className="text-2xl leading-none animate-bounce text-white/85" style={{ filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.5))' }}>↓</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Back-to-hero button (visible when scrolled into globe state).
                Hidden when any modal/panel is open so it doesn't cover the popup
                content (a real issue on small phones with the centered Vivillon modal). */}
            {scrollProgress > 0.5 && !pokemonInfo && !cityInfo && !activeEventId && (
                <button
                    onClick={() => {
                        const viewer = viewerRef.current;
                        const Cesium = cesiumRef.current;
                        if (viewer && Cesium && !viewer.isDestroyed()) {
                            // Disable everything that could fight the back-flight:
                            //  - moveEnd auto-recenter watchdog (was leaving us off-center)
                            //  - auto-rotation onTick listener
                            //  - discrete-state useEffect from re-firing
                            viewer.__zoomedToCity = false;
                            viewer.__autoRecentering = false;
                            viewer.__flyingToCity = true;
                            inGlobeStateRef.current = false;
                            // Clear ALL open right-side panels and modals so the home view
                            // is unobstructed and re-clicking later doesn't stack overlays.
                            setCityInfo(null);
                            setPokemonInfo(null);
                            setHoverInfo(null);
                            setActiveEventId(null);
                            setQrCode(null);
                            viewer.camera.cancelFlight();
                            viewer.camera.flyTo({
                                destination: Cesium.Cartesian3.fromDegrees(8, 25, 9_500_000),
                                orientation: { heading: 0, pitch: Cesium.Math.toRadians(-68), roll: 0 },
                                duration: 1.2,
                                easingFunction: Cesium.EasingFunction.CUBIC_IN_OUT,
                                complete: () => { viewer.__flyingToCity = false; },
                                cancel: () => { viewer.__flyingToCity = false; },
                            });
                        }
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="fixed top-[72px] sm:top-20 left-3 sm:left-5 z-[70] px-4 py-2.5 sm:px-5 sm:py-3 rounded-full backdrop-blur-md active:scale-95 text-white text-sm sm:text-base font-semibold transition-all duration-300 flex items-center gap-2 hover:scale-105 hover:-translate-y-0.5"
                    style={{
                        fontFamily: 'var(--font-outfit), sans-serif',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
                        border: '1.5px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.45), 0 0 24px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.35)',
                        textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                    }}
                >
                    <span className="text-lg sm:text-xl leading-none">←</span> Accueil
                </button>
            )}

            {/* Scroll spacer — provides scroll length to drive hero fade */}
            <div style={{ height: '100vh', pointerEvents: 'none' }} aria-hidden />
            <div style={{ height: '100vh', pointerEvents: 'none' }} aria-hidden />

            {/* City info panel — middle-right of viewport, takes ~half the page on large screens.
                On responsive (small phones) the panel is inset more so it doesn't cover the entire viewport. */}
            <AnimatePresence>
            {cityInfo && (
                <motion.div
                    key="city-panel"
                    initial={{ opacity: 0, x: 40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed top-[60%] sm:top-1/2 right-3 sm:right-6 -translate-y-1/2 z-30 rounded-3xl p-4 sm:p-6 w-[calc(100vw-1.5rem)] sm:w-[480px] md:w-[55vw] lg:w-[50vw] xl:w-[45vw] max-w-[820px] max-h-[70vh] sm:max-h-[85vh] overflow-y-auto text-white shadow-2xl border border-white/20"
                    style={{
                        fontFamily: 'var(--font-outfit), sans-serif',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
                        backdropFilter: 'blur(28px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                >
                    <button
                        onClick={closeCityInfo}
                        className="sticky float-right top-0 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/15 hover:bg-black/70 text-white/80 hover:text-white text-xl leading-none transition-colors -mr-1"
                        aria-label="Close"
                    >×</button>

                    {/* Header: city name in white→gray gradient */}
                    <h3
                        className="text-4xl font-bold mb-1 capitalize bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent"
                        style={{ filter: 'drop-shadow(0 2px 12px rgba(255,255,255,0.18))' }}
                    >
                        {cityInfo.name}
                    </h3>
                    <p className="text-sm text-white/60 mb-5 uppercase tracking-wider">Pokémon GO Community</p>

                    {/* Single Discord-members stat — community total + online count */}
                    {(() => {
                        const totalDiscord = Object.values(memberCounts)
                            .reduce((sum, m) => sum + (m?.members || 0), 0);
                        const totalOnline = Object.values(memberCounts)
                            .reduce((sum, m) => sum + (m?.online || 0), 0);
                        if (totalDiscord === 0) return null;
                        return (
                            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 mb-5 flex items-center justify-between">
                                <div>
                                    <div className="text-3xl font-bold text-white">{totalDiscord.toLocaleString()}</div>
                                    <div className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5">
                                        Discord {totalDiscord === 1 ? t('community.member') : t('community.members')}
                                    </div>
                                </div>
                                {totalOnline > 0 && (
                                    <div className="text-right">
                                        <div className="text-emerald-400 text-2xl font-bold inline-flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                            {totalOnline.toLocaleString()}
                                        </div>
                                        <div className="text-[11px] uppercase tracking-wider text-white/50 mt-0.5">online now</div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Community links */}
                    {communityLinks.length > 0 && (
                        <div className="mb-5">
                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">{t('community.communityGroups')}</p>
                            <div className="flex flex-col gap-2">
                                {communityLinks.map((link, i) => {
                                    const counts = memberCounts[link.url];
                                    return (
                                        <a
                                            key={i}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/8 border border-white/15 hover:bg-white/15 hover:border-white/30 transition-all text-sm"
                                            style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))' }}
                                        >
                                            <CommunityIcon type={link.type} size={20} />
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate font-medium">{link.name}</div>
                                                {counts?.members > 0 && (
                                                    <div className="text-[10px] text-white/55 mt-0.5">
                                                        {counts.members.toLocaleString()} {counts.members === 1 ? t('community.member') : t('community.members')}
                                                        {counts.online > 0 && (
                                                            <span className="text-emerald-400/80 ml-1.5 inline-flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                                                {counts.online.toLocaleString()} online
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-white/40 text-xs">↗</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Coordinates as a subtle note */}
                    {cityInfo.coords && (
                        <p className="text-[10px] text-white/30 mb-3 font-mono">
                            {cityInfo.coords.lat.toFixed(2)}°, {cityInfo.coords.lng.toFixed(2)}°
                        </p>
                    )}

                    <button
                        onClick={() => setSuggestModalCity(cityInfo.name)}
                        className="w-full text-xs px-3 py-2.5 rounded-2xl border border-dashed border-white/25 text-white/70 hover:text-white hover:border-white/50 hover:bg-white/5 transition-all font-medium"
                    >
                        {t('community.suggestGroupCta')}
                    </button>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Event details panel — middle-right, takes ~half the page on large screens.
                On responsive (small phones) the panel is inset more so it doesn't cover the entire viewport. */}
            <AnimatePresence>
            {activeEvent && (
                <motion.div
                    key="event-panel"
                    initial={{ opacity: 0, x: 40, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.96 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed top-[60%] sm:top-1/2 right-3 sm:right-6 -translate-y-1/2 z-30 rounded-3xl p-4 sm:p-6 w-[calc(100vw-1.5rem)] sm:w-[500px] md:w-[55vw] lg:w-[50vw] xl:w-[45vw] max-w-[820px] max-h-[70vh] sm:max-h-[85vh] overflow-y-auto text-white shadow-2xl border border-white/20"
                    style={{
                        fontFamily: 'var(--font-outfit), sans-serif',
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))',
                        backdropFilter: 'blur(28px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15)',
                    }}
                >
                    <button
                        onClick={closeEventPanel}
                        className="sticky float-right top-0 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/15 hover:bg-black/70 text-white/80 hover:text-white text-xl leading-none transition-colors -mr-1"
                        aria-label="Close"
                    >×</button>

                    {activeEvent.heroImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={activeEvent.heroImage}
                            alt={activeEvent.title}
                            // object-contain keeps the (taller-than-wide) GO Fest logo intact —
                            // no top/bottom crop. Compact max-h so the participant block, news
                            // and links below are visible without scrolling.
                            className="block w-auto max-w-full max-h-28 sm:max-h-36 mx-auto object-contain rounded-2xl mb-3 -mt-1"
                        />
                    )}

                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
                            style={{ background: activeEvent.color || '#22d3ee', boxShadow: `0 0 12px ${activeEvent.color || '#22d3ee'}` }}
                        />
                        <span className="text-[10px] uppercase tracking-wider text-white/50">Live event</span>
                    </div>
                    <h3
                        className="text-3xl font-bold mb-1 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent"
                        style={{ filter: 'drop-shadow(0 2px 12px rgba(255,255,255,0.18))' }}
                    >
                        {activeEvent.title}
                    </h3>
                    <p className="text-sm text-white/70 mb-1 capitalize">{activeEvent.city}</p>
                    {(activeEvent.startDate || activeEvent.endDate) && (
                        <p className="text-xs text-white/50 mb-4">
                            {activeEvent.startDate}{activeEvent.endDate && activeEvent.endDate !== activeEvent.startDate ? ` → ${activeEvent.endDate}` : ''}
                        </p>
                    )}

                    {activeEvent.description && (
                        <p className="text-sm text-white/80 mb-4 leading-relaxed">{activeEvent.description}</p>
                    )}

                    {/* Participants */}
                    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 mb-4">
                        <div className="flex items-baseline justify-between mb-2">
                            <span className="text-xs uppercase tracking-wider text-white/50 font-semibold">Participants</span>
                            <span className="text-2xl font-bold text-white">{(activeEvent.participants || []).length}</span>
                        </div>
                        {currentUsername ? (
                            <button
                                onClick={toggleParticipate}
                                disabled={eventBusy}
                                className="w-full mt-1 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                                style={{
                                    background: isParticipating
                                        ? 'linear-gradient(135deg, #475569, #1e293b)'
                                        : `linear-gradient(135deg, ${activeEvent.color || '#22d3ee'}, #0891b2)`,
                                    border: '1px solid rgba(255,255,255,0.22)',
                                    boxShadow: '0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.28)',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.25)',
                                    color: '#fff',
                                }}
                            >
                                {eventBusy ? '…' : (isParticipating ? 'Leave event' : "I'm participating!")}
                            </button>
                        ) : (
                            <p className="text-xs text-white/50 italic">Sign in to join this event.</p>
                        )}
                        {(activeEvent.participants || []).length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-3 max-h-24 overflow-y-auto">
                                {activeEvent.participants.map((p, i) => (
                                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/85">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* News */}
                    {Array.isArray(activeEvent.news) && activeEvent.news.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">News</p>
                            <div className="flex flex-col gap-2">
                                {activeEvent.news.map((n, i) => {
                                    const Inner = (
                                        <>
                                            {n.title && (
                                                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                                                    {n.title}
                                                    {n.url && <span className="text-white/40 text-xs">↗</span>}
                                                </div>
                                            )}
                                            {n.text && <div className="text-xs text-white/70 mt-0.5 leading-relaxed">{n.text}</div>}
                                            {n.date && <div className="text-[10px] text-white/40 mt-1">{n.date}</div>}
                                        </>
                                    );
                                    return n.url ? (
                                        <a
                                            key={i}
                                            href={n.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.10] hover:border-white/25 transition-all"
                                        >
                                            {Inner}
                                        </a>
                                    ) : (
                                        <div key={i} className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                                            {Inner}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Links (Discord channel, info pages, etc.) */}
                    {Array.isArray(activeEvent.links) && activeEvent.links.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">Links</p>
                            <div className="flex flex-col gap-2">
                                {activeEvent.links.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/8 border border-white/15 hover:bg-white/15 hover:border-white/30 transition-all text-sm"
                                        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.05))' }}
                                    >
                                        {link.type ? <CommunityIcon type={link.type} size={20} /> : <span className="text-white/60">↗</span>}
                                        <span className="truncate flex-1 font-medium">{link.name || link.url}</span>
                                        <span className="text-white/40 text-xs">↗</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Image gallery */}
                    {Array.isArray(activeEvent.images) && activeEvent.images.length > 0 && (
                        <div className="mb-2">
                            <p className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">Gallery</p>
                            <div className="grid grid-cols-3 gap-1.5">
                                {activeEvent.images.map((src, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={src} alt="" className="w-full h-16 object-cover rounded-lg border border-white/10" />
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
            </AnimatePresence>

            {/* Suggest community modal — preset city (from city panel) */}
            {suggestModalCity && (
                <SuggestCommunityModal
                    city={suggestModalCity}
                    onClose={() => setSuggestModalCity(null)}
                    onSubmitted={() => setSuggestModalCity(null)}
                />
            )}

            {/* Add-your-community modal — free city input (from bottom-left button) */}
            {showAddCommunity && (
                <SuggestCommunityModal
                    city={null}
                    onClose={() => setShowAddCommunity(false)}
                    onSubmitted={() => setShowAddCommunity(false)}
                />
            )}

            {/* "Add your community" button — bottom-left, fixed */}
            <button
                onClick={() => setShowAddCommunity(true)}
                className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-[1.05] hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                style={{
                    fontFamily: 'var(--font-outfit), sans-serif',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                    border: '1px solid rgba(255,255,255,0.28)',
                    color: '#ffffff',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
                }}
                aria-label={t('community.addYour')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{t('community.addYour')}</span>
            </button>

            {/* Footer */}
            <div className="fixed bottom-4 left-0 w-full text-center text-[10px] md:text-xs font-light z-20 pointer-events-none text-white/30">
                &copy; {new Date().getFullYear()} {cityConfig.siteName}
            </div>

            <style>{`
                footer { display: none !important; }
                .cesium-viewer .cesium-widget-credits { display: none !important; }
                .cesium-viewer { font-family: var(--font-outfit), sans-serif; }
                .pokemon-scrollbar::-webkit-scrollbar { width: 4px; }
                .pokemon-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .pokemon-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .pokemon-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
}
