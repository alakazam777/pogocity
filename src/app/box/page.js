'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useLanguage } from '@/context/LanguageContext';
import BoiteDashboard from '@/components/pokemon/BoiteDashboard';

export default function BoitePage() {
    const { t } = useLanguage();
    const { status } = useSession();
    const loadingSession = status === 'loading';

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                        <span className="w-2 h-9 bg-purple-500 rounded-full"></span>
                        {t('manager.list.pageTitle')}
                    </h1>
                    <Link href="/pokematos"
                        className="text-sm text-purple-300 hover:text-purple-200 flex items-center gap-1.5">
                        <ArrowLeft size={16} />
                        {t('nav.pokematos')}
                    </Link>
                </div>

                <div className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-xl p-4 md:p-6">
                    {loadingSession ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
                        </div>
                    ) : (
                        <BoiteDashboard />
                    )}
                </div>
            </div>
        </div>
    );
}
