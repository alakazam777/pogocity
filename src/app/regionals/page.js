'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Copy, Check, ExternalLink, ChevronLeft, ChevronRight, ArrowRightLeft, MessageCircle, QrCode } from 'lucide-react';
import Link from 'next/link';
import { PRISMILLON_FORMS, getFormSprite } from '@/data/prismillonForms';
import { REGIONAL_POKEMON } from '@/data/regionalPokemon';
import { getPokemonSprite } from '@/lib/pokemonUtils';
import { useLanguage } from '@/context/LanguageContext';

function GlobeLoader() {
    const { t } = useLanguage();
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 text-sm">{t('regional.loadingGlobe')}</p>
            </div>
        </div>
    );
}

const PlanetGlobe = dynamic(() => import('@/components/PlanetGlobe'), { ssr: false, loading: () => <GlobeLoader /> });

// Geographic groupings for Prismillon forms
const PRISMILLON_GROUPS = [
    { labelKey: 'regional.europe', forms: ['Floraison', 'Rivage', 'Continent', 'Verdure', 'Glace'] },
    { labelKey: 'regional.americas', forms: ['Métropole', 'Archipel', 'Jungle', 'Mangrove', 'Sécheresse'] },
    { labelKey: 'regional.africaMiddleEast', forms: ['Delta', 'Sable', 'Zénith'] },
    { labelKey: 'regional.asiaPacificFull', forms: ['Cyclone', 'Monarchie', 'Soleil Levant'] },
    { labelKey: 'regional.polesToundra', forms: ['Banquise', 'Blizzard'] },
];

// Geographic groupings for regional Pokémon
const REGIONAL_GROUPS = [
    { labelKey: 'regional.europe', ids: [122, 439, 874, 707] },
    { labelKey: 'regional.americas', ids: [128, 214, 482, 515, 556, 626, 632, 455] },
    { labelKey: 'regional.asiaPacific', ids: [83, 324, 417, 480, 511, 764] },
    { labelKey: 'regional.oceania', ids: [115, 369] },
    { labelKey: 'regional.africaMiddleEast', ids: [357, 481, 513, 561] },
    { labelKey: 'regional.globalHemisphere', ids: [222, 335, 336, 441, 631, 701] },
];

