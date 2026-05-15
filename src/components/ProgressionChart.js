import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const ProgressionChart = ({ history, height = 150 }) => {
    const { t } = useLanguage();
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const containerRef = useRef(null);
    const [width, setWidth] = useState(300);

    // Range slider state for timeline zoom
    const [rangeStart, setRangeStart] = useState(0);
    const [rangeEnd, setRangeEnd] = useState(1); // 0-1 normalized
    const sliderRef = useRef(null);
    const dragging = useRef(null); // 'left' | 'right' | 'middle' | null
    const dragStartX = useRef(0);
    const dragStartRange = useRef([0, 1]);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Process all data
    const allData = (history || [])
        .map(h => ({
            date: new Date(h.date),
            caught: parseInt(h.stats?.caught || 0),
            stops: parseInt(h.stats?.stops || 0),
            xp: parseInt(h.stats?.xp || 0),
            distance: parseInt(h.stats?.distance || 0),
            stardust: parseInt(String(h.stats?.stardust || 0).replace(/\s/g, '')) || 0,
        }))
        .filter(d => d.caught > 0)
        .sort((a, b) => a.date - b.date);

    // Reset range when data changes
    useEffect(() => {
        setRangeStart(0);
        setRangeEnd(1);
    }, [history]);

    // Slice data based on range
    const dataLength = allData.length;
    const startIdx = Math.floor(rangeStart * (dataLength - 1));
    const endIdx = Math.max(startIdx + 1, Math.ceil(rangeEnd * (dataLength - 1)));
    const data = allData.slice(startIdx, endIdx + 1);

    const showSlider = allData.length > 3;

    // Drag handlers for the range slider
    const handleSliderPointerDown = useCallback((e, type) => {
        e.preventDefault();
        e.stopPropagation();
        dragging.current = type;
        dragStartX.current = e.clientX || e.touches?.[0]?.clientX || 0;
        dragStartRange.current = [rangeStart, rangeEnd];

        const handleMove = (ev) => {
            const clientX = ev.clientX || ev.touches?.[0]?.clientX || 0;
            const rect = sliderRef.current?.getBoundingClientRect();
            if (!rect) return;
            const dx = (clientX - dragStartX.current) / rect.width;

            let newStart = dragStartRange.current[0];
            let newEnd = dragStartRange.current[1];
            const minSpan = 2 / Math.max(dataLength - 1, 2); // At least 2 data points

            if (dragging.current === 'left') {
                newStart = Math.max(0, Math.min(newEnd - minSpan, dragStartRange.current[0] + dx));
            } else if (dragging.current === 'right') {
                newEnd = Math.min(1, Math.max(newStart + minSpan, dragStartRange.current[1] + dx));
            } else if (dragging.current === 'middle') {
                const span = dragStartRange.current[1] - dragStartRange.current[0];
                let s = dragStartRange.current[0] + dx;
                let en = dragStartRange.current[1] + dx;
                if (s < 0) { s = 0; en = span; }
                if (en > 1) { en = 1; s = 1 - span; }
                newStart = s;
                newEnd = en;
            }

            setRangeStart(newStart);
            setRangeEnd(newEnd);
        };

        const handleUp = () => {
            dragging.current = null;
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleUp);
    }, [rangeStart, rangeEnd, dataLength]);

    if (!allData || allData.length < 2) return null;

    const padding = 20;
    const bottomPadding = 20;
    const chartHeight = height - 30 - bottomPadding;

    const metrics = [
        { key: 'caught', color: '#4ade80', label: t('chart.caught') },
        { key: 'stops', color: '#60a5fa', label: t('chart.pokestops') },
        { key: 'distance', color: '#fb923c', label: t('chart.distance') },
        { key: 'xp', color: '#a855f7', label: 'XP' },
        { key: 'stardust', color: '#d946ef', label: t('chart.stardust') }
    ];

    // Helper to generate points
    const getPoints = (key) => {
        const values = data.map(d => d[key]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        return values.map((val, i) => {
            const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
            const y = chartHeight - ((val - min) / range) * chartHeight;
            return `${x},${y}`;
        }).join(' ');
    };

    // Mini sparkline for the slider preview
    const getSliderSparkline = () => {
        if (allData.length < 2) return '';
        const key = 'caught';
        const values = allData.map(d => d[key]);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;
        const sliderH = 20;

        return values.map((val, i) => {
            const x = (i / (allData.length - 1)) * 100;
            const y = sliderH - ((val - min) / range) * sliderH;
            return `${x},${y}`;
        }).join(' ');
    };

    return (
        <div ref={containerRef} className="w-full mt-4 bg-white/5 rounded-xl p-3 border border-white/5 relative group">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">{t('chart.progression')}</span>
                {hoveredIndex !== null && (
                    <span className="text-xs font-mono text-white">
                        {data[hoveredIndex]?.date.toLocaleDateString()}
                    </span>
                )}
            </div>

            <div
                className="w-full relative"
                style={{ height: `${height}px` }}
                onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left - padding;
                    const effectiveWidth = rect.width - 2 * padding;
                    let index = Math.round((x / effectiveWidth) * (data.length - 1));
                    index = Math.min(Math.max(index, 0), data.length - 1);
                    setHoveredIndex(index);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
            >
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
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
                                            r={hoveredIndex === i ? 4 : 2}
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
                            x1={padding + (hoveredIndex / Math.max(data.length - 1, 1)) * (width - 2 * padding)}
                            y1="0"
                            x2={padding + (hoveredIndex / Math.max(data.length - 1, 1)) * (width - 2 * padding)}
                            y2={chartHeight}
                            stroke="white"
                            strokeWidth="1"
                            strokeDasharray="4 4"
                            opacity="0.5"
                        />
                    )}

                    {/* X-Axis Dates */}
                    {data.map((d, i) => {
                        const x = padding + (i / Math.max(data.length - 1, 1)) * (width - 2 * padding);
                        let anchor = "middle";
                        if (i === 0) anchor = "start";
                        if (i === data.length - 1) anchor = "end";

                        // Limit visible labels to avoid overlap
                        const maxLabels = Math.floor(width / 50);
                        const step = Math.max(1, Math.ceil(data.length / maxLabels));
                        if (i > 0 && i < data.length - 1 && i % step !== 0) return null;

                        return (
                            <text
                                key={i}
                                x={x}
                                y={chartHeight + 15}
                                fill="#9ca3af"
                                fontSize="9"
                                textAnchor={anchor}
                                style={{ pointerEvents: 'none' }}
                            >
                                {d.date.toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' })}
                            </text>
                        );
                    })}
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
                {hoveredIndex !== null && data[hoveredIndex] && (
                    <div className="absolute top-0 left-0 right-0 mx-auto w-max pointer-events-none z-20" style={{ transform: 'translateY(-10px)' }}>
                        <div className="bg-black/95 backdrop-blur-md border border-white/20 p-3 rounded-xl shadow-2xl text-xs">
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                                <div className="text-center text-gray-400 border-b border-white/10 pb-1 mb-1 font-mono">
                                    {data[hoveredIndex].date.toLocaleDateString()}
                                </div>
                                {metrics.map(m => {
                                    const currentVal = data[hoveredIndex][m.key];
                                    const prevVal = hoveredIndex > 0 ? data[hoveredIndex - 1][m.key] : null;
                                    const diff = prevVal !== null ? currentVal - prevVal : 0;
                                    const isNeg = diff < 0;
                                    const isPos = diff > 0;

                                    // Format a signed delta for xp/stardust: M for millions, k for thousands,
                                    // raw otherwise. Keeps the sign for positive/negative.
                                    const fmtBigDelta = (v) => {
                                        const abs = Math.abs(v);
                                        if (abs >= 1000000) return (v / 1000000).toFixed(2) + 'M';
                                        if (abs >= 1000) return (v / 1000).toFixed(0) + 'k';
                                        return v.toLocaleString();
                                    };
                                    const fmtDiff = (key, v) =>
                                        (key === 'xp' || key === 'stardust') ? fmtBigDelta(v) : v.toLocaleString();

                                    return (
                                        <div key={m.key} className="flex items-center justify-between gap-4">
                                            <span style={{ color: m.color }} className="font-bold">{m.label}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-white font-bold">
                                                    {m.key === 'xp'
                                                        ? (currentVal / 1000000).toFixed(2) + 'M'
                                                        : m.key === 'stardust'
                                                            ? (currentVal / 1000000).toFixed(1) + 'M'
                                                            : currentVal.toLocaleString()}
                                                </span>
                                                {isPos && (
                                                    <span className="font-mono text-[10px] text-green-400 bg-green-400/10 px-1 rounded">
                                                        +{fmtDiff(m.key, diff)}
                                                    </span>
                                                )}
                                                {isNeg && (
                                                    <span className="font-mono text-[10px] text-red-400 bg-red-400/10 px-1 rounded">
                                                        {fmtDiff(m.key, diff)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Range slider for timeline zoom */}
            {showSlider && (
                <div className="mt-2 px-1">
                    <div
                        ref={sliderRef}
                        className="relative w-full h-[28px] bg-black/30 rounded-lg border border-white/5 overflow-hidden select-none cursor-grab"
                        style={{ touchAction: 'none' }}
                    >
                        {/* Mini sparkline background */}
                        <svg width="100%" height="20" viewBox={`0 0 100 20`} preserveAspectRatio="none" className="absolute top-[4px] left-0 w-full opacity-30">
                            <polyline fill="none" stroke="#4ade80" strokeWidth="1" points={getSliderSparkline()} />
                        </svg>

                        {/* Dimmed area left */}
                        <div
                            className="absolute top-0 bottom-0 left-0 bg-black/40 pointer-events-none"
                            style={{ width: `${rangeStart * 100}%` }}
                        />
                        {/* Dimmed area right */}
                        <div
                            className="absolute top-0 bottom-0 right-0 bg-black/40 pointer-events-none"
                            style={{ width: `${(1 - rangeEnd) * 100}%` }}
                        />

                        {/* Selected range (draggable middle) */}
                        <div
                            className="absolute top-0 bottom-0 bg-white/5 border-y border-purple-500/30 cursor-grab active:cursor-grabbing"
                            style={{ left: `${rangeStart * 100}%`, width: `${(rangeEnd - rangeStart) * 100}%` }}
                            onMouseDown={(e) => handleSliderPointerDown(e, 'middle')}
                            onTouchStart={(e) => handleSliderPointerDown(e, 'middle')}
                        />

                        {/* Left handle */}
                        <div
                            className="absolute top-0 bottom-0 w-[10px] cursor-col-resize flex items-center justify-center z-10"
                            style={{ left: `calc(${rangeStart * 100}% - 5px)` }}
                            onMouseDown={(e) => handleSliderPointerDown(e, 'left')}
                            onTouchStart={(e) => handleSliderPointerDown(e, 'left')}
                        >
                            <div className="w-[3px] h-[14px] bg-purple-400 rounded-full" />
                        </div>

                        {/* Right handle */}
                        <div
                            className="absolute top-0 bottom-0 w-[10px] cursor-col-resize flex items-center justify-center z-10"
                            style={{ left: `calc(${rangeEnd * 100}% - 5px)` }}
                            onMouseDown={(e) => handleSliderPointerDown(e, 'right')}
                            onTouchStart={(e) => handleSliderPointerDown(e, 'right')}
                        >
                            <div className="w-[3px] h-[14px] bg-purple-400 rounded-full" />
                        </div>
                    </div>
                    <p className="text-[9px] text-gray-600 text-center mt-0.5 select-none">
                        {t('chart.brushZoom')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ProgressionChart;
