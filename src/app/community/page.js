'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, Camera, MessageSquare, ExternalLink } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import ReportBlockButtons from '@/components/ReportBlockButtons';

export default function CommunautePage() {
    const { data: session } = useSession();
    const { t, lang } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [blockedUsers, setBlockedUsers] = useState([]);

    const isAdmin = session?.user?.name === 'lcsnzh';

    // Fetch blocked users list
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/block');
                if (res.ok) {
                    const data = await res.json();
                    setBlockedUsers((data.blocked || []).map(u => u.toLowerCase()));
                }
            } catch { /* not logged in */ }
        })();
    }, []);

    // Per-locale captions; EN/JA fall back to FR if missing.
    const photoSources = [
        {
            src: '/photos/photo-5.jpg',
            fr: "Photo de l’événement Finale Max — 23/08/2025",
            en: "Photo from the Max Finale Event — 23/08/2025",
            ja: "マックスフィナーレイベントの写真 — 23/08/2025",
        },
        {
            src: '/photos/photo-2.jpg',
            fr: "Photo de l’Heure de Raids Zamazenta — 22/08/2025",
            en: "Photo from the Zamazenta Raid Hour — 22/08/2025",
            ja: "ザマゼンタのレイドアワーの写真 — 22/08/2025",
        },
        {
            src: '/photos/photo-3.jpg',
            fr: "Photo du Pokémon Go Fest 2025 — 29/06/2025",
            en: "Photo from Pokémon Go Fest 2025 — 29/06/2025",
            ja: "Pokémon Go Fest 2025の写真 — 29/06/2025",
            className: "sepia-[.25] saturate-[1.2] contrast-[1.1]",
        },
        {
            src: '/photos/photo-4.jpg',
            fr: "Photo de l’Heure de Raids Necrozma — 27/08/2025",
            en: "Photo from the Necrozma Raid Hour — 27/08/2025",
            ja: "ネクロズマのレイドアワーの写真 — 27/08/2025",
            position: "object-[center_95%]",
        },
        {
            src: '/photos/photo-6.jpg',
            fr: "Photo de l’Heure de Raids Zamazenta — 22/08/2025",
            en: "Photo from the Zamazenta Raid Hour — 22/08/2025",
            ja: "ザマゼンタのレイドアワーの写真 — 22/08/2025",
            position: "object-[center_70%]",
        },
        {
            src: '/photos/photo-7.jpg',
            fr: "Photo de la journée Lokhlass Gigamax — 19/07/2025",
            en: "Photo from the Lapras Gigantamax Day — 19/07/2025",
            ja: "ラプラスのキョダイマックスデーの写真 — 19/07/2025",
        }
    ];
    const photos = photoSources.map((p) => ({
        ...p,
        caption: p[lang] || p.fr,
    }));

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch('/api/presentations');
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || t('community.loadError'));
                }
                const data = await res.json();
                setMessages(data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, []);

    const formatRelativeTime = (isoString) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return t('community.justNow');
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return t('community.minutesAgo', { count: diffInMinutes });
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('community.hoursAgo', { count: diffInHours });
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return t('community.daysAgo', { count: diffInDays });
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return t('community.monthsAgo', { count: diffInMonths });
        return t('community.yearsAgo', { count: Math.floor(diffInMonths / 12) });
    };

    const formatDiscordText = (text) => {
        if (!text) return null;

        return text.split('\n').map((line, lineIdx) => {
            if (line.startsWith('> ')) {
                return (
                    <blockquote key={lineIdx} className="border-l-4 border-slate-500 pl-2 italic my-1">
                        {parseInlineFormatting(line.slice(2))}
                    </blockquote>
                );
            }
            return (
                <div key={lineIdx} className="min-h-[1.2rem]">
                    {parseInlineFormatting(line)}
                </div>
            );
        });
    };

    const parseInlineFormatting = (text) => {
        const parts = [];
        let remaining = text;
        let key = 0;

        while (remaining) {
            const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
            const codeMatch = remaining.match(/`(.*?)`/);
            const underMatch = remaining.match(/__(.*?)__/);
            const strikeMatch = remaining.match(/~~(.*?)~~/);
            const urlMatch = remaining.match(/https?:\/\/\S+/);

            const matches = [
                { type: 'bold', m: boldMatch },
                { type: 'code', m: codeMatch },
                { type: 'under', m: underMatch },
                { type: 'strike', m: strikeMatch },
                { type: 'url', m: urlMatch }
            ].filter(x => x.m && x.m.index !== undefined).sort((a, b) => a.m.index - b.m.index);

            if (matches.length === 0) {
                parts.push(remaining);
                break;
            }

            const best = matches[0];
            const match = best.m;

            if (match.index > 0) {
                parts.push(remaining.slice(0, match.index));
            }

            if (best.type === 'bold') parts.push(<strong key={key++} className="font-bold text-indigo-300">{match[1]}</strong>);
            if (best.type === 'code') parts.push(<code key={key++} className="bg-slate-800 px-1 rounded font-mono text-sm">{match[1]}</code>);
            if (best.type === 'under') parts.push(<u key={key++}>{match[1]}</u>);
            if (best.type === 'strike') parts.push(<s key={key++}>{match[1]}</s>);
            if (best.type === 'url') parts.push(<a key={key++} href={match[0]} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{match[0]}</a>);

            remaining = remaining.slice(match.index + match[0].length);
        }
        return parts;
    };

    const handleDelete = async (id) => {
        if (!confirm(t('community.confirmDelete'))) return;

        try {
            const res = await fetch('/api/admin/presentations', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== id));
            } else {
                alert(t('community.deleteError'));
            }
        } catch (e) {
            console.error(e);
            alert(t('community.serverError'));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-2 md:px-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 text-center">
                    <h1
                        className="text-4xl md:text-5xl font-extrabold uppercase tracking-normal bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] py-2 [word-spacing:0.5rem]"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {t('community.title')}
                    </h1>
                </header>

                {/* --- PHOTOS SECTION (TOP) --- */}
                <section className="mb-20">
                    <div className="flex items-center gap-3 mb-8 px-4">
                        <Camera className="text-red-500" size={28} />
                        <h2 className="text-2xl font-bold uppercase tracking-tight">{t('community.eventPhotos')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
                        {photos.map((photo, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="relative aspect-[16/10] group overflow-hidden rounded-3xl border border-white/10 bg-white/5 cursor-pointer shadow-2xl"
                                onClick={() => setSelectedImage(photo)}
                            >
                                <Image
                                    src={photo.src}
                                    alt={t('community.communityPhoto', { index: index + 1 })}
                                    fill
                                    className={`object-cover transition-transform duration-700 group-hover:scale-105 ${photo.position || ''} ${photo.className || ''}`}
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent opacity-100 group-hover:from-black/90 transition-all duration-500">
                                    <div className="absolute top-0 left-0 right-0 p-4 md:p-6 text-left">
                                        <div className="flex items-stretch gap-3">
                                            <div className="w-1 bg-red-600 rounded-full" />
                                            <div>
                                                <p className="text-white font-bold text-sm md:text-base leading-tight drop-shadow-md">{photo.caption.split(' — ')[0]}</p>
                                                {photo.caption.includes(' — ') && (
                                                    <p className="text-red-400 font-mono text-[10px] md:text-xs mt-1 tracking-widest">{photo.caption.split(' — ')[1]}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* --- PRESENTATIONS SECTION (BOTTOM) --- */}
                <section className="border-t border-white/10 pt-16">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 px-4">
                        <div className="flex items-center gap-3">
                            <MessageSquare className="text-indigo-500" size={28} />
                            <h2 className="text-2xl font-bold uppercase tracking-tight">{t('community.memberPresentations')}</h2>
                        </div>
                        <a
                            href="https://discord.com/channels/406517157543804928/1409537229566775387"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2.5 bg-gradient-to-b from-[#6d78f5] to-[#4752C4] text-white font-semibold rounded-full transition-all duration-300 shadow-[0_4px_15px_rgba(88,101,242,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_25px_rgba(88,101,242,0.8),inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center gap-2 transform hover:scale-105 hover:-translate-y-0.5 text-sm md:text-base uppercase tracking-wider"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 14.178 14.178 0 00-.636 1.314 18.244 18.244 0 00-5.435 0 14.56 14.56 0 00-.64-1.314.077.077 0 00-.078-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                            </svg>
                            {t('community.introduceOnDiscord')}
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                        {messages.length === 0 ? (
                            <div className="col-span-full text-center py-20">
                                <div className="text-slate-500 text-lg italic bg-white/5 p-12 rounded-3xl border border-white/10 max-w-md mx-auto">
                                    {t('community.noPresentations')}
                                </div>
                            </div>
                        ) : (
                            messages.filter(msg => !blockedUsers.includes(msg.author.username?.toLowerCase())).map((msg) => {
                                const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'];
                                const colorIndex = msg.author.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
                                const userColor = colors[colorIndex];

                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        className="relative border border-white/10 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 group flex flex-col overflow-hidden bg-white/[0.02]"
                                    >
                                        <div className={`absolute inset-0 ${userColor} opacity-[0.06] group-hover:opacity-[0.1] transition-opacity`}></div>
                                        <div className="flex items-center gap-4 mb-4 relative z-10">
                                            <div className="flex-shrink-0">
                                                {msg.author.avatar ? (
                                                    <Image src={`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`} alt={msg.author.username} width={48} height={48} className="rounded-full border-2 border-white/10" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border-2 border-white/10 font-bold">
                                                        {msg.author.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-white truncate">{msg.author.global_name || msg.author.username}</h3>
                                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{formatRelativeTime(msg.timestamp)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <ReportBlockButtons
                                                    targetUsername={msg.author.username}
                                                    contentType="presentation"
                                                    contentId={msg.id}
                                                />
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(msg.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words flex-grow relative z-10 font-medium mb-4">
                                            {formatDiscordText(msg.content)}
                                        </div>

                                        {msg.attachments && msg.attachments.length > 0 && (
                                            <div className="mt-2 grid grid-cols-2 gap-2 relative z-10 mb-4">
                                                {msg.attachments.map((att) => (
                                                    att.contentType && att.contentType.startsWith('image/') && (
                                                        <div key={att.id} className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/5">
                                                            <Image src={att.url} alt="Attachment" fill className="object-cover" />
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-auto flex flex-wrap gap-2 relative z-10">
                                            <a
                                                href={`https://discord.com/channels/406517157543804928/1409537229566775387/${msg.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-[10px] font-bold text-slate-300"
                                            >
                                                ✨ {t('community.react')}
                                            </a>
                                            {msg.reactions && msg.reactions.map((r, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/5 text-[10px] font-bold text-slate-300">
                                                    {r.id ? <img src={`https://cdn.discordapp.com/emojis/${r.id}.png`} alt={r.emoji} className="w-3.5 h-3.5 object-contain" /> : <span>{r.emoji}</span>}
                                                    <span>{r.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            {/* Lightbox Modal (Shared) */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
                        onClick={() => setSelectedImage(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative max-w-7xl w-full flex flex-col items-center"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="relative w-full h-[70vh] md:h-[80vh]">
                                <Image
                                    src={selectedImage.src}
                                    alt={t('community.fullPhoto')}
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <div className="mt-8 text-center bg-black/40 p-6 rounded-3xl border border-white/10 backdrop-blur-sm">
                                <p className="text-white text-xl font-bold mb-2">{selectedImage.caption?.split(' — ')[0]}</p>
                                <p className="text-red-400 font-mono text-sm tracking-widest uppercase">{selectedImage.caption?.split(' — ')[1]}</p>
                            </div>
                            <button
                                className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors"
                                onClick={() => setSelectedImage(null)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}
