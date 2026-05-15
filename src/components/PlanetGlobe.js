'use client';

import React, { useState, useRef, useEffect, Suspense, useMemo, useCallback, Component } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { PRISMILLON_FORMS, getFormSprite } from '@/data/prismillonForms';
import { REGIONAL_POKEMON } from '@/data/regionalPokemon';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { REGION_POLYGONS, REGIONAL_ZONE_MAP } from '@/data/regionPolygons';
import { useLanguage } from '@/context/LanguageContext';

function latLngToVector3(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    // +90 offset to align markers with the globe mesh rotation of -Math.PI/2
    const theta = (lng + 90) * (Math.PI / 180);
    return new THREE.Vector3(
        -(radius * Math.sin(phi) * Math.cos(theta)),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// ─── Region Highlight (colored circle on globe surface) ───
function RegionHighlight({ lat, lng, radius, color }) {
    const segments = 48;
    const geometry = useMemo(() => {
        // Create a circle of points on the sphere surface
        const radiusRad = (radius * Math.PI) / 180;
        const positions = [];
        const indices = [];

        // Center point
        const center = latLngToVector3(lat, lng, 2.015);
        positions.push(center.x, center.y, center.z);

        // Ring points
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const pLat = lat + radius * Math.cos(angle);
            const pLng = lng + (radius * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180);
            const pt = latLngToVector3(pLat, pLng, 2.015);
            positions.push(pt.x, pt.y, pt.z);
        }

        // Triangle fan from center
        for (let i = 1; i <= segments; i++) {
            indices.push(0, i, i + 1);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }, [lat, lng, radius]);

    const col = useMemo(() => new THREE.Color(color), [color]);

    return (
        <mesh geometry={geometry}>
            <meshBasicMaterial color={col} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
    );
}

// ─── Pulsing ring around highlighted region ───
function RegionRing({ lat, lng, radius, color }) {
    const ringRef = useRef();
    const segments = 64;

    const geometry = useMemo(() => {
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const pLat = lat + radius * Math.cos(angle);
            const pLng = lng + (radius * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180);
            const pt = latLngToVector3(pLat, pLng, 2.02);
            points.push(pt);
        }
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [lat, lng, radius]);

    const col = useMemo(() => new THREE.Color(color), [color]);

    useFrame((state) => {
        if (ringRef.current) {
            const t = state.clock.getElapsedTime();
            ringRef.current.material.opacity = 0.4 + 0.3 * Math.sin(t * 3);
        }
    });

    return (
        <line ref={ringRef} geometry={geometry}>
            <lineBasicMaterial color={col} transparent opacity={0.5} linewidth={2} />
        </line>
    );
}

// ─── Geographic Region Outline (polygon on globe surface) ───
function GeoRegionOutline({ regionKey, color }) {
    const ringRef = useRef([]);
    const sphereR = 2.018;

    const polygonData = REGION_POLYGONS[regionKey];

    // Handle special zone types (latitude/longitude bands)
    const resolvedPoints = useMemo(() => {
        if (!polygonData) return null;
        if (typeof polygonData === 'string') {
            const segs = 80;
            if (polygonData === 'EQUATORIAL') {
                // Draw two latitude circles at +30 and -30
                return {
                    type: 'band',
                    lines: [
                        Array.from({ length: segs + 1 }, (_, i) => [30, -180 + (360 * i) / segs]),
                        Array.from({ length: segs + 1 }, (_, i) => [-30, -180 + (360 * i) / segs]),
                    ],
                };
            }
            if (polygonData === 'POLAR_NORTH') {
                return {
                    type: 'band',
                    lines: [Array.from({ length: segs + 1 }, (_, i) => [52, -180 + (360 * i) / segs])],
                };
            }
            if (polygonData === 'HEMISPHERE_SOUTH') {
                return {
                    type: 'band',
                    lines: [Array.from({ length: segs + 1 }, (_, i) => [0, -180 + (360 * i) / segs])],
                };
            }
            if (polygonData === 'HEMISPHERE_EAST') {
                return {
                    type: 'band',
                    lines: [Array.from({ length: segs + 1 }, (_, i) => [-90 + (180 * i) / segs, 0]),
                            Array.from({ length: segs + 1 }, (_, i) => [-90 + (180 * i) / segs, 180])],
                };
            }
            if (polygonData === 'HEMISPHERE_WEST') {
                return {
                    type: 'band',
                    lines: [Array.from({ length: segs + 1 }, (_, i) => [-90 + (180 * i) / segs, 0]),
                            Array.from({ length: segs + 1 }, (_, i) => [-90 + (180 * i) / segs, -180])],
                };
            }
            return null;
        }
        // Regular polygon
        return { type: 'polygon', points: polygonData };
    }, [polygonData]);

    const outlineGeometry = useMemo(() => {
        if (!resolvedPoints) return null;
        if (resolvedPoints.type === 'band') {
            // Return multiple line geometries for bands
            return resolvedPoints.lines.map(line => {
                const pts = line.map(([lat, lng]) => latLngToVector3(lat, lng, sphereR));
                return new THREE.BufferGeometry().setFromPoints(pts);
            });
        }
        // Polygon outline
        const pts = resolvedPoints.points.map(([lat, lng]) => latLngToVector3(lat, lng, sphereR));
        return [new THREE.BufferGeometry().setFromPoints(pts)];
    }, [resolvedPoints]);

    const fillGeometry = useMemo(() => {
        if (!resolvedPoints || resolvedPoints.type !== 'polygon') return null;
        const pts = resolvedPoints.points;
        if (pts.length < 3) return null;

        const positions = [];
        const indices = [];
        // Center point (average)
        let cLat = 0, cLng = 0;
        pts.forEach(([lat, lng]) => { cLat += lat; cLng += lng; });
        cLat /= pts.length;
        cLng /= pts.length;
        const center = latLngToVector3(cLat, cLng, sphereR - 0.002);
        positions.push(center.x, center.y, center.z);

        pts.forEach(([lat, lng]) => {
            const p = latLngToVector3(lat, lng, sphereR - 0.002);
            positions.push(p.x, p.y, p.z);
        });

        // Triangle fan from center
        for (let i = 1; i < pts.length; i++) {
            indices.push(0, i, i + 1);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }, [resolvedPoints]);

    const col = useMemo(() => new THREE.Color(color), [color]);

    useFrame((state) => {
        if (ringRef.current?.length) {
            const t = state.clock.getElapsedTime();
            ringRef.current.forEach(r => {
                if (r?.material) r.material.opacity = 0.5 + 0.2 * Math.sin(t * 2.5);
            });
        }
    });

    if (!outlineGeometry) return null;

    return (
        <group>
            {/* Semi-transparent fill */}
            {fillGeometry && (
                <mesh geometry={fillGeometry}>
                    <meshBasicMaterial color={col} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
                </mesh>
            )}
            {/* Outline border */}
            {outlineGeometry.map((geo, i) => (
                <line key={i} ref={el => {
                    if (!ringRef.current) ringRef.current = [];
                    ringRef.current[i] = el;
                }} geometry={geo}>
                    <lineBasicMaterial color={col} transparent opacity={0.6} linewidth={2} />
                </line>
            ))}
        </group>
    );
}

// ─── Sprite Marker (shows Pokemon/Prismillon sprite on globe) ───
function SpriteMarker({ lat, lng, spriteUrl, label, zone, color, onSelect, isSelected, size = 28, modalOpen, onHover, onUnhover }) {
    const [hovered, setHovered] = useState(false);
    const [visible, setVisible] = useState(true);
    const position = useMemo(() => latLngToVector3(lat, lng, 2.06), [lat, lng]);
    useFrame((state) => {
        const camDir = state.camera.position.clone().normalize();
        const markerDir = position.clone().normalize();
        const dot = camDir.dot(markerDir);
        setVisible(dot > 0.15);
    });

    if (!visible || modalOpen) return null;

    return (
        <group position={position}>
            <Html center style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                zIndexRange={[isSelected ? 100 : hovered ? 50 : 10, isSelected ? 100 : hovered ? 50 : 10]}
            >
                <div
                    onClick={(e) => { e.stopPropagation(); onSelect(); }}
                    onMouseEnter={() => { setHovered(true); onHover && onHover(); }}
                    onMouseLeave={() => { setHovered(false); onUnhover && onUnhover(); }}
                    onTouchStart={() => { onHover && onHover(); }}
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        transform: `translate(-50%, -50%) scale(${isSelected ? 1.4 : hovered ? 1.2 : 1})`,
                        transition: 'transform 0.2s ease, opacity 0.3s ease',
                        filter: isSelected
                            ? `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color}80)`
                            : hovered
                                ? `drop-shadow(0 0 6px ${color}80)`
                                : `drop-shadow(0 0 3px rgba(0,0,0,0.8))`,
                        cursor: 'pointer',
                    }}
                >
                    <img src={spriteUrl} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} draggable={false} />
                </div>
                {(hovered || isSelected) && (
                    <div style={{
                        position: 'absolute',
                        top: `-${size / 2 + (zone ? 32 : 20)}px`,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.92)',
                        color: 'white',
                        fontSize: '10px',
                        padding: zone ? '4px 10px' : '2px 8px',
                        borderRadius: zone ? '10px' : '999px',
                        border: `1px solid ${color}`,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        textAlign: 'center',
                        lineHeight: 1.3,
                    }}>
                        <div>{label}</div>
                        {zone && <div style={{ fontSize: '8px', fontWeight: 'normal', color: color, opacity: 0.9, marginTop: '1px' }}>{zone}</div>}
                    </div>
                )}
            </Html>
        </group>
    );
}

