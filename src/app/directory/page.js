'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy } from 'lucide-react';
import { useSession, signIn } from "next-auth/react";
import ProgressionChart from '@/components/ProgressionChart';
import { useLanguage } from '@/context/LanguageContext';

const ProgressionChart_Old = ({ history, height = 60 }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    if (!history || history.length < 2) return null;

    // Process data
    const data = history
        .map(h => ({
            date: new Date(h.date),
            caught: parseInt(h.stats?.caught || 0),
            stops: parseInt(h.stats?.stops || 0),
            xp: parseInt(h.stats?.xp || 0),
            distance: parseInt(h.stats?.distance || 0),
        }))
        .filter(d => d.caught > 0) // Basic filter
        .sort((a, b) => a.date - b.date);

    if (data.length < 2) return null;

    const width = 300;
    const padding = 10;
    const chartHeight = height - 30; // Reserve space for legend

    // Helper to generate points
    const getPoints = (key) => {
        const values = data.map(d => d[key]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        return values.map((val, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = chartHeight - ((val - min) / range) * chartHeight;
            return `${x},${y}`;
        }).join(' ');
    };

    const metrics = [
        { key: 'caught', color: '#4ade80', label: 'Attrapés' },
        { key: 'stops', color: '#60a5fa', label: 'PokéStops' },
        { key: 'distance', color: '#fb923c', label: 'Distance' },
        { key: 'xp', color: '#a855f7', label: 'XP' }
    ];

    return (
        <div className="w-full mt-4 bg-white/5 rounded-xl p-3 border border-white/5 relative group">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Progression</span>
                {hoveredIndex !== null && (
                    <span className="text-xs font-mono text-white">
                        {data[hoveredIndex].date.toLocaleDateString()}
                    </span>
                )}
            </div>

            <div
                className="w-full relative"
                style={{ height: `${height}px` }}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left - padding;
                    const effectiveWidth = rect.width - 2 * padding; // Adjust for padding scaling
                    // Map x back to index
                    // x / effectiveWidth = index / (length - 1)
                    let index = Math.round((x / effectiveWidth) * (data.length - 1));
                    index = Math.min(Math.max(index, 0), data.length - 1);
                    setHoveredIndex(index);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {metrics.map(m => {
                        const points = getPoints(m.key);
                        return (
                            <g key={m.key}>
                                <polyline
                                    fill="none"
                                    stroke={m.color}
                                    strokeWidth="2"
                                    points={points}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity={hoveredIndex !== null ? 0.3 : 0.8}
                                />
                                {/* Dots for all points */}
                                {points.split(' ').map((p, i) => {
                                    const [cx, cy] = p.split(',');
                                    return (
                                        <circle
                                            key={i}
                                            cx={cx}
                                            cy={cy}
                                            r={hoveredIndex === i ? 4 : 1.5}
                                            fill={m.color}
                                            opacity={hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1}
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Hover Line */}
                    {hoveredIndex !== null && (
                        <line
                            x1={padding + (hoveredIndex / (data.length - 1)) * (width - 2 * padding)}
                            y1="0"
                            x2={padding + (hoveredIndex / (data.length - 1)) * (width - 2 * padding)}
                            y2={chartHeight}
                            stroke="white"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.5"
                        />
                    )}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-0 left-0 w-full flex justify-center gap-4 pointer-events-none">
                    {metrics.map(m => (
                        <div key={m.key} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                            <span className="text-[10px] text-gray-400">{m.label}</span>
                        </div>
                    ))}
                </div>

                {/* Tooltip */}
                {hoveredIndex !== null && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none">
                        <div className="bg-black/90 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl text-[10px] z-10 whitespace-nowrap">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                {metrics.map(m => (
                                    <div key={m.key} className="flex items-center justify-between gap-2">
                                        <span style={{ color: m.color }}>{m.label}</span>
                                        <span className="font-mono text-white">
                                            {m.key === 'xp'
                                                ? (data[hoveredIndex][m.key] / 1000000).toFixed(2) + 'M'
                                                : data[hoveredIndex][m.key].toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function LeaderboardPage({ initialTrainer }) {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [selectedTrainer, setSelectedTrainer] = useState(null);
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/pokemon/leaderboard');
                if (res.ok) {
                    const data = await res.json();
                    setLeaders(data);
                }
            } catch (error) {
                console.error('Failed to load leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    useEffect(() => {
        if (initialTrainer && leaders.length > 0 && !selectedTrainer) {
            const trainer = leaders.find(l => l.username.toLowerCase() === initialTrainer.toLowerCase());
            if (trainer) setSelectedTrainer(trainer);
        }
    }, [initialTrainer, leaders, selectedTrainer]);

    // Format friend code
    const formatFriendCode = (code) => {
        if (!code) return '';
        return code.replace(/\D/g, '');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white pt-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 relative overflow-x-hidden overflow-y-scroll scrollbar-hide">
                <div className="max-w-[85%] mx-auto">
                    {/* View Filters Removed */}

                    {/* Grid Layout for Distant Trainers */}
                    <div className="mb-8 mt-4">
                        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] text-center">
                            {t('rankings.directory')}
                        </h1>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {leaders.map((trainer, index) => (
                            <motion.div
                                key={trainer.username}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3 cursor-pointer group transition-all hover:scale-105 shadow-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                                onClick={() => setSelectedTrainer(trainer)}
                            >
                                <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-br from-purple-500 to-pink-500 relative">
                                    {trainer.trainerImage ? (
                                        <img
                                            src={trainer.trainerImage}
                                            alt={trainer.username}
                                            className="w-full h-full rounded-full object-cover bg-[#0a0a0a]"
                                            style={{ objectPosition: '55% 25%' }}
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center text-white font-bold text-2xl">
                                            {trainer.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 bg-black rounded-full px-2 py-0.5 border border-white/20 text-[10px] font-bold text-white">
                                        Lv {trainer.level}
                                    </div>
                                </div>

                                <div className="text-center w-full">
                                    <h3 className={`font-bold text-base truncate w-full ${trainer.team?.includes('Sagesse') || trainer.team?.includes('Mystic') ? 'text-blue-400' :
                                        trainer.team?.includes('Bravoure') || trainer.team?.includes('Valor') ? 'text-red-400' :
                                            trainer.team?.includes('Intuition') || trainer.team?.includes('Instinct') ? 'text-yellow-400' :
                                                'text-white'
                                        }`}>
                                        {trainer.username}
                                    </h3>
                                    {trainer.city && (
                                        <p className="text-xs text-gray-500 truncate">{trainer.city}</p>
                                    )}
                                </div>


                            </motion.div>
                        ))}
                    </div>

                    {leaders.length === 0 && !loading && (
                        <div className="p-8 text-center text-gray-500">
                            {t('rankings.noTrainerFound')}
                        </div>
                    )}
                </div>

                {/* Hover Preview Removed */}

                {/* Trainer Modal */}
                <AnimatePresence>
                    {selectedTrainer && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedTrainer(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-[#1a1a1a] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Simplified Header */}
                                <div className="p-6 border-b border-white/10 relative bg-black/20">
                                    <button
                                        onClick={() => setSelectedTrainer(null)}
                                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10"
                                    >
                                        <X size={24} />
                                    </button>

                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pr-12">
                                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                                            {selectedTrainer.trainerImage ? (
                                                <img
                                                    src={selectedTrainer.trainerImage}
                                                    alt={selectedTrainer.username}
                                                    className="w-full h-full rounded-full object-cover bg-[#0a0a0a] scale-125"
                                                    style={{ objectPosition: '55% 25%' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center text-white font-bold text-2xl">
                                                    {selectedTrainer.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className="text-2xl font-bold text-white truncate">
                                                    {selectedTrainer.username}
                                                </h2>
                                                {selectedTrainer.team && (
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? 'bg-red-500/20 border-red-500 text-red-400' :
                                                        selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                                                            'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                                        }`}>
                                                        {selectedTrainer.team}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="text-gray-400 text-xs md:text-sm flex items-center gap-2 flex-wrap">
                                                    <span>{t('rankings.level')} {selectedTrainer.level || 1}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                    <span>{((selectedTrainer.xp || 0) / 1000000).toFixed(1)}M {t('rankings.xpTotal')}</span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {selectedTrainer.friendCode && (
                                                        <div className="flex items-center gap-2 text-gray-300 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                            <span className="font-mono font-bold tracking-wider text-xs">
                                                                {formatFriendCode(selectedTrainer.friendCode)}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigator.clipboard.writeText(selectedTrainer.friendCode);
                                                                }}
                                                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                                                title={t('rankings.copy')}
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            if (selectedTrainer.discordId) {
                                                                window.open(`https://discord.com/users/${selectedTrainer.discordId}`, '_blank');
                                                            }
                                                        }}
                                                        disabled={!selectedTrainer.discordId}
                                                        className={`flex items-center gap-1.5 text-white px-2 py-1 rounded-lg transition-colors text-xs font-bold shadow-lg ${selectedTrainer.discordId
                                                            ? 'bg-[#5865F2] hover:bg-[#4752C4] shadow-[#5865F2]/20 cursor-pointer'
                                                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                                                            }`}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.966 2.419-2.176 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.946 2.418-2.157 2.418z" />
                                                        </svg>
                                                        {t('rankings.contact')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">


                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-white uppercase tracking-wider mb-1">Distance</p>
                                            <p className="text-xl font-bold text-orange-200">{selectedTrainer.distance.toLocaleString()} km</p>
                                            {selectedTrainer.distanceThisWeek > 0 && (
                                                <p className="text-xs font-bold text-green-400 mt-1">+{selectedTrainer.distanceThisWeek.toLocaleString()} {t('rankings.thisWeek')}</p>
                                            )}
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-white uppercase tracking-wider mb-1">{t('rankings.catches')}</p>
                                            <p className="text-xl font-bold text-green-200">{selectedTrainer.caught.toLocaleString()}</p>
                                            {selectedTrainer.caughtThisWeek > 0 && (
                                                <p className="text-xs font-bold text-green-400 mt-1">+{selectedTrainer.caughtThisWeek.toLocaleString()} {t('rankings.thisWeek')}</p>
                                            )}
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-white uppercase tracking-wider mb-1">{t('chart.pokestops')}</p>
                                            <p className="text-xl font-bold text-blue-200">{selectedTrainer.stops.toLocaleString()}</p>
                                            {selectedTrainer.stopsThisWeek > 0 && (
                                                <p className="text-xs font-bold text-green-400 mt-1">+{selectedTrainer.stopsThisWeek.toLocaleString()} {t('rankings.thisWeek')}</p>
                                            )}
                                        </div>
                                        {selectedTrainer.battles > 0 && (
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('rankings.battles')}</p>
                                                <p className="text-xl font-bold text-red-400">{selectedTrainer.battles}</p>
                                            </div>
                                        )}
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Shiny</p>
                                            <p className="text-xl font-bold text-yellow-300">{selectedTrainer.shinydex}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">100%</p>
                                            <p className="text-xl font-bold text-pink-400">{selectedTrainer.hundo}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">XXL</p>
                                            <p className="text-xl font-bold text-orange-400">{selectedTrainer.xxldex || 0}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">XXS</p>
                                            <p className="text-xl font-bold text-cyan-400">{selectedTrainer.xxsdex || 0}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('rankings.shadows')}</p>
                                            <p className="text-xl font-bold text-purple-400">{selectedTrainer.shadow || 0}</p>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t('rankings.purified')}</p>
                                            <p className="text-xl font-bold text-gray-400">{selectedTrainer.purified || 0}</p>
                                        </div>
                                    </div>

                                    {/* Progression Chart in Modal */}
                                    <ProgressionChart history={selectedTrainer.history} height={150} />

                                    {(selectedTrainer.tradeList?.lookingFor?.length > 0 || selectedTrainer.tradeList?.forTrade?.length > 0) && (
                                        <div className="mt-8 pt-8 border-t border-white/10">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xl font-bold text-white text-left">{t('rankings.trade')}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {/* Looking For */}
                                                {selectedTrainer.tradeList.lookingFor?.length > 0 && (
                                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <h4 className="text-[#60a5fa] font-bold mb-4 flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                                            {t('rankings.lookingFor')}
                                                        </h4>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {selectedTrainer.tradeList.lookingFor.map((pokemon, i) => (
                                                                <div key={i} className="relative group" title={pokemon.nameFr}>
                                                                    <img
                                                                        src={pokemon.sprite}
                                                                        alt={pokemon.nameFr}
                                                                        className="w-12 h-12 object-contain pixelated mx-auto"
                                                                    />
                                                                    {pokemon.isShiny && (
                                                                        <div className="absolute -top-2 -right-2 text-yellow-400 text-xs drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">✨</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* For Trade */}
                                                {selectedTrainer.tradeList.forTrade?.length > 0 && (
                                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <h4 className="text-[#4ade80] font-bold mb-4 flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full border-2 border-[#4ade80] flex items-center justify-center text-[10px]">⇄</div>
                                                            {t('rankings.offers')}
                                                        </h4>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {selectedTrainer.tradeList.forTrade.map((pokemon, i) => (
                                                                <div key={i} className="relative group" title={pokemon.nameFr}>
                                                                    <img
                                                                        src={pokemon.sprite}
                                                                        alt={pokemon.nameFr}
                                                                        className="w-12 h-12 object-contain pixelated mx-auto"
                                                                    />
                                                                    {pokemon.isShiny && (
                                                                        <div className="absolute -top-2 -right-2 text-yellow-400 text-xs drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">✨</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >
        </>
    );
}
