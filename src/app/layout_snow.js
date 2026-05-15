'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Cloud, CloudRain, Sun, Moon, Wind, Menu, X, ArrowRight, CloudLightning, CloudSnow, Droplets } from 'lucide-react';

// --- Assets & Icons ---

const WeatherIcon = ({ code, className }) => {
    // WMO Weather interpretation codes (http://www.wmo.int/pages/prog/www/IMOP/publications/CIMO-Guide/Updates/ON_M_04_02_e.pdf)
    if (code <= 1) return <Sun className={className} />; // Clear
    if (code <= 3) return <Cloud className={className} />; // Cloudy/Partly Cloudy
    if (code <= 48) return <Wind className={className} />; // Fog/Mist -> Windy visual roughly
    if (code <= 57) return <Droplets className={className} />; // Drizzle
    if (code <= 67) return <CloudRain className={className} />; // Rain
    if (code <= 77) return <CloudSnow className={className} />; // Snow
    if (code <= 82) return <CloudRain className={className} />; // Heavy Rain
    if (code <= 86) return <CloudSnow className={className} />; // Snow Showers
    if (code <= 99) return <CloudLightning className={className} />; // Thunderstorm
    return <Cloud className={className} />;
};

const getPokemonTypeBoost = (weatherData) => {
    const code = weatherData.weathercode;
    const windSpeed = weatherData.windspeed;

    // PoGO Windy Threshold (approx > 24km/h or often reported incorrectly, but let's prioritize it if wind is high)
    if (windSpeed > 24) return ["Dragon", "Vol", "Psy"]; // Windy

    // Simplified mapping of weather codes to PoGO Types - FRENCH
    if (code === 0) return ["Plante", "Sol", "Feu"]; // Clear -> Sunny
    if (code <= 2) return ["Normal", "Roche"]; // 1, 2 -> Partly Cloudy
    if (code === 3) return ["Fée", "Combat", "Poison"]; // 3 -> Cloudy
    if (code <= 48) return ["Spectre", "Ténèbres"]; // Fog
    if (code >= 51 && code <= 67) return ["Eau", "Électrik", "Insecte"]; // Rain
    if (code >= 71 && code <= 77) return ["Glace", "Acier"]; // Snow
    if (code >= 80 && code <= 82) return ["Eau", "Électrik", "Insecte"]; // Rain Showers
    if (code >= 85 && code <= 86) return ["Glace", "Acier"]; // Snow Showers
    if (code >= 95) return ["Eau", "Électrik", "Insecte"]; // Thunderstorm 
    return ["Normal", "Roche"]; // Default
};

// --- Components ---

const CitySilhouette = ({ color }) => (
    <svg viewBox="0 0 1200 300" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
        {/* Abstract Poitiers Skyline: Futuroscope Crystals (Left) & Notre-Dame (Center/Right) */}
        <path
            d="M0,300 L0,250 
         L50,250 L80,180 L110,250 
         L130,250 L160,150 L190,250 
         L250,250 
         L300,200 L350,200 L350,180 L380,160 L410,180 L410,200 L450,200 L450,250
         L530,250 
         L550,180 L585,180 L600,150 L615,180 L650,180
         L670,250 
         L1200,250 L1200,300 Z"
            fill={color}
        />
        {/* Ground Fill */}
        <rect x="0" y="250" width="1200" height="50" fill={color} />
    </svg>
);

const FloatingParticle = ({ type, delay, duration, left }) => (
    <div
        className={`absolute rounded-full opacity-60 animate-float ${type === 'night' ? 'bg-yellow-200 shadow-[0_0_10px_rgba(255,255,0,0.8)] w-1 h-1' : 'bg-white/40 w-2 h-2'}`}
        style={{
            left: `${left}%`,
            bottom: '-10px',
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`
        }}
    />
);

const RainEffect = () => (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {[...Array(100)].map((_, i) => (
            <div
                key={i}
                className="absolute bg-blue-200/40 w-[1px] md:w-[2px] h-[10px] md:h-[20px] rounded-full animate-rain"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * -20}%`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    animationDelay: `${Math.random() * 2}s`
                }}
            />
        ))}
    </div>
);

