import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN } from "@/lib/botAuth";

export async function POST(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { channelId, messageId, content } = await request.json();

    if (!channelId || !messageId || !content) {
        return NextResponse.json({ error: "channelId, messageId et content requis" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
            method: "PATCH",
            headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify({ content })
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.message || "Erreur Discord API" }, { status: res.status });
        }

        const msg = await res.json();
        return NextResponse.json({ success: true, messageId: msg.id });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
