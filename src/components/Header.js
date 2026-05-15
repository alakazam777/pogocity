'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
// Menu/X icons removed — Pokeball is the sole menu toggle
import { AnimatePresence, motion } from 'framer-motion';
import { signOut } from 'next-auth/react';
import AuthModal from './AuthModal';
import { useLanguage } from '@/context/LanguageContext';
import cityConfig from '@/lib/cityConfig';

// Proper Instagram SVG icon
const InstagramIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);

// Campfire SVG icon
const CampfireIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C12 2 4 8 4 14C4 18.4183 7.58172 22 12 22C16.4183 22 20 18.4183 20 14C20 8 12 2 12 2ZM12 20C8.68629 20 6 17.3137 6 14C6 10 12 5 12 5C12 5 18 10 18 14C18 17.3137 15.3137 20 12 20Z" />
        <path d="M12 8C12 8 8 12 8 15C8 17.2091 9.79086 19 12 19C14.2091 19 16 17.2091 16 15C16 12 12 8 12 8Z" />
    </svg>
);

// Discord SVG icon
const DiscordIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037 14.178 14.178 0 00-.636 1.314 18.244 18.244 0 00-5.435 0 14.56 14.56 0 00-.64-1.314.077.077 0 00-.078-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
);

// All social links (used in hamburger menu)
const socialLinks = [
    { href: '#', label: 'Instagram', Icon: InstagramIcon, hoverClass: 'hover:text-[#E1306C] hover:drop-shadow-[0_0_8px_rgba(225,48,108,0.6)]' },
    { href: '#', label: 'Campfire', Icon: CampfireIcon, hoverClass: 'hover:text-orange-400 hover:drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]' },
    { href: '#', label: 'Discord', Icon: DiscordIcon, hoverClass: 'hover:text-[#5865F2] hover:drop-shadow-[0_0_8px_rgba(88,101,242,0.6)]' },
];

// Desktop header: no social icons (Campfire + Discord moved to hamburger only)
const headerSocialLinks = [];

