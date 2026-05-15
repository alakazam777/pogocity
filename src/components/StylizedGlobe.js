'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { PRISMILLON_FORMS, getFormSprite } from '@/data/prismillonForms';
import { REGIONAL_POKEMON } from '@/data/regionalPokemon';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { useLanguage } from '@/context/LanguageContext';

// ═══════════════════════════════════════════════════════════
// Pokémon tile fragment shader (applied to CartoDB Voyager tiles on GPU)
// ═══════════════════════════════════════════════════════════
function buildTileFragmentShader() {
    const rev = parseInt(THREE.REVISION) || 160;
    const colorspaceInclude = rev >= 154 ? '<colorspace_fragment>' : '<encodings_fragment>';
    return `
#define PI 3.1415926538
varying vec3 vPosition;
uniform sampler2D uTexture;
uniform vec4 webMercatorBounds;

void main() {
    float radius = length(vPosition);
    float latitude = asin(vPosition.y / radius);
    float longitude = atan(-vPosition.z, vPosition.x);
    float wmx = radius * longitude;
    float wmy = radius * log(tan(PI / 4.0 + latitude / 2.0));
    float ty = (wmy - webMercatorBounds.z) / webMercatorBounds.w;
    float tx = (wmx - webMercatorBounds.x) / webMercatorBounds.y;

    vec4 tex = texture2D(uTexture, vec2(tx, ty));
    float r = tex.r, g = tex.g, b = tex.b;
    float brightness = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float sat = max(max(r,g),b) - min(min(r,g),b);

    vec3 color;

    // CartoDB water: blueish, b-r > 0.08
    float waterScore = smoothstep(0.06, 0.15, b - r) * smoothstep(0.45, 0.65, b) * step(r, g + 0.05);

    // CartoDB green: parks, forests
    float greenScore = smoothstep(0.01, 0.06, g - r) * smoothstep(0.01, 0.06, g - b)
                     * smoothstep(0.4, 0.7, brightness) * smoothstep(0.02, 0.08, sat);

    // CartoDB roads/paths: very bright, near-white
    float roadScore = smoothstep(0.92, 0.97, brightness) * smoothstep(0.06, 0.02, sat);

    // CartoDB buildings: warm light gray
    float buildScore = smoothstep(0.78, 0.86, brightness) * smoothstep(0.10, 0.04, sat)
                     * smoothstep(0.0, 0.03, r - b);

    // Pokémon palette
    vec3 waterCol = mix(vec3(0.07, 0.22, 0.50), vec3(0.16, 0.40, 0.65), smoothstep(0.5, 0.9, brightness));
    vec3 greenCol = mix(vec3(0.08, 0.40, 0.06), vec3(0.30, 0.70, 0.18), smoothstep(0.5, 0.85, brightness));
    vec3 roadCol  = vec3(0.90, 0.82, 0.56);
    vec3 buildCol = mix(vec3(0.62, 0.46, 0.30), vec3(0.76, 0.62, 0.42), smoothstep(0.78, 0.90, brightness));

    // Default land: warm green
    float landBr = smoothstep(0.5, 0.97, brightness);
    vec3 landCol = mix(vec3(0.22, 0.48, 0.16), vec3(0.50, 0.68, 0.34), landBr);
    landCol = mix(landCol, vec3(0.55, 0.50, 0.32), 0.1);

    // Blend by scores (highest wins, with soft transitions)
    color = landCol;
    color = mix(color, buildCol, buildScore);
    color = mix(color, roadCol,  roadScore);
    color = mix(color, greenCol, greenScore);
    color = mix(color, waterCol, waterScore);

    // Posterize for cel-shade feel
    float levels = 12.0;
    color = floor(color * levels + 0.5) / levels;

    // Boost saturation
    float gray = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(gray), color, 1.3);

    // Warm tint
    color += vec3(0.012, 0.006, -0.008);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    ${rev >= 152 ? `
    #include <tonemapping_fragment>
    #include ${colorspaceInclude}
    ` : ''}
}`;
}

