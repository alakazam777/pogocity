import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { DATA_DIR } from './dataPath';

const COLLECTIONS_DIR = path.join(DATA_DIR, 'collections');

// Hard cap per user. Real PoGo accounts top out around ~6000 (storage upgrade max);
// 10000 leaves margin while keeping any single JSON file readable in one fs.readFile.
const MAX_COLLECTION_SIZE = 10000;

// Per-user mutex: different users don't block each other,
// concurrent writes for the same user are serialized.
const _userLocks = new Map();

async function withUserLock(username, fn) {
    const key = username.toLowerCase();
    let release;
    const acquire = new Promise((resolve) => { release = resolve; });
    const previous = _userLocks.get(key) || Promise.resolve();
    _userLocks.set(key, acquire);
    try {
        await previous;
        return await fn();
    } finally {
        release();
        if (_userLocks.get(key) === acquire) {
            _userLocks.delete(key);
        }
    }
}

function normalizeUsername(username) {
    return username.toLowerCase().replace(/'/g, '’').trim();
}

// Hash-based filename — safe against any unicode, path traversal,
// and Windows reserved names (CON, NUL, etc.).
function userFilePath(username) {
    const normalized = normalizeUsername(username);
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
    return path.join(COLLECTIONS_DIR, `${hash}.json`);
}

async function ensureCollectionsDir() {
    try {
        await fs.access(COLLECTIONS_DIR);
    } catch {
        await fs.mkdir(COLLECTIONS_DIR, { recursive: true });
    }
}

async function readCollectionFile(username) {
    const filePath = userFilePath(username);
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
    }
}

async function writeCollectionFile(username, data) {
    await ensureCollectionsDir();
    const filePath = userFilePath(username);
    const payload = {
        ...data,
        username: data.username || username,
        normalizedUsername: normalizeUsername(username),
        lastUpdated: new Date().toISOString(),
    };
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2));
    return payload;
}

// ─── Public API ───

export async function getCollection(username) {
    const data = await readCollectionFile(username);
    return data?.pokemon || [];
}

export async function getCustomTags(username) {
    const data = await readCollectionFile(username);
    return data?.customTags || [];
}

const MAX_CUSTOM_TAGS = 50;
const MAX_TAG_LEN = 30;

export async function addCustomTag(username, tag) {
    return withUserLock(username, async () => {
        const cleaned = String(tag || '').trim().slice(0, MAX_TAG_LEN);
        if (!cleaned) return null;
        const existing = (await readCollectionFile(username)) || { pokemon: [], customTags: [] };
        const tags = existing.customTags || [];
        if (tags.includes(cleaned)) return tags;
        if (tags.length >= MAX_CUSTOM_TAGS) {
            const err = new Error(`Tag limit reached (${MAX_CUSTOM_TAGS})`);
            err.code = 'TAG_LIMIT';
            throw err;
        }
        existing.customTags = [...tags, cleaned];
        await writeCollectionFile(username, existing);
        return existing.customTags;
    });
}

export async function removeCustomTag(username, tag) {
    return withUserLock(username, async () => {
        const existing = await readCollectionFile(username);
        if (!existing) return [];
        const before = existing.customTags || [];
        existing.customTags = before.filter((t) => t !== tag);
        if (existing.customTags.length === before.length) return before;
        await writeCollectionFile(username, existing);
        return existing.customTags;
    });
}

export async function getPokemon(username, pokemonId) {
    const data = await readCollectionFile(username);
    if (!data) return null;
    return (data.pokemon || []).find((p) => p.id === pokemonId) || null;
}

export class CollectionFullError extends Error {
    constructor(current) {
        super(`Collection limit reached (${current}/${MAX_COLLECTION_SIZE})`);
        this.code = 'COLLECTION_FULL';
        this.limit = MAX_COLLECTION_SIZE;
        this.current = current;
    }
}

export async function addPokemon(username, pokemonData) {
    return withUserLock(username, async () => {
        const existing = (await readCollectionFile(username)) || { pokemon: [] };
        const current = (existing.pokemon || []).length;
        if (current >= MAX_COLLECTION_SIZE) throw new CollectionFullError(current);
        const newPokemon = {
            id: crypto.randomUUID(),
            scanDate: new Date().toISOString(),
            ...pokemonData,
        };
        existing.pokemon = [...(existing.pokemon || []), newPokemon];
        await writeCollectionFile(username, existing);
        return newPokemon;
    });
}