export default function Header() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const pathname = usePathname();
    const { t } = useLanguage();

    useEffect(() => {
        // Re-read localStorage on mount, on storage events (cross-tab), AND on
        // focus/visibilitychange — covers the OAuth-callback case where the user
        // returns from Discord with a new session but the Header was already mounted.
        const syncLoginState = () => {
            const user = localStorage.getItem('pokemon_user');
            setIsLoggedIn(!!user);
        };
        syncLoginState();
        window.addEventListener('storage', syncLoginState);
        window.addEventListener('focus', syncLoginState);
        document.addEventListener('visibilitychange', syncLoginState);

        // Mobile session restoration: iOS Safari's ITP wipes localStorage
        // after 7 days of inactivity, so a user who hasn't explicitly logged
        // out comes back to the site and sees a "Login" button. The
        // server-side cookies (httpOnly `pogo_session` + NextAuth's
        // `__Secure-next-auth.session-token`) survive ITP though, so we ask
        // the server who we are and rehydrate localStorage transparently.
        if (!localStorage.getItem('pokemon_user')) {
            fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                    if (data?.user) {
                        localStorage.setItem('pokemon_user', JSON.stringify(data.user));
                        setIsLoggedIn(true);
                        // Notify other components (ChatBubble, BugReportButton, …)
                        // that pokemon_user just changed. `storage` only fires
                        // cross-tab so we dispatch manually for the same tab.
                        try {
                            window.dispatchEvent(new Event('storage'));
                        } catch { /* noop */ }
                    }
                })
                .catch(() => { /* silently fall back to logged-out */ });
        }

        const user = localStorage.getItem('pokemon_user');
        const parsedUser = user ? JSON.parse(user) : null;
        const isAdmin = parsedUser && parsedUser.username === 'lcsnzh';

        let style;
        if (!isAdmin) {
            style = document.createElement('style');
            style.innerHTML = `
                [data-nextjs-toast],
                [data-nextjs-dev-overlay-container],
                nextjs-portal,
                #nextjs-dev-indicator {
                    display: none !important;
                    opacity: 0 !important;
                    visibility: hidden !important;
                    pointer-events: none !important;
                    z-index: -9999 !important;
                }
             `;
            document.head.appendChild(style);
        }

        return () => {
            window.removeEventListener('storage', syncLoginState);
            window.removeEventListener('focus', syncLoginState);
            document.removeEventListener('visibilitychange', syncLoginState);
            if (style) document.head.removeChild(style);
        };
    }, [pathname]);

    const handleLogout = async () => {
        localStorage.removeItem('pokemon_user');
        localStorage.removeItem('pogo_saved_user');
        setIsLoggedIn(false);
        // Clear the httpOnly pogo_session cookie server-side. Without this,
        // /api/auth/me on next page load would silently rehydrate the user
        // from the leftover cookie.
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch { /* network error — proceed to NextAuth signOut anyway */ }
        await signOut({ callbackUrl: '/pokematos' });
    };

    const navLinks = [
        // Order mirrors the home page main grid.
        // Community and Regionals are intentionally absent: Community is a
        // feature exclusive to PogoPoitiers (city-scoped), and Regionals
        // belongs to a different audience.
        { href: '/pokematos', label: t('nav.pokematos'), color: 'from-blue-500 to-blue-700', glow: 'rgba(59,130,246,0.4)', glowHover: 'rgba(59,130,246,0.7)' },
        { href: '/rankings', label: t('nav.rankings'), color: 'from-violet-500 to-violet-700', glow: 'rgba(139,92,246,0.4)', glowHover: 'rgba(139,92,246,0.7)' },
        { href: '/trades', label: t('nav.trades'), color: 'from-emerald-500 to-emerald-700', glow: 'rgba(16,185,129,0.4)', glowHover: 'rgba(16,185,129,0.7)' },
        { href: '/events', label: t('nav.events'), color: 'from-rose-500 to-rose-700', glow: 'rgba(244,63,94,0.4)', glowHover: 'rgba(244,63,94,0.7)' },
    ];

    return (
        // `padding-top: env(safe-area-inset-top)` extends the header's solid
        // background INTO the iOS status-bar zone. Without this, the
        // Capacitor webview's safe-area area is visually outside the header
        // (which sits at `top: 0` of the viewport, behind the status bar) and
        // page content scrolling underneath shows through the translucent
        // status-bar zone — the user sees text from the page bleeding above
        // POGOSPHERE on iPhone. We also drop the bg from black/80 → near-
        // solid black/95 so even with backdrop-blur there is no visible
        // transparency in the status-bar zone. The blur stays for the
        // glassy aesthetic on the desktop site.
        <header
            className="fixed top-0 left-0 w-full bg-black/95 backdrop-blur-md z-50 border-b border-white/10"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative z-50">
                <div className="flex items-center gap-2 md:gap-4 z-20 relative">
                    {pathname === '/' ? (
                        <Link href="/" className="p-1 -ml-2">
                            <img src="/aurora-spark.svg" alt="Home" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_20px_rgba(167,139,250,0.65)]" />
                        </Link>
                    ) : (
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 -ml-2 hover:opacity-80 transition-opacity"
                            aria-label="Menu"
                        >
                            <img src="/aurora-spark.svg" alt="Menu" className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_20px_rgba(167,139,250,0.55)]" />
                        </button>
                    )}

                    <Link
                        href="/"
                        className="group flex items-center transition-all duration-300"
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        <span className="text-lg md:text-xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] group-hover:drop-shadow-[0_0_20px_rgba(147,51,234,0.7)] transition-all duration-300">
                            POGOSPHERE
                        </span>
                    </Link>
                </div>

                <div className="flex items-center gap-3 md:gap-5 z-20 relative">
                    {/* Socials — visible on all screen sizes */}
                    <nav className="flex gap-3 md:gap-4 items-center">
                        {headerSocialLinks.map(({ href, label, Icon, hoverClass }) => (
                            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`text-white/50 transition-all duration-300 ${hoverClass}`} aria-label={label}>
                                <Icon className="w-5 h-5" />
                            </a>
                        ))}
                    </nav>

                    {/*
                     * PogoSphere Discord server invite icon — mirrors the
                     * Discord icon PogoPoitiers shows next to its login
                     * button. The invite is a permanent, unlimited-uses
                     * link created via the bot on the #welcome channel.
                     * Bumping the invite (generating a new one) is fine,
                     * just update the href here.
                     */}
                    {cityConfig.discordInvite && (
                    <a
                        href={cityConfig.discordInvite}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Join the ${cityConfig.siteName} Discord server`}
                        className="text-white/60 hover:text-[#5865F2] hover:drop-shadow-[0_0_8px_rgba(88,101,242,0.7)] transition-all duration-300"
                    >
                        <DiscordIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </a>
                    )}

                    {isLoggedIn ? (
                        <button
                            onClick={handleLogout}
                            className="relative px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 hover:scale-[1.05] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center whitespace-nowrap"
                            style={{
                                // Mirror PogoPoitiers' login/logout button styling — the alpha
                                // values (0.9 / 0.95 on the gradient stops, 0.45 on the border,
                                // 0.25 / 0.10 on the inner shadows) produce the soft "embossed"
                                // / glassy look that flat solid colours don't.
                                background: 'linear-gradient(135deg, rgba(192,132,252,0.9), rgba(147,51,234,0.95))',
                                border: '1px solid rgba(192,132,252,0.45)',
                                color: '#fff',
                                boxShadow: '0 6px 18px rgba(147,51,234,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.10)',
                            }}
                        >
                            {t('auth.logout')}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="relative px-4 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-300 hover:scale-[1.05] hover:-translate-y-0.5 active:scale-95 flex items-center justify-center whitespace-nowrap"
                            style={{
                                background: 'linear-gradient(135deg, rgba(192,132,252,0.9), rgba(147,51,234,0.95))',
                                border: '1px solid rgba(192,132,252,0.45)',
                                color: '#fff',
                                boxShadow: '0 6px 18px rgba(147,51,234,0.25), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.10)',
                            }}
                        >
                            {t('auth.login')}
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showMenu && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[100]"
                            onClick={() => setShowMenu(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="bg-gradient-to-b from-black/95 via-black/90 to-black/70 overflow-visible relative z-[101]"
                        >
                            <div className="max-w-4xl mx-auto px-4 py-6">
                                {/* Nav links: 3 on first row, 2 centered on second row (mobile) / single row (desktop) */}
                                <div className="hidden md:flex md:flex-nowrap justify-center items-center gap-4">
                                    {navLinks.map((link) => (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setShowMenu(false)}
                                            className={`text-white font-semibold py-2 px-4 text-xs rounded-full text-center transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 whitespace-nowrap bg-gradient-to-b ${link.color}`}
                                            style={{
                                                boxShadow: `0 3px 12px ${link.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 5px 20px ${link.glowHover}, inset 0 1px 0 rgba(255,255,255,0.3)`}
                                            onMouseLeave={(e) => e.currentTarget.style.boxShadow = `0 3px 12px ${link.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`}
                                        >
                                            {link.label}
                                        </Link>
                                    ))}
                                </div>
                                {/* Mobile: two rows of 3 */}
                                <div className="md:hidden flex flex-col gap-3">
                                    {/* 2×2 grid for the 4 nav items (was 2 rows of 3 when
                                        Community + Regionals were still in the list). */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {navLinks.slice(0, 2).map((link) => (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                onClick={() => setShowMenu(false)}
                                                className={`text-white font-semibold py-2 px-3 text-[10px] sm:text-xs rounded-full text-center transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 whitespace-nowrap bg-gradient-to-b ${link.color}`}
                                                style={{
                                                    boxShadow: `0 3px 12px ${link.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 5px 20px ${link.glowHover}, inset 0 1px 0 rgba(255,255,255,0.3)`}
                                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = `0 3px 12px ${link.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`}
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {navLinks.slice(2).map((link) => (
                                            <Link
                                                key={link.href}
                                                href={link.href}
                                                onClick={() => setShowMenu(false)}
                                                className={`text-white font-semibold py-2 px-3 text-[10px] sm:text-xs rounded-full text-center transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 whitespace-nowrap bg-gradient-to-b ${link.color}`}
                                                style={{
                                                    boxShadow: `0 3px 12px ${link.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = `0 5px 20px ${link.glowHover}, inset 0 1px 0 rgba(255,255,255,0.3)`}
                                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = `0 3px 12px ${link.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`}
                                            >
                                                {link.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Social icons row — mobile only (already visible in header on desktop) */}
                                <div className="flex gap-8 items-center justify-center w-full md:hidden mt-5 pt-4 border-t border-white/10">
                                    {socialLinks.map(({ href, label, Icon, hoverClass }) => (
                                        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={`text-white/50 transition-all duration-300 ${hoverClass}`} aria-label={label}>
                                            <Icon className="w-6 h-6" />
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Gradient fade at bottom edge — softens the menu's lower boundary into the blurred page */}
                            <div className="h-16 bg-gradient-to-b from-black/80 via-black/40 to-transparent absolute bottom-0 left-0 right-0 translate-y-full pointer-events-none" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onLogin={(userData) => {
                    setIsLoggedIn(true);
                    setShowAuthModal(false);
                }}
            />
        </header>
    );
}