// ─── Toon gradient texture for cel-shading ───
function createToonGradient() {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    // 4 discrete shading bands for a game-like look
    ctx.fillStyle = '#555555'; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#999999'; ctx.fillRect(1, 0, 1, 1);
    ctx.fillStyle = '#cccccc'; ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    return tex;
}

// ─── Geographic labels that appear on zoom ───
const GEO_LABELS = [
    { text: 'EUROPE', lat: 54, lng: 15, minDist: 0, maxDist: 8 },
    { text: 'ASIE', lat: 42, lng: 85, minDist: 0, maxDist: 8 },
    { text: 'AFRIQUE', lat: 5, lng: 20, minDist: 0, maxDist: 8 },
    { text: 'AMÉRIQUE DU NORD', lat: 45, lng: -100, minDist: 0, maxDist: 8 },
    { text: 'AMÉRIQUE DU SUD', lat: -15, lng: -58, minDist: 0, maxDist: 8 },
    { text: 'OCÉANIE', lat: -25, lng: 140, minDist: 0, maxDist: 8 },
    // Cities/countries appear only when zoomed in
    { text: 'France', lat: 46.5, lng: 2.5, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Japon', lat: 36, lng: 138, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Australie', lat: -28, lng: 134, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Égypte', lat: 27, lng: 30, minDist: 0, maxDist: 4.5, size: 'sm' },
    { text: 'Brésil', lat: -12, lng: -52, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Canada', lat: 58, lng: -96, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'USA', lat: 38, lng: -97, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Inde', lat: 22, lng: 78, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Russie', lat: 60, lng: 100, minDist: 0, maxDist: 5.5, size: 'sm' },
    { text: 'Mexique', lat: 23, lng: -102, minDist: 0, maxDist: 4.5, size: 'sm' },
    { text: 'Royaume-Uni', lat: 54, lng: -2, minDist: 0, maxDist: 4.5, size: 'xs' },
    { text: 'Corée', lat: 36, lng: 128, minDist: 0, maxDist: 4.5, size: 'xs' },
    { text: 'Hawaï', lat: 21, lng: -157, minDist: 0, maxDist: 4, size: 'xs' },
    { text: 'Nouvelle-Zélande', lat: -42, lng: 174, minDist: 0, maxDist: 4, size: 'xs' },
    { text: 'Grèce', lat: 38, lng: 24, minDist: 0, maxDist: 4, size: 'xs' },
];

function GeoLabel({ text, lat, lng, maxDist, size }) {
    const position = useMemo(() => latLngToVector3(lat, lng, 2.025), [lat, lng]);
    const [visible, setVisible] = useState(false);
    const [opacity, setOpacity] = useState(0);

    const sizeStyles = {
        xl: { fontSize: '14px', fontWeight: '900', letterSpacing: '0.25em', textTransform: 'uppercase' },
        sm: { fontSize: '10px', fontWeight: '700', letterSpacing: '0.1em' },
        xs: { fontSize: '8px', fontWeight: '600', letterSpacing: '0.05em' },
    };
    const style = sizeStyles[size] || sizeStyles.xl;

    useFrame((state) => {
        const camDir = state.camera.position.clone().normalize();
        const markerDir = position.clone().normalize();
        const dot = camDir.dot(markerDir);
        const dist = state.camera.position.length();
        const isFacing = dot > 0.2;
        const inRange = dist < maxDist;
        const shouldShow = isFacing && inRange;
        setVisible(shouldShow);
        // Fade based on distance
        if (shouldShow) {
            const fadeStart = maxDist * 0.85;
            const fadeFactor = dist < fadeStart ? 1 : Math.max(0, 1 - (dist - fadeStart) / (maxDist - fadeStart));
            setOpacity(fadeFactor * 0.35);
        }
    });

    if (!visible) return null;

    return (
        <group position={position}>
            <Html center style={{ pointerEvents: 'none' }} zIndexRange={[1, 1]}>
                <div style={{
                    ...style,
                    color: 'rgba(255,255,255,' + opacity + ')',
                    textShadow: `0 0 20px rgba(255,255,255,${opacity * 0.3}), 0 2px 0 rgba(0,0,0,${opacity * 0.5})`,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    transition: 'color 0.3s, text-shadow 0.3s',
                    fontFamily: 'var(--font-outfit), Georgia, serif',
                }}>
                    {text}
                </div>
            </Html>
        </group>
    );
}

// ─── Player Dots (small glowing spheres for registered players) ───
function PlayerDots({ players }) {
    const dots = useMemo(() => {
        if (!players?.length) return [];
        return players.map((p) => ({
            position: latLngToVector3(p.lat, p.lng, 2.035),
            color: new THREE.Color(p.color || '#a78bfa'),
        }));
    }, [players]);

    return dots.map((d, i) => (
        <mesh key={i} position={d.position}>
            <sphereGeometry args={[0.018, 8, 8]} />
            <meshBasicMaterial color={d.color} transparent opacity={0.9} />
        </mesh>
    ));
}

// ─── Globe ───
function Globe({ onSelectForm, selectedForm, showPrismillon, showRegionals, modalOpen, hoveredForm, stylized, playerMarkers }) {
    const meshRef = useRef();
    const [loaded, setLoaded] = useState(false);
    const toonGradient = useMemo(() => stylized ? createToonGradient() : null, [stylized]);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        const texturePath = stylized ? '/earth-pokemon.jpg' : '/earth-texture.jpg';

        loader.load(texturePath, (tex) => {
            if (!meshRef.current) return;
            tex.anisotropy = 16;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;

            if (stylized) {
                // For toon material, set the map directly
                meshRef.current.material.map = tex;
                if (toonGradient) {
                    meshRef.current.material.gradientMap = toonGradient;
                }
            } else {
                meshRef.current.material.map = tex;
            }
            meshRef.current.material.needsUpdate = true;
            setLoaded(true);
        });
        if (!stylized) {
            loader.load('/earth-bump.png', (bumpTex) => {
                if (meshRef.current) {
                    bumpTex.anisotropy = 16;
                    meshRef.current.material.bumpMap = bumpTex;
                    meshRef.current.material.bumpScale = 0.04;
                    meshRef.current.material.needsUpdate = true;
                }
            });
        }
    }, [stylized, toonGradient]);

    return (
        <group>
            <mesh ref={meshRef} rotation={[0, -Math.PI / 2, 0]}>
                <sphereGeometry args={[2, 128, 128]} />
                {stylized ? (
                    <meshToonMaterial
                        color={loaded ? '#ffffff' : '#44aa44'}
                        gradientMap={toonGradient}
                    />
                ) : (
                    <meshStandardMaterial color={loaded ? '#ffffff' : '#4488cc'} roughness={0.7} metalness={0.15} />
                )}
            </mesh>
            {/* Atmosphere glow */}
            <mesh scale={[1.012, 1.012, 1.012]}>
                <sphereGeometry args={[2, 64, 64]} />
                <meshBasicMaterial color={stylized ? '#66ffaa' : '#88ccff'} transparent opacity={stylized ? 0.08 : 0.06} side={THREE.BackSide} />
            </mesh>

            {/* Region highlights when hovering a Prismillon form (circle-based) */}
            {hoveredForm?.type === 'prismillon' && hoveredForm?.highlights && hoveredForm.highlights.map((h, i) => (
                <React.Fragment key={`hl-${hoveredForm.name}-${i}`}>
                    <RegionHighlight lat={h.lat} lng={h.lng} radius={h.radius} color={hoveredForm.color} />
                    <RegionRing lat={h.lat} lng={h.lng} radius={h.radius} color={hoveredForm.color} />
                </React.Fragment>
            ))}

            {/* Geographic region outlines when hovering a regional Pokémon */}
            {hoveredForm?.type === 'regional' && hoveredForm?.id && REGIONAL_ZONE_MAP[hoveredForm.id] &&
                REGIONAL_ZONE_MAP[hoveredForm.id].map((regionKey) => (
                    <GeoRegionOutline key={`geo-${hoveredForm.id}-${regionKey}`} regionKey={regionKey} color={hoveredForm.color} />
                ))
            }

            {/* Geographic labels (stylized mode only) */}
            {stylized && GEO_LABELS.map((label) => (
                <GeoLabel key={label.text} {...label} />
            ))}

            {/* All markers with overlap prevention */}
            {(() => {
                // Collect all markers and offset overlapping ones
                const allMarkers = [];
                if (showPrismillon) {
                    PRISMILLON_FORMS.forEach((form) => {
                        form.points.forEach((pt, i) => {
                            const formWithType = { ...form, type: 'prismillon' };
                            allMarkers.push({
                                key: `p-${form.name}-${i}`,
                                lat: pt.lat, lng: pt.lng,
                                spriteUrl: getFormSprite(form.spriteCode),
                                label: form.name, zone: form.zone, color: form.color, size: 30,
                                isSelected: selectedForm?.name === form.name && selectedForm?.type === 'prismillon',
                                onSelect: () => onSelectForm(formWithType),
                                onHover: () => onSelectForm.__setHovered?.(formWithType),
                                onUnhover: () => onSelectForm.__setHovered?.(null),
                            });
                        });
                    });
                }
                if (showRegionals) {
                    REGIONAL_POKEMON.forEach((poke) => {
                        poke.points.forEach((pt, i) => {
                            allMarkers.push({
                                key: `r-${poke.id}-${i}`,
                                lat: pt.lat, lng: pt.lng,
                                spriteUrl: getPokemonSprite(poke.id, false),
                                label: poke.name, zone: poke.region, color: poke.color, size: 26,
                                isSelected: selectedForm?.id === poke.id && selectedForm?.type === 'regional',
                                onSelect: () => onSelectForm({ ...poke, type: 'regional' }),
                                onHover: () => onSelectForm.__setHovered?.({ ...poke, type: 'regional' }),
                                onUnhover: () => onSelectForm.__setHovered?.(null),
                            });
                        });
                    });
                }

                // Detect overlaps and offset (within 5 degrees)
                const placed = [];
                allMarkers.forEach((m) => {
                    let offsetLat = 0, offsetLng = 0;
                    let attempts = 0;
                    while (attempts < 8) {
                        const tooClose = placed.some(p =>
                            Math.abs((m.lat + offsetLat) - p.lat) < 5 &&
                            Math.abs((m.lng + offsetLng) - p.lng) < 5
                        );
                        if (!tooClose) break;
                        attempts++;
                        // Spiral offset
                        const angle = (attempts * Math.PI * 2) / 6;
                        offsetLat = Math.cos(angle) * 6 * Math.ceil(attempts / 6);
                        offsetLng = Math.sin(angle) * 6 * Math.ceil(attempts / 6);
                    }
                    m.lat += offsetLat;
                    m.lng += offsetLng;
                    placed.push({ lat: m.lat, lng: m.lng });
                });

                return allMarkers.map(m => (
                    <SpriteMarker
                        key={m.key}
                        lat={m.lat} lng={m.lng}
                        spriteUrl={m.spriteUrl}
                        label={m.label}
                        zone={m.zone}
                        color={m.color}
                        size={m.size}
                        isSelected={m.isSelected}
                        onSelect={m.onSelect}
                        onHover={m.onHover}
                        onUnhover={m.onUnhover}
                        modalOpen={modalOpen}
                    />
                ));
            })()}

            {/* Player location dots */}
            {playerMarkers?.length > 0 && <PlayerDots players={playerMarkers} />}
        </group>
    );
}

