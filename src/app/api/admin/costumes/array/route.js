import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { verifyAdminToken } from '@/lib/adminAuth';
import fs from 'fs';
import path from 'path';

const FORMS_FILE = path.join(process.cwd(), 'src', 'data', 'pokemonForms.js');

// Helper to format an object back into JS string
function formatCostume(costume) {
    // Generate JS string for a costume line
    // e.g. { id: 'c_23279', label: 'Costume Veste Université', costumeOnly: true, localAsset: '/Costumes/img23279_5.webp', shinyAsset: '/Costumes/img23279_6.webp' }
    const pairs = [];
    if (costume.id) pairs.push(`id: '${costume.id}'`);
    if (costume.label) pairs.push(`label: '${costume.label.replace(/'/g, "\\'")}'`);
    if (costume.costumeOnly !== undefined) pairs.push(`costumeOnly: ${costume.costumeOnly}`);
    if (costume.localAsset) pairs.push(`localAsset: '${costume.localAsset}'`);
    if (costume.shinyAsset) pairs.push(`shinyAsset: '${costume.shinyAsset}'`);

    return `        { ${pairs.join(', ')} },`;
}

async function checkAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token');
    const session = await getServerSession(authOptions);
    const isPasswordAdmin = verifyAdminToken(adminToken?.value);
    const isDiscordAdmin = session?.user?.id === process.env.DISCORD_ADMIN_ID;
    return isPasswordAdmin || isDiscordAdmin;
}

// Safe parser for JS object literals (no eval)
function parseJSObjects(str) {
    const costumes = [];
    // Match each { ... } block
    const objRegex = /\{([^}]+)\}/g;
    let m;
    while ((m = objRegex.exec(str)) !== null) {
        const obj = {};
        const body = m[1];
        // Match key: 'value' or key: true/false
        const propRegex = /(\w+)\s*:\s*(?:'([^']*)'|"([^"]*)"|(\btrue\b|\bfalse\b))/g;
        let pm;
        while ((pm = propRegex.exec(body)) !== null) {
            const key = pm[1];
            const val = pm[2] ?? pm[3] ?? (pm[4] === 'true');
            obj[key] = val;
        }
        if (obj.id) costumes.push(obj);
    }
    return costumes;
}

// GET: Send the current array of costumes from POKEMON_FORMS[25]
export async function GET() {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const content = fs.readFileSync(FORMS_FILE, 'utf-8');

        // Find everything between "25: [" and "],"
        const match = content.match(/(\n\s+25:\s*\[)([\s\S]*?)(\n\s+\],)/);
        if (!match) throw new Error("Could not find Pikachu array in pokemonForms.js");

        // Safe parsing — no eval()
        const costumes = parseJSObjects(match[2]);

        return NextResponse.json({ costumes });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Replace the entire Pikachu array
export async function POST(request) {
    if (!await checkAuth()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { costumes } = await request.json();

        if (!Array.isArray(costumes)) {
            return NextResponse.json({ error: 'Costumes must be an array' }, { status: 400 });
        }

        let content = fs.readFileSync(FORMS_FILE, 'utf-8');
        const match = content.match(/(\n\s+25:\s*\[)([\s\S]*?)(\n\s+\],)/);

        if (!match) {
            return NextResponse.json({ error: 'Regex could not match Pikachu array block' }, { status: 500 });
        }

        // Keep comments if possible? We will drop them to simplify, or maybe keep some headers?
        // Let's just create a new string with the costumes
        let newArrayBody = '\n';
        costumes.forEach(c => {
            newArrayBody += formatCostume(c) + '\n';
        });

        const newContent = content.replace(/(\n\s+25:\s*\[)([\s\S]*?)(\n\s+\],)/, `$1${newArrayBody}$3`);
        fs.writeFileSync(FORMS_FILE, newContent, 'utf-8');

        return NextResponse.json({ success: true, count: costumes.length });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
