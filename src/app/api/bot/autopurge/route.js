import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN } from "@/lib/botAuth";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "autopurge.json");
const LOG_CHANNEL = "1485246069897039993";

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        }
    } catch (e) { }
    return { rules: [], lastRun: null };
}

function saveConfig(config) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// GET: return current autopurge config
export async function GET() {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    return NextResponse.json(loadConfig());
}

// POST: save autopurge rules
export async function POST(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { rules } = await request.json();
    if (!Array.isArray(rules)) return NextResponse.json({ error: "rules doit etre un tableau" }, { status: 400 });

    const config = loadConfig();
    config.rules = rules.map(r => ({
        channelId: r.channelId,
        channelName: r.channelName || "",
        keepDays: parseInt(r.keepDays) || 30,
        enabled: r.enabled !== false
    }));
    saveConfig(config);

    return NextResponse.json({ success: true, rules: config.rules });
}

// PUT: trigger manual run of autopurge (accepts admin session OR internal secret)
export async function PUT(request) {
    const internalSecret = request.headers.get("x-autopurge-secret");
    const expectedSecret = process.env.AUTOPURGE_SECRET || BOT_TOKEN;
    if (internalSecret !== expectedSecret) {
        const auth = await verifyBotAdmin();
        if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const config = loadConfig();
    const results = [];

    const enabledRules = config.rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
        return NextResponse.json({ message: "Aucune regle active", results: [] });
    }

    // Log start
    await fetch(`https://discord.com/api/v10/channels/${LOG_CHANNEL}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: `🤖 **Purge automatique lancee** (${enabledRules.length} salon${enabledRules.length > 1 ? 's' : ''})` })
    });

    for (const rule of enabledRules) {
        const cutoff = new Date(Date.now() - rule.keepDays * 24 * 60 * 60 * 1000);
        let toDelete = [];
        let lastId = null;

        // Collect messages older than cutoff
        while (true) {
            let url = `https://discord.com/api/v10/channels/${rule.channelId}/messages?limit=100`;
            if (lastId) url += `&before=${lastId}`;

            const res = await fetch(url, { headers: { Authorization: `Bot ${BOT_TOKEN}` } });
            if (res.status === 429) {
                const data = await res.json();
                await new Promise(r => setTimeout(r, data.retry_after * 1000 + 500));
                continue;
            }
            if (!res.ok) break;

            const msgs = await res.json();
            if (!Array.isArray(msgs) || msgs.length === 0) break;

            for (const m of msgs) {
                if (new Date(m.timestamp) < cutoff) toDelete.push(m.id);
            }
            lastId = msgs[msgs.length - 1].id;
            // If oldest message is still newer than cutoff, keep going
            if (new Date(msgs[msgs.length - 1].timestamp) >= cutoff) continue;
            // If we've gone past the cutoff, stop
            break;
        }

        // Delete
        let deleted = 0;
        let errors = 0;
        for (const msgId of toDelete) {
            while (true) {
                const res = await fetch(`https://discord.com/api/v10/channels/${rule.channelId}/messages/${msgId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bot ${BOT_TOKEN}` }
                });
                if (res.status === 429) {
                    const data = await res.json();
                    await new Promise(r => setTimeout(r, data.retry_after * 1000 + 500));
                    continue;
                }
                if (res.status === 204) deleted++;
                else errors++;
                break;
            }
            await new Promise(r => setTimeout(r, 1200));
        }

        results.push({
            channelId: rule.channelId,
            channelName: rule.channelName,
            keepDays: rule.keepDays,
            deleted,
            errors
        });

        // Log per channel
        if (deleted > 0) {
            await fetch(`https://discord.com/api/v10/channels/${LOG_CHANNEL}/messages`, {
                method: "POST",
                headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify({ content: `🧹 **#${rule.channelName}** : ${deleted} messages supprimes (garder ${rule.keepDays}j)${errors > 0 ? ` | ⚠️ ${errors} erreurs` : ''}` })
            });
        }
    }

    config.lastRun = new Date().toISOString();
    saveConfig(config);

    // Log end
    const totalDeleted = results.reduce((s, r) => s + r.deleted, 0);
    await fetch(`https://discord.com/api/v10/channels/${LOG_CHANNEL}/messages`, {
        method: "POST",
        headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: `✅ **Purge automatique terminee** : ${totalDeleted} messages supprimes au total` })
    });

    return NextResponse.json({ success: true, results, lastRun: config.lastRun });
}
