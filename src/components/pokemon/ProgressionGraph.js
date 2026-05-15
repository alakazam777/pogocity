'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, ChevronLeft, Search, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { MEDALS } from './PokemonMedals';

// ── Deterministic color palette for medal lines ──
const MEDAL_COLORS = [
    '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
    '#06b6d4', '#e11d48', '#a855f7', '#22c55e', '#0ea5e9',
    '#f43f5e', '#7c3aed', '#eab308', '#2dd4bf', '#fb923c',
];
function medalColor(index) { return MEDAL_COLORS[index % MEDAL_COLORS.length]; }

function parseNum(v) { return parseFloat(String(v || 0).replace(/[\s,]/g, '')) || 0; }

export default function ProgressionGraph({ history = [], medals = {} }) {
    const { t, lang } = useLanguage();

    // ── Standard stat options ──
    const STAT_OPTIONS = [
        { id: 'xp', label: t('chart.statXp'), color: '#8b5cf6' },
        { id: 'distance', label: t('chart.statDistance'), color: '#ec4899' },
        { id: 'caught', label: t('chart.statCaught'), color: '#eab308' },
        { id: 'stops', label: t('chart.statStops'), color: '#3b82f6' },
        { id: 'stardust', label: t('chart.statStardust'), color: '#d946ef' },
    ];

    const [selectedStat, setSelectedStat] = useState('xp');
    const [medalMode, setMedalMode] = useState(false);
    const [selectedMedal, setSelectedMedal] = useState(null);
    const [medalSearch, setMedalSearch] = useState('');
    const [brushStartIndex, setBrushStartIndex] = useState(0);
    const [brushEndIndex, setBrushEndIndex] = useState(null);

    // ── Medal helpers ──
    const getName = (m) => lang === 'ja' ? m.nameJa : lang === 'en' ? m.nameEn : m.name;

    // Only medals that have a non-zero current value (active medals)
    const activeMedals = useMemo(() => {
        return MEDALS.filter(m => parseNum(medals[m.id]) > 0);
    }, [medals]);

    // Filtered by search (only among active medals)
    const filteredMedals = useMemo(() => {
        const base = medalSearch ? activeMedals : activeMedals;
        if (!medalSearch) return base;
        const lc = medalSearch.toLowerCase();
        return base.filter(m =>
            getName(m).toLowerCase().includes(lc) ||
            m.id.toLowerCase().includes(lc) ||
            m.nameEn.toLowerCase().includes(lc)
        );
    }, [medalSearch, activeMedals, lang]);

    // Auto-select first active medal when entering medal mode
    useEffect(() => {
        if (medalMode && !selectedMedal && activeMedals.length > 0) {
            setSelectedMedal(activeMedals[0].id);
        }
    }, [medalMode, selectedMedal, activeMedals]);

    // Navigate prev/next medal
    const navigateMedal = useCallback((dir) => {
        const list = filteredMedals.length > 0 ? filteredMedals : activeMedals;
        if (list.length === 0) return;
        const curIdx = list.findIndex(m => m.id === selectedMedal);
        const nextIdx = curIdx < 0 ? 0 : (curIdx + dir + list.length) % list.length;
        setSelectedMedal(list[nextIdx].id);
    }, [selectedMedal, filteredMedals, activeMedals]);

    // ── Chart data ──
    // Build chart data from history, then inject current medals into the latest point
    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];

        const sorted = history
            .map(entry => {
                const row = {
                    date: new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
                    fullDate: new Date(entry.date).toLocaleString('fr-FR'),
                    isoDate: entry.date,
                    xp: parseFloat(String(entry.stats?.xp || 0).replace(/\s/g, '').replace(',', '.')) || 0,
                    distance: parseFloat(String(entry.stats?.distance || 0).replace(/\s/g, '').replace(',', '.')) || 0,
                    caught: parseFloat(String(entry.stats?.caught || 0).replace(/\s/g, '').replace(',', '.')) || 0,
                    stops: parseFloat(String(entry.stats?.stops || 0).replace(/\s/g, '').replace(',', '.')) || 0,
                    stardust: parseFloat(String(entry.stats?.stardust || 0).replace(/\s/g, '').replace(',', '.')) || 0,
                };
                // Include medal values from history entries
                if (entry.medals) {
                    for (const [key, val] of Object.entries(entry.medals)) {
                        row[`medal_${key}`] = parseNum(val);
                    }
                }
                return row;
            })
            .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime());

        // Inject current medal values into the latest data point so the graph
        // always reflects the live state — even if older history entries were
        // created before the medal tracking feature existed.
        if (sorted.length > 0 && medals && Object.keys(medals).length > 0) {
            const last = sorted[sorted.length - 1];
            for (const [key, val] of Object.entries(medals)) {
                const parsed = parseNum(val);
                const existingKey = `medal_${key}`;
                // Use the higher value (current live vs historical snapshot)
                last[existingKey] = Math.max(parsed, last[existingKey] || 0);
            }
        }

        return sorted;
    }, [history, medals]);

    // Check if selected medal has any data
    const selectedMedalHasData = useMemo(() => {
        if (!selectedMedal) return false;
        const key = `medal_${selectedMedal}`;
        return chartData.some(d => d[key] > 0);
    }, [selectedMedal, chartData]);

    const handleBrushChange = useCallback((range) => {
        if (range) {
            setBrushStartIndex(range.startIndex);
            setBrushEndIndex(range.endIndex);
        }
    }, []);

    // ── Switch between stat mode and medal mode ──
    const handleStatClick = (statId) => {
        setMedalMode(false);
        setSelectedStat(statId);
    };

    const handleMedalButtonClick = () => {
        setMedalMode(m => {
            const next = !m;
            // When entering medal mode, auto-select first active medal
            if (next && !selectedMedal && activeMedals.length > 0) {
                setSelectedMedal(activeMedals[0].id);
            }
            return next;
        });
    };

    // ── Custom tooltip ──
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const currentIndex = chartData.findIndex(d => d.date === label || d.fullDate === payload[0]?.payload?.fullDate);
            const prevData = currentIndex > 0 ? chartData[currentIndex - 1] : null;

            return (
                <div className="bg-gray-800 border border-white/10 rounded-lg p-3 text-white shadow-xl">
                    <p className="text-gray-400 text-xs mb-2">{payload[0]?.payload?.fullDate}</p>
                    {payload.map((entry) => {
                        let label2;
                        let color = entry.color;
                        if (entry.dataKey?.startsWith('medal_')) {
                            const mId = entry.dataKey.replace('medal_', '');
                            const m = MEDALS.find(mm => mm.id === mId);
                            label2 = m ? getName(m) : mId;
                        } else {
                            const option = STAT_OPTIONS.find(o => o.id === entry.dataKey);
                            if (!option) return null;
                            label2 = option.label;
                        }

                        let diff = 0;
                        if (prevData) {
                            diff = entry.value - (prevData[entry.dataKey] || 0);
                        }

                        const isPositive = diff > 0;
                        const isNegative = diff < 0;

                        return (
                            <div key={entry.dataKey} className="flex items-center gap-2 mb-1 font-bold">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
                                <span style={{ color }}>{label2}:</span>
                                <span>{entry.value?.toLocaleString()}</span>
                                {isPositive && (
                                    <span className="text-green-400 text-xs ml-1">(+{diff.toLocaleString()})</span>
                                )}
                                {isNegative && (
                                    <span className="text-red-400 text-xs ml-1">({diff.toLocaleString()})</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            );
        }
        return null;
    };

    // ── Empty state ──
    if (!history || history.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl mb-8 text-center"
            >
                <h3 className="text-xl font-semibold text-white mb-2">{t('chart.title')}</h3>
                <p className="text-gray-400">
                    {t('chart.emptyHint')}
                </p>
            </motion.div>
        );
    }

    // ── Summary stats ──
    const visibleStart = brushStartIndex || 0;
    const visibleEnd = brushEndIndex != null ? brushEndIndex : chartData.length - 1;
    const firstVisible = chartData[visibleStart];
    const lastVisible = chartData[visibleEnd];

    const summaryStats = STAT_OPTIONS.map(option => {
        if (!firstVisible || !lastVisible) return null;
        const diff = lastVisible[option.id] - firstVisible[option.id];
        return { ...option, diff };
    }).filter(Boolean);

    // Medal summary for the selected medal
    const medalSummary = (() => {
        if (!medalMode || !selectedMedal || !firstVisible || !lastVisible) return null;
        const key = `medal_${selectedMedal}`;
        const diff = (lastVisible[key] || 0) - (firstVisible[key] || 0);
        return { diff };
    })();

    // Color for the currently selected medal
    const selectedMedalIndex = selectedMedal ? MEDALS.findIndex(m => m.id === selectedMedal) : 0;
    const selectedMedalColor = medalColor(selectedMedalIndex);
    const selectedMedalDef = selectedMedal ? MEDALS.find(m => m.id === selectedMedal) : null;

    // Current position / total for nav display
    const currentMedalPos = activeMedals.findIndex(m => m.id === selectedMedal);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl mb-8"
        >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                    {t('chart.title')}
                </h3>

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
                    {STAT_OPTIONS.map(option => (
                        <button
                            key={option.id}
                            onClick={() => handleStatClick(option.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                                !medalMode && selectedStat === option.id
                                    ? 'bg-white/20 text-white'
                                    : 'bg-black/20 text-gray-400 hover:bg-white/10'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                    {/* Medals filter button */}
                    <button
                        onClick={handleMedalButtonClick}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                            medalMode
                                ? 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-500/30'
                                : 'bg-black/20 text-gray-400 hover:bg-white/10'
                        }`}
                    >
                        {t('chart.statMedals')}
                        {medalMode
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {/* ── Medal sub-selector (only when medalMode is active) ── */}
            {medalMode && (
                <div className="mb-4 p-3 rounded-xl bg-black/20 border border-yellow-500/20">
                    {/* Navigation bar: prev/next + search + position */}
                    <div className="flex items-center gap-2 mb-3">
                        <button
                            onClick={() => navigateMedal(-1)}
                            disabled={activeMedals.length === 0}
                            className="p-1.5 rounded-lg bg-black/30 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {/* Current medal name display */}
                        <div className="flex-1 min-w-0">
                            {selectedMedalDef ? (
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm truncate" style={{ color: selectedMedalColor }}>
                                        {getName(selectedMedalDef)}
                                    </span>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                        {currentMedalPos + 1}/{activeMedals.length}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500">
                                    {activeMedals.length === 0
                                        ? t('medals.noMedalsEntered')
                                        : t('medals.selectMedal')}
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => navigateMedal(1)}
                            disabled={activeMedals.length === 0}
                            className="p-1.5 rounded-lg bg-black/30 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
                        >
                            <ChevronRight size={14} />
                        </button>

                        {/* Compact search */}
                        <div className="relative w-36 md:w-48 flex-shrink-0">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={medalSearch}
                                onChange={(e) => setMedalSearch(e.target.value)}
                                placeholder={t('medals.filterPlaceholder')}
                                className="w-full pl-6 pr-6 py-1 text-[11px] bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors"
                            />
                            {medalSearch && (
                                <button onClick={() => setMedalSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Medal buttons — compact scrollable grid, only active medals */}
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-0.5">
                        {filteredMedals.map((m) => {
                            const globalIdx = MEDALS.findIndex(mm => mm.id === m.id);
                            const isSelected = selectedMedal === m.id;
                            const col = medalColor(globalIdx);
                            const currentVal = parseNum(medals[m.id]);
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setSelectedMedal(m.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all whitespace-nowrap border ${
                                        isSelected
                                            ? 'text-white border-current'
                                            : 'text-gray-500 hover:text-gray-300 bg-black/20 border-transparent hover:bg-white/5'
                                    }`}
                                    style={isSelected ? { backgroundColor: `${col}20`, color: col, borderColor: `${col}60` } : {}}
                                    title={`${getName(m)}: ${currentVal.toLocaleString()}`}
                                >
                                    {getName(m)}
                                </button>
                            );
                        })}
                        {filteredMedals.length === 0 && (
                            <span className="text-[10px] text-gray-600 py-1">
                                {medalSearch
                                    ? t('medals.noResults')
                                    : t('medals.noMedalsEntered')}
                            </span>
                        )}
                    </div>

                    {/* No data hint */}
                    {selectedMedal && !selectedMedalHasData && (
                        <p className="text-[10px] text-yellow-500/70 mt-2">
                            {t('medals.saveToTrack')}
                        </p>
                    )}

                    {/* Medal summary */}
                    {medalSummary && selectedMedalDef && (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMedalColor }} />
                            <span className="text-gray-300">{getName(selectedMedalDef)}:</span>
                            <span className="font-bold font-mono text-gray-200">
                                {parseNum(medals[selectedMedal]).toLocaleString()}
                            </span>
                            {medalSummary.diff !== 0 && (
                                <span className={`font-bold font-mono ${
                                    medalSummary.diff > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    ({medalSummary.diff > 0 ? '+' : ''}{medalSummary.diff.toLocaleString()})
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Period summary stats (only in stat mode) */}
            {!medalMode && chartData.length > 1 && (
                <div className="flex flex-wrap gap-3 mb-4">
                    {summaryStats.map(stat => {
                        if (!stat) return null;
                        const isSelected = stat.id === selectedStat;
                        const isNeg = stat.diff < 0;
                        const isPos = stat.diff > 0;

                        let displayDiff;
                        if (stat.id === 'xp') {
                            displayDiff = (stat.diff / 1000000).toFixed(2) + 'M';
                        } else if (stat.id === 'stardust') {
                            const absDiff = Math.abs(stat.diff);
                            displayDiff = absDiff >= 1000000
                                ? (stat.diff / 1000000).toFixed(1) + 'M'
                                : absDiff >= 1000
                                    ? (stat.diff / 1000).toFixed(0) + 'k'
                                    : stat.diff.toLocaleString();
                        } else if (stat.id === 'distance') {
                            displayDiff = stat.diff.toLocaleString() + ' km';
                        } else {
                            displayDiff = stat.diff.toLocaleString();
                        }

                        return (
                            <div
                                key={stat.id}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                                    isSelected ? 'bg-white/10 ring-1 ring-white/20' : 'bg-black/20 opacity-60'
                                }`}
                            >
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                                <span className={`font-bold ${
                                    isNeg ? 'text-red-400' : isPos ? 'text-green-400' : 'text-gray-400'
                                }`}>
                                    {isPos ? '+' : ''}{displayDiff}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Chart ── */}
            <div className="h-[300px] md:h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            tickLine={{ stroke: '#9ca3af' }}
                            axisLine={{ stroke: '#4b5563' }}
                        />

                        {/* ── Standard stat mode ── */}
                        {!medalMode && (
                            <>
                                <YAxis yAxisId="xp" orientation="left" stroke="#8b5cf6" tick={{ fill: '#8b5cf6', fontSize: 10 }} width={40} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} domain={['auto', 'auto']} hide />
                                <YAxis yAxisId="distance" orientation="right" stroke="#ec4899" tick={{ fill: '#ec4899', fontSize: 10 }} width={40} domain={['auto', 'auto']} hide />
                                <YAxis yAxisId="caught" orientation="left" stroke="#eab308" tick={{ fill: '#eab308', fontSize: 10 }} width={40} domain={['auto', 'auto']} hide />
                                <YAxis yAxisId="stops" orientation="right" stroke="#3b82f6" tick={{ fill: '#3b82f6', fontSize: 10 }} width={40} domain={['auto', 'auto']} hide />
                                <YAxis yAxisId="stardust" orientation="left" stroke="#d946ef" tick={{ fill: '#d946ef', fontSize: 10 }} width={40} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} domain={['auto', 'auto']} hide />

                                {STAT_OPTIONS.map(option => {
                                    const isSelected = selectedStat === option.id;
                                    return (
                                        <Line
                                            key={option.id}
                                            yAxisId={option.id}
                                            type="monotone"
                                            dataKey={option.id}
                                            stroke={option.color}
                                            strokeWidth={isSelected ? 3 : 1}
                                            strokeOpacity={isSelected ? 1 : 0.3}
                                            dot={{ fill: option.color, strokeWidth: 2, r: isSelected ? 4 : 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            animationDuration={500}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {/* ── Medal mode ── */}
                        {medalMode && selectedMedal && (
                            <>
                                <YAxis
                                    yAxisId="medal"
                                    orientation="left"
                                    stroke={selectedMedalColor}
                                    tick={{ fill: selectedMedalColor, fontSize: 10 }}
                                    width={50}
                                    domain={['auto', 'auto']}
                                    tickFormatter={(val) => val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                                />

                                <Line
                                    yAxisId="medal"
                                    type="monotone"
                                    dataKey={`medal_${selectedMedal}`}
                                    stroke={selectedMedalColor}
                                    strokeWidth={3}
                                    dot={{ fill: selectedMedalColor, strokeWidth: 2, r: 4, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    animationDuration={500}
                                    connectNulls
                                />
                            </>
                        )}

                        <Tooltip content={<CustomTooltip />} />

                        {/* Timeline brush */}
                        {chartData.length > 3 && (
                            <Brush
                                dataKey="date"
                                height={36}
                                stroke={medalMode ? 'rgba(234, 179, 8, 0.5)' : 'rgba(139, 92, 246, 0.5)'}
                                fill="rgba(0, 0, 0, 0.4)"
                                travellerWidth={10}
                                onChange={handleBrushChange}
                                startIndex={brushStartIndex}
                                endIndex={brushEndIndex != null ? brushEndIndex : chartData.length - 1}
                            >
                                <LineChart data={chartData}>
                                    <Line
                                        type="monotone"
                                        dataKey={medalMode && selectedMedal ? `medal_${selectedMedal}` : selectedStat}
                                        stroke={medalMode ? selectedMedalColor : (STAT_OPTIONS.find(o => o.id === selectedStat)?.color || '#8b5cf6')}
                                        strokeWidth={1}
                                        dot={false}
                                    />
                                </LineChart>
                            </Brush>
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Instructions hint */}
            {chartData.length > 3 && (
                <p className="text-[10px] text-gray-500 text-center mt-1 select-none">
                    {t('chart.brushHint')}
                </p>
            )}
        </motion.div>
    );
}
