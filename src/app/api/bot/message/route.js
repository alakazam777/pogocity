import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN } from "@/lib/botAuth";

export async function GET(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const messageId = searchParams.get("messageId");

    if (!channelId || !messageId) {
        return NextResponse.json({ error: "channelId et messageId requis" }, { status: 400 });
    }

    try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.message || "Message introuvable" }, { status: res.status });
        }

        const msg = await res.json();
        return NextResponse.json(msg);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
