import { NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';
import { BOT_TOKEN } from '@/lib/botAuth';
import { parseRaidInfo } from '@/lib/raidParser';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const RAID_WEBHOOK_URL = process.env.DISCORD_RAID_WEBHOOK_URL;
const RAID_PROCESS_SECRET = process.env.RAID_PROCESS_SECRET || BOT_TOKEN;

/**
 * Crop a specific region of the image and preprocess for OCR
 */
async function preprocessRegion(buffer, metadata, region, options = {}) {
    const top = Math.round(metadata.height * region.topPct);
    const height = Math.min(
        Math.round(metadata.height * region.heightPct),
        metadata.height - top
    );
    const left = Math.round(metadata.width * (region.leftPct || 0));
    const width = Math.min(
        Math.round(metadata.width * (region.widthPct || 1)),
        metadata.width - left
    );

    if (width <= 0 || height <= 0) return null;

    let pipeline = sharp(buffer)
        .extract({ top, left, width, height })
        .resize({ width: 800, withoutEnlargement: false })
        .grayscale();

    if (options.invert) pipeline = pipeline.negate();
    if (options.threshold) pipeline = pipeline.threshold(options.threshold);
    if (options.sharpen) pipeline = pipeline.sharpen();

    return pipeline.toFormat('png').toBuffer();
}

/**
 * Run OCR on a buffer
 */
async function ocrBuffer(worker, buffer) {
    if (!buffer) return '';
    try {
        const ret = await worker.recognize(buffer);
        return ret.data.text || '';
    } catch (e) {
        console.error('OCR region error:', e.message);
        return '';
    }
}

/**
 * Egg image URLs by tier
 */
const EGG_IMAGES = {
    1: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Raids/raid_egg_0_icon.png',
    3: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Raids/raid_egg_1_icon.png',
    5: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Raids/raid_egg_2_icon.png',
    'mega': 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Raids/raid_egg_3_icon.png',
};

/**
 * Build Discord embed for raid info
 */
function buildRaidEmbed(raidInfo, authorName) {
    const isEgg = raidInfo.raidType === 'egg';

    const tierColors = {
        1: 0xFF69B4,
        3: 0xFFD700,
        4: 0xFF4500,
        5: 0x8B00FF,
        'mega': 0xFF4500,
    };

    const color = tierColors[raidInfo.tier] || 0x3498DB;

    // Title
    let title;
    if (isEgg) {
        const tierNum = typeof raidInfo.tier === 'number' ? raidInfo.tier : null;
        const tierText = raidInfo.tier === 'mega'
            ? 'M\u00e9ga'
            : tierNum
                ? `${tierNum} \u00e9toile${tierNum > 1 ? 's' : ''}`
                : '';
        title = tierText
            ? `\ud83e\udd5a \u0152uf ${tierText} \u00e0 ${raidInfo.gymName || 'Ar\u00e8ne inconnue'}`
            : `\ud83e\udd5a \u0152uf \u00e0 ${raidInfo.gymName || 'Ar\u00e8ne inconnue'}`;
    } else if (raidInfo.pokemonName) {
        title = `\u2694\ufe0f Raid ${raidInfo.pokemonName} \u00e0 ${raidInfo.gymName || 'Ar\u00e8ne inconnue'}`;
    } else {
        title = `\u2694\ufe0f Raid \u00e0 ${raidInfo.gymName || 'Ar\u00e8ne inconnue'}`;
    }

    const embed = {
        title,
        color,
        fields: [],
        footer: { text: `Signal\u00e9 par ${authorName}` },
        timestamp: new Date().toISOString(),
    };

    // Description with CP if active (no description for eggs)
    if (!isEgg && raidInfo.cp) {
        embed.description = `**PC ${raidInfo.cp.toLocaleString('fr-FR')}**`;
    }

    // Timer / Times
    if (isEgg && raidInfo.hatchTime) {
        const hatchUnix = Math.floor(raidInfo.hatchTime.getTime() / 1000);
        const endUnix = Math.floor(raidInfo.endTime.getTime() / 1000);
        embed.fields.push({
            name: '\u23f1\ufe0f \u00c9closion',
            value: `<t:${hatchUnix}:t>`,
            inline: true
        });
        embed.fields.push({
            name: '\u23f1\ufe0f Depop',
            value: `~<t:${endUnix}:t>`,
            inline: true
        });
    } else if (raidInfo.endTime) {
        const unix = Math.floor(raidInfo.endTime.getTime() / 1000);
        embed.fields.push({
            name: '\u23f1\ufe0f Depop',
            value: `<t:${unix}:t>`,
            inline: true
        });
    } else if (raidInfo.timeRemaining) {
        embed.fields.push({
            name: '\u23f1\ufe0f Temps restant',
            value: raidInfo.timeRemaining,
            inline: true
        });
    }

    // Image: Pokemon artwork (large) or egg image
    if (!isEgg && raidInfo.pokemonSprite) {
        embed.thumbnail = { url: raidInfo.pokemonSprite };
    } else if (isEgg) {
        const eggImg = EGG_IMAGES[raidInfo.tier] || EGG_IMAGES[5];
        embed.thumbnail = { url: eggImg };
    }

    // Joueurs inscrits fields (updated live by gateway on reactions)
    embed.fields.push({
        name: '<:passpremium:858757890968649738> Pr\u00e9sentiel',
        value: '_Aucun_',
        inline: true
    });
    embed.fields.push({
        name: '<:passedistance:773165174068346890> \u00c0 distance',
        value: '_Aucun_',
        inline: true
    });

    return embed;
}

export async function POST(request) {
    // Verify secret
    const secret = request.headers.get('x-raid-secret');
    if (secret !== RAID_PROCESS_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrl, messageId, channelId, authorId, authorName, webhookUrl: requestWebhookUrl } = await request.json();

    if (!imageUrl) {
        return NextResponse.json({ error: 'imageUrl requis' }, { status: 400 });
    }

    console.log(`[Raid] Processing image from ${authorName}: ${imageUrl}`);

    try {
        // 1. Download image from Discord CDN
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) {
            return NextResponse.json({ error: 'Impossible de telecharger l\'image' }, { status: 400 });
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Get image dimensions
        const metadata = await sharp(buffer).metadata();
        console.log(`[Raid] Image: ${metadata.width}x${metadata.height}`);

        // 3. Crop specific regions and preprocess
        // Pokemon GO raid screen layout:
        // - Top 0-15%: Gym name (white text on photo)
        // - Center 15-55%: Pokemon sprite + name
        // - 55-75%: Timer, CP
        // - Bottom 75-100%: Buttons, raid tier stars

        const gymBuffer = await preprocessRegion(buffer, metadata, {
            topPct: 0.0, heightPct: 0.15, leftPct: 0.05, widthPct: 0.9
        }, { threshold: 200, sharpen: true });

        const pokemonBuffer = await preprocessRegion(buffer, metadata, {
            topPct: 0.15, heightPct: 0.40, leftPct: 0.1, widthPct: 0.8
        }, { threshold: 150 });

        const timerBuffer = await preprocessRegion(buffer, metadata, {
            topPct: 0.50, heightPct: 0.25, leftPct: 0.15, widthPct: 0.7
        }, { threshold: 140 });

        // Full image as fallback
        const fullBuffer = await sharp(buffer)
            .resize({ width: 800, withoutEnlargement: false })
            .grayscale()
            .threshold(150)
            .toFormat('png')
            .toBuffer();

        // 4. OCR with Tesseract (French + English)
        const cachePath = path.join(os.tmpdir(), 'tesseract-cache');
        await fs.mkdir(cachePath, { recursive: true }).catch(() => { });

        const worker = await createWorker('fra+eng', 1, { cachePath });

        const [gymText, pokemonText, timerText, fullText] = await Promise.all([
            ocrBuffer(worker, gymBuffer),
            ocrBuffer(worker, pokemonBuffer),
            ocrBuffer(worker, timerBuffer),
            ocrBuffer(worker, fullBuffer),
        ]);

        await worker.terminate();

        console.log(`[Raid] OCR Results:`);
        console.log(`  Gym: ${gymText.trim().substring(0, 100)}`);
        console.log(`  Pokemon: ${pokemonText.trim().substring(0, 100)}`);
        console.log(`  Timer: ${timerText.trim().substring(0, 100)}`);

        // 5. Parse raid info
        const raidInfo = parseRaidInfo({ gymText, pokemonText, timerText, fullText });
        console.log(`[Raid] Parsed:`, JSON.stringify(raidInfo, null, 2));

        // 6. Since this channel is dedicated to raid screenshots, always process
        // Even low confidence - just post what we found
        console.log(`[Raid] Type: ${raidInfo.raidType}, Confidence: ${raidInfo.confidence}`);

        // 7. Post embed via webhook
        let webhookMessageId = null;
        const activeWebhookUrl = requestWebhookUrl || RAID_WEBHOOK_URL;
        if (activeWebhookUrl) {
            const embed = buildRaidEmbed(raidInfo, authorName || 'Inconnu');

            const contentMsg = '';

            const webhookRes = await fetch(`${activeWebhookUrl}?wait=true`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'PogoSphere',
                    avatar_url: 'https://cdn.discordapp.com/avatars/1485999250117492847/527e0b4698cc791cebfd95c6a855f1a7.png',
                    embeds: [embed],
                    content: contentMsg || undefined
                })
            });

            if (!webhookRes.ok) {
                const err = await webhookRes.text();
                console.error(`[Raid] Webhook error:`, err);
            } else {
                const webhookData = await webhookRes.json();
                webhookMessageId = webhookData.id;
                console.log(`[Raid] Embed posted successfully (msg: ${webhookMessageId})`);

                // Add raid pass reactions so users can sign up
                if (webhookData.channel_id && webhookMessageId) {
                    await addReaction(webhookData.channel_id, webhookMessageId, 'passpremium%3A858757890968649738'); // :passpremium: (présentiel)
                    await addReaction(webhookData.channel_id, webhookMessageId, 'passedistance%3A773165174068346890'); // :passedistance: (à distance)
                }
            }
        }

        // 8. Delete the original screenshot message (cleanup)
        if (channelId && messageId) {
            await removeReaction(channelId, messageId, '%E2%8F%B3');
            try {
                await fetch(
                    `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
                    {
                        method: 'DELETE',
                        headers: { Authorization: `Bot ${BOT_TOKEN}` }
                    }
                );
                console.log(`[Raid] Original screenshot message deleted`);
            } catch (e) {
                console.error(`[Raid] Could not delete original message:`, e.message);
            }
        }

        return NextResponse.json({
            success: true,
            raidInfo,
            webhookMessageId,
            rawText: {
                gym: gymText.trim().substring(0, 200),
                pokemon: pokemonText.trim().substring(0, 200),
                timer: timerText.trim().substring(0, 200),
            }
        });

    } catch (error) {
        console.error('[Raid] Processing error:', error);

        // React with cross on original message
        if (channelId && messageId) {
            await removeReaction(channelId, messageId, '%E2%8F%B3');
            await addReaction(channelId, messageId, '%E2%9D%8C');  // cross
        }

        return NextResponse.json({ error: 'Raid processing failed' }, { status: 500 });
    }
}

/**
 * Add a reaction to a Discord message
 */
async function addReaction(channelId, messageId, emoji) {
    try {
        await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`,
            {
                method: 'PUT',
                headers: { Authorization: `Bot ${BOT_TOKEN}` }
            }
        );
    } catch (e) {
        console.error('[Raid] Reaction error:', e.message);
    }
}

/**
 * Remove bot's reaction from a Discord message
 */
async function removeReaction(channelId, messageId, emoji) {
    try {
        await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}/reactions/${emoji}/@me`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bot ${BOT_TOKEN}` }
            }
        );
    } catch (e) {
        // Ignore - reaction might not exist
    }
}
