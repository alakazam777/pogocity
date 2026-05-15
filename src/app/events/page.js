'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock, ExternalLink, Zap, Check, AlertCircle, Send, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSession } from 'next-auth/react';
import NianticEventsBanner from '@/components/NianticEventsBanner';
import cityConfig from '@/lib/cityConfig';

const ADMIN_DISCORD_ID = "170297298754994177";

// Events come from the Pogosphere hub (see city.config.js → federation).
// The hub serves the shared event calendar at /api/events; this page
// fetches it at runtime so the calendar stays in sync automatically.
const HUB_EVENTS_URL = `${cityConfig.federation.hubUrl}/api/events`;

const LOCAL_EVENTS_FALLBACK = [
];

const EventCard = ({ event, lang, isAdmin }) => {
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'ja' ? 'ja-JP' : 'en-US';
    const Wrapper = event.link ? motion.a : motion.div;
    const props = event.link ? { href: event.link, target: "_blank", rel: "noopener noreferrer" } : {};

    // Admin-only: create Discord scheduled event
    const [discordState, setDiscordState] = useState({ loading: false, ok: null, msg: null });
    const startInFuture = new Date(event.date) > new Date();

    // Admin-only: share Campfire link via webhook (review-before-send)
    const defaultShareMessage = `📅 ${event.title}${event.link ? `\n${event.link}` : ''}`;
    const [shareOpen, setShareOpen] = useState(false);
    const [shareMsg, setShareMsg] = useState(defaultShareMessage);
    const [shareState, setShareState] = useState({ loading: false, ok: null, msg: null });

    const createDiscordEvent = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!startInFuture) {
            setDiscordState({ loading: false, ok: false, msg: "L'événement est déjà passé/en cours" });
            return;
        }
        if (!confirm(`Créer l'événement Discord "${event.title}" ?`)) return;
        setDiscordState({ loading: true, ok: null, msg: null });
        try {
            const res = await fetch('/api/admin/discord-events/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event })
            });
            const data = await res.json();
            if (res.ok) {
                setDiscordState({ loading: false, ok: true, msg: 'Créé !' });
                if (data.url) window.open(data.url, '_blank', 'noopener');
            } else {
                setDiscordState({ loading: false, ok: false, msg: data.error || 'Erreur' });
            }
        } catch (err) {
            setDiscordState({ loading: false, ok: false, msg: 'Échec réseau' });
        }
    };

    const openShareModal = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShareMsg(defaultShareMessage);
        setShareState({ loading: false, ok: null, msg: null });
        setShareOpen(true);
    };

    const sendShareMessage = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!shareMsg.trim()) {
            setShareState({ loading: false, ok: false, msg: 'Message vide' });
            return;
        }
        setShareState({ loading: true, ok: null, msg: null });
        try {
            const res = await fetch('/api/admin/discord-announce', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: shareMsg })
            });
            const data = await res.json();
            if (res.ok) {
                setShareState({ loading: false, ok: true, msg: 'Envoyé !' });
                setTimeout(() => setShareOpen(false), 1200);
            } else {
                setShareState({ loading: false, ok: false, msg: data.error || 'Erreur' });
            }
        } catch (err) {
            setShareState({ loading: false, ok: false, msg: 'Échec réseau' });
        }
    };

    return (
        <Wrapper
            {...props}
            layoutId={`event-${event.id}`}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-colors group cursor-pointer overflow-hidden relative block"
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${event.color}`} />
            <div className="w-16 h-16 rounded-lg bg-black/30 flex-shrink-0 p-1 border border-white/5 relative overflow-hidden">
                {/* Small glow effect behind image */}
                <div className={`absolute inset-0 bg-gradient-to-br ${event.color} opacity-20`} />
                <img src={event.image} alt={event.title} className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white truncate pr-2 group-hover:text-pink-400 transition-colors">{event.title}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-white/10 bg-gradient-to-r ${event.color} text-white shadow-sm`}>
                        {event.type}
                    </span>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 mt-1">{event.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500 font-mono">
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        {event.type === 'raid' && new Date(event.date).getHours() === 10 && new Date(event.date).getMinutes() === 0
                            ? new Date(event.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                            : new Date(event.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
                        }
                        {event.isMultiDay && ` - ${new Date(event.endDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`}
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-1">
                            <MapPin size={12} />
                            {event.location}
                        </div>
                    )}
                </div>
                {isAdmin && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {startInFuture && (
                            <button
                                type="button"
                                onClick={createDiscordEvent}
                                disabled={discordState.loading || discordState.ok === true}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${
                                    discordState.ok === true
                                        ? 'bg-green-500/20 border-green-500/40 text-green-300'
                                        : discordState.ok === false
                                            ? 'bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30'
                                            : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/30'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                title="Créer l'événement sur Discord (admin)"
                            >
                                {discordState.loading
                                    ? <><Zap size={12} className="animate-pulse" /> Création…</>
                                    : discordState.ok === true
                                        ? <><Check size={12} /> Créé sur Discord</>
                                        : discordState.ok === false
                                            ? <><AlertCircle size={12} /> {discordState.msg || 'Erreur'}</>
                                            : <><Zap size={12} /> Créer sur Discord</>
                                }
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={openShareModal}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-md border bg-pink-500/20 border-pink-500/40 text-pink-200 hover:bg-pink-500/30 flex items-center gap-1.5 transition-colors"
                            title="Partager sur Discord (admin)"
                        >
                            <Send size={12} /> Partager sur Discord
                        </button>
                    </div>
                )}
            </div>

            {shareOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareOpen(false); }}
                >
                    <div
                        className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <Send size={18} className="text-pink-400" />
                                Partager sur Discord
                            </h3>
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareOpen(false); }}
                                className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                            Révise le message avant envoi. Il apparaîtra sous le nom <span className="text-pink-300 font-semibold">PogoSphere</span>.
                        </p>
                        <textarea
                            value={shareMsg}
                            onChange={(e) => setShareMsg(e.target.value)}
                            rows={4}
                            maxLength={2000}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-pink-400/50 resize-y"
                            autoFocus
                        />
                        <div className="mt-2 flex justify-between items-center text-[11px] text-gray-500">
                            <span>{shareMsg.length} / 2000</span>
                            {shareState.ok === false && (
                                <span className="text-red-400 flex items-center gap-1">
                                    <AlertCircle size={12} /> {shareState.msg}
                                </span>
                            )}
                            {shareState.ok === true && (
                                <span className="text-green-400 flex items-center gap-1">
                                    <Check size={12} /> {shareState.msg}
                                </span>
                            )}
                        </div>
                        <div className="mt-4 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShareOpen(false); }}
                                className="px-3 py-1.5 text-sm rounded-md border border-white/10 text-gray-300 hover:bg-white/5"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={sendShareMessage}
                                disabled={shareState.loading || shareState.ok === true || !shareMsg.trim()}
                                className="px-3 py-1.5 text-sm rounded-md bg-pink-600 hover:bg-pink-500 text-white flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {shareState.loading
                                    ? <><Zap size={14} className="animate-pulse" /> Envoi…</>
                                    : <><Send size={14} /> Envoyer</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Wrapper>
    );
};

