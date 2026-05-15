'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function PhotosPage() {
    const [selectedImage, setSelectedImage] = useState(null);
    const { t } = useLanguage();

    const photos = [
        {
            src: '/photos/photo-5.jpg',
            captionKey: 'community.photoCaption1',
            date: '23/08/2025'
        },
        {
            src: '/photos/photo-2.jpg',
            captionKey: 'community.photoCaption2',
            date: '22/08/2025'
        },
        {
            src: '/photos/photo-3.jpg',
            captionKey: 'community.photoCaption3',
            date: '29/06/2025',
            className: "sepia-[.25] saturate-[1.2] contrast-[1.1]"
        },
        {
            src: '/photos/photo-4.jpg',
            captionKey: 'community.photoCaption4',
            date: '27/08/2025',
            position: "object-[center_95%]"
        },
        {
            src: '/photos/photo-6.jpg',
            captionKey: 'community.photoCaption5',
            date: '22/08/2025',
            position: "object-[center_70%]"
        },
        {
            src: '/photos/photo-7.jpg',
            captionKey: 'community.photoCaption6',
            date: '19/07/2025'
        }
    ];

    return (
        <main className="min-h-screen bg-[#0a0a0a] text-white pt-24 pb-12 px-4 flex flex-col">
            <div className="max-w-[1600px] mx-auto w-full flex-grow flex flex-col items-center">
                <h1
                    className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase tracking-tighter bg-gradient-to-b from-purple-300/90 to-purple-600/90 bg-clip-text text-transparent mt-8 mb-16 drop-shadow-[0_0_16px_rgba(147,51,234,0.5)] text-center py-2"
                    style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                    {t('community.eventPhotos')}
                </h1>

                <div className="flex flex-wrap justify-center gap-6 w-full">
                    {photos.map((photo, index) => (
                        <div
                            key={index}
                            className="relative aspect-[16/10] group overflow-hidden rounded-2xl border border-white/10 bg-white/5 cursor-pointer shadow-2xl shadow-purple-900/10 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                            onClick={() => setSelectedImage(photo)}
                        >
                            <Image
                                src={photo.src}
                                alt={t('community.communityPhoto').replace('{index}', index + 1)}
                                fill
                                className={`object-cover transition-transform duration-700 group-hover:scale-105 ${photo.position || ''} ${photo.className || ''}`}
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            {/* Cinematic Minimalist Caption - Top Left Improved Visibility */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent pointer-events-none group-hover:from-black/90 transition-colors duration-500">
                                <div className="absolute top-0 left-0 right-0 p-4 md:p-6">
                                    <div className="flex items-stretch gap-4">
                                        <div className="w-0.5 bg-red-600/80 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.4)]" />
                                        <div className="flex-1 text-left py-0.5">
                                            <>
                                                    <p className="text-white/95 font-medium text-[13px] md:text-[15px] leading-tight tracking-wide drop-shadow-md">
                                                        {t(photo.captionKey)}
                                                    </p>
                                                    {photo.date && (
                                                        <div className="flex items-center gap-2 mt-1 opacity-80">
                                                            <p className="text-red-400 font-mono text-[9px] md:text-[10px] tracking-[0.1em] drop-shadow-sm">
                                                                {photo.date}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                        </div>
                    ))}
                </div>
            </div>



            {/* Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center">
                        <div className="relative w-full h-[80vh] md:h-[85vh]">
                            <Image
                                src={selectedImage.src}
                                alt={t('community.fullPhoto')}
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <p className="mt-4 text-gray-300 text-center max-w-2xl text-lg">
                            {t(selectedImage.captionKey)}{selectedImage.date ? ` — ${selectedImage.date}` : ''}
                        </p>
                        <button
                            className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                            onClick={() => setSelectedImage(null)}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
