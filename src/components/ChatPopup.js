'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ArrowLeft, MessageCircle, Plus, Search } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import ReportBlockButtons from '@/components/ReportBlockButtons';

export default function ChatPopup({ isOpen, onClose, targetUser, onUnreadChange }) {
    const { t, lang } = useLanguage();
    const [view, setView] = useState(targetUser ? 'chat' : 'list'); // 'list' | 'chat' | 'new'
    const [conversations, setConversations] = useState([]);
    const [activeConvo, setActiveConvo] = useState(null); // { id, otherUser, otherUserDisplay }
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [myUsername, setMyUsername] = useState(null);
    const [allUsers, setAllUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [blockedUsers, setBlockedUsers] = useState([]);
    const messagesEndRef = useRef(null);
    const pollRef = useRef(null);
    const inputRef = useRef(null);
    const searchInputRef = useRef(null);

    useEffect(() => { setMounted(true); }, []);

    // Fetch blocked users list
    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                const res = await fetch('/api/block');
                if (res.ok) {
                    const data = await res.json();
                    setBlockedUsers((data.blocked || []).map(u => u.toLowerCase()));
                }
            } catch { /* not logged in */ }
        })();
    }, [isOpen]);

    const getMyUsername = () => {
        // Return cached server username first, then fallback to localStorage
        if (myUsername) return myUsername;
        try {
            const u = localStorage.getItem('pokemon_user');
            return u ? JSON.parse(u).username : null;
        } catch { return null; }
    };

    // Load conversations
    const loadConversations = useCallback(async () => {
        try {
            const res = await fetch('/api/messages/conversations');
            if (res.ok) {
                const data = await res.json();
                setConversations(data.conversations || []);
                if (data.username) setMyUsername(data.username);
                const total = (data.conversations || []).reduce((sum, c) => sum + c.unreadCount, 0);
                if (onUnreadChange) onUnreadChange(total);
            }
        } catch (e) { console.error('Failed to load conversations', e); }
    }, [onUnreadChange]);

    // Load messages for a conversation
    const loadMessages = useCallback(async (convoId) => {
        try {
            const res = await fetch(`/api/messages/${convoId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                // Mark as read
                fetch('/api/messages/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ conversationId: convoId })
                });
            }
        } catch (e) { console.error('Failed to load messages', e); }
    }, []);

    // When opening with a target user, go directly to chat
    useEffect(() => {
        if (isOpen && targetUser) {
            setView('chat');
            setActiveConvo({ id: null, otherUser: targetUser.toLowerCase(), otherUserDisplay: targetUser });
            setMessages([]);
            setLoading(true);
            // Try to find existing conversation
            fetch('/api/messages/conversations').then(r => r.json()).then(data => {
                const existing = (data.conversations || []).find(
                    c => c.otherUser === targetUser.toLowerCase()
                );
                if (existing) {
                    setActiveConvo({ id: existing.id, otherUser: existing.otherUser, otherUserDisplay: existing.otherUserDisplay });
                    loadMessages(existing.id);
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        } else if (isOpen && !targetUser) {
            setView('list');
            loadConversations();
        }
    }, [isOpen, targetUser]);

    // Poll for new messages when in chat view
    useEffect(() => {
        if (isOpen && view === 'chat' && activeConvo?.id) {
            const poll = () => loadMessages(activeConvo.id);
            pollRef.current = setInterval(poll, 5000);
            return () => clearInterval(pollRef.current);
        }
    }, [isOpen, view, activeConvo?.id, loadMessages]);

    // Poll conversation list for unread counts
    useEffect(() => {
        if (isOpen && view === 'list') {
            const poll = () => loadConversations();
            pollRef.current = setInterval(poll, 10000);
            return () => clearInterval(pollRef.current);
        }
    }, [isOpen, view, loadConversations]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when entering chat
    useEffect(() => {
        if (view === 'chat') {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [view, activeConvo]);

    const handleSend = async () => {
        if (!newMessage.trim() || sending) return;
        const text = newMessage.trim();
        setNewMessage('');
        setSending(true);

        const myUsername = getMyUsername();
        // Optimistic add
        const tempMsg = { id: 'temp-' + Date.now(), from: myUsername?.toLowerCase(), text, timestamp: new Date().toISOString(), read: false };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const res = await fetch('/api/messages/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: activeConvo.otherUserDisplay || activeConvo.otherUser, text })
            });
            if (res.ok) {
                const data = await res.json();
                // Update convo ID if it was a new conversation
                if (!activeConvo.id && data.conversationId) {
                    setActiveConvo(prev => ({ ...prev, id: data.conversationId }));
                }
                // Replace temp message
                setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
            } else {
                // Remove optimistic message on failure
                setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
            }
        } catch (e) {
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const openConversation = (convo) => {
        setActiveConvo(convo);
        setView('chat');
        setMessages([]);
        setLoading(true);
        loadMessages(convo.id).then(() => setLoading(false));
    };

    const goBack = () => {
        setView('list');
        setActiveConvo(null);
        setMessages([]);
        setUserSearch('');
        loadConversations();
    };

    const openNewMessage = async () => {
        setView('new');
        setUserSearch('');
        try {
            const res = await fetch('/api/pokemon/leaderboard');
            if (res.ok) {
                const data = await res.json();
                const users = (data || []).map(u => u.username).filter(Boolean);
                setAllUsers(users);
            }
        } catch (e) { console.error('Failed to load users', e); }
        setTimeout(() => searchInputRef.current?.focus(), 150);
    };

    const startConvoWith = (username) => {
        setView('chat');
        setActiveConvo({ id: null, otherUser: username.toLowerCase(), otherUserDisplay: username });
        setMessages([]);
        setUserSearch('');
        setLoading(true);
        // Check if conversation already exists
        fetch('/api/messages/conversations').then(r => r.json()).then(data => {
            const existing = (data.conversations || []).find(
                c => c.otherUser === username.toLowerCase()
            );
            if (existing) {
                setActiveConvo({ id: existing.id, otherUser: existing.otherUser, otherUserDisplay: existing.otherUserDisplay });
                loadMessages(existing.id);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    if (!isOpen || !mounted) return null;

    const myUsernameLower = getMyUsername()?.toLowerCase();

    const formatTime = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const locale = lang === 'fr' ? 'fr-FR' : lang === 'ja' ? 'ja-JP' : 'en-US';
        // Compare actual calendar dates (not raw milliseconds)
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffCalendarDays = Math.round((today - msgDay) / 86400000);
        if (diffCalendarDays === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        if (diffCalendarDays === 1) return t('chat.yesterday');
        if (diffCalendarDays < 7) return d.toLocaleDateString(locale, { weekday: 'long' });
        return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-20 right-4 md:right-8 z-[9999] w-[calc(100%-2rem)] max-w-sm"
                    >
                        <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col" style={{ height: '28rem' }}>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                    {(view === 'chat' || view === 'new') && (
                                        <button onClick={goBack} className="text-gray-400 hover:text-white transition-colors p-0.5">
                                            <ArrowLeft size={16} />
                                        </button>
                                    )}
                                    <MessageCircle size={16} className="text-amber-400" />
                                    <h3 className="text-white font-semibold text-sm truncate">
                                        {view === 'chat' ? (activeConvo?.otherUserDisplay || activeConvo?.otherUser || 'Chat')
                                            : view === 'new' ? t('chat.newMessage')
                                            : t('chat.messages')}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-1">
                                    {view === 'chat' && activeConvo?.otherUser && (
                                        <ReportBlockButtons
                                            targetUsername={activeConvo.otherUserDisplay || activeConvo.otherUser}
                                            contentType="message"
                                            contentId={activeConvo.id}
                                            size="sm"
                                        />
                                    )}
                                    {view === 'list' && (
                                        <button onClick={openNewMessage} className="text-gray-400 hover:text-amber-400 transition-colors p-1" title={t('chat.newMessage')}>
                                            <Plus size={16} />
                                        </button>
                                    )}
                                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            {view === 'new' ? (
                                /* New message — user search */
                                <div className="flex-1 overflow-y-auto">
                                    <div className="px-3 py-2 border-b border-white/5">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10">
                                            <Search size={14} className="text-gray-500 flex-shrink-0" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={userSearch}
                                                onChange={(e) => setUserSearch(e.target.value)}
                                                placeholder={t('chat.searchTrainer')}
                                                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    {(() => {
                                        const me = getMyUsername()?.toLowerCase();
                                        const filtered = allUsers
                                            .filter(u => u.toLowerCase() !== me)
                                            .filter(u => !userSearch || u.toLowerCase().includes(userSearch.toLowerCase()));
                                        return filtered.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                                                <p className="text-xs">{userSearch ? t('chat.noTrainerFound') : t('common.loading')}</p>
                                            </div>
                                        ) : (
                                            filtered.map(username => (
                                                <button
                                                    key={username}
                                                    onClick={() => startConvoWith(username)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-white font-medium">{username}</span>
                                                </button>
                                            ))
                                        );
                                    })()}
                                </div>
                            ) : view === 'list' ? (
                                /* Conversation list */
                                <div className="flex-1 overflow-y-auto">
                                    {conversations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-600 px-4">
                                            <MessageCircle size={32} className="mb-2 opacity-30" />
                                            <p className="text-sm text-center">{t('chat.noMessages')}</p>
                                            <p className="text-xs text-center mt-1 text-gray-700">{t('chat.noMessagesHint')}</p>
                                        </div>
                                    ) : (
                                        conversations.filter(convo => !blockedUsers.includes(convo.otherUser?.toLowerCase())).map(convo => (
                                            <button
                                                key={convo.id}
                                                onClick={() => openConversation(convo)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 text-left"
                                            >
                                                {/* Avatar placeholder */}
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                    {(convo.otherUserDisplay || convo.otherUser).charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-white truncate">{convo.otherUserDisplay || convo.otherUser}</span>
                                                        {convo.lastMessage && (
                                                            <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">{formatTime(convo.lastMessage.timestamp)}</span>
                                                        )}
                                                    </div>
                                                    {convo.lastMessage && (
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                            {convo.lastMessage.from === myUsernameLower ? t('chat.you') + ' : ' : ''}{convo.lastMessage.text}
                                                        </p>
                                                    )}
                                                </div>
                                                {convo.unreadCount > 0 && (
                                                    <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                        {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                                                    </span>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            ) : (
                                /* Chat view */
                                <>
                                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-full">
                                                <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                            </div>
                                        ) : messages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                                <p className="text-xs text-center">{t('chat.sendFirst')}</p>
                                            </div>
                                        ) : (
                                            messages.map((msg) => {
                                                const isMe = msg.from === myUsernameLower;
                                                return (
                                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                                                            isMe
                                                                ? 'bg-amber-500/20 text-amber-100 rounded-br-md'
                                                                : 'bg-white/10 text-gray-200 rounded-bl-md'
                                                        }`}>
                                                            <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                                                            <p className={`text-[9px] mt-1 ${isMe ? 'text-amber-500/50' : 'text-gray-600'}`}>
                                                                {formatTime(msg.timestamp)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Input */}
                                    <div className="flex-shrink-0 px-3 py-2 border-t border-white/10">
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                                placeholder={t('chat.placeholder')}
                                                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                                                maxLength={2000}
                                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={!newMessage.trim() || sending}
                                                className="p-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-30 disabled:hover:bg-amber-500/20"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
