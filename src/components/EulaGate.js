'use client';

/**
 * EulaGate — universal Terms-of-Service gate for App Store Guideline 1.2
 * compliance.
 *
 * Apple App Review rejected v1.0 because the app surfaces user-generated
 * content (trades, profiles, messages, friend codes, presentations,
 * community submissions) without an explicit per-user acceptance of an
 * EULA stating zero tolerance for objectionable content / abusive users.
 *
 * Strategy: this component is mounted at the layout root. It reads the
 * current user from localStorage (`pokemon_user`), checks the user's
 * `termsVersion` against the latest published `TERMS_VERSION` constant,
 * and — if they don't match — renders a non-dismissable full-screen
 * modal that BLOCKS the rest of the app until the user explicitly taps
 * "I accept". On accept, POST /api/auth/accept-terms records the
 * timestamp + version on the server, the local user object is updated,
 * and the modal hides.
 *
 * Why localStorage as the source of truth:
 *   - The website auth model already keeps `pokemon_user` in
 *     localStorage as the "currently logged-in user" pointer (set by
 *     AuthModal, the OAuth callback handler, the rehydrate-from-cookie
 *     flow in Header.js, etc.).
 *   - Reading there avoids needing to plumb React context through every
 *     page; the gate works regardless of which auth path created the
 *     account (username/password, Discord OAuth, Apple OAuth).
 *
 * The modal has NO close button — Apple specifically wants explicit
 * positive consent, not a dismiss-equals-accept dark pattern. The user
 * may opt to log out (link inside the modal) which clears the local
 * session and gives them a fresh start.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TERMS_VERSION } from '@/lib/legalContent';
import { useLanguage } from '@/context/LanguageContext';

function readUser() {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('pokemon_user') : null;
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// The EULA gate exists exclusively to satisfy App Store Guideline 1.2 —
// Apple wants explicit per-user EULA acceptance before any UGC access.
// Outside the Capacitor wrapper (desktop browsers, mobile browsers
// visiting pogosphere.com directly) the gate is unnecessary friction
// and gets in the way of the conversion funnel. Mirror the detection
// used in IosSpriteShield so the gate only renders inside the actual
// iOS/Android app webview.
function isCapacitorNative() {
    if (typeof window === 'undefined') return false;
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap?.isNative) return true;
    if (typeof navigator !== 'undefined' && /Capacitor/i.test(navigator.userAgent || '')) return true;
    return false;
}

// Anonymous users (no logged-in account) need to accept the EULA too —
// App Store Guideline 1.2 requires the agreement to be presented BEFORE
// the user can access user-generated content. Since we surface UGC
// (trainer profiles, trades, friend codes, the leaderboard, etc.) to
// unauthenticated visitors too, the gate must run for them as well.
// We persist their acceptance in localStorage under this key, paired
// with the version string so future TERMS_VERSION bumps re-prompt
// everyone uniformly.
const ANON_KEY = 'pogo_anon_terms_version';

function readAnonAccepted() {
    try {
        return typeof window !== 'undefined' ? localStorage.getItem(ANON_KEY) : null;
    } catch {
        return null;
    }
}

export default function EulaGate() {
    const [user, setUser] = useState(null);
    const [anonAccepted, setAnonAccepted] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const { lang } = useLanguage();

    // Keep `user` in sync with localStorage. We re-read on mount, on the
    // `storage` event (cross-tab login/logout), and on the same-tab
    // synthetic event Header.js dispatches after rehydrating from
    // cookies. Without these listeners, a user who logs in inside a
    // separate component wouldn't trigger the gate.
    useEffect(() => {
        setMounted(true);
        const sync = () => {
            setUser(readUser());
            setAnonAccepted(readAnonAccepted());
        };
        sync();
        if (typeof window === 'undefined') return;
        window.addEventListener('storage', sync);
        window.addEventListener('focus', sync);
        return () => {
            window.removeEventListener('storage', sync);
            window.removeEventListener('focus', sync);
        };
    }, []);

    // Gate fires ONLY inside the Capacitor wrapper (iOS / Android app),
    // and only when acceptance is stale or missing. Web visitors are
    // never gated. The two stale-acceptance branches are:
    //   1. Logged-in user whose recorded termsVersion doesn't match the
    //      current published TERMS_VERSION.
    //   2. Anonymous user whose localStorage acceptance doesn't match
    //      the current TERMS_VERSION (or has never accepted at all).
    const needsAcceptance = isCapacitorNative() && (
        user
            ? user.termsVersion !== TERMS_VERSION
            : anonAccepted !== TERMS_VERSION
    );

    const handleAccept = async () => {
        setAccepting(true);
        setError('');

        // Anonymous path: record acceptance in localStorage only.
        // No server round-trip needed since we have no account to attach
        // it to. Apple Guideline 1.2 just requires explicit consent BEFORE
        // accessing UGC — storing the consent version locally is enough
        // to gate the rest of the session.
        if (!user?.username) {
            try {
                localStorage.setItem(ANON_KEY, TERMS_VERSION);
                setAnonAccepted(TERMS_VERSION);
                try { window.dispatchEvent(new Event('storage')); } catch { /* noop */ }
            } catch (e) {
                setError('Could not record acceptance. Please enable storage and retry.');
            } finally {
                setAccepting(false);
            }
            return;
        }

        // Logged-in path: record server-side so future logins from other
        // devices don't re-prompt.
        try {
            const res = await fetch('/api/auth/accept-terms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username: user.username, termsVersion: TERMS_VERSION }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            const next = { ...user, termsAcceptedAt: data.termsAcceptedAt, termsVersion: data.termsVersion };
            localStorage.setItem('pokemon_user', JSON.stringify(next));
            // Also mirror the acceptance under ANON_KEY so the gate
            // doesn't re-fire if the user later logs out — they've
            // already explicitly agreed in this browser session.
            localStorage.setItem(ANON_KEY, TERMS_VERSION);
            setUser(next);
            setAnonAccepted(TERMS_VERSION);
            try { window.dispatchEvent(new Event('storage')); } catch { /* noop */ }
        } catch (e) {
            setError(e?.message || 'Could not record acceptance. Please try again.');
        } finally {
            setAccepting(false);
        }
    };

    const handleLogout = () => {
        try {
            localStorage.removeItem('pokemon_user');
            localStorage.removeItem('pogo_saved_user');
        } catch { /* noop */ }
        try { window.dispatchEvent(new Event('storage')); } catch { /* noop */ }
        // Hard reload so NextAuth session + Header state both reset cleanly.
        window.location.assign('/');
    };

    if (!mounted || !needsAcceptance) return null;

    const isFr = lang === 'fr';
    const t = isFr ? FR : EN;

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="eula-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000]"
                aria-hidden="true"
            />
            <motion.div
                key="eula-modal"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="eula-title"
            >
                <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
                    <div className="px-6 pt-6 pb-4">
                        <h2
                            id="eula-title"
                            className="text-2xl font-extrabold uppercase tracking-tight bg-gradient-to-b from-purple-300 to-purple-600 bg-clip-text text-transparent"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            {t.title}
                        </h2>
                        <p className="text-gray-400 text-sm mt-1.5">{t.subtitle}</p>
                    </div>

                    <div className="px-6 pb-2 text-sm text-gray-300 space-y-3 leading-relaxed">
                        <p>{t.zeroTolerance}</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-400 pl-1">
                            <li>{t.item1}</li>
                            <li>{t.item2}</li>
                            <li>{t.item3}</li>
                            <li>{t.item4}</li>
                        </ul>
                        <p className="text-gray-400">
                            {t.linksPrefix}
                            {' '}
                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                                {t.termsOfService}
                            </a>
                            {' '}{t.and}{' '}
                            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">
                                {t.privacyPolicy}
                            </a>
                            .
                        </p>
                    </div>

                    {error && (
                        <div className="mx-6 mt-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2.5 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="px-6 py-5 space-y-3">
                        <button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full py-3 px-6 rounded-full bg-gradient-to-b from-purple-500 to-purple-700 text-white font-semibold transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:translate-y-0 shadow-[0_3px_14px_rgba(147,51,234,0.4),inset_0_1px_0_rgba(255,255,255,0.25)]"
                        >
                            {accepting ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t.recording}
                                </span>
                            ) : t.accept}
                        </button>
                        <button
                            onClick={handleLogout}
                            type="button"
                            className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
                        >
                            {t.logout}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

