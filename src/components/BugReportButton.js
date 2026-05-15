'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, X, Send, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function BugReportButton() {
    const { t, lang } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const getUser = () => {
        try {
            const raw = localStorage.getItem('pokemon_user');
            if (raw) return JSON.parse(raw);
        } catch (e) { /* ignore */ }
        return null;
    };

    const handleSubmit = async () => {
        if (!message.trim()) return;
        setSending(true);
        setError('');

        const user = getUser();

        try {
            const res = await fetch('/api/bug-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message.trim(),
                    username: user?.username || 'Anonyme',
                    avatar: user?.trainerImage || null,
                    page: window.location.pathname,
                    userAgent: navigator.userAgent
                })
            });

            if (res.ok) {
                setSent(true);
                setMessage('');
                setTimeout(() => {
                    setSent(false);
                    setIsOpen(false);
                }, 2500);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.error || t('bugReport.errorStatus', { status: res.status }));
            }
        } catch (e) {
            console.error('Bug report fetch error:', e);
            setError(t('bugReport.errorConnection'));
        } finally {
            setSending(false);
        }
    };

    const modal = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                        onClick={() => { if (!sending) setIsOpen(false); }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-20 right-4 md:right-8 z-[9999] w-[calc(100%-2rem)] max-w-sm"
                    >
                        <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-5 pt-4 pb-3">
                                <div className="flex items-center gap-2">
                                    <Bug size={18} className="text-red-400" />
                                    <h3 className="text-white font-semibold text-sm">{t('bugReport.title')}</h3>
                                </div>
                                <button
                                    onClick={() => { if (!sending) setIsOpen(false); }}
                                    className="text-gray-500 hover:text-white transition-colors p-1"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 pb-5">
                                {sent ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center gap-2 py-6"
                                    >
                                        <CheckCircle size={40} className="text-green-400" />
                                        <p className="text-green-300 font-medium text-sm">{t('bugReport.success')}</p>
                                        <p className="text-gray-500 text-xs">{t('bugReport.thanks')}</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder={t('bugReport.placeholder')}
                                            className="w-full h-28 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/40 transition-all resize-none"
                                            disabled={sending}
                                            autoFocus
                                        />

                                        {error && (
                                            <p className="text-red-400 text-xs mt-2">{error}</p>
                                        )}

                                        <div className="flex items-center justify-between mt-3">
                                            <p className="text-gray-600 text-xs">
                                                {t('bugReport.page')} : {typeof window !== 'undefined' ? window.location.pathname : ''}
                                            </p>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={sending || !message.trim()}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-b from-red-500 to-red-700 text-white text-xs font-semibold rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 shadow-[0_2px_10px_rgba(239,68,68,0.3)]"
                                            >
                                                {sending ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Send size={12} />
                                                )}
                                                {sending ? t('bugReport.sending') : t('bugReport.send')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <>
            {/* Floating bug button */}
            <button
                onClick={() => { setIsOpen(!isOpen); setError(''); setSent(false); }}
                className="gravity-target fixed bottom-4 right-4 md:right-8 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-white/20 group"
                title={t('bugReport.title')}
            >
                <Bug size={18} className="group-hover:scale-110 transition-transform" />
            </button>

            {/* Portal for modal */}
            {mounted && createPortal(modal, document.body)}
        </>
    );
}