// ═══════════════════════════════════════════════════════════
// Geo labels (shown via CSS2D — text only, lag acceptable)
// ═══════════════════════════════════════════════════════════
const GEO_LABELS = [
    { name: 'Europe', lat: 50, lng: 10, min: 0, max: 2.5, cls: 'lg' },
    { name: 'Afrique', lat: 5, lng: 20, min: 0, max: 2.5, cls: 'lg' },
    { name: 'Asie', lat: 40, lng: 90, min: 0, max: 2.5, cls: 'lg' },
    { name: 'Amérique du Nord', lat: 45, lng: -100, min: 0, max: 2.5, cls: 'lg' },
    { name: 'Amérique du Sud', lat: -15, lng: -60, min: 0, max: 2.5, cls: 'lg' },
    { name: 'Océanie', lat: -25, lng: 135, min: 0, max: 2.5, cls: 'lg' },
    { name: 'France', lat: 46.5, lng: 2.5, min: 1.8, max: 5, cls: 'md' },
    { name: 'Espagne', lat: 40, lng: -3.5, min: 1.8, max: 5, cls: 'md' },
    { name: 'Italie', lat: 42.5, lng: 12.5, min: 1.8, max: 5, cls: 'md' },
    { name: 'Allemagne', lat: 51, lng: 10, min: 1.8, max: 5, cls: 'md' },
    { name: 'Japon', lat: 36, lng: 138, min: 1.8, max: 5, cls: 'md' },
    { name: 'Australie', lat: -25, lng: 134, min: 1.8, max: 5, cls: 'md' },
    { name: 'Brésil', lat: -10, lng: -52, min: 1.8, max: 5, cls: 'md' },
    { name: 'USA', lat: 39, lng: -98, min: 1.8, max: 5, cls: 'md' },
    { name: 'Canada', lat: 56, lng: -96, min: 1.8, max: 5, cls: 'md' },
    { name: 'Chine', lat: 35, lng: 103, min: 1.8, max: 5, cls: 'md' },
    { name: 'Inde', lat: 22, lng: 78, min: 1.8, max: 5, cls: 'md' },
    { name: 'Russie', lat: 60, lng: 90, min: 1.5, max: 5, cls: 'md' },
    { name: 'Corée du Sud', lat: 36, lng: 128, min: 2, max: 5, cls: 'md' },
    { name: 'Poitiers ★', lat: 46.58, lng: 0.34, min: 3.5, max: 8, cls: 'sm hl' },
    { name: 'Paris', lat: 48.85, lng: 2.35, min: 3, max: 8, cls: 'sm' },
    { name: 'London', lat: 51.5, lng: -0.12, min: 3, max: 8, cls: 'sm' },
    { name: 'Tokyo', lat: 35.68, lng: 139.69, min: 3, max: 8, cls: 'sm' },
    { name: 'New York', lat: 40.71, lng: -74.01, min: 3, max: 8, cls: 'sm' },
    { name: 'Sydney', lat: -33.87, lng: 151.21, min: 3, max: 8, cls: 'sm' },
    { name: 'Berlin', lat: 52.52, lng: 13.4, min: 3, max: 8, cls: 'sm' },
    { name: 'Madrid', lat: 40.42, lng: -3.7, min: 3, max: 8, cls: 'sm' },
    { name: 'Roma', lat: 41.9, lng: 12.5, min: 3, max: 8, cls: 'sm' },
    { name: 'Lyon', lat: 45.76, lng: 4.83, min: 4, max: 8, cls: 'sm' },
    { name: 'Marseille', lat: 43.3, lng: 5.37, min: 4, max: 8, cls: 'sm' },
    { name: 'Bordeaux', lat: 44.84, lng: -0.58, min: 4, max: 8, cls: 'sm' },
    { name: 'Seoul', lat: 37.55, lng: 127, min: 3, max: 8, cls: 'sm' },
    { name: 'Bangkok', lat: 13.75, lng: 100.52, min: 3, max: 8, cls: 'sm' },
    { name: 'São Paulo', lat: -23.55, lng: -46.63, min: 3, max: 8, cls: 'sm' },
    { name: 'Mumbai', lat: 19.08, lng: 72.88, min: 3, max: 8, cls: 'sm' },
];

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════
function latLngToVec3(lat, lng, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -(r * Math.sin(phi) * Math.cos(theta)),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
}

