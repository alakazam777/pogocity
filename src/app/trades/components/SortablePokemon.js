'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { useLanguage } from '@/context/LanguageContext';

function SortablePokemon({ id, pokemon, onRemove, onUpdate, type }) {
    const { t, lang } = useLanguage();
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="relative group bg-black/20 border border-white/10 p-1 md:p-2 flex flex-col items-center justify-center hover:bg-white/5 transition-colors rounded-xl min-h-[160px]">
            <div {...attributes} {...listeners} className="absolute top-1 left-2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-white z-40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <GripVertical size={16} />
            </div>
            <button onClick={() => onRemove(id)} className="absolute top-1 right-2 text-gray-400 hover:text-red-500 transition-colors z-40 opacity-100 md:opacity-0 md:group-hover:opacity-100" title={t('trades.remove')}>
                <Trash2 size={16} />
            </button>
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center relative mb-2 mt-4 overflow-hidden rounded-lg">
                {pokemon.hasBackground && pokemon.backgroundImage && (
                    <img src={pokemon.backgroundImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 z-0" loading="lazy" />
                )}
                <img
                    src={pokemon.sprite || getPokemonSprite(pokemon.id, pokemon.isShiny)}
                    alt={pokemon.nameFr}
                    className="w-full h-full object-contain pixelated relative z-10"
                    style={pokemon.sprite?.includes('margxt.fr') ? { transform: 'scale(1.55) translate(-4%, -8%)' } : {}}
                    {...(!pokemon.sprite?.startsWith('/') && { crossOrigin: 'anonymous' })}
                    onError={(e) => {
                        if (e.target.src !== getPokemonSprite(pokemon.id, pokemon.isShiny)) {
                            e.target.src = getPokemonSprite(pokemon.id, pokemon.isShiny);
                        }
                    }}
                />
                {pokemon.isDynamax && (
                    <img
                        src="/dynamax-cloud.png"
                        alt="Dynamax Aura"
                        className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 md:w-16 z-20 pointer-events-none"
                    />
                )}
                {pokemon.isShiny && (
                    <div className="absolute top-0 left-0 text-xs md:text-sm drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] z-30">✨</div>
                )}
                {pokemon.isPurified && (
                    <img src="https://cdn08.net/pokemongo/wiki/purified.png" className="absolute top-10 left-0 w-4 h-4 md:w-5 md:h-5 opacity-90 z-30" alt="Purified" />
                )}
                {pokemon.isGmax && (
                    <div className="absolute bottom-0 left-0 text-[10px] bg-red-600 text-white px-1 rounded font-bold z-30">GMAX</div>
                )}
                {type === 'forTrade' && pokemon.quantity >= 1 && (
                    <div className="absolute bottom-0 right-0 text-[10px] bg-white text-black px-1 rounded font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] z-30 shadow-sm border border-black/10">x{pokemon.quantity}</div>
                )}
            </div>

            {pokemon.formLabel && (
                <div className="w-full text-center px-1 mb-0.5">
                    <span className="text-[9px] font-bold text-gray-300 block truncate leading-tight uppercase tracking-tighter">
                        {lang === 'fr' ? pokemon.formLabel : (pokemon.formLabelEn || pokemon.formLabel)}
                    </span>
                </div>
            )}

            <div className="w-full mt-0.5 text-center px-1 mb-1 min-h-[16px]">
                {pokemon.showNote ? (
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder={t('trades.note')}
                            value={pokemon.note || ''}
                            onChange={(e) => onUpdate(id, { note: e.target.value })}
                            onBlur={(e) => { if (!e.relatedTarget?.classList?.contains('note-clear-btn')) onUpdate(id, { showNote: false }); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onUpdate(id, { showNote: false });
                                }
                            }}
                            autoFocus
                            className="w-full bg-black/60 border border-blue-500/50 rounded pl-1 pr-5 py-0.5 text-center text-[10px] text-white focus:outline-none focus:border-blue-400"
                        />
                        {pokemon.note && (
                            <button
                                className="note-clear-btn absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-full text-white transition-all"
                                onMouseDown={(e) => { e.preventDefault(); onUpdate(id, { note: '' }); }}
                                title={t('trades.clear')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        )}
                    </div>
                ) : pokemon.note ? (
                    <span
                        className="text-[9px] text-gray-400 block truncate leading-tight cursor-pointer hover:text-blue-400 transition-colors"
                        title={pokemon.note}
                        onClick={() => onUpdate(id, { showNote: true })}
                    >
                        {pokemon.note}
                    </span>
                ) : null}
            </div>

            <button
                onClick={() => onUpdate(id, { showNote: !pokemon.showNote })}
                className={`absolute top-1 left-1/2 -translate-x-1/2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex items-center justify-center rounded ${pokemon.note ? 'text-blue-400' : 'text-gray-500 hover:text-white'}`}
                title={t('trades.addNote')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            </button>

            {type === 'forTrade' && (
                <input
                    type="number"
                    min="1"
                    value={pokemon.quantity || 1}
                    onChange={(e) => onUpdate(id, { quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-black/40 border border-white/10 rounded px-1 text-center text-xs text-white focus:outline-none focus:border-purple-500"
                />
            )}
        </div>
    );
}

export default SortablePokemon;
