'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';

const languages = [
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'ja', flag: '🇯🇵', label: '日本語' },
];

// Globe SVG icon component
const GlobeIcon = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

export default function LanguageSwitcher() {
    const { lang, changeLang } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentFlag = languages.find(l => l.code === lang)?.flag || '🌐';

    return (
        <div className="fixed bottom-4 right-16 md:right-[5.25rem] z-20" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="gravity-target w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/10 transition-all duration-300 shadow-lg hover:shadow-white/20 group"
                aria-label="Change language"
                title="Language"
            >
                <GlobeIcon className="w-[18px] h-[18px] group-hover:scale-110 transition-transform" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 bottom-full mb-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[140px]"
                    >
                        {languages.map(({ code, flag, label }) => (
                            <button
                                key={code}
                                onClick={() => { changeLang(code); setIsOpen(false); }}
                                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-all duration-200 ${
                                    lang === code
                                        ? 'bg-white/10 text-white'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                                }`}
                            >
                                <span className="text-base">{flag}</span>
                                <span className="font-medium">{label}</span>
                                {lang === code && (
                                    <span className="ml-auto text-blue-400 text-xs">●</span>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
