'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

export default function Home() {
    const { t } = useLanguage();
    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-purple-500/30 selection:text-purple-200">
            <div className="pt-24 md:pt-32 pb-20 px-6 text-center">
                <div className="max-w-[1600px] mx-auto mb-8 md:mb-12 relative w-full h-80 md:h-[650px] rounded-2xl overflow-hidden border border-purple-500/20 shadow-2xl shadow-purple-900/20 bg-black">
                    <Image
                        src="/community-hero-optimized.jpg"
                        alt="PogoSphere Community"
                        fill
                        className="object-cover object-[center_85%]"
                        priority
                        quality={100}
                        unoptimized
                    />
                    {/* --- Fog/Haze Layer --- */}
                    <div className="absolute bottom-0 left-0 w-full h-[60vh] bg-gradient-to-t from-white/10 via-white/5 to-transparent pointer-events-none z-10 blur-2xl opacity-50"></div>
                    <div className="absolute inset-0 bg-black/20"></div>
                </div>

                <div className="w-full mx-auto mb-8 md:mb-12 space-y-4 md:space-y-6 px-4">

                    <p className="text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent w-full mx-auto leading-relaxed drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] md:whitespace-nowrap">
                        {t('home.portalWelcome')}
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 md:mt-12 max-w-4xl mx-auto">
                    <Link
                        href="/pokematos"
                        className="px-3 md:px-5 py-1.5 md:py-2 bg-blue-600/90 text-white text-xs md:text-sm font-bold rounded-full hover:bg-blue-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.6)] hover:shadow-[0_0_35px_rgba(37,99,235,0.9)]"
                    >
                        {t('home.menuPokematos')}
                    </Link>
                    <Link
                        href="/trades"
                        className="px-3 md:px-5 py-1.5 md:py-2 bg-green-600/90 text-white text-xs md:text-sm font-bold rounded-full hover:bg-green-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(22,163,74,0.6)] hover:shadow-[0_0_35px_rgba(22,163,74,0.9)]"
                    >
                        {t('home.menuTradeHall')}
                    </Link>
                    <Link
                        href="/rankings"
                        className="px-3 md:px-5 py-1.5 md:py-2 bg-purple-600/90 text-white text-xs md:text-sm font-bold rounded-full hover:bg-purple-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(147,51,234,0.6)] hover:shadow-[0_0_35px_rgba(147,51,234,0.9)]"
                    >
                        {t('home.menuRankings')}
                    </Link>

                    <Link
                        href="/events"
                        className="px-3 md:px-5 py-1.5 md:py-2 bg-teal-600/90 text-white text-xs md:text-sm font-bold rounded-full hover:bg-teal-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(13,148,136,0.6)] hover:shadow-[0_0_35px_rgba(13,148,136,0.9)]"
                    >
                        {t('home.menuEvents')}
                    </Link>
                </div>

                <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-4 max-w-4xl mx-auto">
                    <Link
                        href="/presentations"
                        className="px-3 md:px-5 py-1.5 md:py-2 bg-pink-600/90 text-white text-xs md:text-sm font-bold rounded-full hover:bg-pink-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(236,72,153,0.6)] hover:shadow-[0_0_35px_rgba(236,72,153,0.9)]"
                    >
                        {t('home.menuPresentations')}
                    </Link>
                    <Link
                        href="/photos"
                        className="px-3 md:px-5 py-1.5 md:py-2 bg-indigo-600/90 text-white text-xs md:text-sm font-bold rounded-full hover:bg-indigo-500 transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.6)] hover:shadow-[0_0_35px_rgba(79,70,229,0.9)]"
                    >
                        {t('home.menuPhotos')}
                    </Link>
                </div>


            </div>
        </main>
    );
}