export default function PlanetPage() {
    const { t, lang } = useLanguage();
    const [selectedForm, setSelectedForm] = useState(null);
    const [friendCodes, setFriendCodes] = useState([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [allTraders, setAllTraders] = useState([]);
    const [tradersForPokemon, setTradersForPokemon] = useState([]);
    const [loadingTraders, setLoadingTraders] = useState(false);
    const [qrCode, setQrCode] = useState(null);

    // Fetch all traders once on mount
    useEffect(() => {
        fetch('/api/pokemon/leaderboard')
            .then(res => res.json())
            .then(data => {
                const users = Array.isArray(data) ? data : (data.users || []);
                // Keep only users who have forTrade items
                const traders = users.filter(u => u.tradeList?.forTrade?.length > 0);
                setAllTraders(traders);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!selectedForm?.slug || selectedForm?.type !== 'prismillon') {
            setFriendCodes([]);
            return;
        }
        setLoadingCodes(true);
        fetch(`/api/vivillon?slug=${selectedForm.slug}`)
            .then(res => res.json())
            .then(data => { if (Array.isArray(data)) setFriendCodes(data); else setFriendCodes([]); })
            .catch(() => setFriendCodes([]))
            .finally(() => setLoadingCodes(false));
    }, [selectedForm?.slug, selectedForm?.type]);

    // Search traders who have this Pokémon forTrade
    useEffect(() => {
        if (!selectedForm || allTraders.length === 0) {
            setTradersForPokemon([]);
            return;
        }
        setLoadingTraders(true);
        const pokemonId = selectedForm.type === 'regional' ? selectedForm.id : null;
        const pokemonName = selectedForm.name?.toLowerCase();

        const matches = allTraders.filter(trader => {
            return trader.tradeList.forTrade.some(item => {
                // Match by ID for regionals
                if (pokemonId && (item.id === pokemonId || item.originalId === pokemonId)) return true;
                // Match by name for Prismillon (check if name contains "prismillon" + form name)
                if (selectedForm.type === 'prismillon') {
                    const itemName = (item.nameFr || item.nameEn || '').toLowerCase();
                    if (itemName.includes('prismillon') || itemName.includes('vivillon')) {
                        // Check if the form matches
                        if (itemName.includes(pokemonName)) return true;
                    }
                    // Also check by Vivillon id (666)
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
            })
        }));

        setTradersForPokemon(matches);
        setLoadingTraders(false);
    }, [selectedForm, allTraders]);

    const copyCode = async (code) => {
        const raw = code.replace(/\s/g, '');
        try {
            await navigator.clipboard.writeText(raw);
        } catch {
            // Fallback for mobile browsers
            const ta = document.createElement('textarea');
            ta.value = raw;
            ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); } catch { }
            document.body.removeChild(ta);
        }
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const handleSelect = (item) => {
        if (selectedForm?.name === item.name && selectedForm?.type === item.type) {
            setSelectedForm(null);
        } else {
            setSelectedForm(item);
            setSidebarOpen(false);
        }
    };

    return (
        <div className="h-screen bg-[#050510] relative overflow-hidden">
            {/* Globe — full viewport (position: fixed inside component) */}
            <PlanetGlobe selectedForm={selectedForm} onSelectForm={handleSelect} showPrismillon={true} showRegionals={true} modalOpen={!!selectedForm} />

            {/* Sidebar toggle button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`fixed z-40 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md border border-white/10 rounded-r-xl p-2.5 text-gray-400 hover:text-white transition-all ${sidebarOpen ? 'left-[175px] md:left-[185px]' : 'left-0'}`}
            >
                {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Collapsible Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ x: -200, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -200, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-[175px] md:w-[185px] bg-black/80 backdrop-blur-xl border-r border-white/10 z-30 overflow-y-auto scrollbar-hide pt-[110px] pb-4 px-2"
                    >
                        {/* Prismillon section */}
                        <p className="text-[10px] uppercase tracking-widest text-purple-400 font-bold px-2 mb-2 mt-1">🦋 {t('regional.prismillon')}</p>
                        {PRISMILLON_GROUPS.map((group) => (
                            <div key={group.labelKey} className="mb-3">
                                <p className="text-[9px] uppercase tracking-widest text-gray-600 font-bold px-2 mb-1">{t(group.labelKey)}</p>
                                <div className="flex flex-col gap-0.5">
                                    {group.forms.map(formName => {
                                        const form = PRISMILLON_FORMS.find(f => f.name === formName);
                                        if (!form) return null;
                                        const isActive = selectedForm?.name === form.name && selectedForm?.type === 'prismillon';
                                        return (
                                            <button
                                                key={form.name}
                                                onClick={() => handleSelect({ ...form, type: 'prismillon' })}
                                                className={`flex items-center gap-2 px-2.5 py-2 rounded-full text-left transition-all duration-300 text-xs font-semibold transform hover:scale-105 ${
                                                    isActive ? 'text-white scale-105' : 'text-gray-200 hover:text-white'
                                                }`}
                                                style={{
                                                    background: isActive
                                                        ? `linear-gradient(to bottom, ${form.color}, ${form.color}dd)`
                                                        : 'rgba(255,255,255,0.05)',
                                                    boxShadow: isActive
                                                        ? `0 4px 15px ${form.color}60, inset 0 1px 0 rgba(255,255,255,0.25)`
                                                        : 'none',
                                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                <img src={getFormSprite(form.spriteCode)} alt={form.name} className="w-6 h-6 object-contain flex-shrink-0" />
                                                <span className="truncate text-[11px]">{form.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Separator */}
                        <div className="h-px bg-white/10 mx-2 my-3" />

                        {/* Régionaux section */}
                        <p className="text-[10px] uppercase tracking-widest text-green-400 font-bold px-2 mb-2">🌍 {t('regional.regionals')}</p>
                        {REGIONAL_GROUPS.map((group) => (
                            <div key={group.labelKey} className="mb-3">
                                <p className="text-[9px] uppercase tracking-widest text-gray-600 font-bold px-2 mb-1">{t(group.labelKey)}</p>
                                <div className="flex flex-col gap-0.5">
                                    {group.ids.map(id => {
                                        const poke = REGIONAL_POKEMON.find(p => p.id === id);
                                        if (!poke) return null;
                                        const isActive = selectedForm?.id === poke.id && selectedForm?.type === 'regional';
                                        return (
                                            <button
                                                key={poke.id}
                                                onClick={() => handleSelect({ ...poke, type: 'regional' })}
                                                className={`flex items-center gap-2 px-2.5 py-2 rounded-full text-left transition-all duration-300 text-xs font-semibold transform hover:scale-105 ${
                                                    isActive ? 'text-white scale-105' : 'text-gray-200 hover:text-white'
                                                }`}
                                                style={{
                                                    background: isActive
                                                        ? `linear-gradient(to bottom, ${poke.color}, ${poke.color}dd)`
                                                        : 'rgba(255,255,255,0.05)',
                                                    boxShadow: isActive
                                                        ? `0 4px 15px ${poke.color}60, inset 0 1px 0 rgba(255,255,255,0.25)`
                                                        : 'none',
                                                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                <img src={getPokemonSprite(poke.id, false)} alt={poke.name} className="w-6 h-6 object-contain flex-shrink-0" />
                                                <span className="truncate text-[11px]">{poke.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Centered Modal Popup ─── */}
            <AnimatePresence>
                {selectedForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setSelectedForm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.85, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.85, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="bg-[#12122a]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto planet-scrollbar"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-5 pb-3 flex items-center gap-4">
                                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl border-2 flex items-center justify-center overflow-hidden flex-shrink-0"
                                    style={{ borderColor: selectedForm.color, background: `${selectedForm.color}10`, boxShadow: `0 0 30px ${selectedForm.color}20` }}>
                                    <img
                                        src={selectedForm.type === 'prismillon' ? getFormSprite(selectedForm.spriteCode) : getPokemonSprite(selectedForm.id, false)}
                                        alt={selectedForm.name}
                                        className="w-12 h-12 md:w-14 md:h-14 object-contain"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg md:text-xl font-bold text-white">
                                        {selectedForm.type === 'prismillon' ? (
                                            <>{t('regional.prismillon')} <span style={{ color: selectedForm.color }}>{selectedForm.name}</span></>
                                        ) : (
                                            <span style={{ color: selectedForm.color }}>{selectedForm.name} <span className="text-gray-500 text-sm font-normal">#{selectedForm.id}</span></span>
                                        )}
                                    </h3>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        {selectedForm.type === 'prismillon'
                                            ? t('regional.countriesRegions').replace('{count}', selectedForm.countries.length)
                                            : selectedForm.region
                                        }
                                    </p>
                                </div>
                                <button onClick={() => setSelectedForm(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-colors flex-shrink-0">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="h-px bg-white/5 mx-5" />

                            {/* Prismillon: Friend Codes */}
                            {selectedForm.type === 'prismillon' && (
                                <div className="p-5 pt-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('regional.friendCodes')}</h4>
                                        <a href={`https://www.pokemon-friends.eu/fr/vivillon/${selectedForm.slug}/`} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] text-gray-600 hover:text-gray-300 flex items-center gap-1 transition-colors">
                                            {t('regional.seeMore')} <ExternalLink size={10} />
                                        </a>
                                    </div>
                                    {loadingCodes ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                                            <span className="text-gray-500 text-xs ml-2">{t('common.loading')}</span>
                                        </div>
                                    ) : friendCodes.length > 0 ? (
                                        <div className="flex flex-col gap-1.5">
                                            {friendCodes.map((entry, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <button onClick={() => copyCode(entry.code)}
                                                            className="flex-1 flex items-center justify-between gap-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl px-3 py-2.5 transition-all group text-left min-w-0">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                {entry.country && (
                                                                    <img src={`https://flagcdn.com/24x18/${entry.country.toLowerCase()}.png`} alt={entry.country}
                                                                        className="w-6 h-4 object-cover rounded-sm flex-shrink-0 border border-white/10" onError={(e) => { e.target.style.display = 'none'; }} />
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
                                            <a href={`https://www.pokemon-friends.eu/fr/vivillon/${selectedForm.slug}/`} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs mt-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors">
                                                {t('regional.searchOnSite')} <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Regional: Info */}
                            {selectedForm.type === 'regional' && (
                                <div className="p-5 pt-4">
                                    <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/5">
                                        <img src={getPokemonSprite(selectedForm.id, false)} alt={selectedForm.name} className="w-20 h-20 object-contain flex-shrink-0" />
                                        <div>
                                            <p className="text-white font-bold text-lg">{selectedForm.name}</p>
                                            <p className="text-gray-400 text-sm mt-1">{selectedForm.region}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Traders who have this Pokémon */}
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
                                            <div key={trader.username}
                                                className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-xl px-3 py-2.5 transition-all group">
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
                                                <Link
                                                    href={`/trades?user=${encodeURIComponent(trader.username)}`}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
                                                >
                                                    <MessageCircle size={12} />
                                                    {t('regional.viewProfile')}
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-600 text-xs">{t('regional.noTraderAvailable')}</p>
                                        <Link href="/trades" className="inline-flex items-center gap-1 text-xs mt-2 text-amber-500 hover:text-amber-400 transition-colors">
                                            {t('regional.viewTradeHall')} <ExternalLink size={10} />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <style jsx global>{`
                .planet-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .planet-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .planet-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .planet-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
