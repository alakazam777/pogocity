'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';

export default function PresentationsPage() {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const isAdmin = session?.user?.name === 'lcsnzh';

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await fetch('/api/presentations');
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || t('community.errorStatus').replace('{status}', res.status).replace('{message}', t('community.loadError')));
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
        if (diffInMinutes < 60) return t('community.minutesAgo').replace('{count}', diffInMinutes);
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return t('community.hoursAgo').replace('{count}', diffInHours);
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return t('community.daysAgo').replace('{count}', diffInDays);
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return t('community.monthsAgo').replace('{count}', diffInMonths);
        return t('community.yearsAgo').replace('{count}', Math.floor(diffInMonths / 12));
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
            // Match markdown tokens
            // Bold: **text**
            // Italic: *text* or _text_ (simplified to * only for now as _ is common in usernames)
            // Underline: __text__
            // Strike: ~~text~~
            // Code: `text`
            // URL: http...

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

    // Function to delete a message (placeholder for now)
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
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">{t('common.error')}</h1>
                    <p>{error}</p>
                    <p className="text-sm text-slate-400 mt-4">{t('community.discordTokenError')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 text-center flex flex-col items-center gap-6">
                    <h1
                        className="text-4xl md:text-5xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] py-2"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        {t('community.presentations')}
                    </h1>
                    <a
                        href="https://discord.com/channels/406517157543804928/1409537229566775387"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-full transition-all shadow-lg hover:shadow-[#5865F2]/40 flex items-center gap-2 transform hover:scale-105"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 14.178 14.178 0 00-.636 1.314 18.244 18.244 0 00-5.435 0 14.56 14.56 0 00-.64-1.314.077.077 0 00-.078-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
                        </svg>
                        {t('community.introduceOnDiscord')}
                    </a>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {messages.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <div className="text-slate-500 text-lg italic bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md mx-auto">
                                {t('community.noPresentations')}
                                <br />
                                <span className="text-sm not-italic mt-2 block opacity-70">{t('community.beFirstOnDiscord')}</span>
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            // Deterministic color based on user ID
                            const colors = [
                                'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
                                'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
                                'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
                            ];
                            const colorIndex = msg.author.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
                            const userColor = colors[colorIndex];

                            // Mock Reactions removed as per user request to use real data or just the button
                            const reactions = [];

                            return (
                                <div
                                    key={msg.id}
                                    className={`relative border border-white/10 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 group flex flex-col overflow-hidden`}
                                >
                                    {/* Background with User Color */}
                                    <div className={`absolute inset-0 ${userColor} opacity-[0.08] group-hover:opacity-[0.12] transition-opacity`}></div>

                                    <div className="flex items-center gap-4 mb-4 relative z-10">
                                        {/* Avatar */}
                                        <div className="flex-shrink-0 relative">
                                            <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent ${userColor.replace('bg-', 'from-')}/50 opacity-20 group-hover:opacity-40 transition-opacity rounded-full blur`}></div>
                                            {msg.author.avatar ? (
                                                <Image
                                                    src={`https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`}
                                                    alt={msg.author.username}
                                                    width={56}
                                                    height={56}
                                                    className={`rounded-full border-2 border-slate-700/50 group-hover:border-white/20 transition-colors relative z-10`}
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700 group-hover:border-white/20 transition-colors relative z-10">
                                                    <span className="text-xl font-bold text-slate-400 group-hover:text-white">
                                                        {msg.author.username.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-white group-hover:text-pink-200 transition-colors truncate">
                                                {msg.author.global_name || msg.author.username}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mix-blend-plus-lighter">
                                                <span>{formatRelativeTime(msg.timestamp)}</span>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                className="p-2 hover:bg-red-500/10 rounded-full text-slate-600 hover:text-red-500 transition-colors"
                                                title={t('community.hide')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap break-words flex-grow relative z-10 font-medium">
                                        {formatDiscordText(msg.content)}
                                    </div>

                                    {/* Attachments (Images) if any */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
                                            {msg.attachments.map((att) => (
                                                att.contentType && att.contentType.startsWith('image/') && (
                                                    <div key={att.id} className="relative aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/5 hover:border-white/20 transition-colors">
                                                        <Image
                                                            src={att.url}
                                                            alt="Attachment"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}

                                    {/* Reactions */}
                                    <div className="mt-4 flex flex-wrap gap-2 relative z-10">
                                        <a
                                            href={`https://discord.com/channels/406517157543804928/1409537229566775387/${msg.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-xs text-slate-300 pointer-events-auto"
                                        >
                                            ✨ <span className="opacity-50">{t('community.react')}</span>
                                        </a>
                                        {msg.reactions && msg.reactions.map((r, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 border border-white/5 text-xs text-slate-300">
                                                {r.id ? (
                                                    <img src={`https://cdn.discordapp.com/emojis/${r.id}.png`} alt={r.emoji} className="w-4 h-4 object-contain" />
                                                ) : (
                                                    <span>{r.emoji}</span>
                                                )}
                                                <span className="font-bold">{r.count}</span>
                                            </div>
                                        ))}
                                    </div>

                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