const SnowEffect = () => (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {[...Array(50)].map((_, i) => (
            <div
                key={i}
                className="absolute bg-white/80 rounded-full animate-snow blur-[1px]"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * -20}%`,
                    width: `${Math.random() * 3 + 2}px`,
                    height: `${Math.random() * 3 + 2}px`,
                    animationDuration: `${10 + Math.random() * 10}s`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: Math.random() * 0.5 + 0.5
                }}
            />
        ))}
    </div>
);

const ParkTrees = ({ color, onFountainClick }) => (
    <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="xMaxYMax meet">
        {/* Simple Pine/Park Trees */}
        <path
            d="M50,200 L80,100 L110,200 Z
         M90,200 L120,80 L150,200 Z
         M260,200 L300,90 L340,200 Z"
            fill={color}
        />
        {/* Fountain - Clickable */}
        <g onClick={onFountainClick} style={{ cursor: 'pointer', pointerEvents: 'all' }}>
            <path d="M180,200 L180,195 Q180,180 160,180 L220,180 Q200,180 200,195 L200,200 Z" fill={color} />
            <rect x="188" y="160" width="4" height="20" fill={color} />
            {/* Water Jets */}
            <path d="M190,160 Q180,140 170,165" stroke={color} strokeWidth="2" fill="none" className="animate-pulse" />
            <path d="M190,160 Q200,140 210,165" stroke={color} strokeWidth="2" fill="none" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
            <path d="M190,160 L190,130" stroke={color} strokeWidth="2" fill="none" className="animate-pulse" style={{ animationDelay: '0.2s' }} />
            {/* Invisible larger hitbox */}
            <rect x="150" y="120" width="80" height="80" fill="transparent" />
        </g>
    </svg>
);

export default function Homepage() {
    const [timeState, setTimeState] = useState('sunset');
    const [weather, setWeather] = useState(null);
    const [boostedTypes, setBoostedTypes] = useState([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [particles, setParticles] = useState([]);
    const [shootingStars, setShootingStars] = useState([]);
    const [currentTime, setCurrentTime] = useState('');

    // --- Weather Easter Egg: Triple-click = chaos buttons ---
    const [weatherClicks, setWeatherClicks] = useState(0);
    const [buttonsChaos, setButtonsChaos] = useState(false);

    const handleWeatherClick = useCallback(() => {
        const newCount = weatherClicks + 1;
        setWeatherClicks(newCount);
        setTimeout(() => setWeatherClicks(prev => prev === newCount ? 0 : prev), 2000);

        if (newCount >= 3 && !buttonsChaos) {
            setButtonsChaos(true);
            setWeatherClicks(0);
            // Stop after 8 seconds
            setTimeout(() => setButtonsChaos(false), 8000);
        }
    }, [weatherClicks, buttonsChaos]);

    // --- Fountain Easter Egg: Triple-click to flood ---
    const [fountainClicks, setFountainClicks] = useState(0);
    const [flooding, setFlooding] = useState(false);
    const [floodLevel, setFloodLevel] = useState(0); // 0 to 100 (percentage of viewport height)
    const [floodBubbles, setFloodBubbles] = useState([]);

    const handleFountainClick = useCallback(() => {
        const newCount = fountainClicks + 1;
        setFountainClicks(newCount);

        // Reset count after 2 seconds of inactivity
        setTimeout(() => setFountainClicks(prev => prev === newCount ? 0 : prev), 2000);

        if (newCount >= 3 && !flooding) {
            setFlooding(true);
            setFountainClicks(0);

            // Generate bubbles
            setFloodBubbles([...Array(40)].map((_, i) => ({
                id: i,
                left: Math.random() * 100,
                size: 4 + Math.random() * 12,
                delay: Math.random() * 8,
                duration: 3 + Math.random() * 5,
                opacity: 0.2 + Math.random() * 0.4
            })));

            // Progressive flood rise
            let level = 0;
            const riseInterval = setInterval(() => {
                level += 0.4;
                setFloodLevel(level);
                if (level >= 85) {
                    clearInterval(riseInterval);
                    // Hold at max for 4 seconds, then drain
                    setTimeout(() => {
                        let drainLevel = 85;
                        const drainInterval = setInterval(() => {
                            drainLevel -= 1.5;
                            setFloodLevel(Math.max(0, drainLevel));
                            if (drainLevel <= 0) {
                                clearInterval(drainInterval);
                                setFlooding(false);
                                setFloodLevel(0);
                                setFloodBubbles([]);
                            }
                        }, 50);
                    }, 4000);
                }
            }, 50);
        }
    }, [fountainClicks, flooding]);

    // Hydration Fix: Generate particles & stars only on client
    useEffect(() => {
        setParticles([...Array(40)].map(() => ({
            delay: -Math.random() * 20,
            duration: 10 + Math.random() * 10,
            left: Math.random() * 100
        })));
        setShootingStars([...Array(3)].map(() => ({
            top: Math.random() * 70,
            left: Math.random() * 90,
            delay: 5 + Math.random() * 60,
            duration: 0.8 + Math.random() * 1.5,
            rotate: 10 + Math.random() * 40
        })));
    }, []);

    // Time Logic
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const hour = now.getHours();
            // Night from 8PM to 7AM
            setTimeState((hour >= 20 || hour < 7) ? 'night' : 'sunset');

            // Format time HH:MM
            setCurrentTime(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000); // Update every second to keep clock accurate
        return () => clearInterval(interval);
    }, []);

    // Weather Logic
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Use hourly data + correct timezone + precipitation probability
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=46.5802&longitude=0.3404&hourly=weathercode,temperature_2m,windspeed_10m,precipitation_probability&current_weather=true&timezone=Europe%2FParis&t=${Date.now()}`);
                const data = await response.json();

                const currentHour = new Date().getHours();
                let code = data.hourly.weathercode[currentHour];
                const temp = data.hourly.temperature_2m[currentHour];
                const wind = data.hourly.windspeed_10m[currentHour];
                const precipProb = data.hourly.precipitation_probability[currentHour];

                // Removed aggressive rain heuristic as per user feedback (in-game is often just Cloudy)
                // We will rely purely on the weather provider's code.

                setWeather({ weathercode: code, temperature: temp, windspeed: wind });
                setBoostedTypes(getPokemonTypeBoost({ weathercode: code, windspeed: wind }));
            } catch (e) {
                console.error("Weather fetch failed", e);
                setWeather({ temperature: 15, weathercode: 1, windspeed: 5 });
                setBoostedTypes(["Plante", "Sol", "Feu"]);
            }
        };
        fetchWeather();
    }, []);

    const [settings, setSettings] = useState({
        hazeOpacity: 0.3,
        starBlinkSpeed: 3,
        shootingStarFreq: 5,
        forceSnow: true
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (data) setSettings(prev => ({ ...prev, ...data }));
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };
        fetchSettings();
    }, []);

    // Theme Config
    const themes = {
        sunset: {
            gradient: "bg-gradient-to-t from-purple-800 via-rose-500 to-orange-300",
            sunMoon: "bg-gradient-to-b from-yellow-100 to-yellow-300 shadow-[0_0_60px_rgba(255,200,0,0.6)]",
            silhouette: "#2e1065", // deeply dark purple
            text: "text-white",
            subText: "text-rose-100",
            accent: "bg-rose-500",
        },
        night: {
            gradient: "bg-gradient-to-t from-slate-900 via-indigo-950 to-slate-900",
            sunMoon: "bg-slate-100 shadow-[0_0_50px_rgba(255,255,255,0.4)]",
            silhouette: "#020617", // near black
            text: "text-slate-100",
            subText: "text-indigo-200",
            accent: "bg-indigo-500",
        }
    };

    const currentTheme = themes[timeState];

    const mainLinks = [
        { href: '/pokematos', label: 'Pokématos', bg: 'bg-gradient-to-r from-blue-700 to-cyan-500 hover:brightness-110', shadow: 'shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_40px_rgba(37,99,235,0.8)]' },
        { href: '/trades', label: 'Échanges', bg: 'bg-gradient-to-r from-green-700 to-emerald-400 hover:brightness-110', shadow: 'shadow-[0_0_20px_rgba(22,163,74,0.5)] hover:shadow-[0_0_40px_rgba(22,163,74,0.8)]' },
        { href: '/rankings', label: 'Classements', bg: 'bg-gradient-to-r from-purple-700 to-fuchsia-400 hover:brightness-110', shadow: 'shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:shadow-[0_0_40px_rgba(147,51,234,0.8)]' },
        { href: '/community', label: 'La Communauté', bg: 'bg-gradient-to-r from-amber-600 to-orange-400 hover:brightness-110', shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.5)] hover:shadow-[0_0_40px_rgba(234,179,8,0.8)]' },
        { href: '/events', label: 'Évènements', bg: 'bg-gradient-to-r from-rose-600 to-pink-500 hover:brightness-110', shadow: 'shadow-[0_0_20px_rgba(225,29,72,0.5)] hover:shadow-[0_0_40px_rgba(225,29,72,0.8)]' },
    ];

    // Check if raining or snowing
    const isSnowing = settings.forceSnow || (weather && (
        (weather.weathercode >= 71 && weather.weathercode <= 77) || // Snow
        (weather.weathercode >= 85 && weather.weathercode <= 86)    // Snow Showers
    ));

    const isRaining = !isSnowing && weather && (
        (weather.weathercode >= 51 && weather.weathercode <= 67) || // Drizzle & Rain
        (weather.weathercode >= 80 && weather.weathercode <= 82) || // Showers
        (weather.weathercode >= 95) // Thunderstorm
    );

    return (
        <div
            className={`relative w-full h-screen overflow-hidden font-sans transition-all duration-1000 ${currentTheme.gradient}`}
            style={{ '--star-blink-speed': `${settings.starBlinkSpeed}s` }}
        >

            {/* --- Celestial Body (Sun/Moon) --- */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 transition-all duration-1000 ease-out
        ${timeState === 'sunset' ? 'top-[12%] w-28 h-28 md:w-56 md:h-56' : 'top-[15%] w-20 h-20 md:w-32 md:h-32'}
      `}>
                <div className={`w-full h-full rounded-full ${currentTheme.sunMoon}`}></div>

                {/* Moon Craters (Only visible at night) */}
                {timeState === 'night' && (
                    <>
                        <div className="absolute top-6 left-8 w-4 h-4 bg-slate-300/50 rounded-full"></div>
                        <div className="absolute bottom-8 right-10 w-6 h-6 bg-slate-300/50 rounded-full"></div>
                    </>
                )}
            </div>

            {/* --- Rain Effect --- */}
            {isRaining && <RainEffect />}
            {isSnowing && <SnowEffect />}

            {/* --- Stars (Night Only) --- */}
            {timeState === 'night' && (
                <div className="absolute inset-0">
                    {[...Array(90)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-white rounded-full animate-pulse"
                            style={{
                                top: `${Math.random() * 60}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 3}px`,
                                height: `${Math.random() * 3}px`,
                                opacity: Math.random(),
                                animationDuration: `${2 + Math.random() * settings.starBlinkSpeed}s`
                            }}
                        />
                    ))}
                    {/* Shooting Stars */}
                    {shootingStars.map((star, i) => (
                        <div
                            key={`shooting-${i}`}
                            className="absolute"
                            style={{
                                top: `${star.top}%`,
                                left: `${star.left}%`,
                                transform: `rotate(${star.rotate}deg)`
                            }}
                        >
                            <div
                                className="animate-shooting-star opacity-0"
                                style={{
                                    animationDelay: `${star.delay}s`,
                                    animationDuration: `${star.duration}s`
                                }}
                            >
                                <div
                                    className="bg-white h-[1px] w-[80px] rounded-full"
                                    style={{
                                        boxShadow: '0 0 4px 2px rgba(255,255,255,0.8), 0 0 10px 2px rgba(255,255,255,0.5)',
                                        background: 'linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0))'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- Fog/Haze Layer (Configurable) --- */}
            <div
                className="absolute bottom-0 w-full h-[50vh] transition-opacity duration-1000 pointer-events-none z-10 blur-3xl"
                style={{
                    background: 'linear-gradient(to top, rgba(255,255,255,0.8), rgba(255,255,255,0.0))',
                    opacity: settings.hazeOpacity
                }}
            ></div>

            {/* --- Particles (Fireflies or Pollen) --- */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {particles.map((p, i) => (
                    <FloatingParticle
                        key={i}
                        type={timeState}
                        delay={p.delay}
                        duration={p.duration}
                        left={p.left}
                    />
                ))}
            </div>

            {/* --- City Silhouette --- */}
            <div className="absolute bottom-[5vh] md:bottom-0 w-full h-[30vh] md:h-[40vh] z-10 flex items-end">
                <CitySilhouette color={currentTheme.silhouette} />
            </div>

            {/* --- Park Trees (Right) --- */}
            <div className="absolute bottom-[10vh] right-[0%] w-[40%] md:w-[25%] h-[15vh] md:h-[25vh] z-30 flex items-end md:bottom-[8.25vh]" style={{ pointerEvents: 'none' }}>
                <ParkTrees color={currentTheme.silhouette} onFountainClick={handleFountainClick} />
            </div>

            {/* --- Fountain Easter Egg: Flood Effect --- */}
            {(flooding || floodLevel > 0) && (
                <div
                    className="absolute bottom-0 left-0 w-full pointer-events-none overflow-hidden"
                    style={{
                        height: `${floodLevel}vh`,
                        zIndex: 50,
                        transition: 'height 0.1s linear',
                    }}
                >
                    {/* Water surface with wave animation */}
                    <div
                        className="absolute top-0 left-0 w-[200%] h-3"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.5) 25%, transparent 50%, rgba(59,130,246,0.5) 75%, transparent 100%)',
                            animation: 'floodWave 2s linear infinite',
                            filter: 'blur(2px)',
                        }}
                    />
                    {/* Water body */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(to bottom, rgba(59,130,246,0.25) 0%, rgba(30,64,175,0.45) 40%, rgba(23,37,84,0.6) 100%)`,
                            backdropFilter: 'blur(3px)',
                        }}
                    />
                    {/* Bubbles */}
                    {floodBubbles.map(b => (
                        <div
                            key={b.id}
                            className="absolute rounded-full border border-blue-300/40"
                            style={{
                                left: `${b.left}%`,
                                bottom: '10%',
                                width: `${b.size}px`,
                                height: `${b.size}px`,
                                background: 'radial-gradient(circle at 30% 30%, rgba(147,197,253,0.5), transparent)',
                                animation: `floodBubbleRise ${b.duration}s ease-in ${b.delay}s infinite`,
                                opacity: 0,
                            }}
                        />
                    ))}
                    {/* Floating debris / sparkles on surface */}
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={`sparkle-${i}`}
                            className="absolute top-0 w-1 h-1 bg-blue-200/60 rounded-full"
                            style={{
                                left: `${10 + i * 11}%`,
                                animation: `floodFloat ${3 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite alternate`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* --- Main Content (Centered Title & Buttons) --- */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center pointer-events-none">

                {/* Header / Title */}
                <div className="relative group cursor-default pointer-events-auto">
                    <h1 className={`text-6xl md:text-8xl font-black tracking-tighter drop-shadow-lg ${currentTheme.text} mb-2 md:mb-4 ${buttonsChaos ? 'chaos-title' : ''}`}>
                        POGO
                    </h1>
                    <h2 className={`text-4xl md:text-6xl font-light tracking-[0.2em] -mt-2 md:-mt-4 uppercase ${currentTheme.text} opacity-90 ${buttonsChaos ? 'chaos-title-delayed' : ''}`}>
                        Sphere
                    </h2>

                    <p className={`mt-6 text-sm md:text-xl lg:text-2xl font-bold ${currentTheme.text} max-w-[95%] md:max-w-4xl mx-auto leading-relaxed drop-shadow-sm md:whitespace-nowrap px-1`}>
                        Bienvenue sur le portail de la communauté PogoSphere !
                    </p>

                    {/* Row 1 */}
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-8 md:mt-12 w-full">
                        {mainLinks.filter(l => !['/presentations', '/photos', '/events'].includes(l.href)).map((link, i) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 md:px-8 py-2 md:py-3 ${link.bg} text-white text-xs md:text-base font-bold rounded-full transition-all transform hover:scale-105 ${link.shadow} ${buttonsChaos ? 'chaos-btn' : ''}`}
                                style={buttonsChaos ? { animationDelay: `${i * 0.15}s` } : {}}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Row 2 */}
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-4 w-full">
                        {mainLinks.filter(l => ['/presentations', '/photos', '/events'].includes(l.href)).map((link, i) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 md:px-8 py-2 md:py-3 ${link.bg} text-white text-xs md:text-base font-bold rounded-full transition-all transform hover:scale-105 ${link.shadow} ${buttonsChaos ? 'chaos-btn' : ''}`}
                                style={buttonsChaos ? { animationDelay: `${(i + 5) * 0.15}s` } : {}}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Decorative Lines Removed */}
                </div>

            </div>

            {/* --- Top Right UI Container --- */}
            <div className="absolute top-24 right-6 z-30 flex items-center gap-4">

                {/* Weather Widget (Moved Here) - Easter Egg: Triple-click */}
                <div onClick={handleWeatherClick} className={`
          flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-xl
          ${timeState === 'night' ? 'bg-slate-900/40' : 'bg-white/20'}
          transition-all duration-500 hover:scale-105 cursor-pointer
          scale-90 md:scale-100 origin-top-right
        `}>
                    {weather ? (
                        <div className="flex items-center gap-3">
                            <WeatherIcon code={weather.weathercode} className={`w-6 h-6 ${currentTheme.text}`} />
                            <div className="flex flex-col text-left">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-lg font-bold leading-none ${currentTheme.text}`}>{Math.round(weather.temperature)}°C</span>
                                    <span className={`text-xs font-medium opacity-80 ${currentTheme.text}`}>{currentTime}</span>
                                </div>
                                <span className={`text-[10px] uppercase tracking-wider ${currentTheme.text} opacity-80 leading-none mt-1 whitespace-nowrap hidden md:block`}>
                                    Boost Météo : {boostedTypes.join(', ')}
                                </span>
                                <span className={`text-[10px] uppercase tracking-wider ${currentTheme.text} opacity-80 leading-none mt-1 md:hidden max-w-[150px] truncate`}>
                                    {boostedTypes.slice(0, 2).join(', ')}{boostedTypes.length > 2 ? '...' : ''}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-8 w-24 bg-white/20 animate-pulse rounded-full"></div>
                    )}
                </div>

            </div>

            {/* --- Menu Overlay --- */}
            <div className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-xl transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex flex-col items-center justify-center h-full space-y-8 text-white">
                    {mainLinks.map((item, idx) => (
                        <Link key={idx} href={item.href} onClick={() => setMenuOpen(false)} className="text-3xl font-light hover:text-rose-400 transition-colors">
                            {item.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* --- Bottom Filler (Ground Extension for Mobile) --- */}
            <div
                className="absolute bottom-0 w-full h-[5.5vh] md:hidden z-20"
                style={{ backgroundColor: currentTheme.silhouette }}
            />

            {/* --- Footer Copyright (On Floor) --- */}
            <div className={`absolute bottom-6 left-0 w-full text-center text-[10px] md:text-xs font-light z-30 pointer-events-none opacity-50 ${currentTheme.text}`}>
                © {new Date().getFullYear()} PogoSphere
            </div>

            {/* --- CSS Animations & Footer Override --- */}
            <style>{`
        @keyframes float {
          0% { transform: translateY(100vh) translateX(0); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        .animate-float {
          animation-name: float;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes shooting-star {
            0% { transform: translateX(0); opacity: 0; width: 0; }
            10% { opacity: 0.4; width: 50px; }
            100% { transform: translateX(400px); opacity: 0; width: 0; }
        }
        .animate-shooting-star {
            animation-name: shooting-star;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
        }

        @keyframes rain {
            0% { transform: translateY(-10vh); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(110vh); opacity: 0; }
        }
        .animate-rain {
            animation-name: rain;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
        }

        @keyframes snow {
            0% { transform: translateY(-10vh) translateX(0) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(110vh) translateX(20px) rotate(360deg); opacity: 0; }
        }
        .animate-snow {
            animation-name: snow;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
        }
        
        /* --- Weather Easter Egg: Chaos Buttons --- */
        @keyframes chaosShake {
            0% { transform: translate(0, 0) rotate(0deg) scale(1); }
            5% { transform: translate(80px, -120px) rotate(25deg) scale(1.3); }
            10% { transform: translate(-150px, 60px) rotate(-30deg) scale(0.7); }
            15% { transform: translate(200px, -80px) rotate(45deg) scale(1.5); }
            20% { transform: translate(-100px, 150px) rotate(-60deg) scale(0.8); }
            25% { transform: translate(250px, -200px) rotate(90deg) scale(1.2); }
            30% { transform: translate(-200px, -100px) rotate(-45deg) scale(1.4); }
            35% { transform: translate(150px, 200px) rotate(30deg) scale(0.6); }
            40% { transform: translate(-250px, -150px) rotate(-90deg) scale(1.6); }
            45% { transform: translate(100px, -250px) rotate(60deg) scale(0.9); }
            50% { transform: translate(-50px, 100px) rotate(-15deg) scale(1.1); }
            55% { transform: translate(180px, -50px) rotate(75deg) scale(1.3); }
            60% { transform: translate(-120px, -200px) rotate(-80deg) scale(0.7); }
            65% { transform: translate(60px, 180px) rotate(40deg) scale(1.5); }
            70% { transform: translate(-180px, 50px) rotate(-55deg) scale(0.8); }
            75% { transform: translate(220px, -180px) rotate(85deg) scale(1.2); }
            80% { transform: translate(-80px, 120px) rotate(-35deg) scale(1.4); }
            85% { transform: translate(130px, -100px) rotate(50deg) scale(0.9); }
            90% { transform: translate(-160px, -60px) rotate(-70deg) scale(1.1); }
            95% { transform: translate(40px, 140px) rotate(20deg) scale(1.3); }
            100% { transform: translate(0, 0) rotate(0deg) scale(1); }
        }
        @keyframes chaosTitleWobble {
            0% { transform: rotate(0deg) translateX(0); }
            10% { transform: rotate(-8deg) translateX(-30px); }
            20% { transform: rotate(12deg) translateX(40px) translateY(-20px); }
            30% { transform: rotate(-5deg) translateX(-50px) translateY(15px); }
            40% { transform: rotate(15deg) translateX(30px) translateY(-30px); }
            50% { transform: rotate(-10deg) translateX(-20px) translateY(25px); }
            60% { transform: rotate(8deg) translateX(45px) translateY(-10px); }
            70% { transform: rotate(-12deg) translateX(-40px) translateY(20px); }
            80% { transform: rotate(6deg) translateX(25px) translateY(-15px); }
            90% { transform: rotate(-3deg) translateX(-10px) translateY(5px); }
            100% { transform: rotate(0deg) translateX(0); }
        }
        .chaos-btn {
            animation: chaosShake 1.5s ease-in-out infinite alternate;
            position: relative;
            z-index: 60;
        }
        .chaos-title {
            animation: chaosTitleWobble 2s ease-in-out infinite alternate;
            display: inline-block;
        }
        .chaos-title-delayed {
            animation: chaosTitleWobble 2.5s ease-in-out 0.3s infinite alternate;
            display: inline-block;
        }

        /* --- Fountain Easter Egg: Flood Animations --- */
        @keyframes floodWave {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        @keyframes floodBubbleRise {
            0% { transform: translateY(0) scale(1); opacity: 0; }
            10% { opacity: 0.6; }
            80% { opacity: 0.3; }
            100% { transform: translateY(-90vh) scale(0.3); opacity: 0; }
        }
        @keyframes floodFloat {
            0% { transform: translateX(-5px) translateY(0); }
            100% { transform: translateX(5px) translateY(-3px); }
        }

        /* Replace global Footer with homepage specific style (Hidden) */
        footer {
            display: none !important;
        }
      `}</style>
        </div>
    );
}
