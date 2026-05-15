'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Bot, Shield, Trash2, Send, Hash, MessageSquare, RefreshCw, AlertTriangle, CheckCircle, Calendar, Loader2, Scissors, ChevronDown, ArrowDown, Clock, Plus, X, Play, Save, ToggleLeft, ToggleRight, Pencil, Search, Link } from 'lucide-react';

const ADMIN_ID = "170297298754994177";

export default function BotDashboard() {
    const { data: session, status: sessionStatus } = useSession();
    const [botStatus, setBotStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Purge state
    const [purgeChannel, setPurgeChannel] = useState('');
    const [purgeMessages, setPurgeMessages] = useState([]);
    const [loadingPurge, setLoadingPurge] = useState(false);
    const [cutIndex, setCutIndex] = useState(null); // index where we cut: messages ABOVE this line get deleted
    const [purging, setPurging] = useState(false);
    const [purgeResult, setPurgeResult] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const cutLineRef = useRef(null);

    // Autopurge state
    const [autopurgeRules, setAutopurgeRules] = useState([]);
    const [autopurgeLastRun, setAutopurgeLastRun] = useState(null);
    const [loadingAutopurge, setLoadingAutopurge] = useState(false);
    const [savingAutopurge, setSavingAutopurge] = useState(false);
    const [autopurgeRunning, setAutopurgeRunning] = useState(false);
    const [autopurgeResult, setAutopurgeResult] = useState(null);

    // Send message state
    const [sendChannel, setSendChannel] = useState('');
    const [sendContent, setSendContent] = useState('');
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    // Edit message state
    const [editInput, setEditInput] = useState(''); // message ID or link
    const [editChannelId, setEditChannelId] = useState('');
    const [editMessageId, setEditMessageId] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editOriginal, setEditOriginal] = useState(null); // original message object
    const [editLoading, setEditLoading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editResult, setEditResult] = useState(null);

    // Channel messages viewer
    const [viewChannel, setViewChannel] = useState('');
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);

    // Rules editor (publishes a single embed to #rules on the PogoSphere
    // Discord, then edits the same message in place on subsequent saves).
    // The server-side state (messageId, channelId, lastPublishedAt) is
    // persisted in data/discord_rules.json — we only mirror the visible
    // fields locally for the form.
    const [rulesTitle, setRulesTitle] = useState('');
    const [rulesDescription, setRulesDescription] = useState('');
    const [rulesColor, setRulesColor] = useState(0x9333ea);
    const [rulesLastPublished, setRulesLastPublished] = useState(null);
    const [rulesMessageId, setRulesMessageId] = useState(null);
    const [loadingRules, setLoadingRules] = useState(false);
    const [savingRules, setSavingRules] = useState(false);
    const [publishingRules, setPublishingRules] = useState(false);
    const [rulesResult, setRulesResult] = useState(null);

    const adminHeader = { 'x-pogo-admin-user': 'lcsnzh' };

    const isAdmin = session?.user?.id === ADMIN_ID;

    useEffect(() => {
        if (isAdmin) {
            fetchBotStatus();
            fetchAutopurgeConfig();
            fetchRules();
        } else setLoading(false);
    }, [isAdmin]);

    const fetchRules = async () => {
        setLoadingRules(true);
        try {
            const res = await fetch('/api/bot/rules', { headers: adminHeader });
            if (res.ok) {
                const data = await res.json();
                setRulesTitle(data.title || '');
                setRulesDescription(data.description || '');
                setRulesColor(data.color ?? 0x9333ea);
                setRulesLastPublished(data.lastPublishedAt || null);
                setRulesMessageId(data.messageId || null);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingRules(false); }
    };

    const saveRules = async () => {
        setSavingRules(true);
        setRulesResult(null);
        try {
            const res = await fetch('/api/bot/rules', {
                method: 'PUT',
                headers: { ...adminHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: rulesTitle, description: rulesDescription, color: rulesColor }),
            });
            if (res.ok) setRulesResult({ success: 'Saved (not yet published to Discord)' });
            else setRulesResult({ error: 'Could not save: HTTP ' + res.status });
        } catch (e) { setRulesResult({ error: e.message }); }
        finally { setSavingRules(false); setTimeout(() => setRulesResult(null), 3500); }
    };

    const publishRules = async () => {
        const confirmMsg = rulesMessageId
            ? 'Update the published #rules message on Discord with the current text?'
            : 'Post the rules to #rules on Discord for the first time?';
        if (!confirm(confirmMsg)) return;
        setPublishingRules(true);
        setRulesResult(null);
        try {
            // PUT first so we don't publish with stale local edits
            await fetch('/api/bot/rules', {
                method: 'PUT',
                headers: { ...adminHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: rulesTitle, description: rulesDescription, color: rulesColor }),
            });
            const res = await fetch('/api/bot/rules', { method: 'POST', headers: adminHeader });
            const data = await res.json();
            if (res.ok) {
                setRulesMessageId(data.messageId);
                setRulesLastPublished(new Date().toISOString());
                setRulesResult({ success: rulesMessageId ? 'Updated existing message on Discord' : 'Posted to #rules on Discord' });
            } else {
                setRulesResult({ error: data.error || 'Publish failed: HTTP ' + res.status });
            }
        } catch (e) { setRulesResult({ error: e.message }); }
        finally { setPublishingRules(false); setTimeout(() => setRulesResult(null), 5000); }
    };

    const fetchAutopurgeConfig = async () => {
        setLoadingAutopurge(true);
        try {
            const res = await fetch('/api/bot/autopurge');
            if (res.ok) {
                const data = await res.json();
                setAutopurgeRules(data.rules || []);
                setAutopurgeLastRun(data.lastRun);
            }
        } catch (e) { console.error(e); }
        finally { setLoadingAutopurge(false); }
    };

    const saveAutopurgeConfig = async () => {
        setSavingAutopurge(true);
        try {
            const res = await fetch('/api/bot/autopurge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules: autopurgeRules })
            });
            if (res.ok) setAutopurgeResult({ success: 'Configuration sauvegardee !' });
            else setAutopurgeResult({ error: 'Erreur lors de la sauvegarde' });
        } catch (e) { setAutopurgeResult({ error: e.message }); }
        finally { setSavingAutopurge(false); setTimeout(() => setAutopurgeResult(null), 3000); }
    };

    const runAutopurgeNow = async () => {
        if (!confirm('Lancer la purge automatique maintenant pour tous les salons actifs ?')) return;
        setAutopurgeRunning(true);
        setAutopurgeResult(null);
        try {
            const res = await fetch('/api/bot/autopurge', { method: 'PUT' });
            const data = await res.json();
            setAutopurgeResult({
                success: `Purge terminee ! ${data.results?.reduce((s, r) => s + r.deleted, 0) || 0} messages supprimes.`
            });
            setAutopurgeLastRun(data.lastRun);
        } catch (e) { setAutopurgeResult({ error: e.message }); }
        finally { setAutopurgeRunning(false); }
    };

    const addAutopurgeRule = (channelId) => {
        if (!channelId || autopurgeRules.find(r => r.channelId === channelId)) return;
        const ch = botStatus?.channels?.find(c => c.id === channelId);
        setAutopurgeRules([...autopurgeRules, {
            channelId,
            channelName: ch?.name || channelId,
            keepDays: 30,
            enabled: true
        }]);
    };

    const updateRule = (index, field, value) => {
        const updated = [...autopurgeRules];
        updated[index] = { ...updated[index], [field]: value };
        setAutopurgeRules(updated);
    };

    const removeRule = (index) => {
        setAutopurgeRules(autopurgeRules.filter((_, i) => i !== index));
    };

    const fetchBotStatus = async () => {
        try {
            const res = await fetch('/api/bot/status');
            if (res.ok) setBotStatus(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Purge: load ALL messages from channel (paginated)
    const fetchAllMessages = async (channelId) => {
        if (!channelId) return;
        setLoadingPurge(true);
        setPurgeMessages([]);
        setCutIndex(null);
        setPurgeResult(null);

        let allMsgs = [];
        let lastId = null;

        while (true) {
            let url = `/api/bot/channels?channelId=${channelId}&limit=50`;
            if (lastId) url += `&before=${lastId}`;
            const res = await fetch(url);
            if (!res.ok) break;
            const batch = await res.json();
            if (!Array.isArray(batch) || batch.length === 0) break;
            allMsgs = [...allMsgs, ...batch];
            lastId = batch[batch.length - 1].id;
            // Safety: max 500 messages
            if (allMsgs.length >= 500) break;
        }

        // Reverse to show oldest first (top) → newest last (bottom)
        setPurgeMessages(allMsgs.reverse());
        setLoadingPurge(false);
    };

    const handlePurge = async () => {
        if (cutIndex === null || !purgeChannel) return;
        const toDelete = purgeMessages.slice(0, cutIndex);
        const toKeep = purgeMessages.slice(cutIndex);

        if (!confirm(
            `Tu vas supprimer ${toDelete.length} message(s) et garder ${toKeep.length} message(s).\n\nContinuer ?`
        )) return;

        setPurging(true);
        setPurgeResult(null);

        // Use the timestamp of the first kept message as the cutoff
        const cutoffDate = toKeep[0]?.timestamp;

        try {
            const res = await fetch('/api/bot/purge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: purgeChannel, beforeDate: cutoffDate })
            });
            const data = await res.json();
            setPurgeResult(data);
            // Refresh messages
            if (!data.error) fetchAllMessages(purgeChannel);
        } catch (e) {
            setPurgeResult({ error: e.message });
        } finally {
            setPurging(false);
        }
    };

    const fetchMessages = async (channelId) => {
        if (!channelId) return;
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/bot/channels?channelId=${channelId}&limit=30`);
            if (res.ok) setMessages(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoadingMessages(false); }
    };

    const handleSend = async () => {
        if (!sendChannel || !sendContent) return;
        setSending(true);
        setSendResult(null);
        try {
            const res = await fetch('/api/bot/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: sendChannel, content: sendContent })
            });
            const data = await res.json();
            setSendResult(data);
            if (data.success) setSendContent('');
        } catch (e) { setSendResult({ error: e.message }); }
        finally { setSending(false); }
    };

    // Parse Discord message link or raw ID
    const parseMessageInput = (input) => {
        const trimmed = input.trim();
        // Discord link format: https://discord.com/channels/{guildId}/{channelId}/{messageId}
        const linkMatch = trimmed.match(/discord\.com\/channels\/\d+\/(\d+)\/(\d+)/);
        if (linkMatch) return { channelId: linkMatch[1], messageId: linkMatch[2] };
        // Raw message ID — need a channel to be selected
        if (/^\d+$/.test(trimmed)) return { channelId: null, messageId: trimmed };
        return null;
    };

    const handleFetchMessage = async () => {
        const parsed = parseMessageInput(editInput);
        if (!parsed) { setEditResult({ error: "Format invalide. Utilisez un lien Discord ou un ID de message." }); return; }

        const channelId = parsed.channelId || editChannelId;
        if (!channelId) { setEditResult({ error: "Selectionnez un salon ou utilisez un lien Discord complet." }); return; }

        setEditLoading(true);
        setEditResult(null);
        setEditOriginal(null);
        setEditContent('');

        try {
            const res = await fetch(`/api/bot/message?channelId=${channelId}&messageId=${parsed.messageId}`);
            const data = await res.json();
            if (data.error) { setEditResult({ error: data.error }); }
            else {
                setEditOriginal(data);
                setEditContent(data.content || '');
                setEditChannelId(channelId);
                setEditMessageId(parsed.messageId);
            }
        } catch (e) { setEditResult({ error: e.message }); }
        finally { setEditLoading(false); }
    };

    const handleEdit = async () => {
        if (!editChannelId || !editMessageId || !editContent) return;
        setEditing(true);
        setEditResult(null);
        try {
            const res = await fetch('/api/bot/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId: editChannelId, messageId: editMessageId, content: editContent })
            });
            const data = await res.json();
            setEditResult(data);
            if (data.success) {
                setEditOriginal(prev => prev ? { ...prev, content: editContent } : prev);
            }
        } catch (e) { setEditResult({ error: e.message }); }
        finally { setEditing(false); }
    };

    const resetEdit = () => {
        setEditInput('');
        setEditChannelId('');
        setEditMessageId('');
        setEditContent('');
        setEditOriginal(null);
        setEditResult(null);
    };

    // Auth screens
    if (sessionStatus === 'loading') {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center max-w-md backdrop-blur-md">
                    <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Acces restreint</h1>
                    <p className="text-gray-400 mb-6">Connecte-toi avec Discord pour acceder au dashboard bot.</p>
                    <button
                        onClick={() => signIn('discord', { callbackUrl: '/bot' })}
                        className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto"
                    >
                        <svg width="20" height="20" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.3 37.3 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32.2.3 45.5v.1a58.8 58.8 0 0017.9 9.1.2.2 0 00.3-.1 42.1 42.1 0 003.6-5.9.2.2 0 00-.1-.3 38.8 38.8 0 01-5.5-2.7.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 42 42 0 0035.8 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .4 36.4 36.4 0 01-5.5 2.7.2.2 0 00-.1.3 47.3 47.3 0 003.6 5.9.2.2 0 00.3.1A58.6 58.6 0 0070.3 45.6v-.1C71.7 30.1 67.8 16.7 60.2 5a.2.2 0 00-.1-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2c3.6 0 6.5 3.3 6.4 7.2 0 4-2.8 7.2-6.4 7.2z"/></svg>
                        Connexion Discord
                    </button>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="bg-white/5 border border-red-500/30 rounded-2xl p-10 text-center max-w-md">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Acces interdit</h1>
                    <p className="text-gray-400">Ce dashboard est reserve a l'administrateur du serveur.</p>
                    <p className="text-gray-600 text-sm mt-4">Connecte en tant que : {session.user.name}</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Bot },
        { id: 'rules', label: 'Rules Editor', icon: Shield },
        { id: 'purge', label: 'Visual Purge', icon: Scissors },
        { id: 'autopurge', label: 'Auto Purge', icon: Clock },
        { id: 'send', label: 'Send Message', icon: Send },
        { id: 'edit', label: 'Edit Message', icon: Pencil },
        { id: 'channels', label: 'Browse Channels', icon: MessageSquare },
    ];

    const deleteCount = cutIndex !== null ? cutIndex : 0;
    const keepCount = cutIndex !== null ? purgeMessages.length - cutIndex : purgeMessages.length;

    return (
        <div className="min-h-screen bg-black text-white pt-20">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-600/20 p-3 rounded-xl border border-purple-500/30">
                            <Bot className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Bot Dashboard
                            </h1>
                            <p className="text-gray-500 text-sm">PogoSphere bot management</p>
                        </div>
                    </div>
                    <button onClick={fetchBotStatus} className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors">
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                activeTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Bot size={16} /> Bot status</h3>
                            {loading ? <Loader2 className="w-6 h-6 text-purple-500 animate-spin" /> : botStatus?.online ? (
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                        <span className="text-green-400 font-bold">REST API reachable</span>
                                    </div>
                                    <p className="text-gray-500 text-[11px] mb-3">Posting / editing works. Gateway presence (the green dot in Discord member list) is separate and requires a running bot process.</p>
                                    <p className="text-white font-medium">{botStatus.bot?.username}</p>
                                    <p className="text-gray-500 text-xs mt-1">ID: {botStatus.bot?.id}</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full" /><span className="text-red-400 font-bold">REST API unreachable</span>
                                </div>
                            )}
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Shield size={16} /> Server</h3>
                            {botStatus?.guild ? (
                                <div>
                                    <p className="text-white font-medium text-lg">{botStatus.guild.name}</p>
                                    <p className="text-gray-500 text-sm mt-1">{botStatus.guild.memberCount} members</p>
                                </div>
                            ) : <p className="text-gray-600">Loading...</p>}
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Hash size={16} /> Text channels</h3>
                            <p className="text-white text-3xl font-bold">{botStatus?.channels?.length || 0}</p>
                            <p className="text-gray-500 text-sm mt-1">accessible channels</p>
                        </div>
                        <div className="md:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 mb-4">Channel list</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {botStatus?.channels?.map(ch => (
                                    <div key={ch.id} className="bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-sm">
                                        <span className="text-gray-500">#</span> {ch.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Rules Editor Tab */}
                {activeTab === 'rules' && (
                    <div className="max-w-3xl space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Shield size={20} className="text-purple-400" />
                                        Server Rules Embed
                                    </h2>
                                    <p className="text-gray-500 text-sm mt-1">
                                        Edit the rules message shown in #rules on the PogoSphere Discord server.
                                        Saving stores the text on PogoSphere. <strong>Publishing</strong> sends it as
                                        an embed to Discord — subsequent publishes edit the same message in place.
                                    </p>
                                </div>
                            </div>
                            {rulesLastPublished && (
                                <p className="text-xs text-gray-600 mt-2">
                                    Last published to Discord: {new Date(rulesLastPublished).toLocaleString()}
                                    {rulesMessageId && <> · message id <code className="text-gray-400">{rulesMessageId}</code></>}
                                </p>
                            )}
                        </div>

                        {loadingRules ? (
                            <div className="flex items-center gap-3 text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin" /> Loading current rules…
                            </div>
                        ) : (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Embed title</label>
                                    <input
                                        type="text"
                                        value={rulesTitle}
                                        onChange={(e) => setRulesTitle(e.target.value)}
                                        maxLength={256}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500/50"
                                        placeholder="Please follow these rules…"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">{rulesTitle.length} / 256</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Embed body (markdown allowed — bold *text*, line breaks preserved)
                                    </label>
                                    <textarea
                                        value={rulesDescription}
                                        onChange={(e) => setRulesDescription(e.target.value)}
                                        maxLength={4096}
                                        rows={18}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono leading-relaxed focus:outline-none focus:border-purple-500/50"
                                        placeholder="🔹 Rule 1…"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">{rulesDescription.length} / 4096</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Embed accent color</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={'#' + rulesColor.toString(16).padStart(6, '0')}
                                            onChange={(e) => setRulesColor(parseInt(e.target.value.slice(1), 16))}
                                            className="w-12 h-12 rounded-lg cursor-pointer bg-black/40 border border-white/10"
                                        />
                                        <code className="text-gray-400 text-sm">#{rulesColor.toString(16).padStart(6, '0')}</code>
                                    </div>
                                </div>

                                {rulesResult && (
                                    <div className={`text-sm px-4 py-2.5 rounded-xl border ${
                                        rulesResult.success
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        {rulesResult.success ? <CheckCircle size={16} className="inline mr-1.5" /> : <AlertTriangle size={16} className="inline mr-1.5" />}
                                        {rulesResult.success || rulesResult.error}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                                    <button
                                        onClick={saveRules}
                                        disabled={savingRules}
                                        className="bg-white/10 hover:bg-white/15 disabled:opacity-50 border border-white/10 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
                                    >
                                        {savingRules ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Save draft
                                    </button>
                                    <button
                                        onClick={publishRules}
                                        disabled={publishingRules || !rulesTitle.trim() || !rulesDescription.trim()}
                                        className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/30"
                                    >
                                        {publishingRules ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        {rulesMessageId ? 'Update on Discord' : 'Publish to #rules'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Purge Tab - Visual */}
                {activeTab === 'purge' && (
                    <div className="max-w-3xl">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                <Scissors size={20} className="text-red-400" /> Purge visuelle
                            </h3>
                            <p className="text-gray-500 text-sm mb-6">Selectionne un salon, puis clique entre deux messages pour placer la ligne de coupure.</p>

                            {/* Channel selector */}
                            <select
                                value={purgeChannel}
                                onChange={(e) => {
                                    setPurgeChannel(e.target.value);
                                    if (e.target.value) fetchAllMessages(e.target.value);
                                }}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 mb-4"
                            >
                                <option value="">Selectionner un salon...</option>
                                {botStatus?.channels?.map(ch => (
                                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                                ))}
                            </select>

                            {/* Loading */}
                            {loadingPurge && (
                                <div className="text-center py-12">
                                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">Chargement des messages...</p>
                                </div>
                            )}

                            {/* Messages list with cut line */}
                            {!loadingPurge && purgeMessages.length > 0 && (
                                <>
                                    {/* Stats bar */}
                                    {cutIndex !== null && (
                                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4">
                                            <div className="flex items-center gap-4">
                                                <span className="text-red-400 font-bold text-sm">{deleteCount} a supprimer</span>
                                                <span className="text-gray-600">|</span>
                                                <span className="text-green-400 font-bold text-sm">{keepCount} a conserver</span>
                                            </div>
                                            <button
                                                onClick={handlePurge}
                                                disabled={purging || deleteCount === 0}
                                                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                                            >
                                                {purging ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                {purging ? 'Suppression...' : 'Supprimer'}
                                            </button>
                                        </div>
                                    )}

                                    {purgeResult && (
                                        <div className={`p-4 rounded-xl border mb-4 ${purgeResult.error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                            {purgeResult.error ? (
                                                <p className="flex items-center gap-2"><AlertTriangle size={16} /> {purgeResult.error}</p>
                                            ) : (
                                                <p className="flex items-center gap-2"><CheckCircle size={16} /> {purgeResult.deleted} messages supprimes avec succes !</p>
                                            )}
                                        </div>
                                    )}

                                    <p className="text-xs text-gray-600 mb-3 flex items-center gap-1">
                                        <ArrowDown size={12} /> Les plus anciens sont en haut. Clique entre deux messages pour placer la coupure.
                                    </p>

                                    <div className="max-h-[600px] overflow-y-auto pr-1 space-y-0">
                                        {purgeMessages.map((msg, i) => (
                                            <div key={msg.id}>
                                                {/* Clickable cut zone BEFORE this message */}
                                                <button
                                                    onClick={() => setCutIndex(i)}
                                                    className={`w-full group relative py-1 transition-all ${
                                                        cutIndex === i ? 'py-2' : 'hover:py-2'
                                                    }`}
                                                >
                                                    <div className={`w-full h-0.5 rounded transition-all ${
                                                        cutIndex === i
                                                            ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                                                            : 'bg-transparent group-hover:bg-red-500/40'
                                                    }`} />
                                                    {cutIndex === i && (
                                                        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg z-10">
                                                            <Scissors size={12} /> Coupure ici — {i} message{i > 1 ? 's' : ''} au-dessus
                                                        </div>
                                                    )}
                                                </button>

                                                {/* Message */}
                                                <div className={`rounded-lg px-4 py-3 transition-all border ${
                                                    cutIndex !== null && i < cutIndex
                                                        ? 'bg-red-500/5 border-red-500/20 opacity-60'
                                                        : 'bg-black/30 border-white/5'
                                                }`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {msg.author.avatar ? (
                                                            <img
                                                                src={`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=32`}
                                                                alt=""
                                                                className="w-5 h-5 rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full bg-gray-700" />
                                                        )}
                                                        <span className="font-medium text-xs text-purple-300">
                                                            {msg.author.global_name || msg.author.username}
                                                        </span>
                                                        <span className="text-xs text-gray-600">
                                                            {new Date(msg.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {cutIndex !== null && i < cutIndex && (
                                                            <span className="text-xs text-red-400 ml-auto font-bold">SUPPRIME</span>
                                                        )}
                                                        {cutIndex !== null && i >= cutIndex && (
                                                            <span className="text-xs text-green-400 ml-auto font-bold">CONSERVE</span>
                                                        )}
                                                    </div>
                                                    {msg.content && (
                                                        <p className="text-gray-300 text-sm ml-7 line-clamp-2">{msg.content}</p>
                                                    )}
                                                    {!msg.content && msg.embeds?.length > 0 && (
                                                        <p className="text-gray-500 text-sm ml-7 italic">
                                                            [Embed] {msg.embeds[0].title || msg.embeds[0].description?.slice(0, 60) || 'Contenu integre'}
                                                        </p>
                                                    )}
                                                    {!msg.content && !msg.embeds?.length && msg.attachments?.length > 0 && (
                                                        <p className="text-gray-500 text-sm ml-7 italic">📎 {msg.attachments.length} piece(s) jointe(s)</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <p className="text-center text-gray-600 text-xs mt-3">{purgeMessages.length} messages charges</p>
                                </>
                            )}

                            {!loadingPurge && purgeChannel && purgeMessages.length === 0 && (
                                <p className="text-center text-gray-600 py-12">Aucun message dans ce salon</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Autopurge Tab */}
                {activeTab === 'autopurge' && (
                    <div className="max-w-3xl">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Clock size={20} className="text-orange-400" /> Purge automatique
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={runAutopurgeNow}
                                        disabled={autopurgeRunning || autopurgeRules.filter(r => r.enabled).length === 0}
                                        className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                                    >
                                        {autopurgeRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                        {autopurgeRunning ? 'En cours...' : 'Lancer maintenant'}
                                    </button>
                                    <button
                                        onClick={saveAutopurgeConfig}
                                        disabled={savingAutopurge}
                                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                                    >
                                        {savingAutopurge ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                        Sauvegarder
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-500 text-sm mb-6">
                                Configure les salons a nettoyer automatiquement. Le bot supprime les messages plus anciens que le nombre de jours defini, chaque jour a 4h du matin.
                            </p>

                            {autopurgeLastRun && (
                                <p className="text-xs text-gray-600 mb-4">
                                    Derniere execution : {new Date(autopurgeLastRun).toLocaleString('fr-FR')}
                                </p>
                            )}

                            {autopurgeResult && (
                                <div className={`p-3 rounded-xl border mb-4 text-sm ${autopurgeResult.error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                    <p className="flex items-center gap-2">
                                        {autopurgeResult.error ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
                                        {autopurgeResult.error || autopurgeResult.success}
                                    </p>
                                </div>
                            )}

                            {/* Rules list */}
                            <div className="space-y-3 mb-6">
                                {autopurgeRules.map((rule, i) => (
                                    <div key={rule.channelId} className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                                        rule.enabled ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'
                                    }`}>
                                        {/* Toggle */}
                                        <button onClick={() => updateRule(i, 'enabled', !rule.enabled)} className="shrink-0">
                                            {rule.enabled
                                                ? <ToggleRight size={28} className="text-green-400" />
                                                : <ToggleLeft size={28} className="text-gray-600" />
                                            }
                                        </button>

                                        {/* Channel name */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">
                                                <span className="text-gray-500">#</span>{rule.channelName}
                                            </p>
                                        </div>

                                        {/* Days input */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs text-gray-500">Garder</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={rule.keepDays}
                                                onChange={(e) => updateRule(i, 'keepDays', parseInt(e.target.value) || 1)}
                                                className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:border-purple-500"
                                            />
                                            <span className="text-xs text-gray-500">jours</span>
                                        </div>

                                        {/* Remove */}
                                        <button
                                            onClick={() => removeRule(i)}
                                            className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))}

                                {autopurgeRules.length === 0 && (
                                    <div className="text-center py-8 text-gray-600">
                                        <Clock size={32} className="mx-auto mb-3 opacity-30" />
                                        <p>Aucun salon configure. Ajoute un salon ci-dessous.</p>
                                    </div>
                                )}
                            </div>

                            {/* Add channel */}
                            <div className="flex items-center gap-3">
                                <select
                                    id="addAutopurgeChannel"
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 text-sm"
                                    defaultValue=""
                                >
                                    <option value="">Ajouter un salon...</option>
                                    {botStatus?.channels
                                        ?.filter(ch => !autopurgeRules.find(r => r.channelId === ch.id))
                                        .map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)
                                    }
                                </select>
                                <button
                                    onClick={() => {
                                        const sel = document.getElementById('addAutopurgeChannel');
                                        if (sel?.value) {
                                            addAutopurgeRule(sel.value);
                                            sel.value = '';
                                        }
                                    }}
                                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium shrink-0"
                                >
                                    <Plus size={16} /> Ajouter
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Send Message Tab */}
                {activeTab === 'send' && (
                    <div className="max-w-2xl">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Send size={20} className="text-blue-400" /> Envoyer un message
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Salon</label>
                                    <select value={sendChannel} onChange={(e) => setSendChannel(e.target.value)}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500">
                                        <option value="">Selectionner un salon...</option>
                                        {botStatus?.channels?.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Message</label>
                                    <textarea value={sendContent} onChange={(e) => setSendContent(e.target.value)} rows={5}
                                        placeholder="Tapez votre message ici... (Markdown Discord supporte)"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 resize-none" />
                                </div>
                                <button onClick={handleSend} disabled={sending || !sendChannel || !sendContent}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2">
                                    {sending ? <><Loader2 size={18} className="animate-spin" /> Envoi...</> : <><Send size={18} /> Envoyer</>}
                                </button>
                                {sendResult && (
                                    <div className={`p-4 rounded-xl border ${sendResult.error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                        {sendResult.error
                                            ? <p className="flex items-center gap-2"><AlertTriangle size={16} /> {sendResult.error}</p>
                                            : <p className="flex items-center gap-2"><CheckCircle size={16} /> Message envoye !</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Message Tab */}
                {activeTab === 'edit' && (
                    <div className="max-w-2xl">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Pencil size={20} className="text-amber-400" /> Editer un message
                            </h3>
                            <div className="space-y-4">
                                {/* Input: message link or ID */}
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2 flex items-center gap-1.5">
                                        <Link size={14} /> Lien ou ID du message
                                    </label>
                                    <input
                                        type="text"
                                        value={editInput}
                                        onChange={(e) => setEditInput(e.target.value)}
                                        placeholder="https://discord.com/channels/.../...  ou  123456789012345678"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-sm font-mono"
                                    />
                                    <p className="text-xs text-gray-600 mt-1">
                                        Collez un lien Discord complet ou un ID de message (si ID, selectionnez le salon ci-dessous)
                                    </p>
                                </div>

                                {/* Channel selector (only needed if raw ID) */}
                                {editInput && !/discord\.com/.test(editInput) && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-2">Salon (requis si ID seul)</label>
                                        <select value={editChannelId} onChange={(e) => setEditChannelId(e.target.value)}
                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500">
                                            <option value="">Selectionner un salon...</option>
                                            {botStatus?.channels?.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {/* Fetch button */}
                                <button onClick={handleFetchMessage} disabled={editLoading || !editInput}
                                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2">
                                    {editLoading ? <><Loader2 size={18} className="animate-spin" /> Chargement...</> : <><Search size={18} /> Charger le message</>}
                                </button>

                                {/* Original message preview */}
                                {editOriginal && (
                                    <div className="border border-white/10 rounded-xl overflow-hidden">
                                        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {editOriginal.author?.avatar && (
                                                    <img src={`https://cdn.discordapp.com/avatars/${editOriginal.author.id}/${editOriginal.author.avatar}.png?size=32`}
                                                        alt="" className="w-5 h-5 rounded-full" />
                                                )}
                                                <span className="text-sm font-medium text-purple-300">
                                                    {editOriginal.author?.global_name || editOriginal.author?.username}
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    {new Date(editOriginal.timestamp).toLocaleString('fr-FR')}
                                                </span>
                                            </div>
                                            <button onClick={resetEdit} className="text-gray-500 hover:text-white transition-colors" title="Annuler">
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Editable content */}
                                        <div className="p-4 space-y-3">
                                            <label className="block text-sm text-gray-400">Nouveau contenu</label>
                                            <textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                rows={8}
                                                placeholder="Nouveau contenu du message..."
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 resize-none text-sm"
                                            />
                                            <div className="flex items-center gap-3">
                                                <button onClick={handleEdit} disabled={editing || !editContent || editContent === editOriginal?.content}
                                                    className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2">
                                                    {editing ? <><Loader2 size={18} className="animate-spin" /> Modification...</> : <><Pencil size={18} /> Modifier</>}
                                                </button>
                                                <button onClick={resetEdit}
                                                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 px-6 py-3 rounded-xl transition-colors text-sm">
                                                    Annuler
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Result feedback */}
                                {editResult && (
                                    <div className={`p-4 rounded-xl border ${editResult.error ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                                        {editResult.error
                                            ? <p className="flex items-center gap-2"><AlertTriangle size={16} /> {editResult.error}</p>
                                            : <p className="flex items-center gap-2"><CheckCircle size={16} /> Message modifie avec succes !</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Channel Viewer Tab */}
                {activeTab === 'channels' && (
                    <div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <select value={viewChannel}
                                    onChange={(e) => { setViewChannel(e.target.value); if (e.target.value) fetchMessages(e.target.value); }}
                                    className="bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 flex-1">
                                    <option value="">Selectionner un salon...</option>
                                    {botStatus?.channels?.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                                </select>
                                {viewChannel && (
                                    <button onClick={() => fetchMessages(viewChannel)} className="bg-white/10 hover:bg-white/20 px-4 py-3 rounded-xl transition-colors">
                                        <RefreshCw size={16} />
                                    </button>
                                )}
                            </div>
                            {loadingMessages ? (
                                <div className="text-center py-12"><Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" /></div>
                            ) : messages.length > 0 ? (
                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                    {messages.map(msg => (
                                        <div key={msg.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                {msg.author.avatar && <img src={`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=32`} alt="" className="w-6 h-6 rounded-full" />}
                                                <span className="font-medium text-sm text-purple-300">{msg.author.global_name || msg.author.username}</span>
                                                <span className="text-xs text-gray-600">{new Date(msg.timestamp).toLocaleString('fr-FR')}</span>
                                            </div>
                                            {msg.content && <p className="text-gray-300 text-sm">{msg.content}</p>}
                                            {msg.embeds?.length > 0 && (
                                                <div className="mt-2 bg-white/5 rounded-lg p-3 border-l-4 border-purple-500">
                                                    {msg.embeds[0].title && <p className="font-bold text-sm">{msg.embeds[0].title}</p>}
                                                    {msg.embeds[0].description && <p className="text-gray-400 text-xs mt-1">{msg.embeds[0].description.slice(0, 200)}...</p>}
                                                </div>
                                            )}
                                            {msg.attachments?.length > 0 && <p className="text-xs text-gray-500 mt-1">📎 {msg.attachments.length} piece(s) jointe(s)</p>}
                                        </div>
                                    ))}
                                </div>
                            ) : viewChannel ? (
                                <p className="text-center text-gray-600 py-12">Aucun message dans ce salon</p>
                            ) : (
                                <p className="text-center text-gray-600 py-12">Selectionnez un salon pour voir les messages</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
