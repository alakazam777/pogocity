// ─── Regional Pokémon Data ───
// Each entry: { id, name, region (descriptive), points (representative lat/lng), sprite }
import { getPokemonSprite } from '@/lib/pokemonUtils';

export const REGIONAL_POKEMON = [
    // Gen 1
    { id: 83, name: 'Canarticho', region: 'Japon, Corée du Sud, Taïwan', points: [{ lat: 36, lng: 138 }], color: '#8B6914' },
    { id: 122, name: 'M. Mime', region: 'Europe', points: [{ lat: 48, lng: 2 }], color: '#E85D75' },
    { id: 115, name: 'Kangourex', region: 'Australie, Papouasie-Nouvelle-Guinée', points: [{ lat: -25, lng: 134 }], color: '#A0522D' },
    { id: 128, name: 'Tauros', region: 'Amérique du Nord', points: [{ lat: 38, lng: -97 }], color: '#8B4513' },
    // Gen 2
    { id: 214, name: 'Scarhino', region: 'Amérique Centrale et du Sud', points: [{ lat: -10, lng: -55 }], color: '#1E3A8A' },
    { id: 222, name: 'Corayon', region: 'Autour de l\'équateur', points: [{ lat: 0, lng: 25 }], color: '#FF69B4' },
    // Gen 3
    { id: 324, name: 'Chartor', region: 'Asie du Sud', points: [{ lat: 20, lng: 78 }], color: '#CD853F' },
    { id: 335, name: 'Mangriff', region: 'Europe, Asie, Australie', points: [{ lat: 50, lng: 50 }], color: '#FFFFFF' },
    { id: 336, name: 'Séviper', region: 'Afrique, Amériques', points: [{ lat: -5, lng: -55 }], color: '#8B008B' },
    { id: 357, name: 'Tropius', region: 'Afrique, Moyen-Orient', points: [{ lat: 5, lng: 25 }], color: '#228B22' },
    { id: 369, name: 'Relicanth', region: 'Fidji, Nouvelle-Zélande', points: [{ lat: -18, lng: 178 }], color: '#708090' },
    // Gen 4
    { id: 417, name: 'Pachirisu', region: 'Nord du Canada, Russie, Alaska', points: [{ lat: 65, lng: -100 }], color: '#87CEEB' },
    { id: 439, name: 'Mime Jr.', region: 'Europe', points: [{ lat: 52, lng: 10 }], color: '#FF69B4' },
    { id: 441, name: 'Pijako', region: 'Hémisphère Sud', points: [{ lat: -30, lng: 25 }], color: '#FF4500' },
    { id: 455, name: 'Vortente', region: 'Sud-est des États-Unis', points: [{ lat: 30, lng: -84 }], color: '#006400' },
    { id: 480, name: 'Créhelf', region: 'Asie-Pacifique', points: [{ lat: 25, lng: 120 }], color: '#FFD700' },
    { id: 481, name: 'Créfollet', region: 'Europe, Moyen-Orient, Afrique', points: [{ lat: 35, lng: 20 }], color: '#FF69B4' },
    { id: 482, name: 'Créfadet', region: 'Amériques, Groenland', points: [{ lat: 30, lng: -80 }], color: '#4169E1' },
    // Gen 5
    { id: 511, name: 'Feuillajou', region: 'Asie-Pacifique', points: [{ lat: 10, lng: 110 }], color: '#32CD32' },
    { id: 513, name: 'Flamajou', region: 'Europe, Moyen-Orient, Afrique', points: [{ lat: 20, lng: 15 }], color: '#FF4500' },
    { id: 515, name: 'Flotajou', region: 'Amériques, Groenland', points: [{ lat: 15, lng: -75 }], color: '#1E90FF' },
    { id: 556, name: 'Maracachi', region: 'Sud des US, Mexique, Am. Centrale, Caraïbes', points: [{ lat: 20, lng: -100 }], color: '#32CD32' },
    { id: 561, name: 'Cryptéro', region: 'Égypte, Grèce', points: [{ lat: 30, lng: 28 }], color: '#FFD700' },
    { id: 626, name: 'Frison', region: 'Région de New York', points: [{ lat: 40.7, lng: -74 }], color: '#8B4513' },
    { id: 631, name: 'Aflamanoir', region: 'Hémisphère Est', points: [{ lat: 20, lng: 80 }], color: '#FF6347' },
    { id: 632, name: 'Fermite', region: 'Hémisphère Ouest', points: [{ lat: 20, lng: -60 }], color: '#696969' },
    // Gen 6
    { id: 707, name: 'Trousselin', region: 'France, Belgique, Suisse, Luxembourg', points: [{ lat: 47, lng: 2.5 }], color: '#C0C0C0' },
    { id: 701, name: 'Brutalibré', region: 'Mexique', points: [{ lat: 23, lng: -102 }], color: '#DC143C' },
    // Gen 7
    { id: 764, name: 'Guérilande', region: 'Hawaï', points: [{ lat: 21, lng: -157 }], color: '#FF69B4' },
    // Gen 8
    { id: 874, name: 'Dolman', region: 'Royaume-Uni', points: [{ lat: 51.5, lng: -0.1 }], color: '#808080' },
];