// ─── Camera Zoom (GTA satellite-style) ───
function CameraController({ selectedForm, controlsRef }) {
    const { camera } = useThree();
    const zooming = useRef(false);
    const phase = useRef(0);
    const t = useRef(0);
    const start = useRef(new THREE.Vector3());
    const mid = useRef(new THREE.Vector3());
    const end = useRef(new THREE.Vector3());

    useEffect(() => {
        if (selectedForm?.points?.[0]) {
            const { lat, lng } = selectedForm.points[0];
            end.current = latLngToVector3(lat, lng, 2.7);
            start.current.copy(camera.position);
            mid.current.copy(camera.position).normalize().multiplyScalar(9);
            zooming.current = true;
            phase.current = 1;
            t.current = 0;
            if (controlsRef.current) controlsRef.current.autoRotate = false;
        }
    }, [selectedForm, camera]);

    useFrame((_, dt) => {
        if (!zooming.current) return;
        t.current += dt;
        if (phase.current === 1) {
            const p = Math.min(t.current / 0.3, 1);
            camera.position.lerpVectors(start.current, mid.current, 1 - Math.pow(1 - p, 3));
            camera.lookAt(0, 0, 0);
            if (p >= 1) { phase.current = 2; t.current = 0; }
        } else if (phase.current === 2) {
            const p = Math.min(t.current / 0.5, 1);
            const e = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
            camera.position.lerpVectors(mid.current, end.current.clone().normalize().multiplyScalar(9), e);
            camera.lookAt(0, 0, 0);
            if (p >= 1) { phase.current = 3; t.current = 0; start.current.copy(camera.position); }
        } else if (phase.current === 3) {
            const p = Math.min(t.current / 0.6, 1);
            const e = p < 0.4 ? 2.5*p*p : 1 - Math.pow(-2*p+2, 4)/16;
            camera.position.lerpVectors(start.current, end.current, e);
            camera.lookAt(0, 0, 0);
            if (p >= 1) {
                zooming.current = false;
                if (controlsRef.current) { controlsRef.current.autoRotate = true; controlsRef.current.autoRotateSpeed = 0.08; }
            }
        }
    });
    return null;
}

