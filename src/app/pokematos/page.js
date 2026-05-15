'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PokemonDashboard from '@/components/pokemon/PokemonDashboard';
import AuthModal from '@/components/AuthModal';
import DiscordUsernameModal from '@/components/DiscordUsernameModal';
import { useSession } from "next-auth/react";
import { useLanguage } from '@/context/LanguageContext';

export default function PokemonPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        }>
            <PokemonPageInner />
        </Suspense>
    );
}

function PokemonPageInner() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [linkStatus, setLinkStatus] = useState(null); // 'linking' | 'success' | 'error' | null
    // First-time Discord login: when /api/auth/discord/login returns
    // needsUsername:true, we show DiscordUsernameModal so the user can
    // pick a username (or claim an existing one with their password)
    // INSTEAD of silently creating a stub account from the Discord
    // display name. `discordPickContext` carries the response payload
    // (suggestion, discordId, email, image, team) for the modal.
    const [discordPickContext, setDiscordPickContext] = useState(null);

    const { t, lang } = useLanguage();
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();

    // Handle Discord linking flow
    useEffect(() => {
        const linkDiscordUsername = searchParams.get('linkDiscord');
        if (linkDiscordUsername && status === 'authenticated' && session?.user) {
            // User just came back from Discord OAuth — link their Discord to their account
            setLinkStatus('linking');
            (async () => {
                try {
                    const res = await fetch('/api/auth/link-discord', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: linkDiscordUsername })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        setLinkStatus('success');
                        // Update user with merged data
                        setUser(data.user);
                        localStorage.setItem('pokemon_user', JSON.stringify(data.user));
                        // Clean URL
                        window.history.replaceState({}, '', '/pokematos');
                        setTimeout(() => setLinkStatus(null), 4000);
                    } else {
                        console.error('Link Discord failed:', data.error);
                        setLinkStatus('error');
                        setTimeout(() => setLinkStatus(null), 4000);
                    }
                } catch (e) {
                    console.error('Link Discord error:', e);
                    setLinkStatus('error');
                    setTimeout(() => setLinkStatus(null), 4000);
                }
            })();
            return; // Don't run normal session check during linking
        }
    }, [searchParams, session, status]);

    useEffect(() => {
        const checkSession = async () => {
            if (user) return; // Prevent loop

            // Skip normal flow if we're in the linking process
            const linkDiscordUsername = searchParams.get('linkDiscord');
            if (linkDiscordUsername) return;

            // 1. Priority: NextAuth OAuth session (Discord or Apple).
            // We dispatch to the matching backend bridge endpoint based on
            // `session.user.provider`, which the NextAuth `jwt` callback
            // populates from the `account.provider` of the upstream OAuth.
            if (status === 'authenticated' && session?.user) {
                const provider = session.user.provider; // 'discord' | 'apple' | undefined
                try {
                    let res;
                    if (provider === 'apple') {
                        res = await fetch('/api/auth/apple/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                appleId: session.user.id,
                                username: session.user.name,
                                email: session.user.email,
                                name: session.user.name,
                            }),
                        });
                    } else {
                        // Default to Discord for back-compat — older sessions
                        // pre-date the `provider` field.
                        res = await fetch('/api/auth/discord/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                discordId: session.user.id || session.user.image?.split('/avatars/')[1]?.split('/')[0],
                                username: session.user.name,
                                email: session.user.email,
                                image: session.user.image,
                            }),
                        });
                    }

                    if (res.ok) {
                        const backendUser = await res.json();
                        // Discord first-time login that didn't match any
                        // existing account by discordId nor by email returns
                        // `needsUsername:true` (no stub created). Surface the
                        // DiscordUsernameModal so the user explicitly chooses
                        // a username (or claims an existing one with their
                        // password) instead of silently auto-creating a
                        // shadow account from the Discord display name.
                        if (backendUser.needsUsername) {
                            setDiscordPickContext(backendUser);
                            setLoading(false);
                            return;
                        }
                        setUser(backendUser);
                        localStorage.setItem('pokemon_user', JSON.stringify(backendUser));
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error('OAuth login sync failed', e);
                }
            } else if (status === 'loading') {
                return; // Wait for NextAuth
            }

            // 2. Fallback: LocalStorage (password login or previous session)
            const savedUser = localStorage.getItem('pokemon_user');
            if (savedUser) {
                try {
                    const localUser = JSON.parse(savedUser);
                    const userRes = await fetch(`/api/pokemon/user?username=${encodeURIComponent(localUser.username)}`);
                    if (userRes.ok) {
                        const latestUser = await userRes.json();
                        setUser(latestUser);
                        localStorage.setItem('pokemon_user', JSON.stringify(latestUser));
                    } else {
                        setUser(localUser);
                    }
                } catch (e) {
                    console.error("Failed to refresh session", e);
                }
            }
            setLoading(false);
        };

        checkSession();
    }, [session, status, searchParams]);

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('pokemon_user', JSON.stringify(userData));
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('pokemon_user');
        localStorage.removeItem('pogo_saved_user');
    };

    // Auto-open auth modal if not logged in. The `!discordPickContext`
    // guard prevents AuthModal from popping at the same time as the
    // Discord username picker — both are full-screen modals and showing
    // them simultaneously would confuse the user.
    useEffect(() => {
        if (!loading && !user && !discordPickContext) {
            setShowAuthModal(true);
        }
    }, [loading, user, discordPickContext]);

    const handleDiscordPickComplete = (createdOrLinkedUser) => {
        setDiscordPickContext(null);
        setUser(createdOrLinkedUser);
        localStorage.setItem('pokemon_user', JSON.stringify(createdOrLinkedUser));
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24">
            {/* Link status toast */}
            {linkStatus && (
                <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg text-sm font-medium ${
                    linkStatus === 'linking' ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' :
                    linkStatus === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-300' :
                    'bg-red-500/20 border border-red-500/30 text-red-300'
                }`}>
                    {linkStatus === 'linking' && t('pokematos.linkingDiscord')}
                    {linkStatus === 'success' && t('pokematos.linkSuccess')}
                    {linkStatus === 'error' && t('pokematos.linkError')}
                </div>
            )}

            {user ? (
                <PokemonDashboard user={user} onLogout={handleLogout} />
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 max-w-md w-full text-center">
                        <h1
                            className="text-3xl font-extrabold uppercase tracking-normal mb-6 bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] [word-spacing:0.5rem]"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            {t('pokematos.trainerLogin')}
                        </h1>
                        <p className="text-gray-400 mb-8">
                            {t('pokematos.loginDescription')}
                        </p>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-b from-red-500 to-red-700 text-white py-3 px-6 rounded-full font-semibold transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 shadow-[0_4px_15px_rgba(239,68,68,0.5),inset_0_1px_0_rgba(255,255,255,0.25)] hover:shadow-[0_6px_25px_rgba(239,68,68,0.8),inset_0_1px_0_rgba(255,255,255,0.3)]"
                        >
                            {t('auth.loginAction')}
                        </button>
                    </div>
                    <AuthModal
                        isOpen={showAuthModal}
                        onClose={() => setShowAuthModal(false)}
                        onLogin={handleLogin}
                    />
                </div>
            )}

            {discordPickContext && (
                <DiscordUsernameModal
                    context={discordPickContext}
                    onComplete={handleDiscordPickComplete}
                    onCancel={() => setDiscordPickContext(null)}
                />
            )}
        </div>
    );
}
