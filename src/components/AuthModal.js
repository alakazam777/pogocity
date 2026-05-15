'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { X, Eye, EyeOff, User, Lock, LogIn, UserPlus, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

const DiscordIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 14.178 14.178 0 00-.636 1.314 18.244 18.244 0 00-5.435 0 14.56 14.56 0 00-.64-1.314.077.077 0 00-.078-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

const AppleIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
);

export default function AuthModal({ isOpen, onClose, onLogin }) {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [needsDiscordReset, setNeedsDiscordReset] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const { t } = useLanguage();

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            setError('');
            setSuccess('');
            setShowPassword(false);
            setNeedsDiscordReset(false);
            setTermsAccepted(false);

            // Check if there's a remembered user
            const savedUser = localStorage.getItem('pogo_saved_user');
            if (savedUser) {
                try {
                    const data = JSON.parse(savedUser);
                    if (data.username) setUsername(data.username);
                    setRememberMe(true);
                    // Auto-login only if remember me was active
                    if (data.sessionToken && data.rememberMe) {
                        handleCredentialsLogin(data.username, null, data.sessionToken);
                    }
                } catch (e) { /* ignore */ }
            } else {
                setUsername('');
                setRememberMe(false);
            }
        }
    }, [isOpen]);

    const handleCredentialsLogin = async (name, pass, token) => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/pokemon/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: name,
                    password: pass,
                    sessionToken: token
                }),
            });
            const data = await res.json();
            if (res.ok) {
                // Save session — only auto-reconnect if rememberMe is checked
                if (rememberMe) {
                    localStorage.setItem('pogo_saved_user', JSON.stringify({
                        username: name,
                        sessionToken: data.sessionToken,
                        rememberMe: true
                    }));
                } else {
                    localStorage.removeItem('pogo_saved_user');
                }
                localStorage.setItem('pokemon_user', JSON.stringify(data));
                if (onLogin) onLogin(data);
                onClose();
            } else {
                if (!token) {
                    setError(data.error || t('auth.invalidCredentials'));
                }
                // If token failed, clear it and let user login manually
            }
        } catch (e) {
            if (!token) setError(t('auth.genericError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;
        await handleCredentialsLogin(username.trim(), password, null);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password.trim()) return;

        if (password.length < 4) {
            setError(t('auth.passwordTooShort'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }

        if (!termsAccepted) {
            setError(t('auth.termsRequired'));
            return;
        }

        setIsLoading(true);
        try {
            // Use dedicated register endpoint
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: trimmedUsername,
                    password: password,
                    termsAccepted: true
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (rememberMe) {
                    localStorage.setItem('pogo_saved_user', JSON.stringify({
                        username: trimmedUsername,
                        sessionToken: data.sessionToken,
                        rememberMe: true
                    }));
                } else {
                    localStorage.removeItem('pogo_saved_user');
                }
                localStorage.setItem('pokemon_user', JSON.stringify(data));
                if (onLogin) onLogin(data);
                onClose();
            } else {
                if (data.needsDiscord) {
                    // Account is Discord-linked, user needs to auth via Discord first then retry
                    setError('');
                    setNeedsDiscordReset(true);
                } else {
                    setError(data.error || t('auth.registerError'));
                }
            }
        } catch (e) {
            setError(t('auth.genericError'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDiscordLogin = () => {
        signIn('discord', { callbackUrl: '/pokematos' });
    };

    const handleAppleLogin = () => {
        signIn('apple', { callbackUrl: '/pokematos' });
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999]"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 flex items-center justify-center z-[10000] p-4"
                        onClick={(e) => e.target === e.currentTarget && onClose()}
                    >
                        <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/50">
                            {/* Header */}
                            <div className="relative px-6 pt-6 pb-4">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors p-1"
                                >
                                    <X size={20} />
                                </button>
                                <h2
                                    className="text-2xl font-extrabold uppercase tracking-tight bg-gradient-to-b from-red-500 to-red-700 bg-clip-text text-transparent"
                                    style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                                >
                                    {mode === 'login' ? t('auth.login') : t('auth.register')}
                                </h2>
                                <p className="text-gray-500 text-sm mt-1">
                                    {mode === 'login'
                                        ? t('auth.loginSubtitle')
                                        : t('auth.registerSubtitle')
                                    }
                                </p>
                            </div>

                            {/* Tab switcher */}
                            <div className="px-6 flex gap-1 bg-white/5 mx-6 rounded-lg p-1">
                                <button
                                    onClick={() => { setMode('login'); setError(''); }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                        mode === 'login'
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    <LogIn size={14} />
                                    {t('auth.login')}
                                </button>
                                <button
                                    onClick={() => { setMode('register'); setError(''); }}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-1.5 ${
                                        mode === 'register'
                                            ? 'bg-white/10 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    <UserPlus size={14} />
                                    {t('auth.register')}
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="p-6 space-y-4">
                                {/* Error message */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-lg"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                {/* Discord reset prompt */}
                                {needsDiscordReset && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-lg px-4 py-3 space-y-2"
                                    >
                                        <p className="text-sm text-gray-300">{t('auth.discordLinked')}</p>
                                        <button
                                            type="button"
                                            onClick={handleDiscordLogin}
                                            className="w-full py-2 px-4 bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <DiscordIcon className="w-4 h-4" />
                                            {t('auth.connectDiscord')}
                                        </button>
                                    </motion.div>
                                )}

                                {/* Username field */}
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
                                            className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
                                            placeholder={t('auth.usernamePlaceholder')}
                                            required
                                            autoComplete="username"
                                        />
                                    </div>
                                </div>

                                {/* Password field */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                        {t('auth.password')}
                                    </label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-10 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
                                            placeholder={mode === 'login' ? t('auth.passwordPlaceholder') : t('auth.passwordNewPlaceholder')}
                                            required
                                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm password (register only) */}
                                {mode === 'register' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                    >
                                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                            {t('auth.confirmPassword')}
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/40 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all text-sm"
                                                placeholder={t('auth.confirmPasswordPlaceholder')}
                                                required
                                                autoComplete="new-password"
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {/* Remember me */}
                                {mode === 'login' && (
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 bg-black/40 text-red-500 focus:ring-red-500/50 cursor-pointer"
                                        />
                                        <span className="text-sm text-gray-400">{t('auth.rememberMe')}</span>
                                    </label>
                                )}

                                {/* Terms of Service acceptance (register only) */}
                                {mode === 'register' && (
                                    <label className="flex items-start gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={termsAccepted}
                                            onChange={(e) => setTermsAccepted(e.target.checked)}
                                            className="w-4 h-4 mt-0.5 rounded border-gray-600 bg-black/40 text-red-500 focus:ring-red-500/50 cursor-pointer shrink-0"
                                        />
                                        <span className="text-sm text-gray-400">
                                            {t('auth.acceptTermsPrefix')}
                                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">
                                                {t('auth.termsOfService')}
                                            </a>
                                            {t('auth.acceptTermsSuffix')}
                                            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">
                                                {t('auth.privacyPolicy')}
                                            </a>
                                        </span>
                                    </label>
                                )}

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    disabled={isLoading || (mode === 'register' && !termsAccepted)}
                                    className="w-full py-3 px-6 rounded-lg bg-gradient-to-b from-red-500 to-red-700 text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(239,68,68,0.4)] hover:shadow-[0_6px_25px_rgba(239,68,68,0.6)] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'login' ? t('auth.loginAction') : t('auth.registerAction')}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>

                                {/* Divider */}
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-white/10"></div>
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="px-3 bg-[#111] text-gray-600">{t('auth.or')}</span>
                                    </div>
                                </div>

                                {/* Discord button */}
                                <button
                                    type="button"
                                    onClick={handleDiscordLogin}
                                    className="w-full py-3 px-6 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(88,101,242,0.3)] hover:shadow-[0_6px_25px_rgba(88,101,242,0.5)] flex items-center justify-center gap-2.5"
                                >
                                    <DiscordIcon className="w-5 h-5" />
                                    {t('auth.continueDiscord')}
                                </button>

                                {/* Apple button */}
                                <button
                                    type="button"
                                    onClick={handleAppleLogin}
                                    className="w-full py-3 px-6 rounded-lg bg-white hover:bg-gray-100 text-black font-semibold transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(255,255,255,0.1)] hover:shadow-[0_6px_25px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2.5"
                                >
                                    <AppleIcon className="w-5 h-5" />
                                    {t('auth.continueApple')}
                                </button>

                                {/* Info text */}
                                <p className="text-center text-xs text-gray-600 mt-2">
                                    {mode === 'login' ? (
                                        <>{t('auth.loginDiscordHint')}</>
                                    ) : (
                                        <>{t('auth.registerDiscordHint')}</>
                                    )}
                                </p>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
