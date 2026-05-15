'use client';

import { useEffect, useState } from 'react';
import { Heart, Sparkles, Loader2, Star } from 'lucide-react';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { POKEMON_DATA } from '@/data/pokemon';
import { useLanguage } from '@/context/LanguageContext';
import IvRing from './IvRing';
import TypeBadge from './TypeBadge';

const NAME_TO_ID = new Map();
for (const p of POKEMON_DATA) {
    if (p.nameFr) NAME_TO_ID.set(p.nameFr.toLowerCase(), p.id);
    if (p.nameEn) NAME_TO_ID.set(p.nameEn.toLowerCase(), p.id);
    if (p.nameJp) NAME_TO_ID.set(p.nameJp, p.id);
}

function spriteUrl(p) {
    if (p.dexNumber) return getPokemonSprite(p.dexNumber);
    if (p.name) {
        const id = NAME_TO_ID.get(p.name.toLowerCase());
        if (id) return getPokemonSprite(id);
    }
    return null;
}

export default function PublicFavorites({ username }) {
    const { t } = useLanguage();
    const [favorites, setFavorites] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/pokemon-collection/public/${encodeURIComponent(username)}`);
                if (!res.ok) { if (!cancelled) setFavorites([]); return; }
                const data = await res.json();
                if (!cancelled) setFavorites(data.favorites || []);
            } catch {
                if (!cancelled) setFavorites([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [username]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-4 text-gray-400">
                <Loader2 size={16} className="animate-spin" />
            </div>
        );
    }

    if (!favorites || favorites.length === 0) return null;

    return (
        <div className="mt-4 w-full">
            <h3 className="text-sm font-bold text-pink-300 flex items-center gap-2 mb-3">
                <Heart size={14} className="fill-pink-400 text-pink-400" />
                {t('manager.list.publicFavoritesTitle')} ({favorites.length})
            </h3>
            <div className="flex flex-col gap-2">
                {favorites.map((p) => (
                    <FavoriteRow key={p.id} p={p} />
                ))}
            </div>
        </div>
    );
}

function FavoriteRow({ p }) {
    const sprite = spriteUrl(p);
    return (
        <div className="grid grid-cols-[60px_1fr_60px] sm:grid-cols-[60px_minmax(0,2fr)_minmax(0,3fr)_60px] items-center gap-3 bg-black/30 hover:bg-white/5 border border-white/10 hover:border-pink-400/40 rounded-lg px-3 py-2 transition-colors">
            {/* Sprite */}
            <div className="flex items-center justify-center">
                {sprite ? (
                    <img src={sprite} alt="" className="w-12 h-12 object-contain"
                        style={{ imageRendering: 'pixelated' }} loading="lazy" />
                ) : (
                    <div className="w-12 h-12 flex items-center justify-center text-2xl text-white/20">?</div>
                )}
            </div>

            {/* Name + dex + nickname + types + flags */}
            <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm text-white truncate font-medium">{p.name || '?'}</span>
                    {p.shiny && <Sparkles size={12} className="text-yellow-300 flex-shrink-0" />}
                    {p.lucky && <Star size={11} className="fill-orange-400 text-orange-400 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    {p.dexNumber && <span>#{p.dexNumber}</span>}
                    {p.nickname && <span className="italic truncate">&quot;{p.nickname}&quot;</span>}
                </div>
                {(p.types || []).length > 0 && (
                    <div className="flex gap-1 mt-0.5">
                        {p.types.map((typeId) => (
                            <TypeBadge key={typeId} typeId={typeId} size={18} />
                        ))}
                    </div>
                )}
            </div>

            {/* Moveset (hidden on small screens) + CP */}
            <div className="hidden sm:flex flex-col gap-0.5 min-w-0 text-xs">
                <div className="text-gray-300 truncate">{p.fastMove || '—'}</div>
                <div className="text-gray-500 truncate">{p.chargedMove || '—'}</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-purple-300 font-bold tabular-nums text-sm">PC {p.cp ?? '—'}</span>
                    {p.level != null && <span className="text-[10px] text-gray-500">Niv. {p.level}</span>}
                </div>
            </div>

            {/* IV ring */}
            <div className="flex items-center justify-center">
                <IvRing percent={p.iv?.percent ?? null} size={48} strokeWidth={3} />
            </div>
        </div>
    );
}
