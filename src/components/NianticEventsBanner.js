// Compact "current event + next one" card for the homepage / events page.
// Fetches /api/niantic-events (server-side cached for 1h) and renders a
// minimal-but-clickable banner that opens the LeekDuck event page in a
// new tab. Self-hides when the upstream feed is empty or errors out so
// the homepage doesn't get an empty box.

'use client';

import { useEffect, useState } from 'react';
import { Calendar, ExternalLink, Clock } from 'lucide-react';

function formatDateRange(startISO, endISO, locale) {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const sameDay = start.toDateString() === end.toDateString();
    const optsDate = { day: 'numeric', month: 'short' };
    const optsTime = { hour: '2-digit', minute: '2-digit' };
    if (sameDay) {
        return `${start.toLocaleDateString(locale, optsDate)} · ${start.toLocaleTimeString(locale, optsTime)} → ${end.toLocaleTimeString(locale, optsTime)}`;
    }
    return `${start.toLocaleDateString(locale, optsDate)} → ${end.toLocaleDateString(locale, optsDate)}`;
}

function timeUntil(iso) {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return null;
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.floor((ms % 86_400_000) / 3_600_000);
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return `${hours}h ${mins}m`;
}

export default function NianticEventsBanner({ locale = 'en', className = '' }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/niantic-events')
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (!cancelled) setData(j); })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    if (loading) return null;
    if (!data || (!data.current?.length && !data.upcoming?.length)) return null;

    const live = data.current?.[0];
    const next = data.upcoming?.[0];

    return (
        <div className={`max-w-5xl mx-auto px-4 ${className}`}>
            <div className="bg-gradient-to-br from-purple-900/40 via-black/40 to-blue-900/40 border border-purple-500/20 rounded-2xl p-4 sm:p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-purple-300" />
                    <span className="text-xs font-medium text-purple-200 uppercase tracking-wider">
                        Pokémon GO — live events
                    </span>
                    <span className="ml-auto text-[10px] text-gray-500">via LeekDuck</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {live && (
                        <a
                            href={live.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 bg-black/30 border border-white/10 hover:border-purple-400/40 rounded-xl p-3 transition-colors"
                        >
                            {live.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={live.image}
                                    alt=""
                                    className="w-14 h-14 object-cover rounded-lg shrink-0"
                                    loading="lazy"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">live now</span>
                                </div>
                                <p className="text-sm font-bold text-white truncate group-hover:text-purple-200 transition-colors">{live.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{formatDateRange(live.start, live.end, locale)}</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-purple-300 shrink-0 transition-colors" />
                        </a>
                    )}

                    {next && (
                        <a
                            href={next.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-center gap-3 bg-black/30 border border-white/10 hover:border-blue-400/40 rounded-xl p-3 transition-colors"
                        >
                            {next.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={next.image}
                                    alt=""
                                    className="w-14 h-14 object-cover rounded-lg shrink-0"
                                    loading="lazy"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <Clock className="w-3 h-3 text-blue-300" />
                                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">in {timeUntil(next.start) || 'soon'}</span>
                                </div>
                                <p className="text-sm font-bold text-white truncate group-hover:text-blue-200 transition-colors">{next.name}</p>
                                <p className="text-[11px] text-gray-400 truncate">{formatDateRange(next.start, next.end, locale)}</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-300 shrink-0 transition-colors" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
