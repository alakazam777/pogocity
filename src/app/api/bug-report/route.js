import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rateLimit';

const WEBHOOK_URL = process.env.BUG_REPORT_WEBHOOK_URL;

// 5 bug reports per 10 minutes per IP
const limiter = createRateLimiter('bug-report', 5, 10 * 60 * 1000);

export async function POST(request) {
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Trop de signalements. Réessayez plus tard.' }, { status: 429 });
    }
    if (!WEBHOOK_URL) {
        console.error('[bug-report] BUG_REPORT_WEBHOOK_URL not configured');
        return NextResponse.json({ error: 'Signalement indisponible' }, { status: 500 });
    }

    try {
        const { message, username, avatar, page, userAgent } = await request.json();

        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Message requis' }, { status: 400 });
        }
        if (message.length > 2000) {
            return NextResponse.json({ error: 'Message trop long (max 2000 caractères)' }, { status: 400 });
        }

        const embed = {
            title: 'Bug Report',
            description: message.trim(),
            color: 0xED4245,
            fields: [
                { name: 'Page', value: `\`${page || '/'}\``, inline: true },
                { name: 'Dresseur', value: username || 'Anonyme', inline: true },
                { name: 'Navigateur', value: (userAgent || 'Inconnu').substring(0, 120), inline: false },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'PogoSphere Bug Report' }
        };

        // Ensure avatar_url is a full URL (Discord rejects relative paths)
        let avatarUrl = avatar || undefined;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
            avatarUrl = `https://pogosphere.com${avatarUrl}`;
        }

        const payload = {
            username: `${username || 'Anonyme'} (Bug Report)`,
            avatar_url: avatarUrl,
            embeds: [embed]
        };

        const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok || res.status === 204) {
            return NextResponse.json({ success: true });
        } else {
            const text = await res.text();
            console.error('Discord webhook error:', res.status, text);
            return NextResponse.json({ error: 'Erreur Discord' }, { status: 502 });
        }
    } catch (error) {
        console.error('Bug report error:', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}