function Scene({ selectedForm, onSelectForm, showPrismillon, showRegionals, modalOpen, hoveredForm, stylized, playerMarkers }) {
    const controlsRef = useRef();
    return (
        <>
            <ambientLight intensity={stylized ? 0.6 : 0.4} />
            <directionalLight position={[5, 3, 5]} intensity={stylized ? 1.5 : 1.2} />
            <pointLight position={[-5, -3, -5]} intensity={0.3} color={stylized ? '#44ff88' : '#4488ff'} />
            <Globe onSelectForm={onSelectForm} selectedForm={selectedForm} showPrismillon={showPrismillon} showRegionals={showRegionals} modalOpen={modalOpen} hoveredForm={hoveredForm} stylized={stylized} playerMarkers={playerMarkers} />
            <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            <CameraController selectedForm={selectedForm} controlsRef={controlsRef} />
            <OrbitControls ref={controlsRef} enablePan={false} enableZoom minDistance={2.5} maxDistance={10} rotateSpeed={0.5} autoRotate autoRotateSpeed={0.2} />
        </>
    );
}

function CanvasErrorFallback({ error }) {
    const { t } = useLanguage();
    return (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            <div>
                <p style={{ marginBottom: '8px' }}>{t('regional.globeError3D')}</p>
                <p style={{ fontSize: '11px', color: '#555' }}>{error?.message || t('regional.globeErrorUnknown')}</p>
                <button onClick={() => window.location.reload()} style={{ marginTop: '12px', padding: '6px 16px', background: '#333', border: '1px solid #555', borderRadius: '8px', color: '#ccc', cursor: 'pointer' }}>{t('regional.globeRetry')}</button>
            </div>
        </div>
    );
}