const EN = {
    title: 'Community Standards',
    subtitle: 'Before continuing, please review and accept our updated Terms of Service.',
    zeroTolerance: 'We have zero tolerance for objectionable content or abusive users. By continuing, you agree NOT to post content that is:',
    item1: 'Illegal, harassing, hateful, defamatory, or discriminatory',
    item2: 'Sexually explicit, pornographic, or harmful to minors',
    item3: 'Spam, scams, phishing, or unsolicited advertising',
    item4: 'In violation of anyone\'s intellectual property or privacy',
    linksPrefix: 'Reports of objectionable content are reviewed within 24 hours. Use the Report and Block buttons on every user-generated post. Read the full',
    termsOfService: 'Terms of Service',
    and: 'and',
    privacyPolicy: 'Privacy Policy',
    accept: 'I agree — continue',
    recording: 'Recording…',
    logout: 'Log out instead',
};

const FR = {
    title: 'Règles de la communauté',
    subtitle: 'Avant de continuer, veuillez consulter et accepter nos Conditions d\'utilisation mises à jour.',
    zeroTolerance: 'Nous appliquons une tolérance zéro envers tout contenu inapproprié ou comportement abusif. En continuant, vous vous engagez à NE PAS publier de contenu :',
    item1: 'Illégal, harcelant, haineux, diffamatoire ou discriminatoire',
    item2: 'Sexuellement explicite, pornographique ou nuisible aux mineurs',
    item3: 'De type spam, escroquerie, hameçonnage ou publicité non sollicitée',
    item4: 'Enfreignant la propriété intellectuelle ou la vie privée d\'autrui',
    linksPrefix: 'Les signalements de contenu inapproprié sont examinés sous 24 heures. Utilisez les boutons Signaler et Bloquer sur chaque publication. Lisez les',
    termsOfService: 'Conditions d\'utilisation',
    and: 'et',
    privacyPolicy: 'Politique de confidentialité',
    accept: 'J\'accepte — continuer',
    recording: 'Enregistrement…',
    logout: 'Se déconnecter',
};
