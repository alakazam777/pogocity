// Lightweight Discord Gateway connection for the **PogoSphere** bot.
//
// Purpose: keep the bot's gateway socket connected so the bot appears
// "Online" (green dot) in the Discord member list. Everything else
// — posting, editing, reading messages, channel admin, etc. — is done
// from the Next.js app via Discord's REST API (see src/app/api/bot/*).
//
// This is intentionally simpler than pogopoitiers/bot-gateway.js:
//   – no raid screenshot OCR pipeline
//   – no egg → raid boss auto-transform
//   – no raid reaction handler
// PogoSphere's #raid channels don't exist yet, and if/when they do
// we'll port the relevant handlers from PoPo. For now, this process
// just maintains the WebSocket connection + heartbeats and runs the
// autopurge cron that pokes the /api/bot/autopurge endpoint daily.
//
// Env vars (loaded via --env-file=.env.local in ecosystem.config.js):
//   DISCORD_BOT_TOKEN     — PogoSphere bot token (required)
//   AUTOPURGE_URL         — defaults to http://localhost:3064/api/bot/autopurge
//   AUTOPURGE_SECRET      — defaults to DISCORD_BOT_TOKEN

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.argv[2];

if (!BOT_TOKEN) {
    console.error("❌ No bot token. Set DISCORD_BOT_TOKEN in .env.local.");
    process.exit(1);
}

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

// GUILDS (1<<0) is enough to show as Online with no message intent.
// We don't need MESSAGE_CONTENT etc. unless we add features that read
// message text — keep intents minimal so we don't have to enable any
// privileged toggles in the Discord developer portal.
const INTENTS = (1 << 0); // GUILDS

let ws;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;
let resumeGatewayUrl = null;
let reconnectAttempts = 0;
let botUserId = null;

function connect(url) {
    console.log("🤖 Connecting to Discord Gateway...");
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
                    ws.send(JSON.stringify({
                        op: 6,
                        d: { token: BOT_TOKEN, session_id: sessionId, seq: sequence },
                    }));
                    console.log("🔄 Resuming session...");
                } else {
                    ws.send(JSON.stringify({
                        op: 2,
                        d: {
                            token: BOT_TOKEN,
                            intents: INTENTS,
                            properties: { os: "linux", browser: "PogoSphereBot", device: "PogoSphereBot" },
                            presence: { status: "online", activities: [], since: null, afk: false },
                        },
                    }));
                    console.log("📡 Identify sent.");
                }
                break;

            case 11: // Heartbeat ACK — no-op
                break;

            case 0: // Dispatch
                if (t === "READY") {
                    sessionId = d.session_id;
                    resumeGatewayUrl = d.resume_gateway_url;
                    botUserId = d.user.id;
                    console.log(`✅ Online as ${d.user.username} (ID: ${botUserId})`);
                } else if (t === "RESUMED") {
                    console.log("✅ Session resumed.");
                }
                break;

            case 7: // Reconnect
                console.log("🔄 Server requested reconnect...");
                ws.close();
                break;

            case 9: // Invalid Session — re-identify
                console.log("⚠️ Invalid session. Re-identifying...");
                if (!d) { sessionId = null; sequence = null; }
                setTimeout(() => connect(), 5000);
                break;

            case 1: // Heartbeat request
                sendHeartbeat();
                break;
        }
    };

    ws.onclose = (event) => {
        console.log(`🔌 WebSocket closed (code ${event.code}). Reconnecting...`);
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
    // First heartbeat with jitter per Discord docs
    setTimeout(() => {
        sendHeartbeat();
        heartbeatInterval = setInterval(sendHeartbeat, interval);
    }, interval * Math.random());
}

// ── Autopurge cron — pokes /api/bot/autopurge daily at 04:00 CET ─────
const AUTOPURGE_URL = process.env.AUTOPURGE_URL || "http://localhost:3064/api/bot/autopurge";

async function runAutopurge() {
    console.log("🕐 Running scheduled autopurge...");
    try {
        const secret = process.env.AUTOPURGE_SECRET || BOT_TOKEN;
        const res = await fetch(AUTOPURGE_URL, {
            method: "PUT",
            headers: { "x-autopurge-secret": secret },
        });
        const data = await res.json();
        const summary = data.results?.map(r => `#${r.channelName}: ${r.deleted}`).join(", ") || "(no rules)";
        console.log(`✅ Autopurge done: ${summary}`);
    } catch (e) {
        console.error(`❌ Autopurge failed: ${e.message}`);
    }
}

function scheduleAutopurge() {
    const now = new Date();
    // 04:00 CET ≈ 03:00 UTC in winter / 02:00 UTC in summer. We pick
    // 03:00 UTC consistently — close enough, and there's no DST-aware
    // cron primitive worth dragging in for a daily job.
    const target = new Date(now);
    target.setUTCHours(3, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    console.log(`⏰ Next autopurge in ${Math.round(delay / 3600000)}h (${target.toISOString()})`);

    setTimeout(() => {
        runAutopurge();
        setInterval(runAutopurge, 24 * 60 * 60 * 1000);
    }, delay);
}

// ── Boot ─────────────────────────────────────────────────────────────
connect();
scheduleAutopurge();
console.log("🚀 PogoSphere bot gateway started.");

process.on("SIGINT", () => { if (ws) ws.close(1000); process.exit(0); });
process.on("SIGTERM", () => { if (ws) ws.close(1000); process.exit(0); });
