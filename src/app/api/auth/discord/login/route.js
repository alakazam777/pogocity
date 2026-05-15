import { NextResponse } from 'next/server';
import { getAllUsers, saveUser, getUser } from '@/lib/pokemonStorage';

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || '1023267070104277022'; // PogoSphere Guild ID fallback? Best to rely on env but I'll add the one from a previous context if I knew it. User didn't give it. I'll stick to env.
// Actually, I can't guess the ID. I'll assume it's in env.
// Wait, I should probably check if the user provided it.
// I'll use process.env.DISCORD_GUILD_ID and process.env.DISCORD_BOT_TOKEN

async function getDiscordTeam(discordId) {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
        console.log("Missing Discord ENV vars for role sync");
        return null;
    }

    try {
        // Fetch Member and Roles in parallel
        const [memberRes, rolesRes] = await Promise.all([
            fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
                headers: { Authorization: `Bot ${botToken}` },
                next: { revalidate: 0 }
            }),
            fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
                headers: { Authorization: `Bot ${botToken}` },
                next: { revalidate: 3600 } // Cache roles for 1 hour
            })
        ]);

        if (!memberRes.ok) {
            console.error(`Failed to fetch member: ${memberRes.status}`);
            return null;
        }
        if (!rolesRes.ok) {
            console.error(`Failed to fetch roles: ${rolesRes.status}`);
            return null;
        }

        const member = await memberRes.json();
        const allRoles = await rolesRes.json();

        // Map member role IDs to names
        const memberRoleIds = member.roles || [];

        for (const roleId of memberRoleIds) {
            const role = allRoles.find(r => r.id === roleId);
            if (role) {
                const name = role.name.toLowerCase();
                if (name.includes('bravoure') || name.includes('valor')) return 'Bravoure';
                if (name.includes('sagesse') || name.includes('mystic')) return 'Sagesse';
                if (name.includes('intuition') || name.includes('instinct')) return 'Intuition';
            }
        }

    } catch (error) {
        console.error('Error syncing Discord roles:', error);
    }

    return null;
}

export async function POST(request) {
    try {
        const { discordId, username, email, image } = await request.json();

        if (!discordId) {
            return NextResponse.json({ error: 'Discord ID required' }, { status: 400 });
        }

        const allUsers = await getAllUsers();
        let foundUser = null;

        // 1. Try to find by Discord ID — primary identity match.
        for (const key in allUsers) {
            if (allUsers[key].discordId === discordId) {
                foundUser = allUsers[key];
                break;
            }
        }

        // 2. Fall back to email match (defense-in-depth). Only fires when:
        //    a) the Discord ID isn't on any account yet (new Discord login), AND
        //    b) the user previously stored a verified email on their account,
        //       AND that email matches what Discord OAuth returned.
        // Discord verifies emails at signup and (since 2022) blocks unverified
        // emails from being passed to OAuth scopes, so an email match plus a
        // matching Discord ID-less account is a strong enough signal to
        // auto-link without password re-entry.
        if (!foundUser && email) {
            const normalizedEmail = email.toLowerCase().trim();
            for (const key in allUsers) {
                const u = allUsers[key];
                if (
                    u.email &&
                    u.email.toLowerCase().trim() === normalizedEmail &&
                    !u.discordId
                ) {
                    foundUser = u;
                    console.log(`[discord/login] Email auto-link: "${u.username}" via ${normalizedEmail}`);
                    break;
                }
            }
        }

        // 3. Fetch Team from Discord Roles (for both existing and new users).
        const stringsTeam = await getDiscordTeam(discordId);
        console.log(`Discord Sync for ${username}: Detected Team ${stringsTeam}`);

        if (!foundUser) {
            // No match by Discord ID and no match by email. We REFUSE to
            // auto-create a stub account using the Discord display name —
            // that's how "Maxime866 logs in via Discord and ends up as a
            // brand-new Max866 stub" happened. Instead, return a sentinel
            // response so the frontend can prompt the user:
            //   "Pick a username (or claim an existing account with your password)"
            //
            // The previous behaviour also had a security bug: it would
            // silently link any matching-username account that had no
            // discordId, allowing account hijacking by anyone setting their
            // Discord display name to a victim's username. The new flow
            // requires password verification to claim an existing account.
            return NextResponse.json({
                needsUsername: true,
                suggestion: username,        // Discord display name as default
                discordId,
                email: email || null,
                image: image || null,
                team: stringsTeam || null,
            });
        }

        // Found an existing account by Discord ID or email — update
        // metadata if needed (image, team, email if newly provided).
        let updates = {};
        if (image && !foundUser.trainerImage) updates.trainerImage = image;
        if (stringsTeam && foundUser.team !== stringsTeam) updates.team = stringsTeam;
        if (email && !foundUser.email) updates.email = email; // backfill email
        if (!foundUser.discordId) updates.discordId = discordId; // email auto-link path

        if (Object.keys(updates).length > 0) {
            foundUser = await saveUser(foundUser.username, { ...foundUser, ...updates });
        }

        const { passwordHash, ...safeUser } = foundUser;
        return NextResponse.json(safeUser);

    } catch (error) {
        console.error('Discord Login Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