export default function EventsPage() {
    const { t, lang } = useLanguage();
    const { data: session } = useSession();
    const isAdmin = session?.user?.id === ADMIN_DISCORD_ID;
    const locale = lang === 'fr' ? 'fr-FR' : lang === 'ja' ? 'ja-JP' : 'en-US';
    const [currentDate, setCurrentDate] = useState(new Date()); // Today
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Événements affichés : on commence avec le fallback local pour éviter un
    // flash de page vide, puis on remplace par les données PogoPoitiers dès
    // que le fetch aboutit. Si le fetch échoue (offline / API down), on garde
    // simplement le fallback : la page reste utilisable.
    // Same Poitiers-local filter as the post-fetch path (see useEffect below)
    // so the fallback render — which fires before the API call resolves — also
    // hides Poitiers-specific entries. Without this guard, the page would
    // briefly flash a list including local Poitiers raids before the fetched,
    // filtered events arrive.
    const POITIERS_LOCAL_RX = /poitiers|blossac/i;
    const initialFiltered = LOCAL_EVENTS_FALLBACK.filter((ev) => {
        const loc = (ev.location || '');
        const title = (ev.title || '');
        const desc = (ev.description || '');
        return !(POITIERS_LOCAL_RX.test(loc) || POITIERS_LOCAL_RX.test(title) || POITIERS_LOCAL_RX.test(desc));
    });
    const [events, setEvents] = useState(initialFiltered);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();
        // Timeout généreux pour le mobile (réseau lent), mais on laisse le
        // fallback si on dépasse 8s.
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        (async () => {
            try {
                const res = await fetch(HUB_EVENTS_URL, {
                    signal: controller.signal,
                    cache: 'no-store',
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (cancelled) return;
                if (Array.isArray(data?.events) && data.events.length > 0) {
                    // PogoPoitiers' API mixes Poitiers-local meetups (specific
                    // venues like "Hôtel de Ville de Poitiers" / "Parc de
                    // Blossac") with truly global events (GO Fest, weekly raid
                    // rotations, …). PogoSphere is a global community portal, so
                    // we strip the Poitiers-only entries — keep everything else.
                    // Match heuristics: location string mentioning Poitiers,
                    // Blossac, or the title containing those (catches "Heure
                    // de raids Zacian — Hôtel de Ville" style entries).
                    const POITIERS_LOCAL = /poitiers|blossac/i;
                    const filtered = data.events.filter((ev) => {
                        const loc = (ev.location || '');
                        const title = (ev.title || '');
                        const desc = (ev.description || '');
                        return !(POITIERS_LOCAL.test(loc) || POITIERS_LOCAL.test(title) || POITIERS_LOCAL.test(desc));
                    });
                    setEvents(filtered);
                }
            } catch (err) {
                // Fallback local utilisé silencieusement — on logge juste pour debug.
                if (!cancelled) {
                    console.warn('[events] Fetch PogoPoitiers a échoué, fallback local :', err?.message || err);
                }
            } finally {
                clearTimeout(timeoutId);
            }
        })();

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, []);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun

        // Adjust for Monday start (French style)
        // 0 (Sun) -> 6, 1 (Mon) -> 0, etc.
        const offset = firstDay === 0 ? 6 : firstDay - 1;

        return { days, offset };
    };

    const { days, offset } = getDaysInMonth(currentDate);

    const changeMonth = (delta) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    };

    const isSameDay = (d1, d2) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    // Check if a date is within an event's range
    const isEventActiveOnDay = (event, date) => {
        const start = new Date(event.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(event.endDate || event.date);
        end.setHours(23, 59, 59, 999);
        const check = new Date(date);
        check.setHours(12, 0, 0, 0); // Midday to be safe
        return check >= start && check <= end;
    };

    // Helper to determine if a day is the start or end of a multi-day event
    const getEventPosition = (event, date) => {
        const start = new Date(event.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(event.endDate || event.date);
        end.setHours(0, 0, 0, 0);

        const current = new Date(date);
        current.setHours(0, 0, 0, 0);

        const isStart = current.getTime() === start.getTime();
        const isEnd = current.getTime() === end.getTime();

        if (isStart && isEnd) return 'single';
        if (isStart) return 'start';
        if (isEnd) return 'end';
        return 'middle';
    };

    // Helper to get events for a day
    const getEventsForDay = (day) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return events
            .filter(e => isEventActiveOnDay(e, checkDate))
            .sort((a, b) => {
                // Short events (not multi-day) should appear above (first in array) multi-day events
                if (a.isMultiDay === b.isMultiDay) return 0;
                return a.isMultiDay ? 1 : -1;
            });
    };

    const selectedEvents = events.filter(e => isEventActiveOnDay(e, selectedDate))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Sort upcoming events: those ending after now
    const upcomingEvents = events
        .filter(e => new Date(e.endDate || e.date) >= new Date()) // From Today
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);


    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-2 md:px-4">
            <div className="max-w-[1800px] mx-auto">
                <div className="mb-8 mt-8 text-center">
                    <h1
                        className="text-2xl md:text-5xl font-extrabold uppercase tracking-normal bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] py-2 [word-spacing:0.5rem]"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {t('events.title')}
                    </h1>
                </div>

                {/* Live Niantic events ticker — pulls "currently running" and
                    "next up" from the LeekDuck feed (via /api/niantic-events).
                    Auto-hides when both arrays are empty so the page doesn't
                    show a stale-feeling empty box. */}
                <NianticEventsBanner locale={locale} className="mb-10" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Calendar Section */}
                    <div className="lg:col-span-9 xl:col-span-9">
                        <div className="bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl p-4 md:p-6">
                            {/* Calendar Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl md:text-2xl font-bold capitalize flex items-center gap-2">
                                    <Calendar className="text-pink-500" />
                                    {currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={() => changeMonth(-1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                        <ChevronLeft />
                                    </button>
                                    <button onClick={() => changeMonth(1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                                        <ChevronRight />
                                    </button>
                                </div>
                            </div>

                            {/* Days Grid - Responsive Layout */}
                            <div className="relative">
                                {/* Desktop/Tablet Grid View */}
                                <div className="hidden sm:block overflow-x-auto md:overflow-visible scrollbar-hide">
                                    <div className="min-w-[800px] md:min-w-0">
                                        {/* Week Days Header */}
                                        <div className="grid grid-cols-7 mb-2 text-center">
                                            {t('events.weekdays').map(day => (
                                                <div key={day} className="text-gray-500 font-bold text-xs uppercase tracking-wider py-1">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-2 md:gap-3">
                                            {/* Empty spots for offset */}
                                            {Array.from({ length: offset }).map((_, i) => (
                                                <div key={`offset-${i}`} className="aspect-[6/5]" />
                                            ))}

                                            {/* Days (Grid) */}
                                            {Array.from({ length: days }).map((_, i) => {
                                                const day = i + 1;
                                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                                const isSelected = isSameDay(date, selectedDate);
                                                const isToday = isSameDay(date, new Date());
                                                const today = new Date(); today.setHours(0,0,0,0);
                                                const isPast = date < today && !isToday;
                                                const dayEvents = getEventsForDay(day);

                                                return (
                                                    <motion.button
                                                        key={day}
                                                        whileHover={{ scale: 1.02 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => setSelectedDate(date)}
                                                        className={`
                                                            aspect-[6/5] min-h-[100px] rounded-xl md:rounded-2xl relative flex flex-col items-center justify-start pt-2 md:pt-4 border transition-all duration-150 overflow-hidden
                                                            ${isSelected
                                                                ? 'bg-pink-600/20 border-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] z-20'
                                                                : isPast
                                                                    ? 'bg-white/[0.02] border-white/[0.03] text-gray-600 hover:bg-white/5'
                                                                    : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20'
                                                            }
                                                            ${isToday && !isSelected ? 'border-blue-500/50 bg-blue-500/10' : ''}
                                                            ${isPast && !isSelected ? 'saturate-[0.3] opacity-50' : ''}
                                                        `}
                                                    >
                                                        <span className={`text-sm font-mono font-bold z-10 relative mb-1 ${isSelected ? 'text-pink-300' : isToday ? 'text-blue-400' : ''}`}>
                                                            {day}
                                                        </span>

                                                        <div className="w-full mt-auto flex flex-col gap-1 px-1 pb-1 w-full z-0 overflow-hidden">
                                                            {/* Cap visible events per day at 4 — past that the
                                                                cells overflow vertically on iPad's tall aspect
                                                                ratio and bleed into the next row of cells.
                                                                Mobile already shows a bubble-summary view, so
                                                                this only kicks in on the grid layout. The "+N
                                                                more" tag lands at the bottom and uses the same
                                                                pill style so it doesn't visually disrupt the
                                                                day cell. */}
                                                            {dayEvents.slice(0, 4).map((ev, idx) => {
                                                                const position = getEventPosition(ev, date);
                                                                const Wrapper = ev.link ? 'a' : 'div';
                                                                const props = ev.link ? { href: ev.link, target: "_blank", rel: "noopener noreferrer", onClick: (e) => e.stopPropagation() } : {};

                                                                return (
                                                                    <Wrapper
                                                                        key={`event-${idx}`}
                                                                        {...props}
                                                                        className={`
                                                                            h-auto min-h-[36px] py-1 bg-gradient-to-r ${ev.color} flex items-center shadow-md cursor-pointer hover:brightness-110 transition-all
                                                                            ${position === 'start' ? 'rounded-l-md ml-0.5' : ''}
                                                                            ${position === 'end' ? 'rounded-r-md mr-0.5' : ''}
                                                                            ${position === 'middle' ? 'mx-[-2px] w-[calc(100%+4px)]' : ''}
                                                                            ${position === 'single' ? 'rounded-md mx-0.5' : ''}
                                                                        `}
                                                                        title={ev.title}
                                                                    >
                                                                        <div className="flex items-center gap-2 px-2 w-full overflow-hidden">
                                                                            {ev.image && (
                                                                                <img
                                                                                    src={ev.image}
                                                                                    alt=""
                                                                                    className="w-6 h-6 object-contain flex-shrink-0"
                                                                                    loading="lazy"
                                                                                />
                                                                            )}
                                                                            <span className="text-[10px] md:text-[11px] font-semibold text-white leading-[1.1] drop-shadow-[0_1px_3px_black] line-clamp-2 uppercase tracking-tight">
                                                                                {ev.title}
                                                                            </span>
                                                                        </div>
                                                                    </Wrapper>
                                                                );
                                                            })}
                                                            {dayEvents.length > 4 && (
                                                                <div className="text-[9px] md:text-[10px] text-white/70 px-2 py-0.5 bg-white/10 rounded-md text-center font-medium">
                                                                    +{dayEvents.length - 4} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Bubble Calendar */}
                                <div className="sm:hidden">
                                    {/* Week Days Header */}
                                    <div className="grid grid-cols-7 mb-2 text-center">
                                        {t('events.weekdaysShort').map((day, i) => (
                                            <div key={`mh-${i}`} className="text-gray-500 font-bold text-[10px] uppercase tracking-wider py-1">
                                                {day}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {/* Empty spots for offset */}
                                        {Array.from({ length: offset }).map((_, i) => (
                                            <div key={`m-offset-${i}`} className="aspect-square" />
                                        ))}

                                        {/* Day bubbles */}
                                        {Array.from({ length: days }).map((_, i) => {
                                            const day = i + 1;
                                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                            const dayEvents = getEventsForDay(day);
                                            const isToday = isSameDay(date, new Date());
                                            const isSelected = isSameDay(date, selectedDate);
                                            const today = new Date(); today.setHours(0,0,0,0);
                                            const isPast = date < today && !isToday;
                                            const hasEvents = dayEvents.length > 0;
                                            // Get dominant event color for the dot
                                            const dotColor = hasEvents ? dayEvents[0].color : '';

                                            return (
                                                <button
                                                    key={`m-${day}`}
                                                    onClick={() => setSelectedDate(date)}
                                                    className={`
                                                        aspect-square rounded-full flex flex-col items-center justify-center relative transition-all duration-150
                                                        ${isSelected
                                                            ? 'bg-pink-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.5)] scale-110 z-10'
                                                            : isToday
                                                                ? 'bg-blue-600 text-white'
                                                                : isPast
                                                                    ? 'text-gray-600'
                                                                    : hasEvents
                                                                        ? 'bg-white/10 text-white'
                                                                        : 'text-gray-400'
                                                        }
                                                        ${isPast && !isSelected ? 'opacity-40' : ''}
                                                    `}
                                                >
                                                    <span className={`text-xs font-bold ${isSelected || isToday ? 'text-white' : ''}`}>{day}</span>
                                                    {/* Event dots */}
                                                    {hasEvents && !isSelected && (
                                                        <div className="flex gap-0.5 mt-0.5">
                                                            {dayEvents.slice(0, 3).map((ev, idx) => (
                                                                <div key={idx} className={`w-1 h-1 rounded-full bg-gradient-to-r ${ev.color}`} />
                                                            ))}
                                                        </div>
                                                    )}
                                                    {hasEvents && isSelected && (
                                                        <div className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-white" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Selected day events below the calendar */}
                                    <div className="mt-4 space-y-2">
                                        {(() => {
                                            const selEvents = events.filter(e => isEventActiveOnDay(e, selectedDate)).sort((a, b) => new Date(a.date) - new Date(b.date));
                                            if (selEvents.length === 0) return (
                                                <div className="text-center py-6 text-gray-500 text-sm">
                                                    {t('events.noEventsToday')}
                                                </div>
                                            );
                                            return selEvents.map((ev, idx) => {
                                                const Wrapper = ev.link ? 'a' : 'div';
                                                const props = ev.link ? { href: ev.link, target: "_blank", rel: "noopener noreferrer" } : {};
                                                return (
                                                    <Wrapper key={`ev-mob-${idx}`} {...props} className={`p-3 rounded-xl bg-gradient-to-r ${ev.color} flex items-center gap-3 shadow-lg block`}>
                                                        <div className="w-10 h-10 bg-white/20 rounded-lg p-1 flex-shrink-0">
                                                            <img src={ev.image} alt="" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-bold text-sm text-white line-clamp-1">{ev.title}</div>
                                                            <div className="text-[10px] text-white/80 flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {new Date(ev.date).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                                                                {ev.isMultiDay && ` → ${new Date(ev.endDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`}
                                                            </div>
                                                            {ev.location && (
                                                                <div className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5">
                                                                    <MapPin size={10} /> {ev.location}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {ev.link && <ExternalLink size={14} className="text-white/60 flex-shrink-0" />}
                                                    </Wrapper>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details Panel */}
                    <div className="lg:col-span-3 xl:col-span-3 space-y-6">
                        {/* Selected Date Info */}
                        <div className="bg-[#111] rounded-3xl border border-white/10 p-6 min-h-[300px]">
                            <h3 className="text-xl font-bold mb-4 border-b border-white/10 pb-4 capitalize text-pink-500 flex justify-between items-center">
                                {selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
                                {isSameDay(selectedDate, new Date()) && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">{t('events.today')}</span>}
                            </h3>

                            <div className="space-y-4">
                                {selectedEvents.length > 0 ? (
                                    selectedEvents.map(event => (
                                        <EventCard key={event.id} event={event} lang={lang} isAdmin={isAdmin} />
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                            <Calendar size={32} className="opacity-20" />
                                        </div>
                                        <p>{t('events.noEventsDay')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Legend / upcoming */}
                        <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-3xl border border-white/10 p-6">
                            <h3 className="text-lg font-bold mb-4 text-white">{t('events.upcomingTitle')}</h3>
                            <div className="space-y-3">
                                {upcomingEvents.map(event => {
                                    const Wrapper = event.link ? 'a' : 'div';
                                    const props = event.link ? { href: event.link, target: "_blank", rel: "noopener noreferrer" } : {};
                                    return (
                                        <Wrapper key={event.id} {...props} className="flex gap-3 items-center group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors block">
                                            <div className={`w-2 h-10 rounded-full bg-gradient-to-b ${event.color}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm truncate group-hover:text-pink-300 transition-colors">{event.title}</div>
                                                <div className="text-xs text-gray-400 capitalize">
                                                    {new Date(event.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric' })}
                                                    {event.isMultiDay && ` - ${new Date(event.endDate).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`}
                                                </div>
                                            </div>
                                        </Wrapper>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
