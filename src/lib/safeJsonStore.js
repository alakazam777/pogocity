// ─── Safe JSON storage ───
// Drop-in replacement for naive fs.readFile/writeFile JSON I/O.
//
// Why:
//   * Atomic writes — write to a temp file, then rename. POSIX rename is atomic
//     on the same filesystem; eliminates the "half-written file" failure mode.
//   * Timestamped backups — every successful write snapshots the previous
//     contents to data/backups/<filename>/<ISO-timestamp>.json before overwriting.
//   * Backup pruning — keeps the last N (default 50) per file so the directory
//     doesn't grow forever.
//   * Auto-restore on read — if the main file is missing/corrupt, transparently
//     load the most recent backup (with a console.warn). Worst-case we lose the
//     last write attempt, never an entire dataset.
//
// All these protect against:
//   * Process crash during writeFile  → atomic rename never executes, old file intact
//   * Out-of-disk during writeFile    → temp file fails, main file untouched
//   * Manually deleting a data file   → next read auto-restores from latest backup
//   * Corrupt JSON (e.g. interrupted) → next read auto-restores from latest backup

import fs from 'fs/promises';
import path from 'path';

const DEFAULT_KEEP = 50;

function backupDirFor(file) {
    return path.join(path.dirname(file), 'backups', path.basename(file, '.json'));
}

export async function safeReadJson(file, fallback) {
    try {
        const raw = await fs.readFile(file, 'utf-8');
        return JSON.parse(raw);
    } catch (primaryErr) {
        // File missing OR JSON parse failed — try the most recent backup
        try {
            const dir = backupDirFor(file);
            const list = (await fs.readdir(dir))
                .filter(f => f.endsWith('.json'))
                .sort();
            const latest = list[list.length - 1];
            if (latest) {
                const raw = await fs.readFile(path.join(dir, latest), 'utf-8');
                const data = JSON.parse(raw);
                console.warn(`[safeJsonStore] ${path.basename(file)} unreadable (${primaryErr.code || primaryErr.message}); restored from backup ${latest}`);
                return data;
            }
        } catch {
            // No backup directory or no usable backups
        }
        return fallback;
    }
}

export async function safeWriteJson(file, data, opts = {}) {
    const { keep = DEFAULT_KEEP } = opts;
    await fs.mkdir(path.dirname(file), { recursive: true });

    // 1) Backup the previous contents (best-effort — never throws)
    try {
        const existing = await fs.readFile(file, 'utf-8');
        const dir = backupDirFor(file);
        await fs.mkdir(dir, { recursive: true });
        // ISO timestamp with safe filesystem chars: 2026-05-02T14-30-45-123Z
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        await fs.writeFile(path.join(dir, `${ts}.json`), existing);

        // Prune oldest backups so the directory stays bounded
        const list = (await fs.readdir(dir))
            .filter(f => f.endsWith('.json'))
            .sort();
        const toDelete = list.slice(0, Math.max(0, list.length - keep));
        await Promise.all(toDelete.map(f =>
            fs.unlink(path.join(dir, f)).catch(() => {})
        ));
    } catch {
        // File doesn't exist yet — first write, no backup needed
    }

    // 2) Atomic write: temp file then rename
    const tmpFile = `${file}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    try {
        await fs.writeFile(tmpFile, JSON.stringify(data, null, 2));
        await fs.rename(tmpFile, file);
    } catch (e) {
        // Cleanup temp on failure
        await fs.unlink(tmpFile).catch(() => {});
        throw e;
    }
}

// List available backups for a given file, newest first.
// Useful for an admin "restore" UI later if we want one.
export async function listBackups(file) {
    try {
        const dir = backupDirFor(file);
        const list = (await fs.readdir(dir))
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse();
        return list.map(name => ({ name, path: path.join(dir, name) }));
    } catch {
        return [];
    }
}