// Error boundary to catch Three.js/Canvas crashes
class CanvasErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    render() {
        if (this.state.hasError) return <CanvasErrorFallback error={this.state.error} />;
        return this.props.children;
    }
}

export default function PlanetGlobe({ selectedForm, onSelectForm, showPrismillon = true, showRegionals, modalOpen, stylized = false, playerMarkers }) {
    const { t } = useLanguage();
    const [hasError, setHasError] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [debugInfo, setDebugInfo] = useState('');
    const [hoveredForm, setHoveredForm] = useState(null);
    const containerRef = useRef(null);

    // Attach hover handlers to onSelectForm so Globe can trigger them
    const onSelectFormWithHover = useCallback((form) => {
        onSelectForm(form);
    }, [onSelectForm]);
    onSelectFormWithHover.__setHovered = setHoveredForm;

    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                const c = document.createElement('canvas');
                c.width = 1;
                c.height = 1;
                const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
                    || c.getContext('webgl', { failIfMajorPerformanceCaveat: false })
                    || c.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: false });
                if (!gl) {
                    setDebugInfo('WebGL context null');
                    setHasError(true);
                    return;
                }
                const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
                const renderer = debugExt ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) : 'unknown';
                setDebugInfo(`GL: ${renderer}`);
                gl.getExtension('WEBGL_lose_context')?.loseContext();
            } catch (e) {
                setDebugInfo(`Error: ${e.message}`);
                setHasError(true);
                return;
            }
            setIsReady(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    if (hasError) return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-8">
                <p className="text-gray-400 text-lg mb-2">{t('globe.webglNotSupported')}</p>
                <p className="text-gray-600 text-sm">{t('globe.enableHardwareAccel')}</p>
                <p className="text-gray-700 text-xs mt-2">{t('globe.braveHint')}</p>
                {debugInfo && <p className="text-gray-800 text-[10px] mt-4">{debugInfo}</p>}
            </div>
        </div>
    );

    if (!isReady) return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
        </div>
    );

    return (
        <CanvasErrorBoundary>
            <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', zIndex: 0 }}>
                <Canvas
                    camera={{ position: [0, 1.5, 7], fov: 45 }}
                    gl={{
                        antialias: true,
                        alpha: false,
                        powerPreference: 'high-performance',
                        failIfMajorPerformanceCaveat: false,
                        preserveDrawingBuffer: false,
                        stencil: false,
                        depth: true,
                    }}
                    style={{ width: '100vw', height: '100vh', display: 'block', touchAction: 'none' }}
                    resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
                    dpr={[1, 2]}
                    fallback={<div style={{ width: '100vw', height: '100vh', background: '#050510', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>{t('regional.loadingGlobe')}</div>}
                    onCreated={({ gl, size }) => {
                        gl.setClearColor(0x050510, 1);
                        if (size.width === 0 || size.height === 0) {
                            gl.setSize(window.innerWidth, window.innerHeight);
                        }
                    }}
                >
                    <Suspense fallback={null}>
                        <Scene selectedForm={selectedForm} onSelectForm={onSelectFormWithHover} showPrismillon={showPrismillon} showRegionals={showRegionals} modalOpen={modalOpen} hoveredForm={hoveredForm} stylized={stylized} playerMarkers={playerMarkers} />
                    </Suspense>
                </Canvas>
            </div>
        </CanvasErrorBoundary>
    );
}
