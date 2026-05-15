// ─── Prismillon Forms Data ───
// Source: https://www.margxt.fr/comment-obtenir-toutes-les-formes-de-prismillon-dans-pokemon-go/
// slug = English name for pokemon-friends.eu URL: /fr/vivillon/{slug}/
// spriteCode = PokeMiners form code for sprite
// highlights = colored zones to show on globe when hovered [{lat, lng, radius}]

export const PRISMILLON_FORMS = [
    {
        name: 'Archipel', slug: 'archipelago', spriteCode: 'ARCHIPELAGO', color: '#22d3ee',
        zone: 'Caraïbes & Antilles',
        countries: ['Afrique du Sud', 'Anguilla', 'Antigua-et-Barbuda', 'Antilles néerlandaises', 'Aruba', 'Bahamas', 'Barbade', 'Colombie', 'Cuba', 'Curaçao', 'Dominique', 'Espagne', 'États-Unis', 'Grenade', 'Guadeloupe', 'Haïti', 'Îles Caïmans', 'Îles Turks et Caïques', 'Îles Vierges des États-Unis', 'Îles Vierges britanniques', 'Jamaïque', 'Le Cap', 'Lesotho', 'Martinique', 'Mexique', 'Montserrat', 'Venezuela', 'Porto Rico', 'République Dominicaine', 'Sainte-Lucie', 'Saint-Kitts-et-Nevis', 'Saint-Vincent-et-les-Grenadines', 'Trinité-et-Tobago'],
        points: [{ lat: 18.5, lng: -69.9 }],
        highlights: [{ lat: 18, lng: -70, radius: 12 }],
    },
    {
        name: 'Banquise', slug: 'tundra', spriteCode: 'TUNDRA', color: '#a5f3fc',
        zone: 'Régions subarctiques',
        countries: ['Argentine', 'Canada', 'Chili', 'États-Unis', 'Finlande', 'Kazakhstan', 'Mongolie', 'Norvège', 'Russie', 'Suède'],
        points: [{ lat: 60, lng: 25 }],
        highlights: [{ lat: 58, lng: 30, radius: 25 }, { lat: 55, lng: -100, radius: 18 }],
    },
    {
        name: 'Blizzard', slug: 'icy-snow', spriteCode: 'ICY_SNOW', color: '#e0f2fe',
        zone: 'Grand Nord & Arctique',
        countries: ['Alaska', 'Canada', 'Finlande', 'Groenland', 'Norvège', 'Russie', 'Suède', 'Svalbard'],
        points: [{ lat: 68, lng: -45 }],
        highlights: [{ lat: 70, lng: -40, radius: 18 }, { lat: 68, lng: 50, radius: 20 }],
    },
    {
        name: 'Continent', slug: 'continental', spriteCode: 'CONTINENTAL', color: '#fbbf24',
        zone: 'Europe du Nord & Asie de l\'Est',
        countries: ['Allemagne', 'Argentine', 'Belgique', 'Biélorussie', 'Birmanie', 'Chili', 'Corée du Sud', 'Danemark', 'Estonie', 'France', 'Hong Kong', 'Inde', 'Japon', 'Lettonie', 'Lituanie', 'Luxembourg', 'Moldavie', 'Népal', 'Norvège', 'Pays-Bas', 'Pologne', 'Russie', 'Slovaquie', 'Suède', 'Taïwan', 'Ukraine', 'Tchéquie', 'Vietnam'],
        points: [{ lat: 52, lng: 10 }],
        highlights: [{ lat: 52, lng: 15, radius: 14 }, { lat: 35, lng: 125, radius: 12 }],
    },
    {
        name: 'Cyclone', slug: 'monsoon', spriteCode: 'MONSOON', color: '#818cf8',
        zone: 'Asie du Sud & Sud-Est',
        countries: ['Bangladesh', 'Bhoutan', 'Birmanie', 'Cambodge', 'Inde', 'Japon', 'Laos', 'Népal', 'Philippines', 'Taïwan', 'Thaïlande', 'Tibet', 'Vietnam'],
        points: [{ lat: 15, lng: 100 }],
        highlights: [{ lat: 18, lng: 95, radius: 18 }],
    },
    {
        name: 'Delta', slug: 'river', spriteCode: 'RIVER', color: '#d97706',
        zone: 'Afrique du Nord & de l\'Ouest',
        countries: ['Afrique du Sud', 'Algérie', 'Angola', 'Australie', 'Bénin', 'Botswana', 'Burkina Faso', 'Tchad', 'Côte d\'Ivoire', 'Égypte', 'Gambie', 'Ghana', 'Guinée', 'Guinée-Bissau', 'Lesotho', 'Libye', 'Mali', 'Maroc', 'Mauritanie', 'Namibie', 'Niger', 'Nigéria', 'Sahara occidental', 'Sénégal', 'Sierra Leone', 'Soudan', 'Togo', 'Tunisie', 'Zimbabwe'],
        points: [{ lat: 15, lng: 3 }],
        highlights: [{ lat: 15, lng: 5, radius: 22 }],
    },
    {
        name: 'Floraison', slug: 'garden', spriteCode: 'MEADOW', color: '#f472b6',
        zone: 'Europe de l\'Ouest',
        countries: ['Allemagne', 'Andorre', 'Autriche', 'Corse', 'Espagne', 'France', 'Italie', 'Liechtenstein', 'Monaco', 'Suisse'],
        points: [{ lat: 46, lng: 7 }],
        highlights: [{ lat: 46, lng: 6, radius: 8 }],
    },
    {
        name: 'Glace', slug: 'polar', spriteCode: 'POLAR', color: '#bfdbfe',
        zone: 'Islande, Îles Féroé, Norvège',
        countries: ['Île Féroé', 'Islande', 'Japon', 'Norvège'],
        points: [{ lat: 64.5, lng: -19 }],
        highlights: [{ lat: 65, lng: -18, radius: 6 }],
    },
    {
        name: 'Jungle', slug: 'jungle', spriteCode: 'JUNGLE', color: '#22c55e',
        zone: 'Forêts tropicales',
        countries: ['Angola', 'Bénin', 'Brésil', 'Brunéi', 'Burundi', 'Cambodge', 'Cameroun', 'Colombie', 'Côte d\'Ivoire', 'Costa Rica', 'Équateur', 'Gabon', 'Ghana', 'Guinée équatoriale', 'Guyane', 'Guyane Française', 'Îles Salomon', 'Inde', 'Indonésie', 'Kenya', 'Libéria', 'Malaisie', 'Nigéria', 'Ouganda', 'Panama', 'Papouasie-Nouvelle-Guinée', 'Philippines', 'Pérou', 'République Centrafricaine', 'RD Congo', 'Rwanda', 'Sao Tomé et Principe', 'Sierra Leone', 'Singapour', 'Soudan du Sud', 'Sri Lanka', 'Suriname', 'Tanzanie', 'Togo', 'Trinité-et-Tobago', 'Venezuela', 'Vietnam', 'Zambie'],
        points: [{ lat: -3, lng: -60 }],
        highlights: [{ lat: -3, lng: -55, radius: 20 }, { lat: 0, lng: 20, radius: 14 }, { lat: 0, lng: 110, radius: 14 }],
    },
    {
        name: 'Mangrove', slug: 'savanna', spriteCode: 'SAVANNA', color: '#84cc16',
        zone: 'Amérique du Sud',
        countries: ['Argentine', 'Brésil', 'Bolivie', 'Paraguay', 'Pérou', 'Uruguay'],
        points: [{ lat: -22, lng: -55 }],
        highlights: [{ lat: -22, lng: -55, radius: 14 }],
    },
    {
        name: 'Métropole', slug: 'modern', spriteCode: 'MODERN', color: '#94a3b8',
        zone: 'Est des États-Unis & Canada',
        countries: ['États-Unis', 'Bermudes', 'Canada'],
        points: [{ lat: 40, lng: -74 }],
        highlights: [{ lat: 42, lng: -78, radius: 14 }],
    },
    {
        name: 'Monarchie', slug: 'elegant', spriteCode: 'ELEGANT', color: '#dc2626',
        zone: 'Japon',
        countries: ['Japon'],
        points: [{ lat: 36, lng: 138 }],
        highlights: [{ lat: 36, lng: 138, radius: 5 }],
    },
    {
        name: 'Rivage', slug: 'marine', spriteCode: 'MARINE', color: '#3b82f6',
        zone: 'Europe du Sud & Méditerranée',
        countries: ['Açores', 'Albanie', 'Allemagne', 'Andorre', 'Argentine', 'Autriche', 'Bosnie-Herzégovine', 'Bulgarie', 'Chili', 'Chypre', 'Croatie', 'Espagne', 'France', 'Géorgie', 'Gibraltar', 'Grèce', 'Guernesey', 'Hongrie', 'Îles Baléares', 'Îles Canaries', 'Italie', 'Jersey', 'Kosovo', 'Macédoine du Nord', 'Madère', 'Malte', 'Maroc', 'Moldavie', 'Monténégro', 'Pologne', 'Portugal', 'Roumanie', 'Russie', 'Saint-Marin', 'Serbie', 'Slovénie', 'Slovaquie', 'Tchéquie', 'Tunisie', 'Turquie', 'Ukraine', 'Vatican'],
        points: [{ lat: 40, lng: 15 }],
        highlights: [{ lat: 42, lng: 12, radius: 16 }],
    },
    {
        name: 'Sable', slug: 'sandstorm', spriteCode: 'SANDSTORM', color: '#eab308',
        zone: 'Moyen-Orient & Afrique du NE',
        countries: ['Afghanistan', 'Arabie Saoudite', 'Arménie', 'Bahreïn', 'Chypre', 'Comores', 'Djibouti', 'Égypte', 'Émirats arabes unis', 'Érythrée', 'Éthiopie', 'Inde', 'Irak', 'Iran', 'Israël', 'Kenya', 'Liban', 'Oman', 'Pakistan', 'Palestine', 'Qatar', 'Somalie', 'Soudan', 'Syrie', 'Turkménistan', 'Turquie', 'Yémen'],
        points: [{ lat: 25, lng: 45 }],
        highlights: [{ lat: 28, lng: 45, radius: 16 }],
    },
    {
        name: 'Sécheresse', slug: 'high-plains', spriteCode: 'HIGH_PLAINS', color: '#f59e0b',
        zone: 'Ouest des USA & Asie Centrale',
        countries: ['Arménie', 'Azerbaïdjan', 'Canada', 'États-Unis', 'Géorgie', 'Kazakhstan', 'Kirghizistan', 'Mexique', 'Mongolie', 'Ouzbékistan', 'Russie', 'Tadjikistan', 'Turkménistan', 'Turquie'],
        points: [{ lat: 42, lng: -110 }],
        highlights: [{ lat: 42, lng: -108, radius: 14 }, { lat: 42, lng: 65, radius: 14 }],
    },
    {
        name: 'Soleil Levant', slug: 'sun', spriteCode: 'SUN', color: '#ef4444',
        zone: 'Îles du Pacifique & Océan Indien',
        countries: ['Açores', 'Barbade', 'Cap-Vert', 'Fidji', 'Galápagos', 'Grenade', 'Guam', 'Hawaï', 'Îles Cook', 'Îles Mariannes du Nord', 'Îles Marshall', 'Îles Pitcairn', 'Îles Salomon', 'Japon', 'Kiribati', 'La Réunion', 'Madagascar', 'Maurice', 'Micronésie', 'Nauru', 'Nouvelle-Calédonie', 'Polynésie française', 'Saint-Vincent-et-les-Grenadines', 'Samoa', 'Seychelles', 'Tokelau', 'Trinité-et-Tobago', 'Tuvalu', 'Vanuatu', 'Venezuela', 'Wallis et Futuna'],
        points: [{ lat: 20, lng: -155 }],
        highlights: [{ lat: 10, lng: -160, radius: 18 }, { lat: -15, lng: 170, radius: 14 }],
    },
    {
        name: 'Verdure', slug: 'meadow', spriteCode: 'GARDEN', color: '#4ade80',
        zone: 'Royaume-Uni, Irlande, Océanie',
        countries: ['Australie', 'Île de Man', 'Irlande', 'Nouvelle-Zélande', 'Royaume-Uni'],
        points: [{ lat: 53, lng: -7 }],
        highlights: [{ lat: 54, lng: -4, radius: 6 }, { lat: -30, lng: 145, radius: 12 }],
    },
    {
        name: 'Zénith', slug: 'ocean', spriteCode: 'OCEAN', color: '#a855f7',
        zone: 'Afrique de l\'Est & Amérique Centrale',
        countries: ['Afrique du Sud', 'Angola', 'Australie', 'Belize', 'Botswana', 'Comores', 'El Salvador', 'Éthiopie', 'Eswatini', 'Guatemala', 'Honduras', 'Îles Caïmans', 'Kenya', 'Lesotho', 'Madagascar', 'Malawi', 'Mayotte', 'Mexique', 'Mozambique', 'Namibie', 'Nicaragua', 'RD Congo', 'Somalie', 'Tanzanie', 'Zambie', 'Zimbabwe'],
        points: [{ lat: -8, lng: 35 }],
        highlights: [{ lat: -8, lng: 32, radius: 18 }, { lat: 14, lng: -88, radius: 8 }],
    },
];

export function getFormSprite(spriteCode) {
    return `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/Addressable%20Assets/pm666.f${spriteCode}.icon.png`;
}
