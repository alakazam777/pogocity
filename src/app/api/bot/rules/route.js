// /api/bot/rules — admin endpoint to edit + publish the #rules embed
// on the PogoSphere Discord server.
//
// Storage: data/discord_rules.json
//   {
//     title: string,
//     description: string,   // long-form, markdown allowed
//     color: number,         // Discord embed color (decimal)
//     messageId?: string,    // set after first publish; used for edit-in-place
//     channelId?: string,    // resolved at publish time, cached for edit
//     lastPublishedAt?: ISO  // bookkeeping
//   }
//
// Endpoints:
//   GET   → returns the current saved JSON (admin-only)
//   PUT   → updates the JSON in place WITHOUT publishing (auto-save)
//   POST  → publishes the embed to the #rules channel.
//           If messageId is already saved, edits the existing message
//           via PATCH /channels/{id}/messages/{id}. Otherwise posts a
//           fresh message and saves the new messageId for next time.
//
// Authorization: same x-pogo-admin-user header pattern as other /api/bot
// routes — must be 'lcsnzh'.

import { NextResponse } from 'next/server';
import path from 'path';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const RULES_FILE = path.join(DATA_DIR, 'discord_rules.json');

const ADMIN_USERNAMES = new Set(['lcsnzh']);

// Default rules content — English mirror of PogoPoitiers' #charte embed
// (rich embed via MEE6 on the PoPo guild). Each rule line gets a 🔹
// bullet to match the original's visual cadence. Tweaked for the
// worldwide PogoSphere audience (no city-specific raid bot reference).
const DEFAULT_RULES = {
    title: 'Please follow these rules so the server stays welcoming for everyone',
    description: [
        '🔹 Your avatar must not be shocking, NSFW, or offensive.',
        '🔹 Sharing personal information and your in-game credentials is discouraged.',
        '🔹 Please write in clear, readable English (or the language of the channel where you post).',
        '🔹 Be civil toward everyone — both the trainers here and the ones you meet at raids.',
        '🔹 Verbal abuse, racism, LGBTphobia, sexism, and harassment of any kind are forbidden.',
        '🔹 Keep your private life private — DMs are the right place for that.',
        '🔹 If you have a conflict with another member, try to resolve it in private first. Otherwise, ping a moderator.',
        '🔹 GPS spoofing, third-party bot use, fake-distance software, and any promotion of those tools is not tolerated.',
        '🔹 Don\'t post Discord, Messenger, or other social-media invite links to promote other servers without prior moderator approval.',
        '🔹 Help other players when you reasonably can — this community runs on mutual aid.',
        '🔹 Respect each channel\'s topic. No flooding, no excessive pings, no off-topic spam.',
        '🔹 The community is happy to answer your questions — please also read the info channels and post in the right place.',
        '',
        '⚠️ Any violation of these rules will result in a warning, then a kick, and finally a ban for repeat offenders.',
    ].join('\n'),
    color: 0x9333ea, // PogoSphere purple (matches header gradient endpoint)
};

function requireAdmin(request) {
    const username = request.headers.get('x-pogo-admin-user');
    if (!username || !ADMIN_USERNAMES.has(username)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
}

async function loadRules() {
    const saved = await safeReadJson(RULES_FILE, null);
    return saved || { ...DEFAULT_RULES };
}

async function findRulesChannelId(token, guildId) {
    const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: { Authorization: `Bot ${token}` },
    });
    if (!r.ok) return null;
    const channels = await r.json();
    if (!Array.isArray(channels)) return null;
    // Match by Discord normalized name (lowercase, strips emojis is hard
    // — instead we match "rules" or "rule" as a substring of the .name
    // since our setup script names the channel "📋│rules").
    const match = channels.find(
        (c) => c.type === 0 && /rules?/i.test(c.name || '')
    );
    return match ? match.id : null;
}

export async function GET(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const rules = await loadRules();
    return NextResponse.json(rules);
}

export async function PUT(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;
    const body = await request.json().catch(() => ({}));
    const current = await loadRules();
    // Only allow editing safe fields — don't let the client clobber
    // messageId / channelId / lastPublishedAt (those are managed by POST).
    const next = {
        ...current,
        title: typeof body.title === 'string' ? body.title.slice(0, 256) : current.title,
        description: typeof body.description === 'string' ? body.description.slice(0, 4096) : current.description,
        color: Number.isInteger(body.color) ? body.color : current.color,
    };
    await safeWriteJson(RULES_FILE, next);
    return NextResponse.json({ ok: true, rules: next });
}

export async function POST(request) {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!token || !guildId) {
        return NextResponse.json({ error: 'Bot not configured (DISCORD_BOT_TOKEN / DISCORD_GUILD_ID missing)' }, { status: 500 });
    }

    const rules = await loadRules();

    // Resolve channel id every time — if the operator renames or moves
    // the channel, we still find it. Falls back to the cached id from
    // a previous publish if discovery fails.
    let channelId = await findRulesChannelId(token, guildId);
    if (!channelId) channelId = rules.channelId;
    if (!channelId) {
        return NextResponse.json({ error: 'Could not find a #rules channel on the configured Discord server' }, { status: 404 });
    }

    const embed = {
        title: rules.title,
        description: rules.description,
        color: rules.color,
    };

    let messageId = rules.messageId;
    let response;
    if (messageId) {
        // Edit existing
        response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ embeds: [embed] }),
        });
        if (response.status === 404) {
            // Cached messageId stale (operator deleted it). Fall through
            // to a fresh post.
            messageId = null;
        }
    }

    if (!messageId) {
        response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ embeds: [embed] }),
        });
    }

    if (!response.ok) {
        const text = await response.text();
        return NextResponse.json({ error: `Discord ${response.status}: ${text}` }, { status: response.status });
    }
    const data = await response.json();

    // Persist channelId + new messageId so the next publish edits in place.
    await safeWriteJson(RULES_FILE, {
        ...rules,
        channelId,
        messageId: data.id,
        lastPublishedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, messageId: data.id, channelId });
}
