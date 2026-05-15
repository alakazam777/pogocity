import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const ADMIN_DISCORD_ID = process.env.DISCORD_ADMIN_ID;

export async function verifyBotAdmin(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { authorized: false, error: "Non connecté", status: 401 };
        }
        if (session.user.id !== ADMIN_DISCORD_ID) {
            return { authorized: false, error: "Accès refusé", status: 403 };
        }
        return { authorized: true, user: session.user };
    } catch (e) {
        return { authorized: false, error: "Erreur d'authentification", status: 500 };
    }
}

// /api/bot/* endpoints use this token + guild ID to talk to Discord.
// Points at the PogoSphere bot + PogoSphere guild. If you ever need to
// flip the dashboard back at the legacy PogoPoitiers admin bot, set
// DISCORD_BOT_TOKEN / DISCORD_GUILD_ID in .env.local to the old PoPo
// values — we no longer fall back to *_ADMIN automatically because that
// silently sent /bot dashboard requests to the wrong guild.
export const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
export const GUILD_ID = process.env.DISCORD_GUILD_ID;
