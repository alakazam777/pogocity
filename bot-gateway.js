// Lightweight Discord Gateway connection to keep the bot "Online"
// No external dependencies - uses native WebSocket

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN_ADMIN || process.argv[2];

if (!BOT_TOKEN) {
    console.error("❌ No bot token provided. Set DISCORD_BOT_TOKEN_ADMIN env var.");
    process.exit(1);
}

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

// Intents: GUILD_MESSAGES (1 << 9) + GUILD_MESSAGE_REACTIONS (1 << 10) + MESSAGE_CONTENT (1 << 15)
// Required to receive MESSAGE_CREATE + MESSAGE_REACTION_ADD/REMOVE events
const INTENTS = (1 << 9) | (1 << 10) | (1 << 15); // 34304

// Raid screenshot processing config
const RAID_PROCESS_URL = process.env.RAID_PROCESS_URL || "http://host.docker.internal:3062/api/raid/process";
const RAID_PROCESS_SECRET = process.env.RAID_PROCESS_SECRET || BOT_TOKEN;

// Multi-channel raid config: channelId → webhookUrl
// Each channel listens for screenshots and posts alerts via its own webhook
const RAID_CHANNELS = {};
const RAID_CHANNEL_CONFIG = process.env.RAID_CHANNEL_CONFIG || "";
if (RAID_CHANNEL_CONFIG) {
    // Format: "channelId1:webhookUrl1|channelId2:webhookUrl2"
    for (const entry of RAID_CHANNEL_CONFIG.split('|')) {
        const sep = entry.indexOf(':');
        if (sep > 0) {
            const chId = entry.substring(0, sep).trim();
            const whUrl = entry.substring(sep + 1).trim();
            RAID_CHANNELS[chId] = whUrl;
        }
    }
}

// Parse webhook IDs/tokens for PATCH operations (reactions update)
const WEBHOOK_CREDENTIALS = {}; // channelId → { id, token }
for (const [chId, whUrl] of Object.entries(RAID_CHANNELS)) {
    const m = whUrl.match(/webhooks\/(\d+)\/(.+)/);
    if (m) WEBHOOK_CREDENTIALS[chId] = { id: m[1], token: m[2] };
}

// Current raid bosses by tier — update when rotation changes
const CURRENT_RAID_BOSSES = {
    1: { name: 'Regieleki', id: 894 },   // T1 placeholder
    3: { name: 'Regieleki', id: 894 },   // T3 placeholder
    5: { name: 'Regieleki', id: 894 },
    'mega': null,
};

function getPokemonSprite(pokemonId) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;
}

let botUserId = null; // Set on READY event
const pendingHatchTimers = new Map(); // messageId → timeoutId
let ws;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;
let resumeGatewayUrl = null;
let reconnectAttempts = 0;

