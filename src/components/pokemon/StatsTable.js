import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const STAT_FIELDS = [
    { id: 'level', labelKey: 'dashboard.statLevel', type: 'number', keywords: ['level', 'niveau'] },
    { id: 'xp', labelKey: 'dashboard.statXp', type: 'number', keywords: ['xp', 'experience', 'total de px'] },
    { id: 'distance', labelKey: 'dashboard.statDistance', type: 'number', keywords: ['distance', 'walked', 'km', 'marchée'] },
    { id: 'caught', labelKey: 'dashboard.statCaught', type: 'number', keywords: ['caught', 'pokemon', 'attrapés'] },
    { id: 'stops', labelKey: 'dashboard.statStops', type: 'number', keywords: ['stops', 'visited', 'visités'] },
    { id: 'stardust', labelKey: 'dashboard.statStardust', type: 'number', keywords: ['stardust', 'poussière', 'étoiles'] },
    { id: 'friendCode', labelKey: 'dashboard.statFriendCode', type: 'text', keywords: ['code', 'ami', 'friend'] },
];

export default function StatsTable({ stats, onChange, settings, onSettingsChange }) {
    const { t } = useLanguage();
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [allCities, setAllCities] = useState([]);
    const [localCity, setLocalCity] = useState(stats.city || '');
    const cityInputRef = useRef(null);

    const handleChange = useCallback((id, value) => {
        onChange({
            ...stats,
            [id]: value,
        });
    }, [stats, onChange]);

    // Search cities dynamically
    useEffect(() => {
        const fetchCities = async () => {
            if (!localCity || localCity.length < 2) {
                setAllCities([]);
                return;
            }
            try {
                const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${localCity}&fields=nom&limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    setAllCities(data.map(c => c.nom));
                }
            } catch (error) {
                console.error("Failed to search cities:", error);
            }
        };

        const timer = setTimeout(fetchCities, 300);
        return () => clearTimeout(timer);
    }, [localCity]);

    // Sync local city with props if props change externally
    useEffect(() => {
        if (stats.city !== localCity) {
            setLocalCity(stats.city || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stats.city]);

    // Debounce update to parent
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localCity !== stats.city) {
                handleChange('city', localCity);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localCity, stats.city, handleChange]);

    const citySuggestions = allCities; // Direct mapping now

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl mb-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div className="flex items-center gap-6">
                    <div>
                        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                            <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                            {t('dashboard.trainerInfo')}
                        </h3>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Row 1: City + First 3 Stats (Level, Friend Code, XP) */}
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {/* City Input */}
                    <div className="space-y-2 text-center relative" ref={cityInputRef}>
                        <label className="text-sm text-gray-400 block flex items-center justify-center gap-1">
                            <MapPin size={14} /> {t('dashboard.gameCity')}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={localCity}
                                onChange={(e) => {
                                    setLocalCity(e.target.value);
                                    setShowCityDropdown(true);
                                }}
                                onFocus={() => setShowCityDropdown(true)}
                                onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                                className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-center"
                                placeholder={t('dashboard.cityPlaceholder')}
                            />
                            <AnimatePresence>
                                {showCityDropdown && citySuggestions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto"
                                    >
                                        {citySuggestions.map((city, index) => (
                                            <button
                                                key={`${city}-${index}`}
                                                onClick={() => {
                                                    setLocalCity(city);
                                                    setShowCityDropdown(false);
                                                }}
                                                className="w-full px-4 py-2 text-left text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-sm block"
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {STAT_FIELDS.map((field) => (
                        <div
                            key={field.id}
                            className={`space-y-2 text-center text-center`}
                        >
                            <label className="text-sm text-gray-400 block">{t(field.labelKey)}</label>

                            {/* Friend Code Special Handling */}
                            {field.id === 'friendCode' ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={(stats[field.id] || '').toString().replace(/\D/g, '').replace(/(.{4})(?=.)/g, '$1 ')}
                                        onChange={(e) => {
                                            const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                                            handleChange(field.id, clean);
                                        }}
                                        className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-center placeholder:text-gray-600"
                                        placeholder="0000 0000 0000"
                                    />
                                    {settings && onSettingsChange && (
                                        <button
                                            onClick={() => onSettingsChange({ ...settings, showFriendCode: !(settings.showFriendCode !== false) })}
                                            className={`flex-shrink-0 p-2 rounded-lg border transition-all ${settings.showFriendCode !== false
                                                ? 'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30'
                                                : 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30'
                                                }`}
                                            title={settings.showFriendCode !== false ? t('dashboard.visibleOnWall') : t('dashboard.hiddenOnWall')}
                                        >
                                            {settings.showFriendCode !== false ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                        (stats[field.id] ? String(stats[field.id]).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : '')
                                    }
                                    onChange={(e) => {
                                        const cleanValue = e.target.value.replace(/\s/g, '').replace(',', '.');
                                        if (cleanValue === '' || !isNaN(cleanValue)) {
                                            handleChange(field.id, cleanValue);
                                        }
                                    }}
                                    className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-center"
                                    placeholder={'0'}
                                />
                            )}
                        </div>
                    ))}

                </div>

                {/* Team Selection */}
                <div className="mt-8 flex flex-col items-center space-y-3">
                    <label className="text-sm text-gray-400 block">{t('dashboard.team')}</label>
                    <div className="flex justify-center gap-4 h-[48px]">
                        {[
                            { id: 'Sagesse', color: 'bg-blue-900', border: 'border-blue-500', legacyName: 'Équipe Sagesse', name: t('dashboard.teamMystic'), logo: '/teams/mystic.png' },
                            { id: 'Bravoure', color: 'bg-red-900', border: 'border-red-500', legacyName: 'Équipe Bravoure', name: t('dashboard.teamValor'), logo: '/teams/valor.png' },
                            { id: 'Intuition', color: 'bg-yellow-900', border: 'border-yellow-500', legacyName: 'Équipe Intuition', name: t('dashboard.teamInstinct'), logo: '/teams/instinct.png' }
                        ].map(team => (
                            <button
                                key={team.id}
                                onClick={() => handleChange('team', team.id)}
                                className={`relative rounded-xl border flex items-center justify-center transition-all w-16 md:w-20 lg:w-24 ${stats.team === team.id || stats.team === team.legacyName ? `${team.color} ${team.border} shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-110 z-10` : 'bg-black/20 border-white/10 hover:bg-white/5 opacity-50 hover:opacity-100 grayscale hover:grayscale-0'}`}
                                title={team.name}
                            >
                                <img src={team.logo} alt={team.name} className="h-8 md:h-10 w-auto object-contain" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
