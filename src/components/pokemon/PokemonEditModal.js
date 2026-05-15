'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import PokemonEditForm from './PokemonEditForm';

// Modal wrapper around PokemonEditForm for editing an existing Pokémon
// in the user's collection. Calls PATCH /api/pokemon-collection/[id]
// and propagates the updated entity to the parent via onSaved.
export default function PokemonEditModal({ pokemon, customTags = [], leagueTags = [], onClose, onSaved }) {
    const { t } = useLanguage();

    // Lock background scroll while modal is open + close on Escape
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (!pokemon) return null;

    const handleSave = async (payload) => {
        // Strip fields that aren't user-editable / shouldn't be patched
        const { source, ...updates } = payload;
        const res = await fetch(`/api/pokemon-collection/${pokemon.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ updates }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || t('manager.form.errorGeneric'));
        if (onSaved) onSaved(data.pokemon);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl my-8 bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white truncate">
                        {t('manager.dashboard.editTitle').replace('{name}', pokemon.name || '?')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5">
                    <PokemonEditForm
                        initialValues={pokemon}
                        customTags={customTags}
                        leagueTags={leagueTags}
                        onSave={handleSave}
                        onCancel={onClose}
                        submitLabel={t('manager.dashboard.editSave')}
                    />
                </div>
            </div>
        </div>
    );
}
