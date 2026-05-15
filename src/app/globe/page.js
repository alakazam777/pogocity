'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/context/LanguageContext';

import { CITY_COORDS } from '@/lib/cityCoords';
import cityConfig from '@/lib/cityConfig';

function GlobeLoader() {
    return (
        <div className="fixed inset-0 bg-[#050510] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
    );
}

const PlanetGlobe = dynamic(() => import('@/components/PlanetGlobe'), {
    ssr: false,
    loading: () => <GlobeLoader />,
});

export default function GlobePage() {
    const { t } = useLanguage();
    const [selectedForm, setSelectedForm] = useState(null);
    const [playerMarkers, setPlayerMarkers] = useState([]);

    useEffect(() => {
        fetch('/api/pokemon/leaderboard')
            .then(res => res.json())
            .then(data => {
                const users = Array.isArray(data) ? data : [];
                const markers = users
                    .filter(u => u.city)
                    .map(u => {
                        const coords = CITY_COORDS[u.city.toLowerCase().trim()];
                        if (!coords) return null;
                        const teamColors = {
                            'Mystic': '#4a90d9',
                            'Valor': '#e74c3c',
                            'Instinct': '#f1c40f',
                        };
                        return {
                            username: u.username,
                            lat: coords.lat + (Math.random() - 0.5) * 0.8,
                            lng: coords.lng + (Math.random() - 0.5) * 0.8,
                            color: teamColors[u.team] || '#a78bfa',
                        };
                    })
                    .filter(Boolean);
                setPlayerMarkers(markers);
            })
            .catch(() => {});
    }, []);

    const onSelectForm = useCallback((form) => {
        setSelectedForm(form);
    }, []);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#050510]">
            <PlanetGlobe
                selectedForm={selectedForm}
                onSelectForm={onSelectForm}
                showPrismillon={true}
                showRegionals={true}
                modalOpen={false}
                stylized={false}
                playerMarkers={playerMarkers}
            />

            {/* Footer */}
            <div className="fixed bottom-4 left-0 w-full text-center text-[10px] md:text-xs font-light z-20 pointer-events-none text-white/30">
                &copy; {new Date().getFullYear()} {cityConfig.siteName}
            </div>

            <style>{`
                footer { display: none !important; }
            `}</style>
        </div>
    );
}
