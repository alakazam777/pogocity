import { NextResponse } from "next/server";
import { verifyBotAdmin, BOT_TOKEN, GUILD_ID } from "@/lib/botAuth";

// Discord scheduled-event limits
const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 1000;
const MAX_LOCATION_LEN = 100;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MiB

/**
 * Fetch a remote image and convert it to a Discord-accepted data URI.
 * Returns null on any failure (non-fatal — the event is still created).
 */
async function fetchImageAsDataUri(url) {
    if (!url || typeof url !== "string") return null;
    if (!/^https?:\/\//.test(url)) return null;
    try {
        const res = await fetch(url, {
            // 8 second timeout via AbortSignal
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return null;

        let contentType = (res.headers.get("content-type") || "").toLowerCase();
        if (!/^image\/(png|jpeg|jpg|gif|webp)/.test(contentType)) {
            // fall back to png if server did not report a proper image type
            contentType = "image/png";
        }
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        return `data:${contentType};base64,${base64}`;
    } catch {
        return null;
    }
}

export async function POST(request) {
    const auth = await verifyBotAdmin();
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (!BOT_TOKEN) {
        return NextResponse.json({ error: "Bot token non configuré" }, { status: 500 });
    }
    if (!GUILD_ID) {
        return NextResponse.json({ error: "Guild ID non configuré" }, { status: 500 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { event } = body || {};
    if (!event || typeof event !== "object") {
        return NextResponse.json({ error: "event object required" }, { status: 400 });
    }

    const { title, date, endDate, description, image, location, link } = event;

    if (!title || typeof title !== "string") {
        return NextResponse.json({ error: "event.title required" }, { status: 400 });
    }
    if (!date) {
        return NextResponse.json({ error: "event.date required" }, { status: 400 });
    }

    // Parse dates. The events are stored as local Paris time ("2026-01-07T18:00:00").
    // Node.js interprets these as local time of the server process, which is Europe/Paris,
    // so .toISOString() yields the correct UTC ISO string for Discord.
    const startDate = new Date(date);
    if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "event.date is not a valid date" }, { status: 400 });
    }

    // End date fallback: 1 hour after start
    let endDt = endDate ? new Date(endDate) : null;
    if (!endDt || isNaN(endDt.getTime()) || endDt <= startDate) {
        endDt = new Date(startDate.getTime() + 60 * 60 * 1000);
    }

    // Discord requires the start time to be in the future
    const now = new Date();
    if (startDate <= now) {
        return NextResponse.json(
            {
                error: "L'heure de début doit être dans le futur. Discord refuse les événements passés ou en cours.",
                scheduled_start_time: startDate.toISOString(),
                now: now.toISOString(),
            },
            { status: 400 }
        );
    }

    // Build Discord payload
    const payload = {
        name: title.slice(0, MAX_NAME_LEN),
        scheduled_start_time: startDate.toISOString(),
        scheduled_end_time: endDt.toISOString(),
        privacy_level: 2, // GUILD_ONLY (only valid value)
        entity_type: 3,   // EXTERNAL — maps to "Ailleurs" / "En personne" in Discord UI
        entity_metadata: {
            location: String(location || "Poitiers").slice(0, MAX_LOCATION_LEN),
        },
    };

    // Build description: base text + Campfire link if available
    const parts = [];
    if (description && typeof description === "string") {
        parts.push(description.trim());
    }
    if (link && typeof link === "string" && /^https?:\/\//.test(link)) {
        parts.push(`Campfire : ${link}`);
    }
    if (parts.length > 0) {
        payload.description = parts.join("\n\n").slice(0, MAX_DESC_LEN);
    }

    // Optional image cover — fetch it but don't fail the whole request if it errors
    const imageDataUri = await fetchImageAsDataUri(image);
    if (imageDataUri) {
        payload.image = imageDataUri;
    }

    // Call Discord API
    try {
        const res = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/scheduled-events`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bot ${BOT_TOKEN}`,
                    "Content-Type": "application/json",
                    "X-Audit-Log-Reason": `Created via pogosphere.com by ${auth.user?.name || "admin"}`,
                },
                body: JSON.stringify(payload),
            }
        );

        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { raw: text }; }

        if (!res.ok) {
            console.error("[discord-events] Discord API error:", res.status, data);
            return NextResponse.json(
                {
                    error: data?.message || "Discord API refused the request",
                    discord_status: res.status,
                    discord_errors: data?.errors,
                    image_attached: !!imageDataUri,
                },
                { status: res.status }
            );
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            url: `https://discord.com/events/${GUILD_ID}/${data.id}`,
            image_attached: !!imageDataUri,
        });
    } catch (e) {
        console.error("[discord-events] fetch failed:", e);
        return NextResponse.json({ error: "Échec de l'appel à Discord" }, { status: 500 });
    }
}
