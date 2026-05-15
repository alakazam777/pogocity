import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { verifySession } from '@/lib/pokemonStorage';
import { createRateLimiter } from '@/lib/rateLimit';

const WEBHOOK_URL = process.env.DISCORD_TRADE_WEBHOOK_URL;

// 10 webhook actions per 5 minutes per IP
const limiter = createRateLimiter('discord-webhook', 10, 5 * 60 * 1000);

// Require user authentication (Discord OAuth, pogo session cookie, or header token)
async function checkUserAuth(request) {
    // Method 1: Discord OAuth session
    const session = await getServerSession(authOptions);
    if (session) return true;

    // Method 2: pogo_session cookie
    const cookieStore = await cookies();
    const pogoSession = cookieStore.get('pogo_session')?.value;
    if (pogoSession) {
        const [user, token] = pogoSession.split(':');
        if (await verifySession(user, token)) return true;
    }

    // Method 3: x-pogo-auth header (fallback for mobile browsers where cookies may not be sent)
    const authHeader = request?.headers?.get('x-pogo-auth');
    if (authHeader) {
        const sep = authHeader.indexOf(':');
        if (sep > 0) {
            const user = authHeader.substring(0, sep);
            const token = authHeader.substring(sep + 1);
            if (await verifySession(user, token)) return true;
        }
    }

    return false;
}

// POST: Send a new message via webhook
export async function POST(request) {
    if (!await checkUserAuth(request)) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    if (!WEBHOOK_URL) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    try {
        const formData = await request.formData();

        // Sanitize payload_json to strip @everyone/@here mentions
        const payloadJson = formData.get('payload_json');
        if (payloadJson) {
            try {
                const payload = JSON.parse(payloadJson);
                const stripMentions = (str) =>
                    typeof str === 'string' ? str.replace(/@(everyone|here)/gi, '@\u200B$1') : str;
                if (payload.content) payload.content = stripMentions(payload.content);
                if (payload.embeds && Array.isArray(payload.embeds)) {
                    for (const embed of payload.embeds) {
                        if (embed.description) embed.description = stripMentions(embed.description);
                        if (embed.title) embed.title = stripMentions(embed.title);
                        if (embed.fields && Array.isArray(embed.fields)) {
                            for (const field of embed.fields) {
                                if (field.name) field.name = stripMentions(field.name);
                                if (field.value) field.value = stripMentions(field.value);
                            }
                        }
                    }
                }
                formData.set('payload_json', JSON.stringify(payload));
            } catch (parseErr) {
                return NextResponse.json({ error: 'Invalid payload_json' }, { status: 400 });
            }
        }

        const res = await fetch(`${WEBHOOK_URL}?wait=true`, {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const data = await res.json();
            return NextResponse.json({ id: data.id });
        } else {
            const errText = await res.text();
            return NextResponse.json({ error: errText }, { status: res.status });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Webhook request failed' }, { status: 500 });
    }
}

// DELETE: Delete an existing webhook message
// Requires the same user authentication as POST — a logged-in user should be
// the minimum bar to delete a trade announcement (messageIds are visible in
// /trades so an unauthenticated attacker could otherwise wipe trades).
export async function DELETE(request) {
    if (!await checkUserAuth(request)) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    if (!WEBHOOK_URL) {
        return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    try {
        const { messageId } = await request.json();
        if (!messageId || typeof messageId !== 'string') {
            return NextResponse.json({ error: 'Invalid messageId' }, { status: 400 });
        }

        // Sanitize: only allow numeric message IDs (Discord snowflake format)
        if (!/^\d{17,20}$/.test(messageId)) {
            return NextResponse.json({ error: 'Invalid messageId format' }, { status: 400 });
        }

        const res = await fetch(`${WEBHOOK_URL}/messages/${messageId}`, { method: 'DELETE' });
        if (!res.ok) {
            console.warn(`Discord DELETE failed for message ${messageId}: ${res.status}`);
        }
        return NextResponse.json({ success: res.ok, status: res.status }, { status: 200 });
    } catch (e) {
        console.error('Delete webhook message failed:', e);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
