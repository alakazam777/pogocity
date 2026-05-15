import { NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import { DATA_DIR } from '@/lib/dataPath';
import { safeReadJson, safeWriteJson } from '@/lib/safeJsonStore';
import { getSessionUser } from '@/lib/sessionAuth';
import { createRateLimiter } from '@/lib/rateLimit';
import { isSameOriginRequest } from '@/lib/csrfGuard';

const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const VALID_CONTENT_TYPES = ['presentation', 'message', 'trade', 'profile'];

// 10 reports per hour per IP
const limiter = createRateLimiter('report', 10, 60 * 60 * 1000);

export async function POST(request) {
    // CSRF protection
    if (!isSameOriginRequest(request)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit
    const { allowed } = limiter(request);
    if (!allowed) {
        return NextResponse.json({ error: 'Too many reports. Please wait.' }, { status: 429 });
    }

    // Auth
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        const { targetUsername, contentType, contentId, reason } = await request.json();

        // Validate required fields
        if (!targetUsername || typeof targetUsername !== 'string') {
            return NextResponse.json({ error: 'targetUsername is required' }, { status: 400 });
        }
        if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
            return NextResponse.json({ error: 'Invalid contentType' }, { status: 400 });
        }
        if (!reason || typeof reason !== 'string' || reason.length > 500) {
            return NextResponse.json({ error: 'reason is required (max 500 chars)' }, { status: 400 });
        }

        // Can't report yourself
        if (sessionUser.username.toLowerCase() === targetUsername.toLowerCase()) {
            return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
        }

        const reports = await safeReadJson(REPORTS_FILE, []);

        // Check for duplicate report (same reporter + target + contentType + contentId)
        const isDuplicate = reports.some(r =>
            r.reporterUsername.toLowerCase() === sessionUser.username.toLowerCase() &&
            r.targetUsername.toLowerCase() === targetUsername.toLowerCase() &&
            r.targetContentType === contentType &&
            (r.targetContentId || '') === (contentId || '') &&
            r.status === 'pending'
        );
        if (isDuplicate) {
            return NextResponse.json({ error: 'Already reported', alreadyReported: true }, { status: 409 });
        }

        const report = {
            id: crypto.randomUUID(),
            reporterUsername: sessionUser.username,
            targetUsername,
            targetContentType: contentType,
            targetContentId: contentId || null,
            reason,
            createdAt: new Date().toISOString(),
            status: 'pending',
        };

        reports.push(report);
        await safeWriteJson(REPORTS_FILE, reports);

        // Discord webhook notification (best-effort, never blocks response)
        const webhookUrl = process.env.DISCORD_REPORT_WEBHOOK_URL;
        if (webhookUrl) {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        embeds: [{
                            title: 'New User Report',
                            color: 0xFF4444,
                            fields: [
                                { name: 'Reporter', value: sessionUser.username, inline: true },
                                { name: 'Reported User', value: targetUsername, inline: true },
                                { name: 'Content Type', value: contentType, inline: true },
                                { name: 'Reason', value: reason, inline: false },
                                ...(contentId ? [{ name: 'Content ID', value: contentId, inline: true }] : []),
                            ],
                            timestamp: new Date().toISOString(),
                        }],
                    }),
                });
            } catch (webhookErr) {
                console.warn('[report] Discord webhook failed:', webhookErr.message);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Report error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
