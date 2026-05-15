'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, ArrowRight, X, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Shown after a first-time Discord OAuth login, when the backend's
 * /api/auth/discord/login route returned `needsUsername: true` —
 * meaning no existing account matches the user's Discord ID or email.
 *
 * Two paths:
 *   1. Pick a username (defaults to Discord display name) → creates a
 *      new Discord-only account via /api/auth/discord/confirm action='create'.
 *   2. Toggle "I already have an account" → enter the existing username +
 *      password → links Discord to that account via action='claim'.
 *      Password is REQUIRED to prevent username squatting via Discord.
 *
 * Props:
 *   - context: { discordId, suggestion, email, image, team } from the
 *     /api/auth/discord/login response
 *   - onComplete(user): called with the resolved user object on success
 *   - onCancel(): called if the user closes the modal without completing
 */
export default function DiscordUsernameModal({ context, onComplete, onCancel }) {
    const { t } = useLanguage();
    const [mode, setMode] = useState('create'); // 'create' | 'claim'
    const [username, setUsername] = useState(context?.suggestion || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    // App Store Guideline 1.2 — explicit EULA acceptance is required
    // before creating a new account. Required only on `create`; the
    // `claim` path links Discord to an existing account that already
    // accepted at registration time.
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Reset username field when switching modes — when claiming, the
    // user's existing pseudo is unlikely to match the Discord display name.
    useEffect(() => {
        if (mode === 'claim') {
            setUsername('');
            setPassword('');
        } else {
            setUsername(context?.suggestion || '');
            setPassword('');
        }
        setError('');
    }, [mode, context?.suggestion]);

    const submit = async (e) => {
        e.preventDefault();
        const trimmed = username.trim();
        if (!trimmed) return;
        if (mode === 'claim' && !password.trim()) {
            setError(t('auth.claimRequiresPassword'));
            return;
        }
        if (mode === 'create' && !termsAccepted) {
            setError(t('auth.termsRequired'));
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/discord/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: mode,
                    username: trimmed,
                    password: mode === 'claim' ? password : undefined,
                    discordId: context.discordId,
                    email: context.email,
                    image: context.image,
                    team: context.team,
                    termsAccepted: mode === 'create' ? true : undefined,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (onComplete) onComplete(data);
            } else {
                setError(data.error || t('auth.genericError'));
            }
        } catch {
            setError(t('auth.genericError'));
        } finally {
            setIsLoading(false);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999]"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 flex items-center justify-center z-[10000] p-4"
            >
                <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/50">
                    <div className="relative px-6 pt-6 pb-4">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        )}
                        <h2
                            className="text-2xl font-extrabold uppercase tracking-tight bg-gradient-to-b from-purple-400 to-purple-700 bg-clip-text text-transparent"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            {mode === 'create' ? t('auth.discordPickTitle') : t('auth.discordClaimTitle')}
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {mode === 'create' ? t('auth.discordPickSubtitle') : t('auth.discordClaimSubtitle')}
                        </p>
                    </div>

                    <form onSubmit={submit} className="p-6 space-y-4">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-lg"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                {t('auth.username')}
                            </label>
                            <div className="relative">
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                                    placeholder={t('auth.usernamePlaceholder')}
                                    required
                                    autoComplete="username"
                                    maxLength={30}
                                />
                            </div>
                            {mode === 'create' && context?.suggestion && (
                                <p className="text-xs text-gray-600 mt-1.5">
                                    {t('auth.discordPickSuggested')}: <span className="text-gray-400">{context.suggestion}</span>
                                </p>
                            )}
                        </div>

                        {mode === 'claim' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                            >
                                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                    {t('auth.password')}
                                </label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all text-sm"
                                        placeholder={t('auth.passwordPlaceholder')}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                        aria-label="Toggle password visibility"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-600 mt-2">
                                    {t('auth.discordClaimHelp')}
                                </p>
                            </motion.div>
                        )}

                        {mode === 'create' && (
                            <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-black/40 text-purple-500 focus:ring-purple-500/50 cursor-pointer shrink-0"
                                />
                                <span className="text-sm text-gray-400">
                                    {t('auth.acceptTermsPrefix')}
                                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                                        {t('auth.termsOfService')}
                                    </a>
                                    {t('auth.acceptTermsSuffix')}
                                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                                        {t('auth.privacyPolicy')}
                                    </a>
                                </span>
                            </label>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !username.trim() || (mode === 'claim' && !password.trim()) || (mode === 'create' && !termsAccepted)}
                            className="w-full py-3 px-6 rounded-full bg-gradient-to-b from-purple-500 to-purple-700 text-white font-semibold transition-all duration-300 transform hover:scale-[1.02] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                            style={{ boxShadow: '0 3px 14px rgba(147,51,234,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' }}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {mode === 'create' ? t('auth.discordPickAction') : t('auth.discordClaimAction')}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode(mode === 'create' ? 'claim' : 'create')}
                            className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
                        >
                            {mode === 'create' ? t('auth.discordClaimToggle') : t('auth.discordPickTitle')}
                        </button>
                    </form>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}