export async function addPokemonBatch(username, pokemonArray, source = 'unknown') {
    return withUserLock(username, async () => {
        const existing = (await readCollectionFile(username)) || { pokemon: [] };
        const current = (existing.pokemon || []).length;
        if (current + pokemonArray.length > MAX_COLLECTION_SIZE) {
            throw new CollectionFullError(current);
        }
        const now = new Date().toISOString();
        const newPokemon = pokemonArray.map((p) => ({
            id: crypto.randomUUID(),
            scanDate: now,
            source,
            ...p,
        }));
        existing.pokemon = [...(existing.pokemon || []), ...newPokemon];
        await writeCollectionFile(username, existing);
        return newPokemon;
    });
}

export async function updatePokemon(username, pokemonId, updates) {
    return withUserLock(username, async () => {
        const existing = await readCollectionFile(username);
        if (!existing) return null;
        const idx = (existing.pokemon || []).findIndex((p) => p.id === pokemonId);
        if (idx === -1) return null;
        existing.pokemon[idx] = {
            ...existing.pokemon[idx],
            ...updates,
            id: pokemonId,
            updatedAt: new Date().toISOString(),
        };
        await writeCollectionFile(username, existing);
        return existing.pokemon[idx];
    });
}

export async function removePokemon(username, pokemonId) {
    return withUserLock(username, async () => {
        const existing = await readCollectionFile(username);
        if (!existing) return false;
        const before = (existing.pokemon || []).length;
        existing.pokemon = (existing.pokemon || []).filter((p) => p.id !== pokemonId);
        if (existing.pokemon.length === before) return false;
        await writeCollectionFile(username, existing);
        return true;
    });
}

// Reorder the collection by an explicit list of pokemon IDs.
// Any IDs not present in `orderedIds` keep their relative order at the end.
export async function reorderCollection(username, orderedIds) {
    return withUserLock(username, async () => {
        const existing = await readCollectionFile(username);
        if (!existing) return null;
        const map = new Map((existing.pokemon || []).map((p) => [p.id, p]));
        const ordered = [];
        for (const id of orderedIds) {
            if (map.has(id)) {
                ordered.push(map.get(id));
                map.delete(id);
            }
        }
        // Append leftovers (e.g. items added between client load and save)
        for (const p of map.values()) ordered.push(p);
        existing.pokemon = ordered;
        await writeCollectionFile(username, existing);
        return ordered;
    });
}

export async function clearCollection(username) {
    return withUserLock(username, async () => {
        const existing = (await readCollectionFile(username)) || {};
        existing.pokemon = [];
        await writeCollectionFile(username, existing);
        return true;
    });
}

// Replace whole collection (e.g. "re-import CSV in overwrite mode").
export async function setCollection(username, pokemonArray, source = 'unknown') {
    if (pokemonArray.length > MAX_COLLECTION_SIZE) {
        throw new CollectionFullError(pokemonArray.length);
    }
    return withUserLock(username, async () => {
        const existing = (await readCollectionFile(username)) || {};
        const now = new Date().toISOString();
        const stamped = pokemonArray.map((p) => ({
            id: p.id || crypto.randomUUID(),
            scanDate: p.scanDate || now,
            source: p.source || source,
            ...p,
        }));
        existing.pokemon = stamped;
        await writeCollectionFile(username, existing);
        return stamped;
    });
}

export async function getCollectionSummary(username) {
    const data = await readCollectionFile(username);
    if (!data) return { count: 0, favorites: 0, hundo: 0, shundo: 0 };
    const pokemon = data.pokemon || [];
    return {
        count: pokemon.length,
        favorites: pokemon.filter((p) => p.favorite).length,
        hundo: pokemon.filter((p) => p.iv?.percent === 100).length,
        shundo: pokemon.filter((p) => p.iv?.percent === 100 && p.shiny).length,
    };
}

export async function getAllCollectionSummaries() {
    await ensureCollectionsDir();
    let files;
    try {
        files = await fs.readdir(COLLECTIONS_DIR);
    } catch {
        return [];
    }
    const summaries = [];
    for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
            const content = await fs.readFile(path.join(COLLECTIONS_DIR, file), 'utf-8');
            const data = JSON.parse(content);
            const pokemon = data.pokemon || [];
            summaries.push({
                username: data.username,
                normalizedUsername: data.normalizedUsername,
                count: pokemon.length,
                favorites: pokemon.filter((p) => p.favorite).length,
                hundo: pokemon.filter((p) => p.iv?.percent === 100).length,
                shundo: pokemon.filter((p) => p.iv?.percent === 100 && p.shiny).length,
                lastUpdated: data.lastUpdated,
            });
        } catch (err) {
            console.error(`[collectionStorage] Failed to read ${file}:`, err.message);
        }
    }
    return summaries;
}
