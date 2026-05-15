'use client';

import { useEffect, useState } from 'react';
import CommunityIcon from '@/components/CommunityIcon';

const ADMIN_USERNAMES = ['lcsnzh'];

const getAdminUser = () => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem('pokemon_user');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return ADMIN_USERNAMES.includes(parsed?.username) ? parsed.username : null;
    } catch {
        return null;
    }
};

const adminHeaders = (extra = {}) => {
    const user = getAdminUser();
    return user ? { ...extra, 'x-pogo-admin-user': user } : extra;
};

const LINK_TYPES = [
    { value: 'discord',   label: 'Discord'   },
    { value: 'campfire',  label: 'Campfire'  },
    { value: 'messenger', label: 'Messenger' },
    { value: 'telegram',  label: 'Telegram'  },
    { value: 'whatsapp',  label: 'WhatsApp'  },
    { value: 'website',   label: 'Website'   },
];

function GradientButton({ from, to, glow, children, className = '', ...rest }) {
    return (
        <button
            {...rest}
            className={`relative px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-white text-sm font-semibold transition-all duration-300 hover:scale-[1.05] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 flex items-center justify-center gap-1.5 whitespace-nowrap ${className}`}
            style={{
                background: `linear-gradient(135deg, ${from}, ${to})`,
                border: '1px solid rgba(255,255,255,0.22)',
                boxShadow: `0 6px 18px rgba(${glow},0.35), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18)`,
                textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}
        >
            {children}
        </button>
    );
}

function EventFormModal({ initial, onClose, onSubmit, busy }) {
    const isEdit = !!initial?.id;
    const [id, setId] = useState(initial?.id || '');
    const [title, setTitle] = useState(initial?.title || '');
    const [city, setCity] = useState(initial?.city || '');
    const [lat, setLat] = useState(Number.isFinite(initial?.lat) ? String(initial.lat) : '');
    const [lng, setLng] = useState(Number.isFinite(initial?.lng) ? String(initial.lng) : '');
    const [startDate, setStartDate] = useState(initial?.startDate || '');
    const [endDate, setEndDate] = useState(initial?.endDate || '');
    const [color, setColor] = useState(initial?.color || '#22d3ee');
    const [description, setDescription] = useState(initial?.description || '');
    const [heroImage, setHeroImage] = useState(initial?.heroImage || '');
    const [showFlashingDot, setShowFlashingDot] = useState(initial?.showFlashingDot !== false);
    const [news, setNews] = useState(Array.isArray(initial?.news) ? initial.news : []);
    const [links, setLinks] = useState(Array.isArray(initial?.links) ? initial.links : []);
    const [imagesText, setImagesText] = useState(Array.isArray(initial?.images) ? initial.images.join('\n') : '');
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
            setError('Latitude / longitude must be numeric');
            return;
        }
        try {
            await onSubmit({
                id: isEdit ? id : undefined,
                title,
                city,
                lat: latNum,
                lng: lngNum,
                startDate,
                endDate,
                color,
                description,
                heroImage,
                showFlashingDot,
                news: news.filter(n => n.title || n.text || n.url),
                links: links.filter(l => l.url),
                images: imagesText.split('\n').map(s => s.trim()).filter(Boolean),
            });
        } catch (err) {
            setError(err.message);
        }
    };

    const updateNews = (i, field, value) => {
        setNews(news.map((n, idx) => idx === i ? { ...n, [field]: value } : n));
    };
    const updateLink = (i, field, value) => {
        setLinks(links.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
            onClick={onClose}
            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                className="w-full max-w-2xl my-8 bg-[#0a0a18] border border-white/10 rounded-2xl p-6 text-white shadow-2xl"
            >
                <div className="flex items-start justify-between mb-5">
                    <h3 className="text-xl font-bold bg-gradient-to-b from-[#ff5959] to-[#9b1212] bg-clip-text text-transparent">
                        {isEdit ? 'Edit event' : 'Add event'}
                    </h3>
                    <button type="button" onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white text-xl leading-none">×</button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Title</label>
                        <input
                            type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                            required maxLength={200} placeholder="Pokémon GO Fest Copenhagen"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-1">City</label>
                        <input
                            type="text" value={city} onChange={(e) => setCity(e.target.value)}
                            placeholder="Copenhagen"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Color (flashing dot)</label>
                        <div className="flex gap-2">
                            <input
                                type="color" value={color} onChange={(e) => setColor(e.target.value)}
                                className="w-12 h-10 rounded-lg bg-white/5 border border-white/10 cursor-pointer"
                            />
                            <input
                                type="text" value={color} onChange={(e) => setColor(e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-purple-400/50 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Latitude</label>
                        <input
                            type="text" value={lat} onChange={(e) => setLat(e.target.value)}
                            required placeholder="55.6761"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Longitude</label>
                        <input
                            type="text" value={lng} onChange={(e) => setLng(e.target.value)}
                            required placeholder="12.5683"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-1">Start date</label>
                        <input
                            type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-white/60 mb-1">End date</label>
                        <input
                            type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-purple-400/50 focus:outline-none"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Description</label>
                        <textarea
                            value={description} onChange={(e) => setDescription(e.target.value)}
                            rows={3} maxLength={1000}
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10 resize-none"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Hero image URL</label>
                        <input
                            type="url" value={heroImage} onChange={(e) => setHeroImage(e.target.value)}
                            placeholder="https://…/banner.jpg"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-white/60 mb-1">Gallery image URLs (one per line)</label>
                        <textarea
                            value={imagesText} onChange={(e) => setImagesText(e.target.value)}
                            rows={3} placeholder="https://…/photo1.jpg&#10;https://…/photo2.jpg"
                            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10 font-mono text-xs resize-none"
                        />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                        <input
                            id="showFlashingDot" type="checkbox"
                            checked={showFlashingDot} onChange={(e) => setShowFlashingDot(e.target.checked)}
                            className="w-4 h-4"
                        />
                        <label htmlFor="showFlashingDot" className="text-sm text-white/80 cursor-pointer">
                            Show flashing dot on the globe
                        </label>
                    </div>
                </div>

                {/* News items */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-white/60">News items</label>
                        <button type="button"
                            onClick={() => setNews([...news, { title: '', text: '', date: '' }])}
                            className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/80">+ Add</button>
                    </div>
                    <div className="space-y-2">
                        {news.map((n, i) => (
                            <div key={i} className="rounded-lg border border-white/10 p-2 bg-white/[0.03] flex gap-2">
                                <div className="flex-1 grid grid-cols-1 gap-1">
                                    <input
                                        type="text" placeholder="Title" value={n.title || ''}
                                        onChange={(e) => updateNews(i, 'title', e.target.value)}
                                        className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
                                    />
                                    <input
                                        type="text" placeholder="Text" value={n.text || ''}
                                        onChange={(e) => updateNews(i, 'text', e.target.value)}
                                        className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
                                    />
                                    <div className="grid grid-cols-2 gap-1">
                                        <input
                                            type="url" placeholder="Link URL (optional)" value={n.url || ''}
                                            onChange={(e) => updateNews(i, 'url', e.target.value)}
                                            className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
                                        />
                                        <input
                                            type="date" value={n.date || ''}
                                            onChange={(e) => updateNews(i, 'date', e.target.value)}
                                            className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400/50"
                                        />
                                    </div>
                                </div>
                                <button type="button" onClick={() => setNews(news.filter((_, idx) => idx !== i))}
                                    className="self-start text-white/50 hover:text-red-300 px-2">×</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Links */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-white/60">Links (Discord channel, info pages, etc.)</label>
                        <button type="button"
                            onClick={() => setLinks([...links, { type: 'discord', name: '', url: '' }])}
                            className="text-xs px-2 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white/80">+ Add</button>
                    </div>
                    <div className="space-y-2">
                        {links.map((l, i) => (
                            <div key={i} className="rounded-lg border border-white/10 p-2 bg-white/[0.03] flex gap-2">
                                <div className="flex-1 grid grid-cols-3 gap-1">
                                    <select
                                        value={l.type || 'website'}
                                        onChange={(e) => updateLink(i, 'type', e.target.value)}
                                        className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400/50"
                                    >
                                        {LINK_TYPES.map(t => <option key={t.value} value={t.value} className="bg-[#0a0a18]">{t.label}</option>)}
                                    </select>
                                    <input
                                        type="text" placeholder="Name" value={l.name || ''}
                                        onChange={(e) => updateLink(i, 'name', e.target.value)}
                                        className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
                                    />
                                    <input
                                        type="url" placeholder="URL" value={l.url || ''}
                                        onChange={(e) => updateLink(i, 'url', e.target.value)}
                                        className="px-2 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
                                    />
                                </div>
                                <button type="button" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}
                                    className="self-start text-white/50 hover:text-red-300 px-2">×</button>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                <div className="flex gap-2 mt-2">
                    <button
                        type="button" onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <GradientButton
                        type="submit"
                        from="#ff5959" to="#9b1212" glow="220,38,38"
                        disabled={busy} className="flex-1"
                    >
                        {busy ? '…' : (isEdit ? 'Save changes' : 'Create event')}
                    </GradientButton>
                </div>
            </form>
        </div>
    );
}

export default function AdminEvents() {
    const [eventsMap, setEventsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const [authState, setAuthState] = useState('checking');
    const [formModal, setFormModal] = useState(null);

    useEffect(() => {
        const user = getAdminUser();
        setAuthState(user ? 'allowed' : 'denied');
    }, []);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/events', {
                cache: 'no-store',
                headers: adminHeaders(),
            });
            if (res.status === 403) throw new Error('Access denied');
            if (!res.ok) throw new Error('Failed to load');
            setEventsMap(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authState === 'allowed') refresh();
    }, [authState]);

    const submitForm = async (payload) => {
        setBusy('form');
        try {
            const res = await fetch('/api/admin/events', {
                method: 'POST',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Error');
            setFormModal(null);
            await refresh();
        } catch (e) {
            setBusy(null);
            throw e;
        }
        setBusy(null);
    };

    const removeEvent = async (id) => {
        if (!confirm(`Delete event "${id}"?`)) return;
        setBusy(`del-${id}`);
        try {
            const res = await fetch('/api/admin/events', {
                method: 'DELETE',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error');
            await refresh();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    if (authState === 'checking') {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center text-white/50" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                <p>Checking permissions...</p>
            </div>
        );
    }

    if (authState === 'denied') {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center px-6 text-center" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                <div>
                    <h1 className="text-3xl font-bold mb-3 bg-gradient-to-b from-[#ff5959] to-[#9b1212] bg-clip-text text-transparent">
                        Admin only
                    </h1>
                    <p className="text-white/60 mb-6 text-sm">Sign in as an administrator to access this panel.</p>
                    <a href="/" className="inline-block px-5 py-2.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/15 text-white text-sm transition-colors">
                        ← Back to home
                    </a>
                </div>
            </div>
        );
    }

    const eventsList = Object.values(eventsMap);

    return (
        <div className="min-h-screen bg-[#050510] text-white px-4 sm:px-8 py-10" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-[#ff5959] to-[#9b1212] bg-clip-text text-transparent">
                            Admin · Events
                        </h1>
                        <p className="text-white/60 mt-1 text-sm">Manage Pokémon GO events shown on the globe</p>
                    </div>
                    <div className="flex gap-2">
                        <GradientButton from="#3b82f6" to="#06b6d4" glow="14,165,233" onClick={refresh}>
                            Reload
                        </GradientButton>
                        <GradientButton from="#8b5cf6" to="#a855f7" glow="168,85,247" onClick={() => setFormModal({ initial: null })}>
                            + Add event
                        </GradientButton>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/30 text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <p className="text-white/50 text-sm">Loading…</p>
                ) : eventsList.length === 0 ? (
                    <p className="text-white/50 text-sm">No events yet. Create your first one.</p>
                ) : (
                    <div className="space-y-3">
                        {eventsList.map((ev) => (
                            <div key={ev.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ background: ev.color || '#22d3ee', boxShadow: `0 0 10px ${ev.color || '#22d3ee'}` }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">{ev.title}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 capitalize">{ev.city}</span>
                                                {ev.showFlashingDot === false && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/30 border border-slate-400/30 text-slate-200">hidden</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-white/50 mt-1 font-mono">
                                                {ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` → ${ev.endDate}` : ''} · {ev.lat?.toFixed(2)}°, {ev.lng?.toFixed(2)}° · {(ev.participants || []).length} participant(s)
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 sm:flex-shrink-0">
                                        <GradientButton
                                            from="#f59e0b" to="#f97316" glow="249,115,22"
                                            className="!px-3 !py-1.5 !text-xs"
                                            onClick={() => setFormModal({ initial: ev })}
                                            disabled={busy !== null}
                                        >
                                            Edit
                                        </GradientButton>
                                        <GradientButton
                                            from="#475569" to="#1e293b" glow="100,116,139"
                                            className="!px-3 !py-1.5 !text-xs"
                                            onClick={() => removeEvent(ev.id)}
                                            disabled={busy !== null}
                                        >
                                            {busy === `del-${ev.id}` ? '…' : 'Delete'}
                                        </GradientButton>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {formModal && (
                <EventFormModal
                    initial={formModal.initial}
                    onClose={() => setFormModal(null)}
                    onSubmit={submitForm}
                    busy={busy === 'form'}
                />
            )}
        </div>
    );
}
