'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '@/lib/i18n';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('en');

    useEffect(() => {
        // Sphere-specific key so PogoPoitiers preferences don't leak in,
        // and any old `pogo_lang=fr` from previous testing is ignored.
        const saved = localStorage.getItem('pogosphere_lang');
        if (saved && ['fr', 'en', 'ja'].includes(saved)) {
            setLang(saved);
        }
    }, []);

    const changeLang = useCallback((newLang) => {
        setLang(newLang);
        localStorage.setItem('pogosphere_lang', newLang);
        // Update html lang attribute
        document.documentElement.lang = newLang;
    }, []);

    const t = useCallback((key, params) => {
        const keys = key.split('.');
        let value = translations[lang];
        for (const k of keys) {
            value = value?.[k];
        }
        if (value === undefined) {
            // Fallback to French
            let fallback = translations['fr'];
            for (const k of keys) {
                fallback = fallback?.[k];
            }
            value = fallback || key;
        }
        // Replace params like {name} in the string
        if (params && typeof value === 'string') {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
            });
        }
        return value;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, changeLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
}
