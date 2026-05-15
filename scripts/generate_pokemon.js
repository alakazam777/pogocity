const fs = require('fs');
const https = require('https');

const SPECIES_NAMES_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
const OUTPUT_FILE = 'src/data/pokemon.js';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
            res.on('error', reject);
        });
    });
}

async function generatePokemonData() {
    console.log('Fetching species names...');
    const csvData = await fetchUrl(SPECIES_NAMES_URL);

    const lines = csvData.split('\n');
    const pokemonMap = new Map();

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV format: pokemon_species_id,local_language_id,name,genus
        // local_language_id: 5 is French, 9 is English
        const parts = line.split(',');
        const id = parseInt(parts[0]);
        const langId = parseInt(parts[1]);
        const name = parts[2];

        if (!pokemonMap.has(id)) {
            pokemonMap.set(id, { id, nameEn: '', nameFr: '' });
        }

        const entry = pokemonMap.get(id);
        if (langId === 9) entry.nameEn = name;
        if (langId === 5) entry.nameFr = name;
    }

    const pokemonList = Array.from(pokemonMap.values())
        .filter(p => p.nameEn && p.nameFr) // Ensure we have both names
        .sort((a, b) => a.id - b.id)
        .map(p => ({
            id: p.id,
            nameEn: p.nameEn,
            nameFr: p.nameFr,
            sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`
        }));

    const fileContent = `export const POKEMON_DATA = ${JSON.stringify(pokemonList, null, 4)};`;

    fs.writeFileSync(OUTPUT_FILE, fileContent);
    console.log(`Generated ${pokemonList.length} Pokémon entries in ${OUTPUT_FILE}`);
}

generatePokemonData().catch(console.error);
