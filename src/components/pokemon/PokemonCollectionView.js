'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Star, Trash2, Search, Loader2, Sparkles, Check } from 'lucide-react';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { POKEMON_DATA } from '@/data/pokemon';
import { useLanguage } from '@/context/LanguageContext';
import IvRing from './IvRing';
import TypeBadge from './TypeBadge';

// Name → dex# lookup: lets us resolve sprites for Pokémon entered manually
// without a Pokédex number (e.g. user typed "Forgelina" but skipped the # field).
const NAME_TO_ID = new Map();
for (const p of POKEMON_DATA) {
    if (p.nameFr) NAME_TO_ID.set(p.nameFr.toLowerCase(), p.id);
    if (p.nameEn) NAME_TO_ID.set(p.nameEn.toLowerCase(), p.id);
    if (p.nameJp) NAME_TO_ID.set(p.nameJp, p.id);
}

const SORT_OPTIONS = [
    { id: 'cp_desc', getter: (p) => -(p.cp || 0) },
    { id: 'cp_asc', getter: (p) => (p.cp || 0) },
    { id: 'iv_desc', getter: (p) => -(p.iv?.percent || 0) },
    { id: 'name_asc', getter: (p) => (p.name || '').toLowerCase() },
    { id: 'date_desc', getter: (p) => -(new Date(p.scanDate || 0).getTime()) },
];

function spriteUrl(p) {
    if (p.dexNumber) return getPokemonSprite(p.dexNumber);
    if (p.name) {
        const id = NAME_TO_ID.get(p.name.toLowerCase());
        if (id) return getPokemonSprite(id);
    }
    return null;
}

function ivColor(percent) {
    if (percent === 100) return 'text-red-400';
    if (percent >= 90) return 'text-yellow-400';
    if (percent >= 75) return 'text-green-400';
    return 'text-gray-300';
}

