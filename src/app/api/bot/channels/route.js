import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN, GUILD_ID } from "@/lib/botAuth";

export async function GET(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get("channelId");
    const before = searchParams.get("before");
    const limit = searchParams.get("limit") || "50";

    if (!channelId) {
        return NextResponse.json({ error: "channelId requis" }, { status: 400 });
    }

    try {
        let url = `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`;
        if (before) url += `&before=${before}`;

        const res = await fetch(url, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });

        if (!res.ok) {
            const err = await res.json();
            return NextResponse.json({ error: err.message }, { status: res.status });
        }

        const messages = await res.json();
        return NextResponse.json(messages);
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