function connect(url) {
    console.log(`🤖 Connecting to Discord Gateway...`);
    ws = new WebSocket(url || GATEWAY_URL);

    ws.onopen = () => {
        console.log("✅ WebSocket connected.");
        reconnectAttempts = 0;
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { op, d, s, t } = data;

        if (s) sequence = s;

        switch (op) {
            case 10: // Hello
                startHeartbeat(d.heartbeat_interval);
                if (sessionId && sequence) {
                    // Resume
                    ws.send(JSON.stringify({
                        op: 6,
                        d: { token: BOT_TOKEN, session_id: sessionId, seq: sequence }
                    }));
                    console.log("🔄 Resuming session...");
                } else {
                    // Identify
                    ws.send(JSON.stringify({
                        op: 2,
                        d: {
                            token: BOT_TOKEN,
                            intents: INTENTS,
                            properties: {
                                os: "linux",
                                browser: "PoGoBot",
                                device: "PoGoBot"
                            },
                            presence: {
                                status: "online",
                                activities: [],
                                since: null,
                                afk: false
                            }
                        }
                    }));
                    console.log("📡 Identify sent.");
                }
                break;

            case 11: // Heartbeat ACK
                break;

            case 0: // Dispatch
                if (t === "READY") {
                    sessionId = d.session_id;
                    resumeGatewayUrl = d.resume_gateway_url;
                    botUserId = d.user.id;
                    console.log(`✅ Bot online as ${d.user.username} (ID: ${botUserId})`);
                } else if (t === "RESUMED") {
                    console.log("✅ Session resumed successfully.");
                } else if (t === "MESSAGE_CREATE") {
                    handleMessageCreate(d);
                } else if (t === "MESSAGE_REACTION_ADD" || t === "MESSAGE_REACTION_REMOVE") {
                    handleReactionUpdate(d);
                }
                break;

            case 7: // Reconnect
                console.log("🔄 Server requested reconnect...");
                ws.close();
                break;

            case 9: // Invalid Session
                console.log("⚠️ Invalid session. Re-identifying...");
                if (!d) {
                    sessionId = null;
                    sequence = null;
                }
                setTimeout(() => connect(), 5000);
                break;

            case 1: // Heartbeat request
                sendHeartbeat();
                break;
        }
    };

    ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (code: ${event.code}). Reconnecting...`);
        clearInterval(heartbeatInterval);
        reconnectAttempts++;
        const delay = Math.min(reconnectAttempts * 2000, 30000);
        setTimeout(() => connect(resumeGatewayUrl), delay);
    };

    ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err.message);
    };
}

function sendHeartbeat() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 1, d: sequence }));
    }
}

function startHeartbeat(interval) {
    clearInterval(heartbeatInterval);
    // Jitter for first heartbeat
    setTimeout(() => {
        sendHeartbeat();
        heartbeatInterval = setInterval(sendHeartbeat, interval);
    }, interval * Math.random());
}

// ==========================================
// Raid Screenshot Handler
// ==========================================

async function handleMessageCreate(message) {
    // Only process messages in configured raid channels
    const webhookUrl = RAID_CHANNELS[message.channel_id];
    if (!webhookUrl) return;

    // Ignore bot messages
    if (message.author?.bot) return;

    // Check for image attachments
    const imageAttachments = (message.attachments || []).filter(att =>
        att.content_type?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.filename)
    );

    if (imageAttachments.length === 0) return;

    console.log(`📸 Raid screenshot detected from ${message.author?.username} (${imageAttachments.length} image(s))`);

    // Process each image
    for (const attachment of imageAttachments) {
        try {
            // Add hourglass reaction to indicate processing
            await addReaction(message.channel_id, message.id, '%E2%8F%B3'); // ⏳

            // Dispatch to Next.js API for OCR processing
            const res = await fetch(RAID_PROCESS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-raid-secret': RAID_PROCESS_SECRET
                },
                body: JSON.stringify({
                    imageUrl: attachment.url,
                    messageId: message.id,
                    channelId: message.channel_id,
                    authorId: message.author?.id,
                    authorName: message.author?.global_name || message.author?.username || 'Inconnu',
                    webhookUrl
                })
            });

            const result = await res.json();
            if (result.success) {
                console.log(`✅ Raid processed: ${result.raidInfo?.pokemonName || 'Unknown'} at ${result.raidInfo?.gymName}`);

                // Schedule egg → raid boss transform if it's an egg with a hatch time
                if (result.raidInfo?.raidType === 'egg' && result.raidInfo?.hatchTime && result.webhookMessageId) {
                    const hatchMs = new Date(result.raidInfo.hatchTime).getTime() - Date.now();
                    if (hatchMs > 0) {
                        const tier = result.raidInfo.tier;
                        const gymName = result.raidInfo.gymName;
                        const msgId = result.webhookMessageId;

                        console.log(`⏰ Scheduling egg hatch transform in ${Math.round(hatchMs / 60000)}min for msg ${msgId}`);

                        const timerId = setTimeout(() => {
                            transformEggToRaid(message.channel_id, msgId, tier, gymName, webhookUrl);
                            pendingHatchTimers.delete(msgId);
                        }, hatchMs);
                        pendingHatchTimers.set(msgId, timerId);
                    }
                }
            } else {
                console.log(`⚠️ Raid processing: ${result.error || 'unknown error'}`);
            }
        } catch (e) {
            console.error(`❌ Raid dispatch error:`, e.message);
            // Add error reaction
            await addReaction(message.channel_id, message.id, '%E2%9D%8C'); // ❌
        }

        // Small delay between images to avoid overwhelming Tesseract
        if (imageAttachments.length > 1) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

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
        console.error('Reaction error:', e.message);
    }
}

// ==========================================
// Egg → Raid Boss Auto-Transform
// ==========================================

async function transformEggToRaid(channelId, messageId, tier, gymName, webhookUrl) {
    console.log(`🥚→⚔️ Transforming egg message ${messageId} (tier ${tier})`);

    // Parse webhook credentials from URL
    const whMatch = webhookUrl?.match(/webhooks\/(\d+)\/(.+)/);
    if (!whMatch) return;
    const whId = whMatch[1];
    const whToken = whMatch[2];

    const boss = CURRENT_RAID_BOSSES[tier];
    if (!boss) {
        console.log(`[Raid] No current boss configured for tier ${tier}, skipping transform`);
        return;
    }

    try {
        // Fetch current message to preserve fields (joueurs inscrits)
        const msgRes = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );

        if (!msgRes.ok) return;
        const message = await msgRes.json();
        if (!message.embeds || message.embeds.length === 0) return;

        const embed = message.embeds[0];

        // Update title: egg → raid boss
        embed.title = `⚔️ Raid ${boss.name} à ${gymName || 'Arène inconnue'}`;
        embed.color = 0x8B00FF; // Keep legendary color

        // Remove éclosion field, keep depop and joueurs inscrits
        if (embed.fields) {
            embed.fields = embed.fields.filter(f => !f.name?.includes('closion'));
        }

        // Remove description if any
        delete embed.description;

        // Set Pokemon sprite as thumbnail
        embed.thumbnail = { url: getPokemonSprite(boss.id) };

        // PATCH
        const patchRes = await fetch(
            `https://discord.com/api/webhooks/${whId}/${whToken}/messages/${messageId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            }
        );

        if (patchRes.ok) {
            console.log(`✅ Egg transformed to Raid ${boss.name}`);
        } else {
            const err = await patchRes.text();
            console.error(`[Raid] Transform PATCH error: ${patchRes.status}`, err);
        }
    } catch (e) {
        console.error(`[Raid] Transform error:`, e.message);
    }
}

