'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Per-route enter animation. The slow 500ms fade-in feels premium on
// the web (especially the homepage globe reveal), but inside the
// Capacitor iOS/Android app it adds half a second of perceived lag
// between every tab switch on the floating bottom nav — exactly the
// opposite of the "native tab bar" feel we're aiming for. So we
// detect the wrapper at mount and swap to a snappier 120ms fade with
// no vertical slide when in the app. Web visitors keep the original
// motion. Same detection pattern as EulaGate / MobileBottomNav.
function isCapacitorNative() {
    if (typeof window === 'undefined') return false;
    const cap = window.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    if (cap?.isNative) return true;
    if (typeof navigator !== 'undefined' && /Capacitor/i.test(navigator.userAgent || '')) return true;
    return false;
}

export default function Template({ children }) {
    // SSR + initial client paint must use the SAME values to avoid a
    // hydration mismatch warning. We start with the "web" defaults and
    // only swap to "native" values after mount detects Capacitor.
    const [native, setNative] = useState(false);
    useEffect(() => { setNative(isCapacitorNative()); }, []);

    const initial = native ? { opacity: 0 } : { opacity: 0, y: 20 };
    const animate = native ? { opacity: 1 } : { opacity: 1, y: 0 };
    const exit    = native ? { opacity: 0 } : { opacity: 0, y: 20 };
    const transition = native
        ? { ease: 'easeOut', duration: 0.12 }   // ~120ms, no slide — feels native
        : { ease: 'easeInOut', duration: 0.5 }; // ~500ms cinematic fade for web

    return (
        <motion.div
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
        >
            {children}
        </motion.div>
    );
}
