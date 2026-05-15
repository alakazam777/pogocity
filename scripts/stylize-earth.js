// Pre-process earth-8k.jpg into a Pokémon-game-styled texture
// Run: node scripts/stylize-earth.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function main() {
    const inputPath = path.join(__dirname, '..', 'public', 'earth-8k.jpg');
    const outputPath = path.join(__dirname, '..', 'public', 'earth-pokemon.jpg');

    console.log('Loading 8k texture...');
    const img = await loadImage(inputPath);

    // Output at 4096x2048 for good quality but reasonable file size
    const W = 4096;
    const H = 2048;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);

    console.log('Processing pixels...');
    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i], g = data[i + 1], b = data[i + 2];

        const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
        const isWater = (b > r + 20 && b > g) || (b > 80 && r < 70 && g < 90);
        const isIce = brightness > 190 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
        const isDesert = r > 160 && g > 130 && b < 110 && r > g;
        const isDarkForest = g > r && g > b && brightness < 80;

        if (isIce) {
            // Snow/ice → soft white-blue, slightly warm
            data[i] = Math.min(255, 220 + (r - brightness) * 0.2);
            data[i + 1] = Math.min(255, 225 + (g - brightness) * 0.2);
            data[i + 2] = Math.min(255, 240);
        } else if (isWater) {
            // Water → rich Pokémon blue (like ocean in Gen 3-5 games)
            const depth = 1 - Math.min(1, brightness / 150);
            data[i] = Math.round(20 + depth * 15);
            data[i + 1] = Math.round(80 + (1 - depth) * 60);
            data[i + 2] = Math.round(160 + (1 - depth) * 50);
        } else if (isDesert) {
            // Desert → warm sandy yellow-green (like Hoenn desert)
            data[i] = Math.min(255, Math.round(r * 0.9 + 30));
            data[i + 1] = Math.min(255, Math.round(g * 0.85 + 40));
            data[i + 2] = Math.round(b * 0.4 + 20);
        } else if (isDarkForest) {
            // Dense forest → rich dark green
            data[i] = Math.round(r * 0.3 + 10);
            data[i + 1] = Math.min(255, Math.round(g * 1.2 + 30));
            data[i + 2] = Math.round(b * 0.25 + 8);
        } else {
            // General land → lush green (main Pokémon game color)
            const greenness = g / Math.max(1, (r + b) / 2);
            if (greenness > 0.9) {
                // Already greenish → boost more
                data[i] = Math.max(0, Math.round(r * 0.35));
                data[i + 1] = Math.min(255, Math.round(g * 1.4 + 25));
                data[i + 2] = Math.max(0, Math.round(b * 0.3));
            } else {
                // Brownish/mixed land → shift to green
                data[i] = Math.max(0, Math.round(r * 0.4 + 5));
                data[i + 1] = Math.min(255, Math.round(g * 1.1 + 40));
                data[i + 2] = Math.max(0, Math.round(b * 0.3 + 5));
            }
        }

        // Light posterization for painted/game feel (steps of 6)
        data[i] = Math.round(data[i] / 6) * 6;
        data[i + 1] = Math.round(data[i + 1] / 6) * 6;
        data[i + 2] = Math.round(data[i + 2] / 6) * 6;
    }

    ctx.putImageData(imageData, 0, 0);

    // Save as JPEG
    console.log('Saving stylized texture...');
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.88 });
    fs.writeFileSync(outputPath, buffer);
    console.log(`Done! Saved to ${outputPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(console.error);