// ==========================================
// Raid Reaction Handler (🙌 = Joueurs inscrits)
// ==========================================

// Custom emoji IDs for raid signup
const EMOJI_PRESENTIEL = { name: 'passpremium', id: '858757890968649738' };
const EMOJI_DISTANCE = { name: 'passedistance', id: '773165174068346890' };
const RAID_EMOJI_IDS = new Set([EMOJI_PRESENTIEL.id, EMOJI_DISTANCE.id]);

async function handleReactionUpdate(data) {
    // Only handle our raid pass emojis
    if (!data.emoji.id || !RAID_EMOJI_IDS.has(data.emoji.id)) return;

    // Ignore bot's own reactions
    if (data.user_id === botUserId) return;

    console.log(`🎫 Reaction update (${data.emoji.name}) on message ${data.message_id} by user ${data.user_id}`);

    try {
        // 1. Fetch the current message to get existing embeds
        const msgRes = await fetch(
            `https://discord.com/api/v10/channels/${data.channel_id}/messages/${data.message_id}`,
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
        );

        if (!msgRes.ok) return;
        const message = await msgRes.json();
        if (!message.embeds || message.embeds.length === 0) return;

        // 2. Fetch users for both emojis
        const [presentielRes, distanceRes] = await Promise.all([
            fetch(
                `https://discord.com/api/v10/channels/${data.channel_id}/messages/${data.message_id}/reactions/${EMOJI_PRESENTIEL.name}%3A${EMOJI_PRESENTIEL.id}`,
                { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
            ),
            fetch(
                `https://discord.com/api/v10/channels/${data.channel_id}/messages/${data.message_id}/reactions/${EMOJI_DISTANCE.name}%3A${EMOJI_DISTANCE.id}`,
                { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
            )
        ]);

        const presentielUsers = presentielRes.ok
            ? (await presentielRes.json()).filter(u => u.id !== botUserId)
            : [];
        const distanceUsers = distanceRes.ok
            ? (await distanceRes.json()).filter(u => u.id !== botUserId)
            : [];

        // 3. Update the embed fields
        const embed = message.embeds[0];
        if (!embed.fields) embed.fields = [];

        // Find or create the Présentiel field
        const presentielIdx = embed.fields.findIndex(f => f.name && f.name.includes('sentiel'));
        const presentielField = {
            name: `<:passpremium:858757890968649738> Présentiel (${presentielUsers.length})`,
            value: presentielUsers.length > 0
                ? presentielUsers.map(u => u.global_name || u.username).join('\n')
                : '_Aucun_',
            inline: true
        };

        // Find or create the À distance field
        const distanceIdx = embed.fields.findIndex(f => f.name && f.name.includes('distance'));
        const distanceField = {
            name: `<:passedistance:773165174068346890> À distance (${distanceUsers.length})`,
            value: distanceUsers.length > 0
                ? distanceUsers.map(u => u.global_name || u.username).join('\n')
                : '_Aucun_',
            inline: true
        };

        if (presentielIdx >= 0) embed.fields[presentielIdx] = presentielField;
        else embed.fields.push(presentielField);

        if (distanceIdx >= 0) embed.fields[distanceIdx] = distanceField;
        else embed.fields.push(distanceField);

        // 4. PATCH webhook message — try all webhooks
        let patched = false;
        for (const creds of Object.values(WEBHOOK_CREDENTIALS)) {
            const patchRes = await fetch(
                `https://discord.com/api/webhooks/${creds.id}/${creds.token}/messages/${data.message_id}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ embeds: [embed] })
                }
            );
            if (patchRes.ok) {
                const total = presentielUsers.length + distanceUsers.length;
                console.log(`✅ Updated joueurs: ${presentielUsers.length} présentiel, ${distanceUsers.length} distance`);
                patched = true;
                break;
            }
        }
        if (!patched) {
            console.error(`[Raid] Could not update joueurs for msg ${data.message_id}`);
        }
    } catch (e) {
        console.error(`[Raid] Reaction handler error:`, e.message);
    }
}

// ==========================================
// Autopurge Cron - runs daily at 04:00 CET
// ==========================================
const AUTOPURGE_URL = process.env.AUTOPURGE_URL || "http://localhost:3064/api/bot/autopurge";
const LOG_CHANNEL = "1485246069897039993";

async function runAutopurge() {
    console.log("🕐 Running scheduled autopurge...");
    try {
        const secret = process.env.AUTOPURGE_SECRET || BOT_TOKEN;
        const res = await fetch(AUTOPURGE_URL, {
            method: "PUT",
            headers: { "x-autopurge-secret": secret }
        });
        const data = await res.json();
        console.log(`✅ Autopurge done: ${JSON.stringify(data.results?.map(r => `#${r.channelName}: ${r.deleted}`) || [])}`);
    } catch (e) {
        console.error(`❌ Autopurge failed: ${e.message}`);
    }
}

function scheduleAutopurge() {
    const now = new Date();
    // Target 04:00 CET (03:00 UTC in winter, 02:00 UTC in summer)
    const target = new Date(now);
    target.setUTCHours(3, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    const delay = target - now;
    console.log(`⏰ Next autopurge scheduled in ${Math.round(delay / 3600000)}h (${target.toISOString()})`);

    setTimeout(() => {
        runAutopurge();
        // Then repeat every 24h
        setInterval(runAutopurge, 24 * 60 * 60 * 1000);
    }, delay);
}

// Start
connect();
scheduleAutopurge();
console.log("🚀 PoGo Poitiers Bot Gateway started. Keeping bot online...");
const raidChannelCount = Object.keys(RAID_CHANNELS).length;
if (raidChannelCount > 0) {
    for (const [chId, whUrl] of Object.entries(RAID_CHANNELS)) {
        const whMatch = whUrl.match(/webhooks\/(\d+)\//);
        console.log(`📸 Raid scanner active: channel ${chId} → webhook ${whMatch?.[1] || '?'}`);
    }
} else {
    console.log("⚠️ RAID_CHANNEL_CONFIG not set - raid scanner disabled");
}

// Keep process alive
process.on("SIGINT", () => {
    console.log("👋 Shutting down bot gateway...");
    if (ws) ws.close(1000);
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("👋 Shutting down bot gateway...");
    if (ws) ws.close(1000);
    process.exit(0);
});
