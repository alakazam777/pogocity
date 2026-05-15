import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN } from "@/lib/botAuth";

export async function POST(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { channelId, content, embed } = await request.json();

    if (!channelId || (!content && !embed)) {
        return NextResponse.json({ error: "channelId et content/embed requis" }, { status: 400 });
    }

    try {
        const body = {};
        if (content) body.content = content;
        if (embed) body.embeds = [embed];

        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.message }, { status: res.status });
        }

        const msg = await res.json();
        return NextResponse.json({ success: true, messageId: msg.id });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