export default function PokemonCollectionView({ variant = 'compact', onChange }) {
    const { t, lang } = useLanguage();
    const [pokemon, setPokemon] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sortId, setSortId] = useState('cp_desc');
    const [favOnly, setFavOnly] = useState(false);
    const [shinyOnly, setShinyOnly] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/pokemon-collection/list', { credentials: 'include' });
            if (!res.ok) { setPokemon([]); return; }
            const data = await res.json();
            setPokemon(data.pokemon || []);
        } catch {
            setPokemon([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const handleDelete = async (id) => {
        if (!window.confirm(t('manager.list.confirmDelete'))) return;
        const res = await fetch(`/api/pokemon-collection/${id}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            setPokemon((prev) => prev.filter((p) => p.id !== id));
            if (onChange && data.summary) onChange(data.summary);
        }
    };

    const handleToggleFavorite = async (p) => {
        const res = await fetch(`/api/pokemon-collection/${p.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ updates: { favorite: !p.favorite } }),
        });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            setPokemon((prev) => prev.map((x) => x.id === p.id ? { ...x, favorite: !p.favorite } : x));
            if (onChange && data.summary) onChange(data.summary);
        }
    };

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
        if (favOnly) list = list.filter((p) => p.favorite);
        if (shinyOnly) list = list.filter((p) => p.shiny);
        const sorter = SORT_OPTIONS.find((s) => s.id === sortId)?.getter;
        if (sorter) list.sort((a, b) => {
            const va = sorter(a);
            const vb = sorter(b);
            if (va < vb) return -1;
            if (va > vb) return 1;
            return 0;
        });
        return list;
    }, [pokemon, search, sortId, favOnly, shinyOnly]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
            </div>
        );
    }

    if (pokemon.length === 0) {
        if (variant === 'compact') return null; // hide entirely when empty in compact mode
        return (
            <div className="text-center py-12 text-gray-400 text-sm">
                {t('manager.empty')}
            </div>
        );
    }

    if (variant === 'compact') {
        const top = filtered.slice(0, 8);
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{t('manager.list.recent')} ({pokemon.length})</span>
                    <a href={lang === 'en' ? '/manager' : '/box'} className="text-purple-300 hover:text-purple-200 underline">
                        {t('manager.list.viewAll')} →
                    </a>
                </div>
                <div className="rounded-lg overflow-hidden border border-white/10">
                    <div className="grid grid-cols-[44px_minmax(0,1fr)_56px_44px_56px_56px_minmax(0,1.5fr)] gap-2 px-3 py-1.5 bg-black/40 text-[10px] uppercase tracking-wider text-gray-400">
                        <span></span>
                        <span className="text-left">{t('manager.list.colPokemon')}</span>
                        <span className="text-center">{t('manager.list.colCp')}</span>
                        <span className="text-center">{t('manager.list.colLevel')}</span>
                        <span className="text-center">{t('manager.list.colIv')}</span>
                        <span className="text-center">{t('manager.list.colType')}</span>
                        <span className="text-left hidden sm:inline">{t('manager.list.colMoves')}</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                        {top.map((p) => (
                            <CompactRow key={p.id} p={p} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Full variant — table
    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('manager.list.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                </div>
                <select value={sortId} onChange={(e) => setSortId(e.target.value)}
                    className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                    <option value="cp_desc">{t('manager.list.sortCpDesc')}</option>
                    <option value="cp_asc">{t('manager.list.sortCpAsc')}</option>
                    <option value="iv_desc">{t('manager.list.sortIvDesc')}</option>
                    <option value="name_asc">{t('manager.list.sortNameAsc')}</option>
                    <option value="date_desc">{t('manager.list.sortDateDesc')}</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                    <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)}
                        className="accent-pink-500" />
                    <Star size={14} className={favOnly ? 'fill-pink-400 text-pink-400' : 'text-gray-500'} />
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer">
                    <input type="checkbox" checked={shinyOnly} onChange={(e) => setShinyOnly(e.target.checked)}
                        className="accent-yellow-400" />
                    <Sparkles size={14} className={shinyOnly ? 'text-yellow-300' : 'text-gray-500'} />
                </label>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                    {filtered.length} / {pokemon.length}
                </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                    <thead className="bg-black/40 text-xs uppercase tracking-wider text-gray-400">
                        <tr>
                            <th className="text-left px-3 py-2"></th>
                            <th className="text-left px-3 py-2">{t('manager.list.colPokemon')}</th>
                            <th className="text-right px-3 py-2">{t('manager.list.colCp')}</th>
                            <th className="text-right px-3 py-2">{t('manager.list.colIv')}</th>
                            <th className="text-right px-3 py-2 hidden md:table-cell">{t('manager.list.colHp')}</th>
                            <th className="text-right px-3 py-2 hidden md:table-cell">{t('manager.list.colLevel')}</th>
                            <th className="text-left px-3 py-2 hidden lg:table-cell">{t('manager.list.colMoves')}</th>
                            <th className="text-left px-3 py-2 hidden lg:table-cell">{t('manager.list.colTags')}</th>
                            <th className="text-right px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => (
                            <tr key={p.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-3 py-2">
                                    <button type="button" onClick={() => handleToggleFavorite(p)}
                                        className="p-1 hover:bg-white/10 rounded transition-colors">
                                        <Star size={14} className={p.favorite ? 'fill-pink-400 text-pink-400' : 'text-gray-500'} />
                                    </button>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        {spriteUrl(p) && (
                                            <img src={spriteUrl(p)} alt="" className="w-9 h-9 object-contain"
                                                style={{ imageRendering: 'pixelated' }} loading="lazy" />
                                        )}
                                        <div className="min-w-0">
                                            <div className="text-white truncate flex items-center gap-1.5">
                                                {p.name || '?'}
                                                {p.shiny && <Sparkles size={12} className="text-yellow-300 flex-shrink-0" />}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {p.dexNumber ? `#${p.dexNumber}` : ''}
                                                {p.nickname && <span className="ml-1 italic">"{p.nickname}"</span>}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-right text-purple-300 font-medium tabular-nums">
                                    {p.cp ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    <span className={ivColor(p.iv?.percent)}>{p.iv?.percent != null ? `${p.iv.percent}%` : '—'}</span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-300 tabular-nums hidden md:table-cell">
                                    {p.hp ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-300 tabular-nums hidden md:table-cell">
                                    {p.level ?? '—'}
                                </td>
                                <td className="px-3 py-2 hidden lg:table-cell">
                                    <div className="text-xs text-gray-300">
                                        <div>{p.fastMove || '—'}</div>
                                        <div className="text-gray-500">{p.chargedMove || ''}</div>
                                    </div>
                                </td>
                                <td className="px-3 py-2 hidden lg:table-cell">
                                    <div className="flex flex-wrap gap-1">
                                        {(p.tags || []).slice(0, 3).map((tag) => (
                                            <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${tag === 'Hundo' || tag === 'Shundo'
                                                ? 'bg-red-500/20 text-red-300 border-red-500/30'
                                                : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <button type="button" onClick={() => handleDelete(p.id)}
                                        className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-300 transition-colors"
                                        title={t('manager.list.delete')}>
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CompactRow({ p }) {
    const sprite = spriteUrl(p);
    return (
        <div className="grid grid-cols-[44px_minmax(0,1fr)_56px_44px_56px_56px_minmax(0,1.5fr)] gap-2 px-3 py-1.5 items-center bg-black/20 hover:bg-white/5 transition-colors text-sm">
            <div className="w-11 h-11 flex items-center justify-center">
                {sprite ? (
                    <img src={sprite} alt="" className="w-11 h-11 object-contain"
                        style={{ imageRendering: 'pixelated' }} loading="lazy" />
                ) : (
                    <span className="text-xl text-white/20">?</span>
                )}
            </div>
            <div className="min-w-0">
                <div className="text-sm text-white truncate flex items-center gap-1.5">
                    {p.name || '?'}
                    {p.shiny && <Sparkles size={11} className="text-yellow-300 flex-shrink-0" />}
                    {p.favorite && <Star size={11} className="fill-pink-400 text-pink-400 flex-shrink-0" />}
                </div>
                <div className="text-[10px] text-gray-500 truncate">
                    {p.dexNumber ? `#${p.dexNumber}` : ''}
                    {p.nickname && <span className="ml-1 italic">&quot;{p.nickname}&quot;</span>}
                </div>
            </div>
            <div className="text-center tabular-nums text-purple-300 font-bold">{p.cp ?? '—'}</div>
            <div className="text-center tabular-nums text-xs text-gray-300">{p.level ?? '—'}</div>
            <div className="flex items-center justify-center">
                <IvRing percent={p.iv?.percent ?? null} size={36} strokeWidth={2.5} />
            </div>
            <div className="flex gap-1 items-center justify-center">
                {(p.types || []).slice(0, 2).map((typeId) => (
                    <TypeBadge key={typeId} typeId={typeId} size={20} />
                ))}
            </div>
            <div className="hidden sm:block min-w-0 text-xs text-gray-300 leading-tight truncate">
                <div className="truncate">{p.fastMove || '—'}</div>
                <div className="truncate text-gray-500">{p.chargedMove || ''}</div>
            </div>
        </div>
    );
}
