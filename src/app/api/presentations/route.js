import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPath';

const HIDDEN_FILE = path.join(DATA_DIR, 'hidden_presentations.json');
const OVERRIDES_FILE = path.join(DATA_DIR, 'presentation_overrides.json');

export async function GET() {
    const channelId = '1409537229566775387';
    const botToken = process.env.DISCORD_BOT_TOKEN;

    // Use the existing client token if bot token is missing, assuming it might work or is same
    // Actually, for client credentials or bot interactions, we usually need a bot token.
    // If the user hasn't set DISCORD_BOT_TOKEN, this will fail.
    // I will check if DISCORD_BOT_TOKEN is available, otherwise I'll log an error.

    if (!botToken) {
        console.error("DISCORD_BOT_TOKEN is missing in environment variables.");
        // Fallback? No, we need a token.
        // Let's return a mock or empty list if in dev? No, the user wants this to work.
        return NextResponse.json({ error: 'Configuration manquante (Token Discord)' }, { status: 500 });
    }

    try {
        const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages?limit=50`, {
            headers: {
                Authorization: `Bot ${botToken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Discord API Error:", response.status, errorText);

            if (response.status === 403) {
                const clientId = process.env.DISCORD_CLIENT_ID;
                if (clientId) {
                    console.log("------------------------------------------------------------------");
                    console.log("⚠️  LE BOT N'A PAS ACCÈS AU SALON. VEUILLEZ L'INVITER AVEC CE LIEN :");
                    console.log(`👉 https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=66560&scope=bot`);
                    console.log("------------------------------------------------------------------");
                }
            }

            return NextResponse.json({
                error: response.status === 403
                    ? "Le bot n'a pas la permission d'accéder au salon. Vérifiez qu'il est invité sur le serveur."
                    : `Erreur Discord: ${response.status} ${errorText}`
            }, { status: response.status });
        }

        const messages = await response.json();



        let hiddenIds = [];
        try {
            const hiddenContent = await fs.readFile(HIDDEN_FILE, 'utf-8');
            hiddenIds = JSON.parse(hiddenContent);
        } catch (e) {
            // file might not exist yet
        }

        let overrides = {};
        try {
            const overridesContent = await fs.readFile(OVERRIDES_FILE, 'utf-8');
            overrides = JSON.parse(overridesContent);
        } catch (e) {
            // file might not exist yet
        }

        // Filter out hidden IDs and specific unwanted content
        const formattedMessages = messages
            .filter(msg =>
                !hiddenIds.includes(msg.id) &&
                !(msg.author.username === 'dierter' && msg.content.includes('542492008213'))
            )
            .map(msg => ({
                id: msg.id,
                content: overrides[msg.id] !== undefined ? overrides[msg.id] : msg.content,
                author: {
                    username: msg.author.username,
                    global_name: msg.author.global_name,
                    avatar: msg.author.avatar,
                    id: msg.author.id
                },
                timestamp: msg.timestamp,
                attachments: msg.attachments,
                reactions: msg.reactions ? msg.reactions.map(r => ({
                    emoji: r.emoji.name,
                    count: r.count,
                    id: r.emoji.id
                })) : []
            }));

        return NextResponse.json(formattedMessages);
    } catch (error) {
        console.error('Error in presentations API:', error);
        return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
    }
}
