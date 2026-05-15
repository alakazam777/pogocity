'use client';

/**
 * MobileBottomNav — floating 4-tab bottom navigation rendered ONLY inside
 * the Capacitor mobile app (iOS + Android). Hidden on every desktop and
 * mobile web browser visit.
 *
 * Visual: transparent glassmorphism pill anchored to the bottom of the
 * viewport, four equal slots (Pokématos · Classements · Échanges ·
 * Manager). A second transparent pill ("bubble") sits behind the active
 * slot — framer-motion's shared layoutId glides it laterally between
 * slots whenever the route changes, with a soft spring (no manual offset
 * math needed; framer-motion measures both layouts and animates the
 * delta automatically).
 *
 * Why Capacitor-only:
 *   – The web header already gives desktop / mobile-web users a fully
 *     functional nav. Stacking a second nav below would be visual noise.
 *   – Apple HIG + Material Design both expect native apps to have a
 *     tab bar at the bottom; web doesn't. This is purely an in-app
 *     ergonomic win.
 *
 * Why it ships without a Play Store / App Store update:
 *   The Capacitor webview loads https://pogosphere.com live. Any change
 *   to the website code propagates to both the iOS app and the Android
 *   app on the next webview reload — no rebuild of the IPA / AAB needed.
 *
 * Detection mirrors EulaGate.isCapacitorNative() so the gating is
 * consistent across the app shell.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Radar, Trophy, ArrowRightLeft, Package } from 'lucide-react';

// Mirror of EulaGate.isCapacitorNative() — kept inline (rather than
// extracted into a shared util) because the two callsites are the only
// users today and the function is 5 lines. Extract if a third gate
// component appears.
function isCapacitorNative() {
    if (typeof window === 'undefined') return false;
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap?.isNative) return true;
    if (typeof navigator !== 'undefined' && /Capacitor/i.test(navigator.userAgent || '')) return true;
    return false;
}

// Tab definitions — order matters (left-to-right slot order). Keep this
// list at exactly 4 items unless you also adjust the grid-cols-4 below;
// 5+ items pack the labels too tightly on small phones.
//
// `match` is how we decide which tab is active for the current pathname:
//   – string starting with '=' → exact match (after stripping the '=')
//   – plain string             → prefix match (handles /rankings/local,
//                                /rankings/global, etc — the rankings
//                                route is a [[...view]] catchall)
const TABS = [
    { label: 'Pokématos',  href: '/pokematos',  icon: Radar,          match: '/pokematos' },
    { label: 'Classements', href: '/rankings',  icon: Trophy,         match: '/rankings'  },
    { label: 'Échanges',    href: '/trades',    icon: ArrowRightLeft, match: '/trades'    },
    { label: 'Manager',     href: '/manager',   icon: Package,        match: '/manager'   },
];

// Routes where the bottom nav should NOT appear even inside the
// Capacitor wrapper. Admin tools and the EULA / onboarding gates would
// be cluttered by a tab bar.
const HIDDEN_PREFIXES = ['/admin', '/uploads', '/account-deletion'];

function isActive(pathname, tab) {
    if (!pathname) return false;
    if (tab.match.startsWith('=')) {
        return pathname === tab.match.slice(1);
    }
    return pathname === tab.match || pathname.startsWith(tab.match + '/');
}

export default function MobileBottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [isNative, setIsNative] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setIsNative(isCapacitorNative());
    }, []);

    // ── Aggressive prefetch on first mount in the native app ─────────
    // Next.js App Router only auto-prefetches <Link> components that
    // enter the viewport. We use <button onClick> here (to keep the
    // framer-motion bubble layout clean), so we trigger router.prefetch
    // manually for every tab the moment the app boots. Wrapped in
    // requestIdleCallback (with a setTimeout fallback for older
    // WebKit) so the prefetch waterfall never blocks initial paint or
    // the Cesium globe on the homepage. Once primed, tab switches feel
    // near-instant because the JS bundle + RSC payload are already in
    // memory by the time the user taps.
    useEffect(() => {
        if (!isNative) return;
        const idle = typeof window !== 'undefined' && window.requestIdleCallback
            ? window.requestIdleCallback
            : (cb) => setTimeout(cb, 250);
        const cancelIdle = typeof window !== 'undefined' && window.cancelIdleCallback
            ? window.cancelIdleCallback
            : clearTimeout;
        const handles = TABS.map((tab, i) =>
            // Stagger by 80ms per tab so we don't slam the network with
            // 4 parallel requests on cold boot — each gets its own
            // idle slice.
            idle(() => {
                try { router.prefetch(tab.href); } catch { /* noop */ }
            }, { timeout: 1500 + i * 80 })
        );
        return () => handles.forEach((h) => { try { cancelIdle(h); } catch { /* noop */ } });
    }, [isNative, router]);

    if (!mounted || !isNative) return null;
    if (HIDDEN_PREFIXES.some(p => pathname?.startsWith(p))) return null;

    const activeIndex = TABS.findIndex(t => isActive(pathname, t));

    return (
        <div
            // Anchored to the bottom with a safe-area inset so it floats
            // above the iPhone home-indicator bar. pointer-events-none on
            // the wrapper lets touches pass through the gap; only the
            // pill itself receives events.
            className="fixed left-0 right-0 z-[80] flex justify-center pointer-events-none px-4"
            style={{
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
            }}
        >
            <nav
                role="tablist"
                aria-label="Navigation principale"
                className="pointer-events-auto relative grid grid-cols-4 gap-1 p-1.5 rounded-full border border-white/15 bg-black/35 backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
                style={{
                    // Slightly wider than content so the bubble has breathing
                    // room and 4 labels never wrap on the narrowest iPhones
                    // (iPhone SE / 5.4" ≈ 320pt content width).
                    minWidth: 'min(420px, calc(100vw - 24px))',
                    maxWidth: 'min(520px, calc(100vw - 24px))',
                    // Subtle outer halo that picks up the page bg through
                    // the blur — feels glass-on-glass.
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                }}
            >
                {TABS.map((tab, i) => {
                    const active = i === activeIndex;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.href}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-label={tab.label}
                            // touchstart warm-up — fires the prefetch ~50ms
                            // before onClick (the time between finger-down
                            // and finger-up). On a slow connection this can
                            // shave another 100-200ms off the perceived
                            // transition. No-op for tabs already cached by
                            // the boot prefetch above.
                            onTouchStart={() => {
                                if (active) return;
                                try { router.prefetch(tab.href); } catch { /* noop */ }
                            }}
                            onClick={() => {
                                // No-op tap on the already-active tab —
                                // mirrors native iOS behaviour (and avoids
                                // a useless re-render / scroll jump).
                                if (active) return;
                                router.push(tab.href);
                            }}
                            className="relative flex flex-col items-center justify-center py-2 px-1 rounded-full transition-colors duration-200 active:scale-95"
                        >
                            {/* Sliding bubble — only ONE element in the
                                tree has this layoutId at a time, so
                                framer-motion animates it between the
                                previous active slot and the new one. */}
                            {active && (
                                <motion.span
                                    layoutId="mobile-nav-bubble"
                                    className="absolute inset-0 rounded-full bg-white/12 border border-white/20"
                                    style={{
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 10px rgba(0,0,0,0.25)',
                                    }}
                                    transition={{
                                        // Spring tuned so the bubble feels
                                        // physical without being bouncy —
                                        // overshoot ≈ 1px, settles ~250ms.
                                        type: 'spring',
                                        stiffness: 420,
                                        damping: 36,
                                        mass: 0.9,
                                    }}
                                    aria-hidden="true"
                                />
                            )}
                            <span className="relative z-10 flex flex-col items-center gap-0.5">
                                <Icon
                                    size={20}
                                    strokeWidth={active ? 2.2 : 1.8}
                                    className={active ? 'text-white' : 'text-white/65'}
                                />
                                <span
                                    className={`text-[10px] font-medium leading-none whitespace-nowrap transition-colors ${active ? 'text-white' : 'text-white/55'}`}
                                    style={{
                                        fontFamily: 'var(--font-outfit), sans-serif',
                                        letterSpacing: '0.01em',
                                    }}
                                >
                                    {tab.label}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
