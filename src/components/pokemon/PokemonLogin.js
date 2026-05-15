'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

export default function PokemonLogin({ onLogin }) {
    const { t } = useLanguage();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [sessionToken, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const savedUser = localStorage.getItem('pogo_saved_user');
        if (savedUser) {
            const data = JSON.parse(savedUser);
            if (data.username) setUsername(data.username);
            setRememberMe(true);
            if (data.sessionToken) {
                setToken(data.sessionToken);
                // Attempt auto-login if token exists
                handleLogin(data.username, null, data.sessionToken);
            } else if (data.password) {
                setPassword(data.password);
            }
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || (!password.trim() && !sessionToken)) return;
        handleLogin(username.trim(), password, sessionToken);
    };

    const handleLogin = async (name, pass, token) => {
        setIsLoading(true);
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
                if (rememberMe) {
                    localStorage.setItem('pogo_saved_user', JSON.stringify({
                        username: name,
                        sessionToken: data.sessionToken
                    }));
                } else {
                    localStorage.removeItem('pogo_saved_user');
                }
                onLogin(data);
            } else {
                if (!token) alert(data.error || t('login.failed'));
                else setToken(null); // Clear invalid token
            }
        } catch (error) {
            console.error('Login error:', error);
            if (!token) alert(t('login.genericError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl"
            >
                <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    {t('login.title')}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {t('login.usernameLabel')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            placeholder={t('login.usernamePlaceholder')}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            {t('login.passwordLabel')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            placeholder={t('login.passwordPlaceholder')}
                            required
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-black/20 text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                            {t('login.rememberMe')}
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isLoading ? t('login.submitting') : t('login.submit')}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
