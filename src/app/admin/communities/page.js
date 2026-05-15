'use client';

import { useEffect, useState } from 'react';
import CommunityIcon from '@/components/CommunityIcon';

const TYPE_OPTIONS = [
    { value: 'discord',   label: 'Discord'   },
    { value: 'campfire',  label: 'Campfire'  },
    { value: 'messenger', label: 'Messenger' },
    { value: 'telegram',  label: 'Telegram'  },
    { value: 'whatsapp',  label: 'WhatsApp'  },
    { value: 'website',   label: 'Website'   },
];

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

// ─── Premium gradient button — same template as the homepage nav ───
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

// ─── Add/Edit form modal ───
function CommunityFormModal({ initial, onClose, onSubmit, busy }) {
    const isEdit = !!initial?.linkIndex !== undefined && initial?.linkIndex >= 0;
    const [city, setCity] = useState(initial?.city || '');
    const [name, setName] = useState(initial?.name || '');
    const [url, setUrl] = useState(initial?.url || '');
    const [type, setType] = useState(initial?.type || 'discord');
    const [error, setError] = useState(null);

    const submit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await onSubmit({ city: city.toLowerCase().trim(), name, url, type, linkIndex: initial?.linkIndex });
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
        >
            <form
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
                className="w-full max-w-md bg-[#0a0a18] border border-white/10 rounded-2xl p-6 text-white shadow-2xl"
            >
                <div className="flex items-start justify-between mb-5">
                    <h3 className="text-xl font-bold bg-gradient-to-b from-[#ff5959] to-[#9b1212] bg-clip-text text-transparent">
                        {isEdit ? 'Edit community' : 'Add community'}
                    </h3>
                    <button type="button" onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white text-xl leading-none">×</button>
                </div>

                <label className="block text-xs text-white/60 mb-1.5">City (lowercase, matches CITY_COORDS key)</label>
                <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    disabled={isEdit}
                    placeholder="e.g. poitiers"
                    className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10 disabled:opacity-50"
                />

                <label className="block text-xs text-white/60 mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                    {TYPE_OPTIONS.map(t => (
                        <button
                            type="button"
                            key={t.value}
                            onClick={() => setType(t.value)}
                            className={`px-2 py-2 rounded-lg border text-sm transition-colors flex items-center justify-center gap-1.5 ${
                                type === t.value
                                    ? 'border-white/40 bg-white/10 text-white'
                                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                            }`}
                        >
                            <CommunityIcon type={t.value} size={16} brandColor={type === t.value} />
                            <span>{t.label}</span>
                        </button>
                    ))}
                </div>

                <label className="block text-xs text-white/60 mb-1.5">Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={80}
                    placeholder="e.g. PoGo Poitiers"
                    className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                />

                <label className="block text-xs text-white/60 mb-1.5">URL</label>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://discord.gg/..."
                    className="w-full px-3 py-2 mb-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-purple-400/50 focus:outline-none focus:bg-white/10"
                />

                {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

                <div className="flex gap-2 mt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <GradientButton
                        type="submit"
                        from="#ff5959"
                        to="#9b1212"
                        glow="220,38,38"
                        disabled={busy}
                        className="flex-1"
                    >
                        {busy ? '…' : (isEdit ? 'Save changes' : 'Add community')}
                    </GradientButton>
                </div>
            </form>
        </div>
    );
}

