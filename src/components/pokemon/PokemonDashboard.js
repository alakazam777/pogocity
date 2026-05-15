'use client';

import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { Upload, Loader2, X, Edit2, ArrowDownUp, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession, signIn } from "next-auth/react";
import StatsTable from './StatsTable';
import ProgressionGraph from './ProgressionGraph';
import { useLanguage } from '@/context/LanguageContext';
import { reconcileLevel } from '@/lib/pogoLevels';

// Lazy-load heavy components that are below the fold
const PokemonChecklist = lazy(() => import('./PokemonChecklist'));
const PokemonManager = lazy(() => import('./PokemonManager'));
const PokemonMedals = lazy(() => import('./PokemonMedals'));

// ── Regional medal auto-complete from checklist ──
// Dex ranges for each region medal (inclusive)
const REGION_DEX_RANGES = {
    'Kanto':  [1, 151],
    'Johto':  [152, 251],
    'Hoenn':  [252, 386],
    'Sinnoh': [387, 493],
    'Unova':  [494, 649],
    'Kalos':  [650, 721],
    'Alola':  [722, 809],
    'Galar':  [810, 905],
    'Paldea': [906, 1025],
};
// Hisuian forms are variants of existing Pokémon, tracked separately.
// In Pokémon GO the Hisui medal counts these specific form entries.
const HISUI_FORM_KEYS = [
    '58_01', '59_01',     // Growlithe / Arcanine Hisui
    '100_01', '101_01',   // Voltorb / Electrode Hisui
    '157_01',             // Typhlosion Hisui
    '211_01',             // Qwilfish Hisui
    '215_01',             // Sneasel Hisui
    '503_01',             // Samurott Hisui
    '549_01',             // Lilligant Hisui
    '570_01', '571_01',   // Zorua / Zoroark Hisui
    '628_01',             // Braviary Hisui
    '705_01', '706_01',   // Sliggoo / Goodra Hisui
    '713_01',             // Avalugg Hisui
    '724_01',             // Decidueye Hisui
];

function computeRegionalMedals(checklist) {
    const counts = {};

    // Count unique base IDs per dex range
    for (const [region, [minId, maxId]] of Object.entries(REGION_DEX_RANGES)) {
        const seen = new Set();
        for (const [key, val] of Object.entries(checklist)) {
            if (!val?.normal) continue;
            const baseId = parseInt(key.includes('_') ? key.split('_')[0] : key);
            if (!isNaN(baseId) && baseId >= minId && baseId <= maxId) seen.add(baseId);
        }
        counts[region] = seen.size;
    }

    // Hisui: count specific Hisuian form keys
    counts['Hisui'] = HISUI_FORM_KEYS.filter(key => checklist[key]?.normal).length;

    return counts;
}

const STAT_FIELDS = [
    { id: 'level', labelKey: 'dashboard.statLevel', type: 'number', keywords: ['niveau', 'level', 'niv'] },
    { id: 'xp', labelKey: 'dashboard.statXp', type: 'number', keywords: ['xp', 'experience', 'total de px'] },
    { id: 'distance', labelKey: 'dashboard.statDistance', type: 'number', keywords: ['distance', 'walked', 'km', 'marchée'] },
    { id: 'caught', labelKey: 'dashboard.statCaught', type: 'number', keywords: ['caught', 'pokemon', 'attrapés'] },
    { id: 'stops', labelKey: 'dashboard.statStops', type: 'number', keywords: ['stops', 'visited', 'visités'] },
    { id: 'stardust', labelKey: 'dashboard.statStardust', type: 'number', keywords: ['stardust', 'poussière', 'etoile'] },
];

