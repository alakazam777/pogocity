import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN } from "@/lib/botAuth";

const CHANNEL_ID = process.env.DISCORD_CAMPFIRE_ANNOUNCE_CHANNEL_ID;
const MAX_CONTENT = 2000; // Discord hard limit

/**
 * Admin-only endpoint to post an announcement message as the PogoSphere bot
 * (same user as /api/bot/send), so the message is editable via the /bot dashboard.
 *
 * Used by the "Partager sur Discord" button on /events to share a newly-created
 * Campfire meetup.
 */
export async function POST(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!BOT_TOKEN) {
        return NextResponse.json({ error: "Bot token non configuré" }, { status: 500 });
    }
    if (!CHANNEL_ID) {
        return NextResponse.json({ error: "Channel ID non configuré" }, { status: 500 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const rawContent = body?.content;
    if (!rawContent || typeof rawContent !== "string" || !rawContent.trim()) {
        return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
    }

    // Strip @everyone / @here to prevent accidental mass-pings via injected text
    const sanitized = rawContent
        .replace(/@(everyone|here)/gi, "@\u200B$1")
        .slice(0, MAX_CONTENT);

    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
            method: "POST",
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: sanitized,
                allowed_mentions: { parse: [] }, // belt-and-suspenders: no pings ever
            }),
        });

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        if (!res.ok) {
            console.error("[discord-announce] bot post error:", res.status, data);
            return NextResponse.json(
                { error: data?.message || "Échec de l'envoi", discord_status: res.status },
                { status: res.status }
            );
        }

        return NextResponse.json({
            success: true,
            messageId: data?.id || null,
            channelId: CHANNEL_ID,
        });
    } catch (e) {
        console.error("[discord-announce] fetch failed:", e);
        return NextResponse.json({ error: "Échec de l'appel à Discord" }, { status: 500 });
    }
}
