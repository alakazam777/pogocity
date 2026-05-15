'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Star, Trash2, Search, Loader2, Sparkles, RotateCcw, Filter,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Heart, Trophy,
    LayoutGrid, List, X, GripVertical, Pencil, Plus,
} from 'lucide-react';
import {
    DndContext, closestCenter, PointerSensor, KeyboardSensor,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, rectSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { POKEMON_DATA } from '@/data/pokemon';
import { useLanguage } from '@/context/LanguageContext';
import IvRing from './IvRing';
import TypeBadge, { TYPE_IDS } from './TypeBadge';
import PokemonEditModal from './PokemonEditModal';

const NAME_TO_ID = new Map();
for (const p of POKEMON_DATA) {
    if (p.nameFr) NAME_TO_ID.set(p.nameFr.toLowerCase(), p.id);
    if (p.nameEn) NAME_TO_ID.set(p.nameEn.toLowerCase(), p.id);
    if (p.nameJp) NAME_TO_ID.set(p.nameJp, p.id);
}

// Per-column getters; direction is encoded in the sortId suffix (`_asc`/`_desc`)
// so we can derive every (column, direction) combination from a single map.
const COLUMN_GETTERS = {
    cp: (p) => p.cp || 0,
    iv: (p) => p.iv?.percent || 0,
    hp: (p) => p.hp || 0,
    level: (p) => p.level || 0,
    name: (p) => (p.name || '').toLowerCase(),
    dex: (p) => p.dexNumber || 99999,
    date: (p) => new Date(p.scanDate || 0).getTime(),
};

const SORTABLE_COLUMNS = ['name', 'cp', 'iv', 'hp', 'level'];

function parseSortId(id) {
    if (!id || id === 'manual') return null;
    const m = id.match(/^([a-z]+)_(asc|desc)$/);
    if (!m || !COLUMN_GETTERS[m[1]]) return null;
    return { column: m[1], direction: m[2] };
}

function applySort(list, sortId) {
    const parsed = parseSortId(sortId);
    if (!parsed) return list;
    const getter = COLUMN_GETTERS[parsed.column];
    const sign = parsed.direction === 'asc' ? 1 : -1;
    return list.slice().sort((a, b) => {
        const va = getter(a), vb = getter(b);
        if (va < vb) return -sign;
        if (va > vb) return sign;
        return 0;
    });
}

const LEAGUE_TAGS = ['Master League', 'Ultra League', 'Great League'];
const PAGE_SIZES = [10, 25, 50, 100];

function spriteUrl(p) {
    if (p.dexNumber) return getPokemonSprite(p.dexNumber);
    if (p.name) {
        const id = NAME_TO_ID.get(p.name.toLowerCase());
        if (id) return getPokemonSprite(id);
    }
    return null;
}

const DEFAULT_FILTERS = {
    favOnly: false,
    shinyOnly: false,
    hundoOnly: false,
    luckyOnly: false,
    cpMin: 0,
    cpMax: 5000,
    hpMin: 0,
    hpMax: 999,
    ivMin: 0,
    ivMax: 100,
    types: [],
    tags: [],
};

export default function BoiteDashboard() {
    const { t } = useLanguage();
    const [pokemon, setPokemon] = useState([]);
    const [customTags, setCustomTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortId, setSortId] = useState('cp_desc');
    // Tracks the user's last *dropdown* selection separately from sortId.
    // Header-click cycling (asc → desc → revert) uses this as the "revert" target,
    // so the third click restores whatever the user had picked from the dropdown.
    const [dropdownSort, setDropdownSort] = useState('cp_desc');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [view, setView] = useState('table');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [selected, setSelected] = useState(() => new Set());
    const [editingPokemon, setEditingPokemon] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/pokemon-collection/list', { credentials: 'include' });
            if (!res.ok) { setPokemon([]); return; }
            const data = await res.json();
            setPokemon(data.pokemon || []);
            setCustomTags(data.customTags || []);
        } catch {
            setPokemon([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleAddCustomTag = async () => {
        const tag = window.prompt(t('manager.dashboard.addCustomTagPrompt'));
        if (!tag) return;
        const res = await fetch('/api/pokemon-collection/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ tag }),
        });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (Array.isArray(data.tags)) setCustomTags(data.tags);
        } else if (res.status === 413) {
            alert(t('manager.dashboard.customTagLimit'));
        }
    };

    const handleRemoveCustomTag = async (tag) => {
        if (!window.confirm(t('manager.dashboard.removeCustomTag') + ' "' + tag + '" ?')) return;
        const res = await fetch('/api/pokemon-collection/tags', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ tag }),
        });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (Array.isArray(data.tags)) setCustomTags(data.tags);
            // Also drop from active filter if present
            setFilters((f) => ({ ...f, tags: f.tags.filter((tg) => tg !== tag) }));
        }
    };

    const handleEditSaved = (updated) => {
        if (!updated) return;
        setPokemon((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    };

    // 3-state header click: asc → desc → revert to dropdown choice (or 'manual'
    // if dropdown matches the desc we'd revert from, to avoid a no-op on click 3).
    const handleHeaderClick = (column) => {
        const asc = `${column}_asc`;
        const desc = `${column}_desc`;
        if (sortId === asc) setSortId(desc);
        else if (sortId === desc) setSortId(dropdownSort === desc ? 'manual' : dropdownSort);
        else setSortId(asc);
    };

    const handleSortDropdown = (newId) => {
        setSortId(newId);
        setDropdownSort(newId);
    };

    useEffect(() => { refresh(); }, [refresh]);

    const handleDelete = async (id) => {
        if (!window.confirm(t('manager.list.confirmDelete'))) return;
        const res = await fetch(`/api/pokemon-collection/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
            setPokemon((prev) => prev.filter((p) => p.id !== id));
            setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
        }
    };

    const handleToggleFavorite = async (p) => {
        const res = await fetch(`/api/pokemon-collection/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ updates: { favorite: !p.favorite } }),
        });
        if (res.ok) setPokemon((prev) => prev.map((x) => x.id === p.id ? { ...x, favorite: !p.favorite } : x));
    };

    const persistOrder = useCallback((orderedIds) => {
        // Fire-and-forget; UI is already updated optimistically
        fetch('/api/pokemon-collection/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ ids: orderedIds }),
        }).catch(() => {});
    }, []);

    const handleDragStart = useCallback(() => {
        // Auto-flip to manual sort on first drag so visual order matches data order;
        // otherwise the active sort would re-apply and undo the user's drag.
        setSortId((s) => (s === 'manual' ? s : 'manual'));
    }, []);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setPokemon((prev) => {
            const oldIdx = prev.findIndex((p) => p.id === active.id);
            const newIdx = prev.findIndex((p) => p.id === over.id);
            if (oldIdx < 0 || newIdx < 0) return prev;
            const next = arrayMove(prev, oldIdx, newIdx);
            persistOrder(next.map((p) => p.id));
            return next;
        });
    };

    const stats = useMemo(() => ({
        total: pokemon.length,
        favorites: pokemon.filter((p) => p.favorite).length,
        shiny: pokemon.filter((p) => p.shiny).length,
        hundo: pokemon.filter((p) => p.iv?.percent === 100).length,
        lucky: pokemon.filter((p) => p.lucky).length,
        shadow: pokemon.filter((p) => p.shadow).length,
    }), [pokemon]);

    const allTags = useMemo(() => {
        const set = new Set();
        for (const p of pokemon) for (const tag of (p.tags || [])) set.add(tag);
        // Drop the league tags that already have their own quick-filter
        for (const lt of LEAGUE_TAGS) set.delete(lt);
        return [...set].sort();
    }, [pokemon]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = pokemon.slice();
        if (q) {
            list = list.filter((p) => {
                const hay = [p.name, p.nickname, ...(p.tags || []), String(p.dexNumber || ''), p.fastMove, p.chargedMove]
                    .filter(Boolean).join(' ').toLowerCase();
                return hay.includes(q);
            });
        }
        if (filters.favOnly) list = list.filter((p) => p.favorite);
        if (filters.shinyOnly) list = list.filter((p) => p.shiny);
        if (filters.hundoOnly) list = list.filter((p) => p.iv?.percent === 100);
        if (filters.luckyOnly) list = list.filter((p) => p.lucky);
        if (filters.cpMin > 0) list = list.filter((p) => (p.cp || 0) >= filters.cpMin);
        if (filters.cpMax < 5000) list = list.filter((p) => (p.cp || 0) <= filters.cpMax);
        if (filters.hpMin > 0) list = list.filter((p) => (p.hp || 0) >= filters.hpMin);
        if (filters.hpMax < 999) list = list.filter((p) => (p.hp || 0) <= filters.hpMax);
        if (filters.ivMin > 0) list = list.filter((p) => (p.iv?.percent ?? -1) >= filters.ivMin);
        if (filters.ivMax < 100) list = list.filter((p) => (p.iv?.percent ?? 101) <= filters.ivMax);
        if (filters.types.length > 0) {
            list = list.filter((p) => (p.types || []).some((tp) => filters.types.includes(tp)));
        }
        if (filters.tags.length > 0) {
            list = list.filter((p) => (p.tags || []).some((tg) => filters.tags.includes(tg)));
        }
        return applySort(list, sortId);
    }, [pokemon, search, filters, sortId]);

    useEffect(() => { setPage(1); }, [filters, search, sortId, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
    const isManualSort = sortId === 'manual';
    const isLeagueActive = (tag) => filters.tags.includes(tag);

    const updateFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
    const toggleType = (typeId) => setFilters((f) => ({
        ...f, types: f.types.includes(typeId) ? f.types.filter((tp) => tp !== typeId) : [...f.types, typeId],
    }));
    const toggleTag = (tag) => setFilters((f) => ({
        ...f, tags: f.tags.includes(tag) ? f.tags.filter((tg) => tg !== tag) : [...f.tags, tag],
    }));
    const resetFilters = () => { setFilters(DEFAULT_FILTERS); setSearch(''); };

    const toggleSelect = (id) => setSelected((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const allOnPageSelected = paginated.length > 0 && paginated.every((p) => selected.has(p.id));
    const togglePageSelect = () => setSelected((s) => {
        const next = new Set(s);
        if (allOnPageSelected) paginated.forEach((p) => next.delete(p.id));
        else paginated.forEach((p) => next.add(p.id));
        return next;
    });
    const clearSelection = () => setSelected(new Set());

    const handleBulk = async (action) => {
        if (selected.size === 0) return;
        if (action === 'delete') {
            const ok = window.confirm(t('manager.dashboard.bulkConfirmDelete').replace('{count}', selected.size));
            if (!ok) return;
        }
        const ids = [...selected];
        const res = await fetch('/api/pokemon-collection/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action, ids }),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const idSet = new Set(ids);
        if (action === 'delete') {
            setPokemon((prev) => prev.filter((p) => !idSet.has(p.id)));
        } else {
            const fav = action === 'favorite';
            setPokemon((prev) => prev.map((p) => idSet.has(p.id) ? { ...p, favorite: fav } : p));
        }
        clearSelection();
        if (data.failed > 0) {
            alert(t('manager.dashboard.bulkResult')
                .replace('{succeeded}', data.succeeded)
                .replace('{failed}', data.failed));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Loader2 size={28} className="animate-spin" />
            </div>
        );
    }

    if (pokemon.length === 0) {
        return (
            <div className="text-center py-24 text-gray-400">
                <p className="text-lg mb-4">{t('manager.empty')}</p>
                <a href="/pokematos" className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm">
                    {t('manager.list.emptyAction')}
                </a>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Stats counter chips */}
            <div className="flex flex-wrap gap-2 md:gap-3">
                <StatChip label={t('manager.dashboard.statsTotal')} value={stats.total}
                    active={!filters.favOnly && !filters.shinyOnly && !filters.hundoOnly && !filters.luckyOnly}
                    onClick={() => setFilters((f) => ({ ...f, favOnly: false, shinyOnly: false, hundoOnly: false, luckyOnly: false }))}
                    color="text-purple-300" />
                <StatChip label={t('manager.dashboard.statsFav')} value={stats.favorites}
                    active={filters.favOnly} onClick={() => updateFilter('favOnly', !filters.favOnly)}
                    icon={<Star size={14} />} color="text-pink-300" />
                <StatChip label={t('manager.dashboard.statsShiny')} value={stats.shiny}
                    active={filters.shinyOnly} onClick={() => updateFilter('shinyOnly', !filters.shinyOnly)}
                    icon={<Sparkles size={14} />} color="text-yellow-300" />
                <StatChip label={t('manager.dashboard.statsHundo')} value={stats.hundo}
                    active={filters.hundoOnly} onClick={() => updateFilter('hundoOnly', !filters.hundoOnly)}
                    icon={<Trophy size={14} />} color="text-red-300" />
                <StatChip label={t('manager.dashboard.statsLucky')} value={stats.lucky}
                    active={filters.luckyOnly} onClick={() => updateFilter('luckyOnly', !filters.luckyOnly)}
                    icon={<Heart size={14} />} color="text-orange-300" />
                {stats.shadow > 0 && (
                    <StatChip label={t('manager.dashboard.statsShadow')} value={stats.shadow} color="text-purple-400" />
                )}
            </div>

            {/* Quick-filters: leagues + user-defined custom tags + "+" to create one */}
            <div className="flex flex-wrap items-center gap-2">
                {LEAGUE_TAGS.map((tag) => {
                    const active = isLeagueActive(tag);
                    return (
                        <button key={tag} type="button" onClick={() => toggleTag(tag)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active
                                ? 'bg-purple-500/40 text-purple-100 border-purple-400'
                                : 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'}`}>
                            {tag}
                        </button>
                    );
                })}
                {customTags.map((tag) => {
                    const active = filters.tags.includes(tag);
                    return (
                        <span key={tag} className={`group inline-flex items-stretch text-xs rounded-full border overflow-hidden ${active
                            ? 'bg-pink-500/30 text-pink-100 border-pink-400'
                            : 'bg-pink-500/10 text-pink-300 border-pink-500/30 hover:bg-pink-500/20'}`}>
                            <button type="button" onClick={() => toggleTag(tag)}
                                className="px-3 py-1.5">
                                {tag}
                            </button>
                            <button type="button" onClick={() => handleRemoveCustomTag(tag)}
                                className="px-1.5 border-l border-current/20 opacity-50 hover:opacity-100 hover:bg-red-500/30"
                                title={t('manager.dashboard.removeCustomTag')}>
                                <X size={10} />
                            </button>
                        </span>
                    );
                })}
                <button type="button" onClick={handleAddCustomTag}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/40 transition-colors">
                    <Plus size={12} /> {t('manager.dashboard.addCustomTagBtn')}
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <button type="button" onClick={() => setSidebarOpen((v) => !v)}
                    className="md:hidden flex items-center gap-2 px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm">
                    <Filter size={14} />
                    {t('manager.dashboard.filtersBtn')}
                    {sidebarOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder={t('manager.list.searchPlaceholder')}
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <select value={sortId} onChange={(e) => handleSortDropdown(e.target.value)}
                        className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                        <option value="cp_desc">{t('manager.list.sortCpDesc')}</option>
                        <option value="cp_asc">{t('manager.list.sortCpAsc')}</option>
                        <option value="iv_desc">{t('manager.list.sortIvDesc')}</option>
                        <option value="iv_asc">IV % ↑</option>
                        <option value="hp_desc">PV ↓</option>
                        <option value="hp_asc">PV ↑</option>
                        <option value="level_desc">{t('manager.list.sortLevelDesc')}</option>
                        <option value="level_asc">Niv. ↑</option>
                        <option value="name_asc">{t('manager.list.sortNameAsc')}</option>
                        <option value="name_desc">Nom Z-A</option>
                        <option value="dex_asc">{t('manager.list.sortDexAsc')}</option>
                        <option value="date_desc">{t('manager.list.sortDateDesc')}</option>
                        <option value="manual">↕ {t('manager.list.sortManual')}</option>
                    </select>
                    <div className="flex items-center bg-black/30 border border-white/10 rounded-lg overflow-hidden">
                        <button type="button" onClick={() => setView('table')}
                            title={t('manager.dashboard.viewTable')}
                            className={`p-2 ${view === 'table' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <List size={14} />
                        </button>
                        <button type="button" onClick={() => setView('grid')}
                            title={t('manager.dashboard.viewGrid')}
                            className={`p-2 ${view === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {filtered.length}/{stats.total}
                    </span>
                </div>
            </div>

            {isManualSort && (
                <div className="text-xs text-purple-300 italic">{t('manager.dashboard.reorderHint')}</div>
            )}

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 px-3 py-2 bg-purple-900/60 backdrop-blur-md border border-purple-400 rounded-xl shadow-lg text-sm">
                    <span className="text-purple-100 font-medium">
                        {t('manager.dashboard.bulkSelected').replace('{count}', selected.size)}
                    </span>
                    <button type="button" onClick={() => handleBulk('favorite')}
                        className="flex items-center gap-1 px-2 py-1 bg-pink-500/30 hover:bg-pink-500/50 border border-pink-400/40 rounded text-pink-100">
                        <Star size={12} /> {t('manager.dashboard.bulkFavorite')}
                    </button>
                    <button type="button" onClick={() => handleBulk('unfavorite')}
                        className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/20 rounded text-gray-200">
                        <Star size={12} /> {t('manager.dashboard.bulkUnfavorite')}
                    </button>
                    <button type="button" onClick={() => handleBulk('delete')}
                        className="flex items-center gap-1 px-2 py-1 bg-red-500/30 hover:bg-red-500/50 border border-red-400/40 rounded text-red-100">
                        <Trash2 size={12} /> {t('manager.dashboard.bulkDelete')}
                    </button>
                    <button type="button" onClick={clearSelection}
                        className="ml-auto flex items-center gap-1 px-2 py-1 hover:bg-white/10 rounded text-gray-300">
                        <X size={12} /> {t('manager.dashboard.bulkClear')}
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4">
                {/* Sidebar */}
                <aside className={`md:w-64 md:flex-shrink-0 space-y-4 ${sidebarOpen ? 'block' : 'hidden md:block'}`}>
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('manager.dashboard.filtersTitle')}</h3>
                            <button type="button" onClick={resetFilters}
                                className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">
                                <RotateCcw size={12} /> {t('manager.dashboard.filtersReset')}
                            </button>
                        </div>

                        <div className="space-y-2 text-sm">
                            <ToggleRow label={t('manager.dashboard.filterFavOnly')} checked={filters.favOnly}
                                onChange={(v) => updateFilter('favOnly', v)} icon={<Star size={14} className="text-pink-400" />} />
                            <ToggleRow label={t('manager.dashboard.filterShinyOnly')} checked={filters.shinyOnly}
                                onChange={(v) => updateFilter('shinyOnly', v)} icon={<Sparkles size={14} className="text-yellow-400" />} />
                            <ToggleRow label={t('manager.dashboard.filterHundoOnly')} checked={filters.hundoOnly}
                                onChange={(v) => updateFilter('hundoOnly', v)} icon={<Trophy size={14} className="text-red-400" />} />
                            <ToggleRow label={t('manager.dashboard.filterLuckyOnly')} checked={filters.luckyOnly}
                                onChange={(v) => updateFilter('luckyOnly', v)} icon={<Heart size={14} className="text-orange-400" />} />
                        </div>

                        <SliderField label={t('manager.dashboard.filterCp')} min={0} max={5000} step={50}
                            valueMin={filters.cpMin} valueMax={filters.cpMax}
                            onChange={(lo, hi) => setFilters((f) => ({ ...f, cpMin: lo, cpMax: hi }))} />

                        <SliderField label={t('manager.dashboard.filterHp')} min={0} max={999} step={5}
                            valueMin={filters.hpMin} valueMax={filters.hpMax}
                            onChange={(lo, hi) => setFilters((f) => ({ ...f, hpMin: lo, hpMax: hi }))} />

                        <SliderField label={t('manager.dashboard.filterIv')} min={0} max={100} step={1}
                            valueMin={filters.ivMin} valueMax={filters.ivMax}
                            onChange={(lo, hi) => setFilters((f) => ({ ...f, ivMin: lo, ivMax: hi }))} />

                        <div>
                            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">{t('manager.dashboard.filterType')}</label>
                            <div className="grid grid-cols-6 gap-1.5">
                                {TYPE_IDS.map((typeId) => {
                                    const active = filters.types.includes(typeId);
                                    return (
                                        <TypeBadge key={typeId} typeId={typeId} size={32}
                                            active={active}
                                            onClick={() => toggleType(typeId)}
                                            title={t(`types.${typeId}`)} />
                                    );
                                })}
                            </div>
                        </div>

                        {allTags.length > 0 && (
                            <div>
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">{t('manager.dashboard.filterTags')}</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {allTags.map((tag) => {
                                        const active = filters.tags.includes(tag);
                                        const isHundoTag = tag === 'Hundo' || tag === 'Shundo';
                                        return (
                                            <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                                className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${active
                                                    ? (isHundoTag ? 'bg-red-500/40 text-red-200 border-red-400' : 'bg-purple-500/40 text-purple-200 border-purple-400')
                                                    : (isHundoTag ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30')}`}>
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <div className="flex-1 min-w-0 space-y-3">
                    <DndContext sensors={sensors} collisionDetection={closestCenter}
                        onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                        {view === 'table' ? (
                            <SortableContext items={paginated.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                                <TableView
                                    rows={paginated} t={t}
                                    selected={selected}
                                    allOnPageSelected={allOnPageSelected}
                                    onTogglePageSelect={togglePageSelect}
                                    onToggleSelect={toggleSelect}
                                    onToggleFavorite={handleToggleFavorite}
                                    onDelete={handleDelete}
                                    onEdit={setEditingPokemon}
                                    sortId={sortId}
                                    onHeaderSort={handleHeaderClick}
                                    isManualSort={isManualSort}
                                />
                            </SortableContext>
                        ) : (
                            <SortableContext items={paginated.map((p) => p.id)} strategy={rectSortingStrategy}>
                                <GridView
                                    rows={paginated} t={t}
                                    selected={selected}
                                    onToggleSelect={toggleSelect}
                                    onToggleFavorite={handleToggleFavorite}
                                    onDelete={handleDelete}
                                    onEdit={setEditingPokemon}
                                    isManualSort={isManualSort}
                                />
                            </SortableContext>
                        )}
                    </DndContext>

                    {filtered.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={safePage <= 1}
                                    className="p-1.5 bg-black/30 border border-white/10 rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="tabular-nums">
                                    {t('manager.dashboard.pageOf').replace('{page}', safePage).replace('{total}', totalPages)}
                                </span>
                                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={safePage >= totalPages}
                                    className="p-1.5 bg-black/30 border border-white/10 rounded hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                                    className="px-2 py-1 bg-black/30 border border-white/10 rounded text-white">
                                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                                </select>
                                {t('manager.dashboard.perPage')}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {editingPokemon && (
                <PokemonEditModal
                    pokemon={editingPokemon}
                    customTags={customTags}
                    leagueTags={LEAGUE_TAGS}
                    onClose={() => setEditingPokemon(null)}
                    onSaved={handleEditSaved}
                />
            )}
        </div>
    );
}

// ─── Sortable wrappers ───

function SortableTableRow({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <tr ref={setNodeRef} style={style}>
            <td className="px-1 py-2 w-6">
                <button type="button" {...attributes} {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-purple-300 p-1"
                    aria-label="reorder" title="Glisser pour réorganiser">
                    <GripVertical size={14} />
                </button>
            </td>
            {children}
        </tr>
    );
}

function SortableGridCard({ id, children }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} className="relative">
            <button type="button" {...attributes} {...listeners}
                className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 cursor-grab active:cursor-grabbing text-gray-500 hover:text-purple-300 p-1 bg-black/40 rounded"
                aria-label="reorder" title="Glisser pour réorganiser">
                <GripVertical size={12} />
            </button>
            {children}
        </div>
    );
}

// ─── Views ───

function TableView({ rows, t, selected, allOnPageSelected, onTogglePageSelect, onToggleSelect, onToggleFavorite, onDelete, onEdit, sortId, onHeaderSort, isManualSort }) {
    const sortIndicator = (col) => {
        if (sortId === `${col}_asc`) return ' ▲';
        if (sortId === `${col}_desc`) return ' ▼';
        return '';
    };
    const sortableHeaderCls = 'cursor-pointer hover:text-white select-none transition-colors';
    const isActiveCol = (col) => sortId === `${col}_asc` || sortId === `${col}_desc`;
    return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
                <thead className="bg-black/40 text-xs uppercase tracking-wider text-gray-400">
                    <tr>
                        <th className="w-6 px-1 py-2"></th>
                        <th className="w-8 px-2 py-2">
                            <input type="checkbox" checked={allOnPageSelected}
                                onChange={onTogglePageSelect}
                                className="accent-purple-500 cursor-pointer"
                                title={t('manager.dashboard.bulkSelectAll')} />
                        </th>
                        <th className="w-8 px-1 py-2"></th>
                        <th className={`text-left px-3 py-2 ${sortableHeaderCls} ${isActiveCol('name') ? 'text-purple-300' : ''}`}
                            onClick={() => onHeaderSort('name')}>
                            {t('manager.list.colPokemon')}{sortIndicator('name')}
                        </th>
                        <th className={`text-center px-2 py-2 w-16 ${sortableHeaderCls} ${isActiveCol('cp') ? 'text-purple-300' : ''}`}
                            onClick={() => onHeaderSort('cp')}>
                            {t('manager.list.colCp')}{sortIndicator('cp')}
                        </th>
                        <th className={`text-center px-2 py-2 w-16 ${sortableHeaderCls} ${isActiveCol('iv') ? 'text-purple-300' : ''}`}
                            onClick={() => onHeaderSort('iv')}>
                            {t('manager.list.colIv')}{sortIndicator('iv')}
                        </th>
                        <th className={`text-center px-2 py-2 w-14 hidden md:table-cell ${sortableHeaderCls} ${isActiveCol('hp') ? 'text-purple-300' : ''}`}
                            onClick={() => onHeaderSort('hp')}>
                            {t('manager.list.colHp')}{sortIndicator('hp')}
                        </th>
                        <th className={`text-center px-2 py-2 w-12 hidden md:table-cell ${sortableHeaderCls} ${isActiveCol('level') ? 'text-purple-300' : ''}`}
                            onClick={() => onHeaderSort('level')}>
                            {t('manager.list.colLevel')}{sortIndicator('level')}
                        </th>
                        <th className="text-left px-2 py-2 w-20 hidden lg:table-cell">{t('manager.list.colType')}</th>
                        <th className="text-left px-3 py-2 hidden xl:table-cell">{t('manager.list.colMoves')}</th>
                        <th className="text-left px-3 py-2 hidden lg:table-cell">{t('manager.list.colTags')}</th>
                        <th className="w-8 px-2 py-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={12} className="px-3 py-12 text-center text-gray-500">
                                {t('manager.list.noFilterResults')}
                            </td>
                        </tr>
                    ) : rows.map((p) => (
                        <SortableTableRow key={p.id} id={p.id}>
                            <td className="px-2 py-2 text-center">
                                <input type="checkbox" checked={selected.has(p.id)}
                                    onChange={() => onToggleSelect(p.id)}
                                    className="accent-purple-500 cursor-pointer" />
                            </td>
                            <td className="px-1 py-2">
                                <button type="button" onClick={() => onToggleFavorite(p)}
                                    className="p-1 hover:bg-white/10 rounded transition-colors">
                                    <Star size={14} className={p.favorite ? 'fill-pink-400 text-pink-400' : 'text-gray-500'} />
                                </button>
                            </td>
                            <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                    {spriteUrl(p) ? (
                                        <img src={spriteUrl(p)} alt="" className="w-10 h-10 object-contain"
                                            style={{ imageRendering: 'pixelated' }} loading="lazy" />
                                    ) : (
                                        <div className="w-10 h-10 flex items-center justify-center text-xl text-white/20">?</div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="text-white truncate flex items-center gap-1.5">
                                            {p.name || '?'}
                                            {p.shiny && <Sparkles size={12} className="text-yellow-300 flex-shrink-0" />}
                                        </div>
                                        <div className="text-[10px] text-gray-500">
                                            {p.dexNumber ? `#${p.dexNumber}` : ''}
                                            {p.nickname && <span className="ml-1 italic">&quot;{p.nickname}&quot;</span>}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-2 py-2 text-center text-purple-300 font-bold tabular-nums">{p.cp ?? '—'}</td>
                            <td className="px-2 py-2 text-center">
                                <div className="flex justify-center">
                                    <IvRing percent={p.iv?.percent ?? null} size={36} strokeWidth={2.5} />
                                </div>
                                {p.iv?.atk != null && (
                                    <div className="text-[10px] text-gray-500 tabular-nums mt-0.5">{p.iv.atk}/{p.iv.def}/{p.iv.sta}</div>
                                )}
                            </td>
                            <td className="px-2 py-2 text-center text-gray-300 tabular-nums hidden md:table-cell">{p.hp ?? '—'}</td>
                            <td className="px-2 py-2 text-center text-gray-300 tabular-nums hidden md:table-cell">{p.level ?? '—'}</td>
                            <td className="px-2 py-2 hidden lg:table-cell">
                                <div className="flex gap-1">
                                    {(p.types || []).map((typeId) => (
                                        <TypeBadge key={typeId} typeId={typeId} size={22} title={t(`types.${typeId}`)} />
                                    ))}
                                </div>
                            </td>
                            <td className="px-3 py-2 hidden xl:table-cell">
                                <div className="text-xs text-gray-300 leading-tight">
                                    <div>{p.fastMove || '—'}</div>
                                    <div className="text-gray-500">{p.chargedMove || ''}</div>
                                </div>
                            </td>
                            <td className="px-3 py-2 hidden lg:table-cell">
                                <div className="flex flex-wrap gap-1">
                                    {(p.tags || []).slice(0, 2).map((tag) => {
                                        const isHundo = tag === 'Hundo' || tag === 'Shundo';
                                        return (
                                            <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${isHundo
                                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                                                {tag}
                                            </span>
                                        );
                                    })}
                                </div>
                            </td>
                            <td className="px-2 py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <button type="button" onClick={() => onEdit(p)}
                                        className="p-1 hover:bg-purple-500/20 rounded text-gray-500 hover:text-purple-300 transition-colors"
                                        title={t('manager.dashboard.editPokemon')}>
                                        <Pencil size={14} />
                                    </button>
                                    <button type="button" onClick={() => onDelete(p.id)}
                                        className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-300 transition-colors"
                                        title={t('manager.list.delete')}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </SortableTableRow>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function GridView({ rows, t, selected, onToggleSelect, onToggleFavorite, onDelete, onEdit, isManualSort }) {
    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-12 text-center text-gray-500 text-sm">
                {t('manager.list.noFilterResults')}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {rows.map((p) => (
                <SortableGridCard key={p.id} id={p.id}>
                    <div className={`relative bg-black/30 border rounded-xl p-3 transition-colors ${selected.has(p.id) ? 'border-purple-400' : 'border-white/10 hover:border-purple-500/40'}`}>
                        <input type="checkbox" checked={selected.has(p.id)}
                            onChange={() => onToggleSelect(p.id)}
                            className="absolute top-2 left-2 accent-purple-500 cursor-pointer z-10" />
                        <button type="button" onClick={() => onToggleFavorite(p)}
                            className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded transition-colors z-10">
                            <Star size={14} className={p.favorite ? 'fill-pink-400 text-pink-400' : 'text-gray-500'} />
                        </button>
                        <div className="flex flex-col items-center gap-1 mt-2">
                            {spriteUrl(p) ? (
                                <img src={spriteUrl(p)} alt="" className="w-16 h-16 object-contain"
                                    style={{ imageRendering: 'pixelated' }} loading="lazy" />
                            ) : (
                                <div className="w-16 h-16 flex items-center justify-center text-3xl text-white/20">?</div>
                            )}
                            <div className="text-sm text-white truncate w-full text-center flex items-center justify-center gap-1">
                                {p.name || '?'}
                                {p.shiny && <Sparkles size={11} className="text-yellow-300" />}
                            </div>
                            <div className="text-[10px] text-gray-500">
                                {p.dexNumber ? `#${p.dexNumber}` : ''}
                            </div>
                            <div className="flex gap-1 my-1">
                                {(p.types || []).map((typeId) => (
                                    <TypeBadge key={typeId} typeId={typeId} size={20} title={t(`types.${typeId}`)} />
                                ))}
                            </div>
                            <div className="flex items-center gap-3 my-1">
                                <span className="text-purple-300 font-bold tabular-nums">{p.cp ?? '—'}</span>
                                <IvRing percent={p.iv?.percent ?? null} size={36} strokeWidth={2.5} />
                            </div>
                            {(p.tags || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 justify-center">
                                    {p.tags.slice(0, 2).map((tag) => {
                                        const isHundo = tag === 'Hundo' || tag === 'Shundo';
                                        return (
                                            <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${isHundo
                                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                                                {tag}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="absolute bottom-1 right-1 flex items-center gap-1">
                                <button type="button" onClick={() => onEdit(p)}
                                    className="p-1 hover:bg-purple-500/20 rounded text-gray-500 hover:text-purple-300 transition-colors"
                                    title={t('manager.dashboard.editPokemon')}>
                                    <Pencil size={12} />
                                </button>
                                <button type="button" onClick={() => onDelete(p.id)}
                                    className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-300 transition-colors"
                                    title={t('manager.list.delete')}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    </div>
                </SortableGridCard>
            ))}
        </div>
    );
}

// ─── Helpers ───

function StatChip({ label, value, active, onClick, icon, color = 'text-gray-300' }) {
    const isClickable = !!onClick;
    return (
        <button type="button" onClick={onClick} disabled={!isClickable}
            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all ${active
                ? 'bg-purple-500/20 border-purple-400 shadow-lg'
                : 'bg-black/20 border-white/10 hover:bg-white/5'} ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}>
            {icon && <span className={color}>{icon}</span>}
            <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-tight">{label}</div>
                <div className={`text-base md:text-lg font-bold leading-tight ${color}`}>{value}</div>
            </div>
        </button>
    );
}

function ToggleRow({ label, checked, onChange, icon }) {
    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="flex items-center gap-2 text-gray-200">{icon}{label}</span>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
                className="accent-purple-500" />
        </label>
    );
}

function SliderField({ label, min, max, step, valueMin, valueMax, onChange }) {
    return (
        <div>
            <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">{label}</label>
            <DualRangeSlider min={min} max={max} step={step}
                valueMin={valueMin} valueMax={valueMax} onChange={onChange} />
        </div>
    );
}

function DualRangeSlider({ min, max, step, valueMin, valueMax, onChange }) {
    const onMinChange = (e) => {
        const v = Math.min(Number(e.target.value), valueMax);
        onChange(v, valueMax);
    };
    const onMaxChange = (e) => {
        const v = Math.max(Number(e.target.value), valueMin);
        onChange(valueMin, v);
    };
    const lowPct = ((valueMin - min) / (max - min)) * 100;
    const highPct = ((valueMax - min) / (max - min)) * 100;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-300 tabular-nums">
                <span>{valueMin}</span>
                <span>{valueMax}</span>
            </div>
            <div className="dual-range">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-white/10 rounded" />
                <div className="absolute top-1/2 -translate-y-1/2 h-1 bg-purple-500 rounded"
                    style={{ left: `${lowPct}%`, right: `${100 - highPct}%` }} />
                <input type="range" min={min} max={max} step={step} value={valueMin} onChange={onMinChange}
                    aria-label="min" />
                <input type="range" min={min} max={max} step={step} value={valueMax} onChange={onMaxChange}
                    aria-label="max" />
            </div>
        </div>
    );
}
