'use client';

import React, { useEffect, useState } from 'react';

export default function SnowEffect() {
    const [snowflakes, setSnowflakes] = useState([]);

    useEffect(() => {
        // Generate snowflakes on client-side to match screen/prevent hydration mismatch
        const flakes = [...Array(50)].map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            animationDuration: 10 + Math.random() * 10,
            animationDelay: -Math.random() * 20, // Negative delay to start mid-animation
            opacity: Math.random() * 0.5 + 0.3,
            size: Math.random() * 3 + 2
        }));
        setSnowflakes(flakes);
    }, []);

    return (
        <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
            <style jsx>{`
                @keyframes snow-fall {
                    0% { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { transform: translateY(110vh) translateX(20px) rotate(360deg); opacity: 0; }
                }
            `}</style>
            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="absolute bg-white/80 rounded-full blur-[1px]"
                    style={{
                        left: `${flake.left}%`,
                        top: `-20px`, // Start above screen
                        width: `${flake.size}px`,
                        height: `${flake.size}px`,
                        opacity: flake.opacity,
                        animation: `snow-fall ${flake.animationDuration}s linear infinite`,
                        animationDelay: `${flake.animationDelay}s`
                    }}
                />
            ))}
        </div>
    );
}
