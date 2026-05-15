'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import ChatPopup from '@/components/ChatPopup';
import { useSession, signIn } from "next-auth/react";
import ProgressionChart from '@/components/ProgressionChart';
import { useLanguage } from '@/context/LanguageContext';
import ReportBlockButtons from '@/components/ReportBlockButtons';

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
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [showAllFavorites, setShowAllFavorites] = useState(false);
    const [chatTarget, setChatTarget] = useState(null);
    const [leaders, setLeaders] = useState([]);

    const [loading, setLoading] = useState(true);
    const [filterMode, setFilterMode] = useState('all'); // 'local', 'global', 'all'
    const [sortConfig, setSortConfig] = useState({ key: 'caught', direction: 'desc' });

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const sortedLeaders = [...leaders].sort((a, b) => {
        let aValue = a[sortConfig.key] || 0;
        let bValue = b[sortConfig.key] || 0;

        if (typeof aValue === 'string') {
            return sortConfig.direction === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }

        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });

    const isLocalCity = (city) => {
        if (!city) return false;
        const c = city.toLowerCase();
        return c.includes('poitiers') || c.includes('buxerolles') || c.includes('migné') || c.includes('biard') || c.includes('vouneuil') || c.includes('chasseneuil') || c.includes('saint-benoît') || c.includes('fontaine-le-comte') || c.includes('montamisé') || c.includes('ligugé');
    };

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

    // ... (rest of useEffects)

    // ...

    // Format friend code
    const formatFriendCode = (code) => {
        if (!code) return '';
        return code.replace(/\D/g, '');
    };

    if (loading) {
        // ...
    }

    return (
        <>
            {/* ... styles ... */}
            {/* ... styles ... */}
            <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-2 md:px-4">
                <div className="w-full md:max-w-[85%] mx-auto">

                    <div className="mb-8 mt-4 text-center">
                        <h1
                            className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] transition-all duration-300"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            {t('rankings.topTrainers')}
                        </h1>

                        <div className="flex justify-center gap-2 md:gap-4 my-6 md:my-10 flex-nowrap overflow-x-auto py-4 px-4 custom-scrollbar md:overflow-visible">
                            <button
                                onClick={() => setFilterMode('all')}
                                className={`px-2 md:px-6 py-1 md:py-2 text-[8px] md:text-base rounded-full border transition-all duration-300 font-bold tracking-wide whitespace-nowrap shadow-[0_0_15px_rgba(220,38,38,0.4)] md:hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] hover:scale-105 active:scale-95 flex-shrink-0
                                ${filterMode === 'all'
                                        ? 'bg-red-600 border-red-500 text-white scale-105 md:shadow-[0_0_20px_rgba(220,38,38,0.6)] shadow-[0_0_10px_rgba(220,38,38,0.8)]' // Mobile glow added
                                        : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                                {t('rankings.allTrainersLong')}
                            </button>
                            <button
                                onClick={() => setFilterMode('local')}
                                className={`px-2 md:px-6 py-1 md:py-2 text-[8px] md:text-base rounded-full border transition-all duration-300 font-bold tracking-wide whitespace-nowrap shadow-[0_0_15px_rgba(168,85,247,0.4)] md:hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] hover:scale-105 active:scale-95 flex-shrink-0
                                ${filterMode === 'local'
                                        ? 'bg-purple-600 border-purple-500 text-white scale-105 md:shadow-[0_0_20px_rgba(168,85,247,0.6)] shadow-[0_0_10px_rgba(168,85,247,0.8)]' // Mobile glow added
                                        : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                                {t('rankings.localTrainers')}
                            </button>
                            <button
                                onClick={() => setFilterMode('global')}
                                className={`px-2 md:px-6 py-1 md:py-2 text-[8px] md:text-base rounded-full border transition-all duration-300 font-bold tracking-wide whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)] md:hover:shadow-[0_0_30px_rgba(37,99,235,0.7)] hover:scale-105 active:scale-95 flex-shrink-0
                                ${filterMode === 'global'
                                        ? 'bg-blue-600 border-blue-500 text-white scale-105 md:shadow-[0_0_20px_rgba(37,99,235,0.6)] shadow-[0_0_10px_rgba(37,99,235,0.8)]' // Mobile glow added
                                        : 'bg-black/40 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                                {t('rankings.globalTrainers')}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 overflow-hidden relative z-10">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1200px]">
                                <thead>
                                    <tr className="border-b border-white/10 bg-white/5">
                                        <th onClick={() => handleSort('level')} className="p-1 md:p-6 text-center text-purple-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm w-8 md:w-16 cursor-pointer hover:bg-white/10 transition-colors">{t('rankings.level')}</th>
                                        <th onClick={() => handleSort('username')} className="p-1 md:p-6 text-center text-gray-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm sticky left-0 md:static bg-[#0a0a0a] md:bg-transparent z-20 md:z-auto shadow-lg md:shadow-none min-w-[50px] max-w-[50px] md:min-w-[80px] md:max-w-[100px] cursor-pointer hover:bg-white/10 transition-colors">{t('rankings.trainer')}</th>
                                        <th onClick={() => handleSort('caught')} className="p-1 md:p-6 text-center text-gray-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm cursor-pointer hover:bg-white/10 transition-colors">{t('rankings.catches')}</th>
                                        <th onClick={() => handleSort('stops')} className="p-1 md:p-6 text-center text-gray-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm cursor-pointer hover:bg-white/10 transition-colors">{t('chart.pokestops')}</th>
                                        <th onClick={() => handleSort('xp')} className="p-1 md:p-6 text-center text-purple-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm cursor-pointer hover:bg-white/10 transition-colors">XP</th>
                                        <th onClick={() => handleSort('pokedex')} className="p-1 md:p-6 text-center text-blue-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm cursor-pointer hover:bg-white/10 transition-colors">{t('rankings.pokedex')}</th>
                                        <th onClick={() => handleSort('shinydex')} className="p-1 md:p-6 text-center text-yellow-400 font-medium uppercase tracking-normal md:tracking-wider text-[10px] md:text-sm cursor-pointer hover:bg-white/10 transition-colors">{t('rankings.shinyDex')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLeaders.filter(t => {
                                        const local = isLocalCity(t.city);
                                        if (filterMode === 'all') return true;
                                        if (filterMode === 'local' && local) return true;
                                        if (filterMode === 'global' && !local) return true;
                                        return false;
                                    }).map((trainer, index) => (
                                        <motion.tr
                                            key={trainer.username}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3, delay: index * 0.05 }}
                                            className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer relative"
                                            onClick={() => setSelectedTrainer(trainer)}
                                        >
                                            <td className="p-1 md:p-6 text-center font-mono text-purple-300 font-bold text-sm md:text-lg">
                                                {trainer.level}
                                            </td>
                                            <td className="p-1 md:p-6 text-center sticky left-0 bg-[#0a0a0a] md:bg-transparent z-20 shadow-lg md:shadow-none min-w-[50px] max-w-[50px] md:min-w-[80px] md:max-w-[120px]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-gray-800 border border-white/10 overflow-hidden flex-shrink-0 relative">
                                                        {trainer.trainerImage ? (
                                                            <img
                                                                src={trainer.trainerImage}
                                                                alt={trainer.username}
                                                                className="w-full h-full object-cover absolute inset-0 scale-125 transition-all duration-300"
                                                                style={{ objectPosition: '55% 30%' }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-lg">
                                                                {trainer.username.charAt(0).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="font-bold text-[10px] md:text-lg text-center break-words w-full px-0.5 leading-tight text-gray-200">
                                                        {trainer.username}
                                                    </div>
                                                    {trainer.city && (
                                                        <div className="text-[8px] md:text-[10px] text-gray-500 font-medium truncate max-w-[80px]">
                                                            {trainer.city}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-0.5 md:p-6 text-center font-mono text-gray-400 text-xs md:text-base">
                                                {trainer.caught.toLocaleString()}
                                            </td>
                                            <td className="p-0.5 md:p-6 text-center font-mono text-gray-400 text-xs md:text-base">
                                                {trainer.stops.toLocaleString()}
                                            </td>
                                            <td className="p-0.5 md:p-6 text-center font-mono text-purple-300 font-bold text-xs md:text-lg">
                                                {trainer.xp.toLocaleString()}
                                            </td>
                                            <td className="p-0.5 md:p-6 text-center font-mono text-blue-300 text-xs md:text-base">
                                                {trainer.pokedex || '-'}
                                            </td>
                                            <td className="p-0.5 md:p-6 text-center font-mono text-yellow-300 text-xs md:text-base">
                                                {trainer.shinydex || '-'}
                                            </td>

                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {leaders.length === 0 && !loading && (
                            <div className="p-8 text-center text-gray-500">
                                {t('rankings.noTrainerFound')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Hover Preview Removed */}

                {/* Trainer Modal */}
                <AnimatePresence>
                    {selectedTrainer && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedTrainer(null)}
                        >
                            <div
                                className="bg-[#1a1a1a] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="p-6 border-b border-white/10 relative bg-black/20">
                                    <button
                                        onClick={() => setSelectedTrainer(null)}
                                        className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10"
                                    >
                                        <X size={24} />
                                    </button>

                                    <div className="flex flex-col md:flex-row items-center md:items-center gap-4 pr-0 md:pr-12">
                                        <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0">
                                            {selectedTrainer.trainerImage ? (
                                                <img
                                                    src={selectedTrainer.trainerImage}
                                                    alt={selectedTrainer.username}
                                                    className="w-full h-full rounded-full object-cover bg-[#0a0a0a] scale-125"
                                                    style={{ objectPosition: '55% 30%' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center text-white font-bold text-2xl">
                                                    {selectedTrainer.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left w-full">
                                            <div className="flex flex-col md:flex-row items-center gap-1 md:gap-2 flex-wrap justify-center md:justify-start">
                                                <h2 className="text-2xl font-bold text-white truncate max-w-[200px] md:max-w-none">
                                                    {selectedTrainer.username}
                                                </h2>
                                                {selectedTrainer.team && (
                                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? 'bg-red-500/20 border-red-500 text-red-400' :
                                                        selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
                                                            'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                                                        }`}>
                                                        <img
                                                            src={
                                                                selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? '/teams/Team_Mystic.webp' :
                                                                    selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? '/teams/Team_Valor.webp' :
                                                                        '/teams/Team_Instinct.webp'
                                                            }
                                                            alt={selectedTrainer.team}
                                                            className="w-4 h-4 object-contain"
                                                        />
                                                        <span className="text-xs font-bold uppercase tracking-wider">
                                                            {selectedTrainer.team.includes('Sagesse') || selectedTrainer.team.includes('Mystic') ? `${t('rankings.team')} ${t('rankings.teamMystic')}` :
                                                                selectedTrainer.team.includes('Bravoure') || selectedTrainer.team.includes('Valor') ? `${t('rankings.team')} ${t('rankings.teamValor')}` :
                                                                    `${t('rankings.team')} ${t('rankings.teamInstinct')}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2 md:gap-1 mt-2 md:mt-1 w-full items-center md:items-start">
                                                <div className="text-gray-400 text-xs md:text-sm flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                                    <span>{t('rankings.level')} {selectedTrainer.level || 1}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                    <span>{(selectedTrainer.xp || 0).toLocaleString()} {t('rankings.xpTotal')}</span>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1 w-full">
                                                    {selectedTrainer.friendCode && selectedTrainer.settings?.showFriendCode !== false && (
                                                        <div className="flex items-center gap-2 text-gray-300 bg-white/5 px-3 rounded-lg border border-white/5 h-8">
                                                            <span className="text-xs font-bold text-gray-500">{t('rankings.friendCode')} :</span>
                                                            <span className="font-mono font-bold tracking-wider text-xs">
                                                                {formatFriendCode(selectedTrainer.friendCode)}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    // Only copy numbers
                                                                    const rawCode = selectedTrainer.friendCode.replace(/\D/g, '');
                                                                    navigator.clipboard.writeText(rawCode);
                                                                }}
                                                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors ml-1 flex items-center justify-center"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    {selectedTrainer.discordId && (
                                                        <button
                                                            onClick={() => window.open(`https://discord.com/users/${selectedTrainer.discordId}`, '_blank')}
                                                            className="flex items-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] shadow-lg shadow-[#5865F2]/20 text-white px-3 h-8 rounded-lg transition-colors text-xs font-bold"
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.966 2.419-2.176 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.176 2.419 0 1.334-.946 2.418-2.157 2.418z" />
                                                            </svg>
                                                            {t('rankings.contactDiscord')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setChatTarget(selectedTrainer.username)}
                                                        className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 h-8 rounded-lg transition-colors text-xs font-bold"
                                                    >
                                                        <MessageCircle size={14} />
                                                        {t('rankings.sendDM')}
                                                    </button>
                                                    <ReportBlockButtons
                                                        targetUsername={selectedTrainer.username}
                                                        contentType="profile"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>




                                </div>
                                <div className="p-4 md:p-8 space-y-6 md:space-y-8 overflow-y-auto w-full flex-1 overscroll-contain">
                                    <div className="max-w-xl mx-auto space-y-8">
                                        <div className="text-center relative">
                                            <h3 className="text-xl font-bold text-white mb-4">{t('rankings.statistics')}</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-white uppercase tracking-wider mb-1">{t('rankings.catches')}</p>
                                                <p className="text-xl font-bold text-green-200">{(selectedTrainer.caught || 0).toLocaleString()}</p>
                                                {selectedTrainer.caughtThisWeek > 0 && (
                                                    <p className="text-xs font-bold text-green-400 mt-1">+{selectedTrainer.caughtThisWeek.toLocaleString()} {t('rankings.thisWeek')}</p>
                                                )}
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-white uppercase tracking-wider mb-1">{t('rankings.stopsVisited')}</p>
                                                <p className="text-xl font-bold text-blue-200">{(selectedTrainer.stops || 0).toLocaleString()}</p>
                                                {selectedTrainer.stopsThisWeek > 0 && (
                                                    <p className="text-xs font-bold text-blue-400 mt-1">+{selectedTrainer.stopsThisWeek.toLocaleString()} {t('rankings.thisWeek')}</p>
                                                )}
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">{t('rankings.pokedex')}</p>
                                                <p className="text-xl font-bold text-blue-400">{selectedTrainer.pokedex || '-'}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1">{t('rankings.shinyDex')}</p>
                                                <p className="text-xl font-bold text-yellow-300">{selectedTrainer.shinydex || '-'}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-orange-400 uppercase tracking-wider mb-1">{t('rankings.xxlDex')}</p>
                                                <p className="text-xl font-bold text-orange-400">{selectedTrainer.xxldex || 0}</p>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                                                <p className="text-xs text-cyan-400 uppercase tracking-wider mb-1">{t('rankings.xxsDex')}</p>
                                                <p className="text-xl font-bold text-cyan-400">{selectedTrainer.xxsdex || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progression Chart in Modal */}
                                    <div className="w-full">
                                        <ProgressionChart history={selectedTrainer.history} height={150} />
                                    </div>

                                    {/* Favorites Section */}
                                    {selectedTrainer.favorites && selectedTrainer.favorites.length > 0 && false && (
                                        <div className="pt-8 border-t border-white/10 w-full mb-8">
                                            <div className="relative flex items-center justify-center mb-6">
                                                <h3 className="text-xl font-bold text-white text-center">
                                                    {t('rankings.pokemonFavorites')}
                                                </h3>
                                            </div>

                                            {/* Favorites Grid */}
                                            <div className="flex justify-center gap-4 flex-wrap w-full px-4">
                                                {selectedTrainer.favorites.slice(0, showAllFavorites ? selectedTrainer.favorites.length : 3).map((fav, i) => {
                                                    const url = typeof fav === 'string' ? fav : fav.url;
                                                    const stardust = typeof fav === 'object' ? fav.stardust : 0;
                                                    if (!url) return null;
                                                    return (
                                                        <div
                                                            key={i}
                                                            onClick={() => setLightboxIndex(i)}
                                                            className="relative w-24 h-40 md:w-32 md:h-56 rounded-xl border border-white/10 bg-black/30 overflow-hidden shadow-lg hover:scale-105 transition-transform cursor-zoom-in group"
                                                        >
                                                            <img src={url} className="w-full h-full object-contain transition-transform group-hover:scale-110" alt="Favori" />
                                                            {stardust > 0 && (
                                                                <div className="absolute top-0 right-0 bg-pink-500/90 px-2 py-0.5 text-[10px] font-bold text-white rounded-bl-md z-10">
                                                                    {(stardust / 1000).toFixed(0)}k
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Afficher Plus Button */}
                                            {selectedTrainer.favorites.length > 3 && (
                                                <div className="w-full flex justify-center mt-6">
                                                    <button
                                                        onClick={() => setShowAllFavorites(!showAllFavorites)}
                                                        className="px-6 py-2 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all flex items-center gap-2 group"
                                                    >
                                                        {showAllFavorites ? (
                                                            <>
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                                                {t('rankings.showLess')}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                                {t('rankings.showMore')} ({selectedTrainer.favorites.length - 3})
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(selectedTrainer.tradeList?.lookingFor?.length > 0 || selectedTrainer.tradeList?.forTrade?.length > 0) && (
                                        <div className="pt-8 border-t border-white/10 w-full">
                                            <div className="relative flex items-center justify-center mb-6">
                                                <h3 className="text-xl font-bold text-white text-center">{t('rankings.trades')}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-8 w-full">
                                                {/* Looking For */}
                                                {selectedTrainer.tradeList.lookingFor?.length > 0 && (
                                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-[#60a5fa] font-bold flex items-center gap-2">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                                                {t('rankings.lookingFor')}
                                                            </h4>
                                                        </div>
                                                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
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
                                                                    {(pokemon.quantity >= 1 || pokemon.count >= 1) && (
                                                                        <div className="absolute bottom-0 right-0 bg-white text-black text-[10px] px-1 rounded font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] z-10 shadow-sm border border-black/10">
                                                                            x{pokemon.quantity || pokemon.count}
                                                                        </div>
                                                                    )}
                                                                    {pokemon.note && (
                                                                        <div className="text-[9px] text-gray-400 text-center w-full truncate leading-tight mt-0.5">{pokemon.note}</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* For Trade */}
                                                {selectedTrainer.tradeList.forTrade?.length > 0 && (
                                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h4 className="text-[#4ade80] font-bold flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full border-2 border-[#4ade80] flex items-center justify-center text-[10px]">⇄</div>
                                                                {t('rankings.offers')}
                                                            </h4>
                                                        </div>
                                                        <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
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
                                                                    {(pokemon.quantity >= 1 || pokemon.count >= 1) && (
                                                                        <div className="absolute bottom-0 right-0 bg-white text-black text-[10px] px-1 rounded font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] z-10 shadow-sm border border-black/10">
                                                                            x{pokemon.quantity || pokemon.count}
                                                                        </div>
                                                                    )}
                                                                    {pokemon.note && (
                                                                        <div className="text-[9px] text-gray-400 text-center w-full truncate leading-tight mt-0.5">{pokemon.note}</div>
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
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxIndex >= 0 && selectedTrainer?.favorites && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxIndex(-1)}
                        className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm"
                    >
                        {/* Left Arrow */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex((lightboxIndex - 1 + selectedTrainer.favorites.length) % selectedTrainer.favorites.length);
                            }}
                            className="absolute left-4 p-2 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded-full z-[210] hidden md:block" // Hidden on mobile if swipe is preferred, but buttons are good
                        >
                            <ChevronLeft size={48} />
                        </button>

                        <motion.img
                            key={lightboxIndex} // Key forces re-render for animation
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={selectedTrainer.favorites[lightboxIndex]?.url || selectedTrainer.favorites[lightboxIndex]}
                            alt="Full size"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-auto select-none" // pointer-events-auto for swipe?
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={1}
                            onDragEnd={(e, { offset, velocity }) => {
                                const swipe = offset.x; // simple logic
                                if (swipe < -50) {
                                    setLightboxIndex((lightboxIndex + 1) % selectedTrainer.favorites.length);
                                } else if (swipe > 50) {
                                    setLightboxIndex((lightboxIndex - 1 + selectedTrainer.favorites.length) % selectedTrainer.favorites.length);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                        />

                        {/* Right Arrow */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setLightboxIndex((lightboxIndex + 1) % selectedTrainer.favorites.length);
                            }}
                            className="absolute right-4 p-2 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded-full z-[210] hidden md:block"
                        >
                            <ChevronRight size={48} />
                        </button>

                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-[210]"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(-1); }}
                        >
                            <X size={32} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <ChatPopup
                isOpen={!!chatTarget}
                onClose={() => setChatTarget(null)}
                targetUser={chatTarget}
            />
        </>
    );
}
