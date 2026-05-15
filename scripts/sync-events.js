const fs = require('fs');
const path = require('path');

/**
 * This script fetches upcoming Pokémon GO events from Margxt.fr
 * and proposes updates for the evenements/page.js file.
 * 
 * Usage: node scripts/sync-events.js
 */

async function getPokemonData() {
    const filePath = path.join(__dirname, '../src/data/pokemon.js');
    const content = fs.readFileSync(filePath, 'utf8');
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    const jsonStr = content.substring(start, end + 1);
    return JSON.parse(jsonStr);
}

const MONTHS_FR = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

function parseDate(dateStr, year) {
    // Example: "3 février"
    const parts = dateStr.toLowerCase().split(' ');
    const day = parseInt(parts[0]);
    const monthIdx = MONTHS_FR.indexOf(parts[1]);
    if (monthIdx === -1) return null;

    const date = new Date(year, monthIdx, day, 18, 0, 0); // Default to 18:00 for spotlight
    return date;
}

async function sync() {
    console.log('Fetching Pokémon Data...');
    const pokedex = await getPokemonData();
    const nameToId = {};
    pokedex.forEach(p => {
        nameToId[p.nameFr.toLowerCase()] = p.id;
    });

    const spotlightUrl = 'https://www.margxt.fr/historique-des-heures-de-pokemon-vedette-dans-pokemon-go/';
    const raidsUrl = 'https://www.margxt.fr/historique-des-pokemon-des-raids-legendaires-dans-pokemon-go/';

    console.log('Fetching Spotlight Hours from:', spotlightUrl);
    try {
        const resS = await fetch(spotlightUrl);
        const htmlS = await resS.text();

        // Very basic parser for their table rows
        // Typical row: <td>3 février</td><td>Chuchmur</td><td>Bonbon x2 à la capture</td>
        const spotlightMatches = [...htmlS.matchAll(/<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<\/tr>/gi)];

        console.log(`Found ${spotlightMatches.length} potential spotlight rows.`);

        // We only care about 2026 for now
        const year = 2026;
        const events = [];

        spotlightMatches.forEach(match => {
            const [_, dateStr, name, bonus] = match;
            const date = parseDate(dateStr.replace(/<.*?>/g, ''), year);
            if (date && date.getFullYear() === year) {
                const cleanName = name.replace(/<.*?>/g, '').trim();
                const id = nameToId[cleanName.toLowerCase()];
                if (id) {
                    events.push({
                        title: `Heure Vedette ${cleanName}`,
                        date: date.toISOString().split('.')[0],
                        endDate: new Date(date.getTime() + 3600000).toISOString().split('.')[0],
                        type: 'spotlight',
                        description: bonus.replace(/<.*?>/g, '').trim(),
                        image: `https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon/pokemon_icon_${id}_00.png`
                    });
                }
            }
        });

        console.log('New Spotlight Events found:', events.length);
        console.log(JSON.stringify(events, null, 2));

    } catch (err) {
        console.error('Error fetching spotlights:', err);
    }
}

// sync();
console.log('Script created. You can run it with: node scripts/sync-events.js');
console.log('Note: This is a template script. You might need to adjust the regex if Margxt changes their site layout.');