function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function createHighlightFill(lat, lng, radius, color) {
    const N = 48, pos = [], idx = [];
    const c = latLngToVec3(lat, lng, 1.003);
    pos.push(c.x, c.y, c.z);
    for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        const pt = latLngToVec3(
            lat + radius * Math.cos(a),
            lng + (radius * Math.sin(a)) / Math.cos(lat * Math.PI / 180),
            1.003
        );
        pos.push(pt.x, pt.y, pt.z);
    }
    for (let i = 1; i <= N; i++) idx.push(0, i, i + 1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: new THREE.Color(color), transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false,
    }));
}

function createHighlightRing(lat, lng, radius, color) {
    const N = 64, pts = [];
    for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push(latLngToVec3(
            lat + radius * Math.cos(a),
            lng + (radius * Math.sin(a)) / Math.cos(lat * Math.PI / 180),
            1.006
        ));
    }
    return new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.6 })
    );
}

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════
export default function StylizedGlobe({ onSelectForm, selectedForm, modalOpen }) {
    const { t } = useLanguage();
    const containerRef = useRef(null);
    const stateRef = useRef({});           // mutable state for animation loop
    const animFrameRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);

    // Keep onSelectForm ref current without causing re-init
    const onSelectFormRef = useRef(onSelectForm);
    useEffect(() => { onSelectFormRef.current = onSelectForm; }, [onSelectForm]);

    useEffect(() => {
        if (!containerRef.current) return;
        const container = containerRef.current;
        let w = container.clientWidth, h = container.clientHeight;

        // ── State bag (used in animation loop without triggering re-renders) ──
        const S = stateRef.current = {
            sprites: [],          // {sprite, data, position}
            geoLabels: [],        // {obj, position, min, max}
            highlights: {},       // key → [mesh...]
            activeHL: [],         // currently visible
            hoveredData: null,
            mouseClient: { x: 0, y: 0 },
        };

        // ── Scene ──
        const scene = new THREE.Scene();
        scene.background = new THREE.Color('#060612');

        // ── Camera ──
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
        camera.position.set(0, 0.4, 3.0);

        // ── Renderer ──
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // ── CSS2D (geo labels only) ──
        const cssRenderer = new CSS2DRenderer();
        cssRenderer.setSize(w, h);
        cssRenderer.domElement.style.position = 'absolute';
        cssRenderer.domElement.style.top = '0';
        cssRenderer.domElement.style.left = '0';
        cssRenderer.domElement.style.pointerEvents = 'none';
        container.appendChild(cssRenderer.domElement);

        // ── Tooltip (follows cursor, no sync issue) ──
        const tooltip = document.createElement('div');
        tooltip.className = 'sg-tooltip';
        container.appendChild(tooltip);

        // ── Stars ──
        const starsGeo = new THREE.BufferGeometry();
        const starsArr = new Float32Array(1500 * 3);
        for (let i = 0; i < 1500; i++) {
            starsArr[i * 3] = (Math.random() - 0.5) * 60;
            starsArr[i * 3 + 1] = (Math.random() - 0.5) * 60;
            starsArr[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(starsArr, 3));
        scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({
            color: 0xffffff, size: 0.06, transparent: true, opacity: 0.65
        })));

        // ── Controls — NO DAMPING ──
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = false;
        controls.rotateSpeed = 0.4;
        controls.zoomSpeed = 0.7;
        controls.minDistance = 1.15;
        controls.maxDistance = 6;
        controls.enablePan = false;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.2;

        // ── Raycaster for sprite interaction ──
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2(9999, 9999); // off-screen default
        let pointerDown = null;

        const onPointerMove = (e) => {
            const rect = container.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            S.mouseClient = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const onPointerDown = (e) => { pointerDown = { x: e.clientX, y: e.clientY }; };
        const onPointerUp = (e) => {
            if (!pointerDown) return;
            const dx = e.clientX - pointerDown.x, dy = e.clientY - pointerDown.y;
            if (Math.sqrt(dx * dx + dy * dy) < 6) handleClick();
            pointerDown = null;
        };

        function handleClick() {
            raycaster.setFromCamera(mouse, camera);
            const hits = raycaster.intersectObjects(S.sprites.map(s => s.sprite));
            if (hits.length > 0) {
                const data = hits[0].object.userData;
                controls.autoRotate = false;
                if (data.type === 'prismillon') {
                    const form = PRISMILLON_FORMS.find(f => f.name === data.name);
                    if (form) onSelectFormRef.current({ ...form, type: 'prismillon' });
                } else {
                    onSelectFormRef.current({ ...data, type: 'regional' });
                }
            }
        }

        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerdown', onPointerDown);
        container.addEventListener('pointerup', onPointerUp);

        // ══════════════════════════════════════
        // Init globe (async — loads geo-three)
        // ══════════════════════════════════════
        const initGlobe = async () => {
            try {
                const GeoThree = await import('geo-three');
                setLoadProgress(15);

                const EARTH_R = GeoThree.UnitsUtils.EARTH_RADIUS;
                const SCALE = 1.0 / EARTH_R;
                const TILE_FRAG = buildTileFragmentShader();

                // ── Subclass MapSphereNode to inject Pokémon shader ──
                class PokemonNode extends GeoThree.MapSphereNode {
                    constructor(parent, mapView, loc, lvl, x, y) {
                        super(parent, mapView, loc, lvl, x, y);
                        this.material.fragmentShader = TILE_FRAG;
                        this.material.needsUpdate = true;
                    }
                }

                // Register so MapView uses it (and createChildNodes inherits it)
                GeoThree.MapView.mapModes.set(GeoThree.MapView.SPHERICAL, PokemonNode);

                setLoadProgress(25);

                // ── CartoDB Voyager tiles with request queue ──
                class CartoProvider extends GeoThree.MapProvider {
                    constructor() {
                        super();
                        this.maxZoom = 18;
                        this.minZoom = 0;
                        this._active = 0;
                        this._queue = [];
                        this._maxConcurrent = 8;
                    }
                    _processQueue() {
                        while (this._active < this._maxConcurrent && this._queue.length > 0) {
                            this._queue.shift()();
                        }
                    }
                    fetchTile(zoom, x, y) {
                        return new Promise((resolve, reject) => {
                            const run = () => {
                                this._active++;
                                const img = document.createElement('img');
                                img.crossOrigin = 'Anonymous';
                                img.onload = () => { this._active--; this._processQueue(); resolve(img); };
                                img.onerror = () => { this._active--; this._processQueue(); reject(new Error('Tile fail')); };
                                img.src = `https://basemaps.cartocdn.com/rastertiles/voyager_nolabels/${zoom}/${x}/${y}.png`;
                            };
                            if (this._active < this._maxConcurrent) run();
                            else this._queue.push(run);
                        });
                    }
                }

                const map = new GeoThree.MapView(GeoThree.MapView.SPHERICAL, new CartoProvider());
                map.lod = new GeoThree.LODRadial();
                map.lod.subdivideDistance = 60;
                map.lod.simplifyDistance = 140;
                map.scale.set(SCALE, SCALE, SCALE);
                scene.add(map);

                setLoadProgress(50);

                // ── Atmosphere ──
                const atmosMat = new THREE.ShaderMaterial({
                    vertexShader: `varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
                    fragmentShader: `varying vec3 vN; void main(){float rim=1.0-max(0.0,dot(vN,vec3(0,0,1)));float i=pow(rim,3.2)*0.5;vec3 c=mix(vec3(0.25,0.6,1.0),vec3(0.65,0.45,0.25),rim*0.35);gl_FragColor=vec4(c,i);}`,
                    transparent: true, side: THREE.BackSide, depthWrite: false,
                });
                scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 64, 64), atmosMat));

                setLoadProgress(60);

                // ══════════════════════
                // Region highlights
                // ══════════════════════
                PRISMILLON_FORMS.forEach(form => {
                    if (!form.highlights) return;
                    const meshes = [];
                    form.highlights.forEach(h => {
                        const fill = createHighlightFill(h.lat, h.lng, h.radius, form.color);
                        fill.visible = false; scene.add(fill); meshes.push(fill);
                        const ring = createHighlightRing(h.lat, h.lng, h.radius, form.color);
                        ring.visible = false; scene.add(ring); meshes.push(ring);
                    });
                    S.highlights[`p-${form.name}`] = meshes;
                });

                setLoadProgress(70);

                // ══════════════════════
                // Pokémon Sprites (WebGL — zero lag)
                // ══════════════════════
                const texCache = new Map();
                const texLoader = new THREE.TextureLoader();

                function loadTex(url) {
                    if (texCache.has(url)) return texCache.get(url);
                    const t = texLoader.load(url);
                    t.magFilter = THREE.LinearFilter;  // Smooth scaling when enlarged
                    t.minFilter = THREE.LinearMipmapLinearFilter;
                    t.generateMipmaps = true;
                    t.colorSpace = THREE.SRGBColorSpace;
                    texCache.set(url, t);
                    return t;
                }

                const allPokemon = [];
                REGIONAL_POKEMON.forEach(poke => {
                    poke.points.forEach(pt => {
                        allPokemon.push({
                            type: 'regional', name: poke.name, id: poke.id,
                            lat: pt.lat, lng: pt.lng, color: poke.color,
                            sprite: getPokemonSprite(poke.id, false),
                            zone: poke.region || '', hlKey: null,
                            region: poke.region, points: poke.points,
                        });
                    });
                });
                PRISMILLON_FORMS.forEach(form => {
                    form.points.forEach(pt => {
                        allPokemon.push({
                            type: 'prismillon', name: form.name,
                            lat: pt.lat, lng: pt.lng, color: form.color,
                            sprite: getFormSprite(form.spriteCode),
                            zone: form.zone || '',
                            hlKey: form.highlights ? `p-${form.name}` : null,
                        });
                    });
                });

                // Spiral offset
                const placed = [];
                allPokemon.forEach(m => {
                    let oLat = 0, oLng = 0, att = 0;
                    while (att < 10) {
                        if (!placed.some(p => Math.abs(m.lat + oLat - p.lat) < 4 && Math.abs(m.lng + oLng - p.lng) < 4)) break;
                        att++;
                        const a = (att * Math.PI * 2) / 7;
                        oLat = Math.cos(a) * 5 * Math.ceil(att / 7);
                        oLng = Math.sin(a) * 5 * Math.ceil(att / 7);
                    }
                    m.lat += oLat; m.lng += oLng;
                    placed.push({ lat: m.lat, lng: m.lng });
                });

                allPokemon.forEach(poke => {
                    const pos = latLngToVec3(poke.lat, poke.lng, 1.025);
                    const tex = loadTex(poke.sprite);
                    const mat = new THREE.SpriteMaterial({
                        map: tex, transparent: true,
                        depthTest: false,   // Always render on top — no z-fighting
                        depthWrite: false,
                        sizeAttenuation: false, // Screen-space size — no stretching
                    });
                    const sprite = new THREE.Sprite(mat);
                    sprite.position.copy(pos);
                    sprite.scale.set(0.045, 0.045, 1); // ~40px screen-space
                    sprite.userData = {
                        name: poke.name, zone: poke.zone, color: poke.color,
                        type: poke.type, hlKey: poke.hlKey, id: poke.id,
                        region: poke.region, points: poke.points,
                    };
                    sprite.renderOrder = 999; // Render after everything
                    scene.add(sprite);
                    S.sprites.push({ sprite, data: poke, position: pos });
                });

                setLoadProgress(85);

                // ══════════════════════
                // Geographic labels (CSS2D — text only)
                // ══════════════════════
                GEO_LABELS.forEach(lbl => {
                    const pos = latLngToVec3(lbl.lat, lbl.lng, 1.02);
                    const el = document.createElement('div');
                    el.className = `gl gl-${lbl.cls}`;
                    el.textContent = lbl.name;
                    const obj = new CSS2DObject(el);
                    obj.position.copy(pos);
                    obj.visible = false;
                    scene.add(obj);
                    S.geoLabels.push({ obj, position: pos, min: lbl.min, max: lbl.max });
                });

                setLoadProgress(100);
                setTimeout(() => setLoading(false), 300);

            } catch (err) {
                console.error('Globe error:', err);
                setLoading(false);
            }
        };

        initGlobe();

        // ══════════════════════
        // Resize
        // ══════════════════════
        const onResize = () => {
            w = container.clientWidth; h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            cssRenderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        // ══════════════════════
        // Animation loop
        // ══════════════════════
        const clock = new THREE.Clock();
        // Pre-allocated vectors to avoid GC pressure
        const _camDir = new THREE.Vector3();
        const _markerDir = new THREE.Vector3();
        let frameCount = 0;
        let lastHoveredSprite = null;

        const animate = () => {
            animFrameRef.current = requestAnimationFrame(animate);
            controls.update();
            frameCount++;

            const camPos = camera.position;
            const camDist = camPos.length();
            _camDir.copy(camPos).normalize();
            const zoomLevel = Math.max(0, 6 - camDist);
            const elapsed = clock.getElapsedTime();

            // Fade out sprites when zoomed very close (street-level = just map)
            // camDist ~3.0 = default, ~1.15 = max zoom
            const spriteFade = camDist < 1.5 ? 0 : camDist < 2.0 ? (camDist - 1.5) / 0.5 : 1;

            // ── Sprites: visibility + face-culling ──
            const visibleSprites = [];
            for (let i = 0; i < S.sprites.length; i++) {
                const { sprite, position } = S.sprites[i];
                _markerDir.copy(position).normalize();
                const dot = _camDir.dot(_markerDir);
                const faceVisible = dot > 0.15;
                sprite.visible = faceVisible && spriteFade > 0;
                if (sprite.visible) {
                    sprite.material.opacity = spriteFade;
                    visibleSprites.push(sprite);
                }
            }

            // ── Hover detection — only every 3rd frame for perf ──
            if (frameCount % 3 === 0) {
                raycaster.setFromCamera(mouse, camera);
                const hits = raycaster.intersectObjects(visibleSprites);
                const hoveredSprite = hits.length > 0 ? hits[0].object : null;
                const hoveredData = hoveredSprite ? hoveredSprite.userData : null;
                const prevHovered = S.hoveredData;

                if (hoveredData?.name !== prevHovered?.name) {
                    if (prevHovered) {
                        S.activeHL.forEach(m => { m.visible = false; });
                        S.activeHL = [];
                    }
                    if (hoveredData) {
                        if (hoveredData.hlKey && S.highlights[hoveredData.hlKey]) {
                            S.highlights[hoveredData.hlKey].forEach(m => { m.visible = true; });
                            S.activeHL = S.highlights[hoveredData.hlKey];
                        }
                    }
                    S.hoveredData = hoveredData;
                }
                lastHoveredSprite = hoveredSprite;
            }

            const hoveredData = S.hoveredData;

            // Hover sprite glow (scale up) — reset all first, then enlarge hovered
            const BASE_SCALE = 0.045;
            for (let i = 0; i < S.sprites.length; i++) {
                const sp = S.sprites[i].sprite;
                if (sp.visible) sp.scale.set(BASE_SCALE, BASE_SCALE, 1);
            }
            if (lastHoveredSprite && lastHoveredSprite.visible) {
                lastHoveredSprite.scale.set(BASE_SCALE * 1.4, BASE_SCALE * 1.4, 1);
            }

            // Tooltip (follows cursor — zero sync issue)
            if (hoveredData) {
                tooltip.style.display = 'block';
                tooltip.style.left = `${S.mouseClient.x}px`;
                tooltip.style.top = `${S.mouseClient.y - 55}px`;
                // Only update innerHTML when hover changes (avoid layout thrash)
                if (tooltip._lastName !== hoveredData.name) {
                    const zoneHtml = hoveredData.zone
                        ? `<div class="sg-tt-zone" style="color:${hoveredData.color}">${hoveredData.zone}</div>` : '';
                    tooltip.innerHTML = `<div class="sg-tt-name">${hoveredData.name}</div>${zoneHtml}`;
                    tooltip.style.borderColor = hoveredData.color || 'rgba(255,255,255,0.3)';
                    tooltip._lastName = hoveredData.name;
                }
                renderer.domElement.style.cursor = 'pointer';
            } else {
                if (tooltip.style.display !== 'none') {
                    tooltip.style.display = 'none';
                    tooltip._lastName = null;
                    renderer.domElement.style.cursor = '';
                }
            }

            // Pulse active highlight rings (cheap)
            for (let i = 0; i < S.activeHL.length; i++) {
                const m = S.activeHL[i];
                if (m.isLine) m.material.opacity = 0.4 + 0.3 * Math.sin(elapsed * 3);
            }

            // ── Geo labels: only update every 5th frame ──
            if (frameCount % 5 === 0) {
                for (let i = 0; i < S.geoLabels.length; i++) {
                    const { obj, position, min, max } = S.geoLabels[i];
                    _markerDir.copy(position).normalize();
                    const dot = _camDir.dot(_markerDir);
                    const vis = dot > 0.3 && zoomLevel >= min && zoomLevel <= max;
                    obj.visible = vis;
                    if (vis) {
                        const fi = smoothstep(min, min + 0.3, zoomLevel);
                        const fo = smoothstep(max, max - 0.3, zoomLevel);
                        const fd = smoothstep(0.3, 0.5, dot);
                        obj.element.style.opacity = Math.min(fi, fo, fd).toFixed(2);
                    }
                }
            }

            renderer.render(scene, camera);
            cssRenderer.render(scene, camera);
        };
        animate();

        // ══════════════════════
        // Cleanup
        // ══════════════════════
        return () => {
            window.removeEventListener('resize', onResize);
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerdown', onPointerDown);
            container.removeEventListener('pointerup', onPointerUp);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            S.sprites.forEach(({ sprite }) => { scene.remove(sprite); sprite.material.dispose(); });
            S.geoLabels.forEach(({ obj }) => scene.remove(obj));
            Object.values(S.highlights).forEach(arr => arr.forEach(m => {
                scene.remove(m); m.geometry?.dispose(); m.material?.dispose();
            }));
            if (tooltip.parentElement) tooltip.remove();
            if (renderer.domElement.parentElement) renderer.domElement.remove();
            if (cssRenderer.domElement.parentElement) cssRenderer.domElement.remove();
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    return (
        <>
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {/* Loading */}
            <div className={`absolute inset-0 z-[100] bg-[#060612] flex flex-col items-center justify-center transition-all duration-700 ${loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-full border-4 border-green-500/20 border-t-green-400 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl">🌍</span></div>
                </div>
                <h2 className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'var(--font-outfit)' }}>{t('globe.loadingTitle')}</h2>
                <p className="text-gray-500 text-sm mb-6">{t('globe.loadingSubtitle')}</p>
                <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${loadProgress}%` }} />
                </div>
                <p className="text-gray-600 text-xs mt-2">{loadProgress}%</p>
            </div>

            <style jsx global>{`
                /* Tooltip */
                .sg-tooltip {
                    position: absolute; pointer-events: none; display: none; z-index: 50;
                    background: rgba(0,0,0,0.92); border: 1px solid rgba(255,255,255,0.25);
                    border-radius: 10px; padding: 5px 12px; white-space: nowrap;
                    text-align: center; transform: translateX(-50%);
                    backdrop-filter: blur(6px);
                }
                .sg-tt-name { font-size: 11px; font-weight: 700; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }
                .sg-tt-zone { font-size: 9px; font-weight: 600; opacity: 0.9; margin-top: 2px; }

                /* Geo labels */
                .gl {
                    color: rgba(255,255,255,0.6); font-family: var(--font-outfit), sans-serif;
                    text-transform: uppercase; letter-spacing: 0.12em;
                    text-shadow: 0 1px 5px rgba(0,0,0,0.9), 0 0 15px rgba(0,0,0,0.5);
                    pointer-events: none; white-space: nowrap; transition: opacity 0.3s;
                }
                .gl-lg { font-size: 14px; font-weight: 800; letter-spacing: 0.22em; color: rgba(255,255,255,0.5); }
                .gl-md { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.6); }
                .gl-sm { font-size: 9px; font-weight: 600; letter-spacing: 0.06em; }
                .gl-hl { color: rgba(255,220,80,0.9) !important; text-shadow: 0 0 8px rgba(255,200,0,0.4), 0 1px 4px rgba(0,0,0,0.9); }
            `}</style>
        </>
    );
}
