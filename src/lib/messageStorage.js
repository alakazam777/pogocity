import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './dataPath';

const DATA_FILE = path.join(DATA_DIR, 'messages.json');

async function ensureDataFile() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify({ conversations: {} }, null, 2));
    }
}

function getConversationId(user1, user2) {
    const sorted = [user1.toLowerCase(), user2.toLowerCase()].sort();
    return crypto.createHash('md5').update(sorted.join(':')).digest('hex');
}

export async function getConversationsForUser(username) {
    await ensureDataFile();
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    const normalized = username.toLowerCase();
    const results = [];

    for (const [id, convo] of Object.entries(data.conversations)) {
        if (convo.participants.includes(normalized)) {
            const otherUser = convo.participants.find(p => p !== normalized) || normalized;
            const messages = convo.messages || [];
            const lastMsg = messages[messages.length - 1] || null;
            const unreadCount = messages.filter(m => m.from !== normalized && !m.read).length;

            results.push({
                id,
                otherUser,
                otherUserDisplay: convo.displayNames?.[otherUser] || otherUser,
                lastMessage: lastMsg ? { text: lastMsg.text, timestamp: lastMsg.timestamp, from: lastMsg.from } : null,
                unreadCount,
                lastActivity: convo.lastActivity
            });
        }
    }

    // Sort by last activity (newest first)
    results.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
    return results;
}

export async function getMessages(conversationId, limit = 100) {
    await ensureDataFile();
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    const convo = data.conversations[conversationId];
    if (!convo) return { messages: [], participants: [] };

    const messages = (convo.messages || []).slice(-limit);
    return {
        messages,
        participants: convo.participants,
        displayNames: convo.displayNames || {}
    };
}

export async function sendMessage(fromUsername, toUsername, text) {
    await ensureDataFile();
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));

    const fromNorm = fromUsername.toLowerCase();
    const toNorm = toUsername.toLowerCase();
    const convoId = getConversationId(fromNorm, toNorm);

    if (!data.conversations[convoId]) {
        data.conversations[convoId] = {
            participants: [fromNorm, toNorm].sort(),
            displayNames: {},
            messages: [],
            lastActivity: new Date().toISOString()
        };
    }

    const convo = data.conversations[convoId];

    // Update display names
    convo.displayNames[fromNorm] = fromUsername;
    if (!convo.displayNames[toNorm]) convo.displayNames[toNorm] = toUsername;

    const message = {
        id: crypto.randomUUID(),
        from: fromNorm,
        text: text.trim(),
        timestamp: new Date().toISOString(),
        read: false
    };

    convo.messages.push(message);
    convo.lastActivity = message.timestamp;

    // Cap at 500 messages per conversation
    if (convo.messages.length > 500) {
        convo.messages = convo.messages.slice(-500);
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return { conversationId: convoId, message };
}

export async function markAsRead(conversationId, username) {
    await ensureDataFile();
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    const convo = data.conversations[conversationId];
    if (!convo) return;

    const normalized = username.toLowerCase();
    let changed = false;

    for (const msg of convo.messages) {
        if (msg.from !== normalized && !msg.read) {
            msg.read = true;
            changed = true;
        }
    }

    if (changed) {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    }
}

export async function getTotalUnreadCount(username) {
    await ensureDataFile();
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    const normalized = username.toLowerCase();
    let total = 0;

    for (const convo of Object.values(data.conversations)) {
        if (convo.participants.includes(normalized)) {
            total += (convo.messages || []).filter(m => m.from !== normalized && !m.read).length;
        }
    }

    return total;
}
