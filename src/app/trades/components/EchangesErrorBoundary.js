'use client';

import { Component } from 'react';
import { translations } from '@/lib/i18n';

// Error Boundary to prevent "Application error" crash screen
class EchangesErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('EchangesPage Error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            // Detect language from localStorage (class components can't use hooks)
            const lang = (typeof window !== 'undefined' && localStorage.getItem('pogosphere_lang')) || 'fr';
            const t = (key) => {
                const parts = key.split('.');
                let val = translations[lang];
                for (const p of parts) val = val?.[p];
                return val || key;
            };
            return (
                <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-lg text-center">
                        <div className="text-5xl mb-4">😵</div>
                        <h2 className="text-xl font-bold text-white mb-2">{t('errorBoundary.title')}</h2>
                        <p className="text-gray-400 mb-6">{t('errorBoundary.message')}</p>
                        <button onClick={() => { localStorage.removeItem('pokemon_user'); window.location.reload(); }} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors mr-3">{t('errorBoundary.resetButton')}</button>
                        <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">{t('errorBoundary.reloadButton')}</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default EchangesErrorBoundary;
