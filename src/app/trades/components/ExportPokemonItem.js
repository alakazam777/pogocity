'use client';

import { getPokemonSprite } from '@/lib/pokemonUtils';
import { useLanguage } from '@/context/LanguageContext';

function ExportPokemonItem({ pokemon, showQuantity: showQty = true }) {
    const { lang } = useLanguage();
    const showQuantity = showQty && pokemon.quantity >= 1;
    return (
        <div className="relative flex flex-col items-center gap-1">
            <div className="w-20 h-20 flex items-center justify-center relative overflow-hidden rounded-lg">
                {pokemon.hasBackground && pokemon.backgroundImage && (
                    <img
                        src={pokemon.backgroundImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-60 z-0"
                        crossOrigin="anonymous"
                    />
                )}
                {(pokemon.hasSignatureMove || pokemon.hasEliteTM) && (
                    <img
                        src="/backgrounds/signature-move.png"
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-50 z-0"
                        crossOrigin="anonymous"
                    />
                )}
                <img
                    src={pokemon.sprite || getPokemonSprite(pokemon.id, pokemon.isShiny)}
                    alt={pokemon.nameFr}
                    className="w-full h-full object-contain pixelated relative z-10"
                    style={pokemon.sprite?.includes('margxt.fr') ? { transform: 'scale(1.55) translate(-4%, -8%)' } : {}}
                    crossOrigin="anonymous"
                    onError={(e) => {
                        if (e.target.src !== getPokemonSprite(pokemon.id, pokemon.isShiny)) {
                            e.target.src = getPokemonSprite(pokemon.id, pokemon.isShiny);
                        }
                    }}
                />
                {pokemon.isShiny && <div className="absolute top-0 right-0 text-lg drop-shadow-[0_0_5px_rgba(250,204,21,0.8)] z-20">✨</div>}
                {showQuantity && <div className="absolute bottom-0 right-0 text-[10px] bg-white text-black px-1 rounded font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] z-20">x{pokemon.quantity}</div>}
                {pokemon.isDynamax === true && (
                    <img src="/dynamax-cloud.png" alt="Dynamax" className="absolute -top-1 left-1/2 -translate-x-1/2 w-14 z-20 pointer-events-none opacity-80" crossOrigin="anonymous" />
                )}
                {pokemon.isGmax === true && <div className="absolute bottom-0 right-0 text-[8px] bg-red-600 text-white px-1 rounded font-bold z-20">GMAX</div>}
            </div>
            {pokemon.formLabel && (
                <div className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter text-center max-w-[80px] leading-tight" style={{ color: '#d1d5db' }}>
                    {lang === 'fr' ? pokemon.formLabel : (pokemon.formLabelEn || pokemon.formLabel)}
                </div>
            )}
            {pokemon.note && <div className="text-[10px] text-gray-400 bg-black/50 px-1 rounded">{pokemon.note}</div>}
        </div>
    );
}

export default ExportPokemonItem;
