import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN } from "@/lib/botAuth";

export async function POST(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { channelId, beforeDate, logChannelId } = await request.json();

    if (!channelId || !beforeDate) {
        return NextResponse.json({ error: "channelId et beforeDate requis" }, { status: 400 });
    }

    const cutoff = new Date(beforeDate);
    const LOG_CHANNEL = logChannelId || "1485246069897039993";

    try {
        // Collect messages to delete
        let toDelete = [];
        let lastId = null;

        while (true) {
            let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=100`;
            if (lastId) url += `&before=${lastId}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bot ${BOT_TOKEN}` }
            });

            if (res.status === 429) {
                const data = await res.json();
                await new Promise(r => setTimeout(r, data.retry_after * 1000 + 500));
                continue;
            }

            const msgs = await res.json();
            if (!Array.isArray(msgs) || msgs.length === 0) break;

            for (const m of msgs) {
                if (new Date(m.timestamp) < cutoff) {
                    toDelete.push(m.id);
                }
            }
            lastId = msgs[msgs.length - 1].id;
        }

        if (toDelete.length === 0) {
            return NextResponse.json({ deleted: 0, message: "Aucun message à supprimer" });
        }

        // Log start
        await fetch(`https://discord.com/api/v10/channels/${LOG_CHANNEL}/messages`, {
            method: "POST",
            headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content: `🧹 **Purge lancée** depuis le dashboard\n📋 ${toDelete.length} messages à supprimer dans <#${channelId}>` })
        });

        // Delete one by one
        let deleted = 0;
        let errors = 0;

        for (const msgId of toDelete) {
            while (true) {
                const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${msgId}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bot ${BOT_TOKEN}` }
                });

                if (res.status === 429) {
                    const data = await res.json();
                    await new Promise(r => setTimeout(r, data.retry_after * 1000 + 500));
                    continue;
                }

                if (res.status === 204) {
                    deleted++;
                } else {
                    errors++;
                }
                break;
            }
            await new Promise(r => setTimeout(r, 1200));
        }

        // Log end
        await fetch(`https://discord.com/api/v10/channels/${LOG_CHANNEL}/messages`, {
            method: "POST",
            headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content: `✅ **Purge terminée** dans <#${channelId}>\n🗑️ **${deleted}** supprimés | ${errors > 0 ? `⚠️ ${errors} erreurs` : '✨ Aucune erreur'}` })
        });

        return NextResponse.json({ deleted, errors, total: toDelete.length });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
