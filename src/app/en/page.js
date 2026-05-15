'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Shareable language entry point. Hitting /en sets the persistent
// language preference to English and bounces to the home page so the
// rest of the site renders in EN. Pair routes exist for /fr and /ja.
export default function ForceEnglish() {
    const router = useRouter();
    useEffect(() => {
        try {
            // Match the key used by LanguageContext.
            localStorage.setItem('pogosphere_lang', 'en');
            document.documentElement.lang = 'en';
        } catch { /* localStorage may be blocked */ }
        router.replace('/');
    }, [router]);
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400 text-sm">
            Switching to English…
        </div>
    );
}
