'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForceJapanese() {
    const router = useRouter();
    useEffect(() => {
        try {
            // Match the key used by LanguageContext.
            localStorage.setItem('pogosphere_lang', 'ja');
            document.documentElement.lang = 'ja';
        } catch { /* localStorage may be blocked */ }
        router.replace('/');
    }, [router]);
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-gray-400 text-sm">
            日本語に切り替え中…
        </div>
    );
}
