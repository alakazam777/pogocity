import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN, GUILD_ID } from "@/lib/botAuth";

export async function GET() {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

    try {
        // Get bot info
        const botRes = await fetch("https://discord.com/api/v10/users/@me", {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });
        const bot = await botRes.json();

        // Get guild info
        const guildRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });
        const guild = guildRes.ok ? await guildRes.json() : null;

        // Get channels
        const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
            headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });
        const channels = channelsRes.ok ? await channelsRes.json() : [];

        const textChannels = channels
            .filter(c => c.type === 0)
            .sort((a, b) => a.position - b.position)
            .map(c => ({ id: c.id, name: c.name, position: c.position }));

        return NextResponse.json({
            bot: { id: bot.id, username: bot.username, avatar: bot.avatar },
            guild: guild ? {
                name: guild.name,
                memberCount: guild.approximate_member_count,
                icon: guild.icon
            } : null,
            channels: textChannels,
            online: true
        });
    } catch (e) {
        return NextResponse.json({ error: e.message, online: false }, { status: 500 });
    }
}
