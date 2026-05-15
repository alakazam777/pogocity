
const fs = require('fs');
const path = require('path');
const https = require('https');

const FORMS_FILE = path.join(process.cwd(), 'src/data/pokemonForms.js');
const DEST_DIR = path.join(process.cwd(), 'public/Costumes');

if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
}

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${res.statusCode}`));
                return;
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function run() {
    let content = fs.readFileSync(FORMS_FILE, 'utf-8');
    
    // Regex to find all URls in the Pikachu array
    const pikachuBlockMatch = content.match(/25: \[([\s\S]*?)\]/);
    if (!pikachuBlockMatch) return;
    
    let pikachuBlock = pikachuBlockMatch[1];
    const urlRegex = /'https?:\/\/(?:www\.)?margxt\.fr\/[^']+'/g;
    const urls = pikachuBlock.match(urlRegex) || [];
    
    console.log(`Found ${urls.length} URLs to download.`);
    
    for (const quotedUrl of urls) {
        const url = quotedUrl.replace(/'/g, '');
        const filename = path.basename(url);
        const dest = path.join(DEST_DIR, filename);
        
        try {
            if (!fs.existsSync(dest)) {
                console.log(`Downloading ${url}...`);
                await download(url, dest);
            }
            // Update the block content
            const localPath = `/Costumes/${filename}`;
            pikachuBlock = pikachuBlock.replace(quotedUrl, `'${localPath}'`);
        } catch (e) {
            console.error(`Error downloading ${url}:`, e.message);
        }
    }
    
    const newContent = content.replace(/25: \[[\s\S]*?\]/, `25: [${pikachuBlock}]`);
    fs.writeFileSync(FORMS_FILE, newContent, 'utf-8');
    console.log('Updated pokemonForms.js with local assets.');
}

run();