export default function AdminCommunities() {
    const [data, setData] = useState({ suggestions: [], approved: {} });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState(null);
    const [authState, setAuthState] = useState('checking');
    const [formModal, setFormModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', city, linkIndex, name, url, type }

    useEffect(() => {
        const user = getAdminUser();
        setAuthState(user ? 'allowed' : 'denied');
    }, []);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/community/admin', {
                cache: 'no-store',
                headers: adminHeaders(),
            });
            if (res.status === 403) throw new Error('Access denied');
            if (!res.ok) throw new Error('Failed to load');
            setData(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authState === 'allowed') refresh();
    }, [authState]);

    const act = async (action, index) => {
        setBusy(`${action}-${index}`);
        try {
            const res = await fetch('/api/community/admin', {
                method: 'POST',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ action, index }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error');
            await refresh();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    const removeApproved = async (city, linkIndex) => {
        if (!confirm(`Remove this group for ${city}?`)) return;
        setBusy(`remove-${city}-${linkIndex}`);
        try {
            const res = await fetch('/api/community/admin', {
                method: 'DELETE',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ city, linkIndex }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Error');
            await refresh();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(null);
        }
    };

    const submitForm = async ({ city, name, url, type, linkIndex }) => {
        setBusy('form');
        try {
            const isEdit = typeof linkIndex === 'number';
            const res = await fetch('/api/community/admin', {
                method: 'POST',
                headers: adminHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    action: isEdit ? 'edit' : 'add',
                    city, name, url, type,
                    ...(isEdit ? { linkIndex } : {}),
                }),
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

    const approvedCities = Object.entries(data.approved);

    return (
        <div className="min-h-screen bg-[#050510] text-white px-4 sm:px-8 py-10" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-[#ff5959] to-[#9b1212] bg-clip-text text-transparent">
                            Admin · Communities
                        </h1>
                        <p className="text-white/60 mt-1 text-sm">Manage Campfire / Discord groups by city</p>
                    </div>
                    <div className="flex gap-2">
                        <GradientButton from="#3b82f6" to="#06b6d4" glow="14,165,233" onClick={refresh}>
                            Reload
                        </GradientButton>
                        <GradientButton from="#8b5cf6" to="#a855f7" glow="168,85,247" onClick={() => setFormModal({ mode: 'add' })}>
                            + Add community
                        </GradientButton>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/15 border border-red-400/30 text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {/* Pending suggestions */}
                <section className="mb-12">
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        Pending
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-yellow-200">
                            {data.suggestions.length}
                        </span>
                    </h2>
                    {loading ? (
                        <p className="text-white/50 text-sm">Loading…</p>
                    ) : data.suggestions.length === 0 ? (
                        <p className="text-white/50 text-sm">No pending suggestions.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.suggestions.map((s, i) => (
                                <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <CommunityIcon type={s.type} size={18} />
                                                <span className="font-semibold">{s.name}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 capitalize">{s.city}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200">{s.type}</span>
                                            </div>
                                            <a href={s.url} target="_blank" rel="noopener noreferrer"
                                                className="text-xs text-cyan-300 hover:text-cyan-200 break-all underline">
                                                {s.url}
                                            </a>
                                            <p className="text-[11px] text-white/40 mt-1">
                                                Submitted {new Date(s.submittedAt).toLocaleString('en-US')}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 sm:flex-shrink-0">
                                            <GradientButton
                                                from="#10b981" to="#22c55e" glow="34,197,94"
                                                onClick={() => act('approve', i)}
                                                disabled={busy !== null}
                                            >
                                                {busy === `approve-${i}` ? '…' : 'Approve'}
                                            </GradientButton>
                                            <GradientButton
                                                from="#475569" to="#1e293b" glow="100,116,139"
                                                onClick={() => act('reject', i)}
                                                disabled={busy !== null}
                                            >
                                                {busy === `reject-${i}` ? '…' : 'Reject'}
                                            </GradientButton>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Approved by city */}
                <section>
                    <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                        Approved
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
                            {approvedCities.reduce((sum, [, links]) => sum + links.length, 0)}
                        </span>
                    </h2>
                    {approvedCities.length === 0 ? (
                        <p className="text-white/50 text-sm">No approved groups yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {approvedCities.map(([city, links]) => (
                                <div key={city} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                    <h3 className="font-semibold capitalize mb-3 text-cyan-300">{city}</h3>
                                    <div className="space-y-2">
                                        {links.map((link, idx) => (
                                            <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
                                                <CommunityIcon type={link.type} size={20} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-sm">{link.name}</div>
                                                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-cyan-400/80 hover:text-cyan-300 break-all underline">
                                                        {link.url}
                                                    </a>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <GradientButton
                                                        from="#f59e0b" to="#f97316" glow="249,115,22"
                                                        className="!px-3 !py-1.5 !text-xs"
                                                        onClick={() => setFormModal({ mode: 'edit', city, linkIndex: idx, ...link })}
                                                        disabled={busy !== null}
                                                    >
                                                        Edit
                                                    </GradientButton>
                                                    <GradientButton
                                                        from="#ef4444" to="#b91c1c" glow="239,68,68"
                                                        className="!px-3 !py-1.5 !text-xs"
                                                        onClick={() => removeApproved(city, idx)}
                                                        disabled={busy !== null}
                                                    >
                                                        {busy === `remove-${city}-${idx}` ? '…' : 'Delete'}
                                                    </GradientButton>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <p className="text-xs text-white/30 mt-12 text-center">
                    Data stored in <code className="bg-white/10 px-1.5 py-0.5 rounded">data/city_communities.json</code> and <code className="bg-white/10 px-1.5 py-0.5 rounded">data/community_suggestions.json</code>.
                </p>
            </div>

            {formModal && (
                <CommunityFormModal
                    initial={formModal.mode === 'edit' ? formModal : null}
                    onClose={() => setFormModal(null)}
                    onSubmit={submitForm}
                    busy={busy === 'form'}
                />
            )}
        </div>
    );
}