export default function PokemonDashboard({ user, onLogout }) {
    const { t, lang } = useLanguage();
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'ja' ? 'ja-JP' : 'en-US';
    const { data: session } = useSession();
    const [stats, setStats] = useState(user.stats || {});
    const [checklist, setChecklist] = useState(user.checklist || {});
    const [medals, setMedals] = useState(user.medals || {});
    const [trainerColor, setTrainerColor] = useState(user.trainerColor || 'text-purple-400');
    const [discordId, setDiscordId] = useState(user.discordId);
    const [settings, setSettings] = useState(user.settings || { showFriendCode: true });
    const [favorites, setFavorites] = useState(user.favorites || []);
    const [isProcessing, setIsProcessing] = useState(false);

    // Ensure history items have IDs for drag and drop
    const [history, setHistory] = useState(() => {
        const initialHistory = user.history || [];
        // Sort new to old by default
        initialHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        return initialHistory.map((h, i) => ({
            ...h,
            id: h.id || `history-${Date.now()}-${i}`
        }));
    });

    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [saveError, setSaveError] = useState(false);

    const [editingEntry, setEditingEntry] = useState(null);
    const [editingUsername, setEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState(user.username);
    const [renameError, setRenameError] = useState('');

    // Ref to track pending save data for beforeunload flush
    const pendingSaveRef = useRef(null);

    // Skip the first auto-save (mount effect) to avoid showing the toast on page load
    const isInitialMountRef = useRef(true);

    // Track last saved payload (as JSON string) to skip no-op saves.
    // Auto-save fires on every effect dep change; without this, toggling and
    // un-toggling a Pokémon (or any state churn) hits the server even though
    // nothing changed. The checklist alone is ~1000 entries — significant traffic.
    const lastSavedPayloadRef = useRef(null);

    // Track stardust changes to auto-create history entries
    const prevStardustRef = useRef(stats.stardust);
    useEffect(() => {
        const currentStardust = parseInt(String(stats.stardust || 0).replace(/\s/g, '')) || 0;
        const prevStardust = parseInt(String(prevStardustRef.current || 0).replace(/\s/g, '')) || 0;

        // Only create history if stardust actually changed to a valid value
        if (currentStardust === prevStardust || currentStardust <= 0) {
            return;
        }

        const timer = setTimeout(() => {
            setHistory(prev => {
                // One entry per day: update existing or create new
                const today = new Date().toDateString();
                const existingIndex = prev.findIndex(h =>
                    new Date(h.date).toDateString() === today
                );

                if (existingIndex !== -1) {
                    // Update existing today's entry with new stardust
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        stats: { ...updated[existingIndex].stats, stardust: stats.stardust },
                        medals: { ...medals },
                        date: new Date().toISOString()
                    };
                    return updated;
                }

                // Create a hidden history entry (no screenshot) for stardust progression
                return [{
                    id: `history-stardust-${Date.now()}`,
                    date: new Date().toISOString(),
                    stats: { ...stats },
                    medals: { ...medals },
                    screenshot: null
                }, ...prev];
            });

            prevStardustRef.current = stats.stardust;
        }, 2000); // 2s debounce to wait for user to finish typing

        return () => clearTimeout(timer);
    }, [stats.stardust]); // eslint-disable-line react-hooks/exhaustive-deps

    // Track medal changes to auto-create history entries (like stardust)
    const prevMedalsRef = useRef(JSON.stringify(medals));
    useEffect(() => {
        const cur = JSON.stringify(medals);
        if (cur === prevMedalsRef.current) return;
        // Only create a history point if at least one medal has a non-zero value
        const hasAnyValue = Object.values(medals).some(v => parseInt(String(v || 0).replace(/[\s,]/g, '')) > 0);
        if (!hasAnyValue) { prevMedalsRef.current = cur; return; }

        const timer = setTimeout(() => {
            setHistory(prev => {
                const today = new Date().toDateString();
                const existingIndex = prev.findIndex(h => new Date(h.date).toDateString() === today);

                if (existingIndex !== -1) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        medals: { ...medals },
                        date: new Date().toISOString()
                    };
                    return updated;
                }

                return [{
                    id: `history-medals-${Date.now()}`,
                    date: new Date().toISOString(),
                    stats: { ...stats },
                    medals: { ...medals },
                    screenshot: null
                }, ...prev];
            });
            prevMedalsRef.current = cur;
        }, 2000);

        return () => clearTimeout(timer);
    }, [medals]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-complete regional medals from the Checklist de Collection.
    // When a user ticks "normal" for a Pokémon, the corresponding region's
    // medal value auto-updates. Only increases (never decreases) the medal.
    useEffect(() => {
        if (!checklist || Object.keys(checklist).length === 0) return;

        const computed = computeRegionalMedals(checklist);

        setMedals(prev => {
            const updated = { ...prev };
            let changed = false;
            for (const [region, count] of Object.entries(computed)) {
                const current = parseInt(String(prev[region] || 0).replace(/[\s,]/g, '')) || 0;
                if (count > current) {
                    updated[region] = count;
                    changed = true;
                }
            }
            return changed ? updated : prev;
        });
    }, [checklist]); // eslint-disable-line react-hooks/exhaustive-deps

    // Debounced save function
    const saveData = useCallback(async (newStats, newChecklist, newMedals, newColor, newHistory, newDiscordId, newSettings, newFavorites) => {
        const dataToSave = {
            stats: newStats,
            checklist: newChecklist,
            medals: newMedals,
            trainerColor: newColor,
            discordId: newDiscordId || discordId,
            settings: newSettings || settings,
            trainerImage: newStats.trainerImage || user.trainerImage,
            history: newHistory || history,
            favorites: newFavorites || favorites
        };

        // Skip if nothing actually changed since the last successful save.
        // This is the cheap dedup — JSON.stringify is fast even for ~1000-entry
        // checklists, and avoids a full round-trip when state churns without
        // semantic change.
        const serialized = JSON.stringify(dataToSave);
        if (serialized === lastSavedPayloadRef.current) {
            pendingSaveRef.current = null;
            return;
        }

        setIsSaving(true);
        setSaveError(false);
        try {
            const res = await fetch('/api/pokemon/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    data: dataToSave,
                    sessionToken: user.sessionToken
                }),
            });

            if (res.ok) {
                pendingSaveRef.current = null;
                lastSavedPayloadRef.current = serialized;
                // Update local storage to keep session in sync
                const updatedUser = {
                    username: user.username,
                    ...dataToSave
                };
                localStorage.setItem('pokemon_user', JSON.stringify(updatedUser));

                setLastSaved(new Date());
                setShowSavedToast(true);
                setTimeout(() => setShowSavedToast(false), 1800);
            } else {
                console.error('Save failed:', res.status, await res.text().catch(() => ''));
                setSaveError(true);
                setTimeout(() => setSaveError(false), 5000);
            }
        } catch (error) {
            console.error('Save error:', error);
            setSaveError(true);
            setTimeout(() => setSaveError(false), 5000);
        } finally {
            setIsSaving(false);
        }
    }, [user.username, user.sessionToken, user.trainerImage, history, discordId, settings, favorites]);

    // Auto-save when data changes (skip the first render to avoid toast on page load)
    useEffect(() => {
        // Track pending data for beforeunload flush
        pendingSaveRef.current = { stats, checklist, medals, trainerColor, history, discordId, settings, favorites };

        if (isInitialMountRef.current) {
            // First render — don't save. Also prime the dedup ref with the
            // initial payload so even if state churns without changing values,
            // we won't fire a save. Marks mount as done after 1.5s.
            lastSavedPayloadRef.current = JSON.stringify({
                stats, checklist, medals, trainerColor,
                discordId: discordId,
                settings: settings,
                trainerImage: stats.trainerImage || user.trainerImage,
                history, favorites,
            });
            const mountTimer = setTimeout(() => { isInitialMountRef.current = false; }, 1500);
            return () => clearTimeout(mountTimer);
        }

        const timer = setTimeout(() => {
            saveData(stats, checklist, medals, trainerColor, history, discordId, settings, favorites);
        }, 1000); // Debounce for 1 second

        return () => clearTimeout(timer);
    }, [stats, checklist, medals, trainerColor, history, discordId, settings, favorites, saveData]);

    // Flush pending save on page unload (prevents data loss on quick refresh)
    useEffect(() => {
        const handleBeforeUnload = () => {
            const pending = pendingSaveRef.current;
            if (!pending) return;
            // Use sendBeacon for reliable delivery during page unload
            const payload = JSON.stringify({
                username: user.username,
                data: {
                    stats: pending.stats,
                    checklist: pending.checklist,
                    medals: pending.medals,
                    trainerColor: pending.trainerColor,
                    discordId: pending.discordId || discordId,
                    settings: pending.settings || settings,
                    trainerImage: pending.stats.trainerImage || user.trainerImage,
                    history: pending.history || history,
                    favorites: pending.favorites || favorites
                },
                sessionToken: user.sessionToken
            });
            navigator.sendBeacon('/api/pokemon/save', new Blob([payload], { type: 'application/json' }));
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user.username, user.sessionToken, user.trainerImage, history, discordId, settings, favorites]);

    // Sync Discord ID from session
    useEffect(() => {
        if (session?.user?.id && (!discordId || discordId !== session.user.id)) {
            setDiscordId(session.user.id);
        }
    }, [session, discordId]);

    const handleRename = async () => {
        const trimmed = newUsername.trim();
        if (!trimmed || trimmed === user.username) {
            setEditingUsername(false);
            setNewUsername(user.username);
            return;
        }
        setRenameError('');
        try {
            const res = await fetch('/api/auth/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentUsername: user.username, newUsername: trimmed })
            });
            const data = await res.json();
            if (res.ok) {
                // Update user object and localStorage
                user.username = trimmed;
                user.sessionToken = data.sessionToken;
                localStorage.setItem('pokemon_user', JSON.stringify({ ...user, ...data }));
                localStorage.setItem('pogo_saved_user', JSON.stringify({ username: trimmed, sessionToken: data.sessionToken, rememberMe: true }));
                setEditingUsername(false);
            } else {
                setRenameError(data.error || t('common.error'));
            }
        } catch (e) {
            setRenameError(t('dashboard.connectionError'));
        }
    };

    // Auto-assign medals based on stats
    useEffect(() => {
        if (!stats) return;

        setMedals(prevMedals => {
            const newMedals = { ...prevMedals };
            let changed = false;

            // Collectionneur (caught)
            if (stats.caught !== undefined && newMedals['Collector'] !== stats.caught) {
                newMedals['Collector'] = stats.caught;
                changed = true;
            }
            // Joggeur (distance)
            if (stats.distance !== undefined && newMedals['Jogger'] !== stats.distance) {
                newMedals['Jogger'] = stats.distance;
                changed = true;
            }
            // Randonneur (stops)
            if (stats.stops !== undefined && newMedals['Backpacker'] !== stats.stops) {
                newMedals['Backpacker'] = stats.stops;
                changed = true;
            }

            return changed ? newMedals : prevMedals;
        });
    }, [stats]);

    // Warn before unload if saving
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isSaving) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isSaving]);

    const handleHistoryDateChange = (index, newDate) => {
        const updatedHistory = [...history];
        if (updatedHistory[index]) {
            updatedHistory[index] = { ...updatedHistory[index], date: newDate };
            setHistory(updatedHistory);
            // Save will be triggered by effect
            setEditingEntry(null);
        }
    };

    const deleteHistoryEntry = (id) => {
        // Force delete without confirm to fix mobile issue
        const updatedHistory = history.filter(h => h.id !== id);
        setHistory(updatedHistory);
        setEditingEntry(null);
    };

    const visibleHistory = history.filter(h => h.screenshot && typeof h.screenshot === 'string' && h.screenshot.startsWith('/'));

    const dayKey = (d) => {
        const date = new Date(d);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const entriesByDay = useMemo(() => {
        const map = new Map();
        for (const entry of visibleHistory) {
            const key = dayKey(entry.date);
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(entry);
        }
        return map;
    }, [visibleHistory]);

    const [calendarMonth, setCalendarMonth] = useState(() => {
        const ref = visibleHistory[0]?.date ? new Date(visibleHistory[0].date) : new Date();
        return new Date(ref.getFullYear(), ref.getMonth(), 1);
    });

    const calendarMeta = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start
        return { year, month, days, offset };
    }, [calendarMonth]);

    const todayKey = dayKey(new Date());

    const handleImageUpload = async (e) => {
        let file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        try {
            // 1. HEIC Conversion (Client-side)
            if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
                try {
                    const heic2any = (await import('heic2any')).default;
                    const blob = await heic2any({
                        blob: file,
                        toType: "image/jpeg",
                        quality: 0.8
                    });
                    file = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
                } catch (error) {
                    throw new Error('Impossible de convertir l\'image HEIC.');
                }
            }

            // 2. Client-Side Parsing (Tesseract)
            // No need to upload first!
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('eng'); // English is faster and good for numbers/keywords

            // Optimize: Resize image via canvas before OCR if too large?
            // Tesseract.js handles it but slower. 
            // Let's just feed the file.

            const ret = await worker.recognize(file);
            const text = ret.data.text;
            await worker.terminate();

            console.log("Client OCR Text:", text);

            const detectedStats = parsePokemonStatsClient(text);

            if (!detectedStats || Object.keys(detectedStats).length === 0) {
                throw new Error(t('dashboard.ocrNoStats'));
            }

            // 3. Validated! Now Upload for History
            // We use the file we have (converted or original)
            const formData = new FormData();
            formData.append('file', file);

            // 30s timeout for upload
            const uploadController = new AbortController();
            const uploadTimeout = setTimeout(() => uploadController.abort(), 30000);

            let imageUrl = null;
            try {
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                    signal: uploadController.signal
                });
                clearTimeout(uploadTimeout);
                if (uploadRes.ok) {
                    const d = await uploadRes.json();
                    imageUrl = d.url;
                }
            } catch (err) {
                console.error("Upload failed but OCR worked:", err);
                // We continue without image URL if upload fails? 
                // Better to warn but allow stats update.
            }

            // 4. Update State
            const newStats = { ...stats };
            if (detectedStats.xp) newStats.xp = detectedStats.xp;
            if (detectedStats.level) newStats.level = detectedStats.level;
            if (detectedStats.distance) newStats.distance = detectedStats.distance;
            if (detectedStats.caught) newStats.caught = detectedStats.caught;
            if (detectedStats.stops) newStats.stops = detectedStats.stops;

            // Sanity-check level against XP: OCR occasionally misreads "80" as "2"
            // (the level badge is displayed as a small number next to the XP ring).
            // We reconcile the detected level with the XP-implied floor — never
            // allow a lower level to overwrite a higher one when the XP proves it.
            const xpForReconcile = newStats.xp || stats.xp || 0;
            if (xpForReconcile > 0) {
                newStats.level = reconcileLevel(newStats.level, xpForReconcile, stats.level);
            }

            if (imageUrl) {
                // Modified: Only update trainerImage if it's currently empty
                if (!stats.trainerImage) {
                    newStats.trainerImage = imageUrl;
                }

                // Detect Team from Color (Always run this on valid upload)
                try {
                    const imgUrl = URL.createObjectURL(file);
                    const img = new Image();
                    img.src = imgUrl;
                    await new Promise((resolve) => {
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            // Resize to 1x1 to get average color
                            canvas.width = 1;
                            canvas.height = 1;
                            ctx.drawImage(img, 0, 0, 1, 1);
                            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

                            console.log(`Detected Color: R${r} G${g} B${b}`);

                            // Validated Logic for Color Detection (Red/Blue/Yellow)

                            let detectedTeam = null;

                            // Sagesse (Blue): Blue is significantly higher than Red
                            if (b > r + 15 && b > g) {
                                detectedTeam = 'Sagesse / Mystic';
                            }
                            // Bravoure (Red): Red is the highest component
                            else if (r > b + 15 && r > g) {
                                detectedTeam = 'Bravoure / Valor';
                            }
                            // Intuition (Yellow): Red and Green both high, Blue low
                            else if (r > 100 && g > 100 && b < 100) {
                                detectedTeam = 'Intuition / Instinct';
                            }

                            if (detectedTeam && !stats.team) {
                                newStats.team = detectedTeam;
                            }

                            resolve();
                        };
                        img.onerror = resolve;
                    });
                } catch (e) {
                    console.error("Color detection failed", e);
                }


                // Add to history (one entry per day)
                const today = new Date().toDateString();
                setHistory(prev => {
                    const existingIndex = prev.findIndex(h =>
                        new Date(h.date).toDateString() === today
                    );
                    if (existingIndex !== -1) {
                        // Update existing today's entry with new stats and screenshot
                        const updated = [...prev];
                        updated[existingIndex] = {
                            ...updated[existingIndex],
                            stats: newStats,
                            medals: { ...medals },
                            screenshot: imageUrl,
                            date: new Date().toISOString()
                        };
                        return updated;
                    }
                    return [{
                        id: `history-${Date.now()}`,
                        date: new Date().toISOString(),
                        stats: newStats,
                        medals: { ...medals },
                        screenshot: imageUrl
                    }, ...prev];
                });
            }

            setStats(newStats);
            alert(t('dashboard.statsUpdatedSuccess'));

        } catch (error) {
            console.error('OCR/Upload Error:', error);
            alert(t('dashboard.errorTemplate', { error: error.message }));
        } finally {
            setIsProcessing(false);
            e.target.value = '';
        }
    };

    const handleTrainerImageUpload = async (e) => {
        let file = e.target.files?.[0];
        if (!file) return;

        // Handle HEIC conversion client-side
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
            try {
                const heic2any = (await import('heic2any')).default;
                const blob = await heic2any({
                    blob: file,
                    toType: "image/jpeg",
                    quality: 0.8
                });
                file = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
            } catch (error) {
                console.error('HEIC conversion failed:', error);
                alert(t('dashboard.heicError'));
                return;
            }
        }

        // Resize image to max 1600px
        try {
            const resizeImage = (file, maxWidth, maxHeight, quality) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    img.onload = () => {
                        let width = img.width;
                        let height = img.height;

                        if (width > maxWidth || height > maxHeight) {
                            if (width > height) {
                                height = Math.round((height * maxWidth) / width);
                                width = maxWidth;
                            } else {
                                width = Math.round((width * maxHeight) / height);
                                height = maxHeight;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(resolve, 'image/jpeg', quality);
                        URL.revokeObjectURL(img.src);
                    };
                    img.onerror = reject;
                });
            };

            const resizedBlob = await resizeImage(file, 1600, 1600, 0.8);
            if (resizedBlob) {
                file = new File([resizedBlob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
            }
        } catch (err) {
            console.error("Resize failed", err);
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || res.statusText);
            }

            const data = await res.json();

            if (data.url) {
                const imageUrl = data.url;
                const newStats = { ...stats, trainerImage: imageUrl };
                setStats(newStats);

                // Extract color & team for Trainer Profile Picture Update
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = imageUrl;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 1;
                    canvas.height = 1;
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                    const color = `rgb(${r}, ${g}, ${b})`;

                    // Update stats with just new color
                    setTrainerColor(color);
                    setStats(prev => ({
                        ...prev,
                        trainerColor: color,
                    }));
                };
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert(t('dashboard.uploadFailed', { error: error.message }));
        }
    };

    const [showReorderModal, setShowReorderModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // ... (existing code) ...

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 relative">
            {/* Header Section */}
            <div className="relative mb-8 md:mb-12 p-4 md:p-8 rounded-3xl bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-white/10 overflow-hidden">
                <div className={`absolute inset-0 backdrop-blur-sm ${(() => {
                    const t = stats.team || '';
                    if (t.includes('Bravoure') || t.includes('Valor')) return 'bg-gradient-to-br from-red-900/80 to-stone-950/90';
                    if (t.includes('Sagesse') || t.includes('Mystic')) return 'bg-gradient-to-br from-blue-900/80 to-slate-950/90';
                    if (t.includes('Intuition') || t.includes('Instinct')) return 'bg-gradient-to-br from-yellow-700/80 to-stone-950/90';
                    return 'bg-black/40';
                })()}`}></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start gap-4 md:gap-8">
                    {/* Large Trainer Image & Upload Button */}
                    <div className="flex flex-col gap-2 w-auto flex-shrink-0 mx-auto md:mx-0">
                        <div className="w-32 h-32 md:w-64 md:h-auto rounded-full md:rounded-2xl border-4 border-white/20 shadow-2xl overflow-hidden bg-black/40 flex items-center justify-center relative group">
                            {stats.trainerImage ? (
                                <img
                                    src={stats.trainerImage}
                                    alt="Trainer"
                                    className="w-full h-full object-cover md:object-contain"
                                    style={{ objectPosition: '55% 25%' }}
                                />
                            ) : (
                                <div className="w-full h-64 flex items-center justify-center text-4xl text-white/20">
                                    ?
                                </div>
                            )}

                            {/* Overlay Upload Button */}
                            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleTrainerImageUpload}
                                    className="hidden"
                                />
                                <span className="text-white font-medium border border-white/30 px-4 py-2 rounded-lg bg-black/50 hover:bg-white/10 transition-colors">
                                    Changer Photo
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="flex-grow w-full pt-2">
                        <div className="text-center md:text-left mb-6">
                            <h1
                                className="text-xl md:text-3xl font-medium text-white mb-2 flex items-center justify-center md:justify-start gap-4"
                                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                            >
                                {stats.team && (
                                    <img
                                        src={`/teams/${stats.team.toLowerCase().includes('sagesse') || stats.team.toLowerCase().includes('mystic') ? 'mystic' :
                                            stats.team.toLowerCase().includes('bravoure') || stats.team.toLowerCase().includes('valor') ? 'valor' : 'instinct'}.png`}
                                        alt={stats.team}
                                        className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                                    />
                                )}
                                {editingUsername ? (
                                    <div className="flex items-center gap-2">
                                        <span>{t('dashboard.hello')} </span>
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditingUsername(false); setNewUsername(user.username); } }}
                                            className="bg-white/10 border border-white/20 rounded-lg px-2 py-0.5 text-lg md:text-2xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/50 max-w-[200px]"
                                            style={{ color: trainerColor }}
                                            autoFocus
                                        />
                                        <button onClick={handleRename} className="text-green-400 hover:text-green-300 transition-colors"><Check size={18} /></button>
                                        <button onClick={() => { setEditingUsername(false); setNewUsername(user.username); setRenameError(''); }} className="text-red-400 hover:text-red-300 transition-colors"><X size={18} /></button>
                                    </div>
                                ) : (
                                    <span className="group cursor-pointer" onClick={() => setEditingUsername(true)}>
                                        {t('dashboard.hello')} <span style={{ color: trainerColor }}>{user.username}</span>
                                        <Edit2 size={14} className="inline ml-2 text-gray-600 group-hover:text-gray-400 transition-colors" />
                                    </span>
                                )}
                                {renameError && <span className="text-red-400 text-xs ml-2">{renameError}</span>}
                            </h1>
                            <p
                                className="text-gray-300 text-sm md:text-lg mb-4"
                                style={{ fontFamily: 'var(--font-poppins), sans-serif' }}
                            >
                                {t('dashboard.pokematosWelcome')}
                            </p>



                            <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-400 mb-4 h-5">
                                <span>{isSaving ? t('dashboard.saving') : lastSaved ? t('dashboard.savedAt', { time: lastSaved.toLocaleTimeString() }) : ''}</span>
                            </div>

                            {/* Discord linking banner */}
                            {!discordId && (() => {
                                const hasExistingData = Object.keys(stats || {}).length > 0 || (history || []).length > 0 || Object.keys(checklist || {}).length > 0;
                                return (
                                    <div className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
                                        <svg className="w-5 h-5 text-[#5865F2] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 14.178 14.178 0 00-.636 1.314 18.244 18.244 0 00-5.435 0 14.56 14.56 0 00-.64-1.314.077.077 0 00-.078-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.122-.093.244-.19.372-.292a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                                        </svg>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300">
                                                {hasExistingData
                                                    ? t('dashboard.discordLinkExisting')
                                                    : t('dashboard.discordLinkNew')
                                                }
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => signIn('discord', { callbackUrl: `/pokematos?linkDiscord=${encodeURIComponent(user.username)}` })}
                                            className="flex-shrink-0 px-3 py-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            {t('dashboard.linkDiscord')}
                                        </button>
                                    </div>
                                );
                            })()}

                        </div>

                        {/* Scanner Button */}
                        <div className="mt-4 mb-6 flex justify-center md:justify-start">
                            <input
                                type="file"
                                accept="image/*,.heic,.HEIC"
                                onChange={handleImageUpload}
                                className="hidden"
                                id="dashboard-stats-upload"
                                disabled={isProcessing}
                            />
                            <label
                                htmlFor="dashboard-stats-upload"
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/20 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="font-semibold text-sm">{t('dashboard.analyzing')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        <span className="font-semibold text-xs md:text-sm">{t('dashboard.scanScreenshot')}</span>
                                    </>
                                )}
                            </label>
                        </div>

                        {/* Screenshot History Calendar */}
                        {visibleHistory.length > 0 && (
                            <div className="w-full">
                                <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{t('dashboard.history')}</p>
                                        <button
                                            onClick={() => setShowReorderModal(true)}
                                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                            title={t('dashboard.manageOrder')}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCalendarMonth(new Date(calendarMeta.year, calendarMeta.month - 1, 1))}
                                            className="p-1 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition-colors"
                                            aria-label="Previous month"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs text-white capitalize min-w-[110px] text-center">
                                            {calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                                        </span>
                                        <button
                                            onClick={() => setCalendarMonth(new Date(calendarMeta.year, calendarMeta.month + 1, 1))}
                                            className="p-1 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition-colors"
                                            aria-label="Next month"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {t('events.weekdaysShort').map((d, i) => (
                                        <div key={`wd-${i}`} className="text-gray-500 font-bold text-[10px] uppercase tracking-wider text-center py-1">
                                            {d}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 pb-4">
                                    {Array.from({ length: calendarMeta.offset }).map((_, i) => (
                                        <div key={`offset-${i}`} className="h-9 md:h-11" />
                                    ))}
                                    {Array.from({ length: calendarMeta.days }).map((_, i) => {
                                        const day = i + 1;
                                        const key = `${calendarMeta.year}-${String(calendarMeta.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const dayEntries = entriesByDay.get(key) || [];
                                        const hasEntry = dayEntries.length > 0;
                                        const isToday = key === todayKey;

                                        if (hasEntry) {
                                            return (
                                                <button
                                                    key={day}
                                                    onClick={() => setEditingEntry(dayEntries[0])}
                                                    className={`relative h-9 md:h-11 rounded-lg flex items-center justify-center text-xs md:text-sm font-semibold bg-purple-500/30 border border-purple-400/60 text-white hover:bg-purple-500/50 hover:border-purple-300 transition-colors ${isToday ? 'ring-1 ring-blue-400' : ''}`}
                                                    title={`${dayEntries.length} screenshot${dayEntries.length > 1 ? 's' : ''} — ${new Date(dayEntries[0].date).toLocaleDateString(locale)}`}
                                                >
                                                    {day}
                                                    {dayEntries.length > 1 && (
                                                        <span className="absolute -top-1 -right-1 text-[8px] bg-pink-500 rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                                                            {dayEntries.length}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        }
                                        return (
                                            <div
                                                key={day}
                                                className={`h-9 md:h-11 rounded-lg flex items-center justify-center text-xs md:text-sm text-gray-500 bg-white/[0.02] border border-white/[0.05] ${isToday ? 'ring-1 ring-blue-400/40 text-blue-400' : ''}`}
                                            >
                                                {day}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </div >

            {/* Saved Toast */}
            {
                showSavedToast && (
                    <div className="fixed bottom-8 right-8 bg-green-500/90 text-white px-5 py-2.5 rounded-xl shadow-lg z-50 text-sm font-medium backdrop-blur-sm animate-[fadeInUp_0.3s_ease-out]">
                        ✓ {t('dashboard.dataSaved')}
                    </div>
                )
            }

            {/* Save Error Toast */}
            {
                saveError && (
                    <div className="fixed bottom-8 right-8 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                        {t('dashboard.saveError')}
                    </div>
                )
            }

            {/* Edit Date Modal */}
            {
                editingEntry && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4">{t('dashboard.editDate')}</h3>
                            <div className="mb-6">
                                <img src={editingEntry.screenshot} alt="Preview" className="w-full h-48 object-contain rounded-lg bg-black/50 mb-4" />
                                <label className="block text-sm text-gray-400 mb-2">{t('dashboard.date')}</label>
                                <input
                                    type="date"
                                    defaultValue={new Date(editingEntry.date).toISOString().slice(0, 10)}
                                    onChange={(e) => {
                                        editingEntry.tempDate = e.target.value;
                                    }}
                                    className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div className="flex justify-between gap-4">
                                <button
                                    onClick={() => deleteHistoryEntry(editingEntry.id)}
                                    className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    {t('common.delete')}
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingEntry(null)}
                                        className="px-4 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            const dateVal = editingEntry.tempDate || new Date(editingEntry.date).toISOString().slice(0, 10);
                                            const newIso = new Date(`${dateVal}T12:00:00`).toISOString();
                                            const index = history.findIndex(h => h.id === editingEntry.id);
                                            if (index !== -1) {
                                                handleHistoryDateChange(index, newIso);
                                            }
                                        }}
                                        className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                                    >
                                        {t('common.save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Reorder Modal (Mobile) */}
            {
                showReorderModal && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex flex-col p-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">{t('dashboard.manageHistory')}</h3>
                            <button
                                onClick={() => setShowReorderModal(false)}
                                className="p-2 bg-white/10 rounded-full text-white"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-3">
                            {history.filter(h => h.screenshot).map((entry, index) => {
                                const visibleIndex = index;
                                return (
                                    <div key={entry.id} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                                        <img src={entry.screenshot} className="w-16 h-16 object-cover rounded-lg" />
                                        <div className="flex-grow">
                                            <p className="text-sm font-bold text-white">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {entry.stats.xp?.toLocaleString()} XP
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button
                                                onClick={() => {
                                                    if (index === 0) return;
                                                    const newHist = [...history];
                                                    // Swap with previous visible item mechanism
                                                    // Since history includes hidden items (no screenshot), this is tricky.
                                                    // But here we iterate over filtered list.
                                                    // Actually, we should just operate on the full history list if we filter it?
                                                    // Wait, history state includes everything.
                                                    // Let's simplified: Swap in the MAIN history array.
                                                    const currentIdx = history.findIndex(h => h.id === entry.id);
                                                    // Find previous visible item index
                                                    let prevIdx = -1;
                                                    for (let i = currentIdx - 1; i >= 0; i--) {
                                                        if (history[i].screenshot) {
                                                            prevIdx = i;
                                                            break;
                                                        }
                                                    }

                                                    if (prevIdx !== -1) {
                                                        [newHist[currentIdx], newHist[prevIdx]] = [newHist[prevIdx], newHist[currentIdx]];
                                                        setHistory(newHist);
                                                    }
                                                }}
                                                className="p-1.5 bg-white/10 rounded hover:bg-white/20 disabled:opacity-30"
                                                disabled={index === 0}
                                            >
                                                ▲
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const visibleList = history.filter(h => h.screenshot);
                                                    if (index === visibleList.length - 1) return;

                                                    const newHist = [...history];
                                                    const currentIdx = history.findIndex(h => h.id === entry.id);
                                                    // Find next visible item
                                                    let nextIdx = -1;
                                                    for (let i = currentIdx + 1; i < history.length; i++) {
                                                        if (history[i].screenshot) {
                                                            nextIdx = i;
                                                            break;
                                                        }
                                                    }

                                                    if (nextIdx !== -1) {
                                                        [newHist[currentIdx], newHist[nextIdx]] = [newHist[nextIdx], newHist[currentIdx]];
                                                        setHistory(newHist);
                                                    }
                                                }}
                                                className="p-1.5 bg-white/10 rounded hover:bg-white/20 disabled:opacity-30"
                                                disabled={index === history.filter(h => h.screenshot).length - 1}
                                            >
                                                ▼
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            <StatsTable
                stats={stats}
                onChange={setStats}
                onColorChange={setTrainerColor}
                initialColor={trainerColor}
                settings={settings}
                onSettingsChange={setSettings}
            />

            {/* Medals — above graph so users see them first */}
            {user.username === 'lcsnzh' && (
                <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
                    </div>
                }>
                    <PokemonMedals medals={medals} onChange={setMedals} isAdmin={user.username === 'lcsnzh'} settings={settings} onSettingsChange={setSettings} />
                </Suspense>
            )}

            {/* Show all history in graph, not just screenshots */}
            <ProgressionGraph history={history} medals={medals} />

            {false && (
                <FavoritePokemon
                    favorites={favorites}
                    onUpdate={setFavorites}
                    onUpsertHistory={(favItem) => {
                        // 1. Validation
                        if (!favItem.stardust || favItem.stardust <= 0 || favItem.stardust > 2000000000) return;

                        // 2. Update Current Stats (Global) showing immediate feedback
                        setStats(prev => ({ ...prev, stardust: favItem.stardust }));

                        // 3. Add to History for Graph (Hidden from Scroller)
                        // We set screenshot to null so it doesn't clutter the "History Gallery"
                        const newHistoryEntry = {
                            id: `history-fav-${Date.now()}`,
                            date: favItem.date || new Date().toISOString(),
                            stats: {
                                ...stats, // Snapshot of current stats
                                stardust: favItem.stardust // With new Stardust
                            },
                            screenshot: null // HIDDEN from carousel
                        };

                        setHistory(prev => {
                            // Sort desc by date to keep order clean
                            const newHist = [newHistoryEntry, ...prev];
                            newHist.sort((a, b) => new Date(b.date) - new Date(a.date));
                            return newHist;
                        });
                    }}
                />
            )}

            <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            }>
                <PokemonManager />
            </Suspense>

            <Suspense fallback={
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            }>
                <PokemonChecklist checklist={checklist} onChange={setChecklist} />
            </Suspense>
        </div >
    );
}

// Helper function (Client Side)
function parsePokemonStatsClient(text) {
    const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l.length > 0);
    const stats = {};

    // Helper to find number in a line
    const extractNumber = (str) => {
        const cleanStr = str.replace(/km/g, '');
        // Match number with possible separators (space, comma, dot)
        const matches = cleanStr.match(/(\d[\d\s,.]*\d|\d)/g);
        if (!matches) return null;

        const numbers = matches.map(m => {
            // Check for decimal part at the end (1 or 2 digits after comma/dot)
            // e.g. "123,4" or "123.45" but NOT "123,456" (thousands)
            // This fixes the issue where "27 617,4" was read as "276174"
            let processed = m;
            if (/[,.]\d{1,2}$/.test(m)) {
                // Truncate decimal part as requested
                processed = m.replace(/[,.]\d{1,2}$/, '');
            }
            // Remove all other separators (thousands) and parse as integer
            return parseInt(processed.replace(/[\s,.]/g, ''), 10);
        });

        return numbers[0];
    };

    const findStat = (keywords) => {
        for (const line of lines) {
            if (keywords.some(k => line.includes(k))) {
                let num = extractNumber(line);
                if (num !== null) return num;
                const index = lines.indexOf(line);
                if (index < lines.length - 1) {
                    num = extractNumber(lines[index + 1]);
                    if (num !== null) return num;
                }
                if (index > 0) {
                    num = extractNumber(lines[index - 1]);
                    if (num !== null) return num;
                }
            }
        }
        return null;
    };

    const xpMatch = text.replace(/\s/g, '').match(/total(?:de)?(?:xp|px)[:\s]*(\d+)/i) ||
        text.match(/total\s+(?:de\s+)?(?:xp|px)\s*[:\s]*([\d\s]+)/i);

    if (xpMatch) {
        // remove non-digits
        stats.xp = parseInt(xpMatch[1].replace(/\D/g, ''));
    } else {
        stats.xp = findStat(['total xp', 'xp total', 'expérience', 'experience', 'total de px']);
    }

    // Max trainer level in Pokemon GO is 80. Accept only 1..80 to avoid
    // capturing unrelated numbers (XP fragments, friend codes, etc).
    const levelMatch = text.match(/(?:niveau|level|lvl|niv)[\s.:]*(\d{1,2})(?!\d)/i);
    if (levelMatch) {
        const lvl = parseInt(levelMatch[1]);
        if (lvl >= 1 && lvl <= 80) stats.level = lvl;
    }
    if (!stats.level) {
        const nivIndex = lines.findIndex(l => /niveau|level/.test(l));
        if (nivIndex !== -1) {
            // Try same line
            let num = extractNumber(lines[nivIndex]);
            if (num && num < 100) stats.level = num;

            // Try next line
            if (!stats.level && nivIndex < lines.length - 1) {
                num = extractNumber(lines[nivIndex + 1]);
                if (num && num < 100) stats.level = num;
            }

            // Try prev line (Important for circle layout)
            if (!stats.level && nivIndex > 0) {
                num = extractNumber(lines[nivIndex - 1]);
                if (num && num < 100) stats.level = num;
            }
        }
    }

    stats.distance = findStat(['distance', 'km', 'walked', 'marchée']);
    stats.caught = findStat(['caught', 'attrapés', 'pokemon caught']);
    stats.stops = findStat(['stops', 'visités', 'visited']);
    return stats;
}
