/**
 * pogo-watchdog — auto health check + build-recovery for pogopoitiers.
 *
 * Runs as a PM2 process. Every 60s:
 *   1. Structural check: verifies build artifacts exist on disk. Missing
 *      artifact triggers an immediate clean rebuild (no double-failure threshold).
 *   2. HTTP check: GET http://127.0.0.1:3062/. Two consecutive failures within
 *      ~2 minutes triggers recovery. A 5-minute cooldown prevents rebuild thrashing.
 *
 * Recovery sequence:
 *   - pm2 stop pogopoitiers
 *   - Kill zombie node.exe processes whose loaded modules trace back to this
 *     repo (PowerShell module-path filter — never blanket kills node.exe)
 *   - rm -rf .next  (clean rebuild — incremental on corrupted state was the bug)
 *   - npm run build
 *   - Copy post-build files to .next/standalone/ (.next/static, public, .env.local)
 *   - pm2 restart pogopoitiers + sibling tunnel
 *   - NO `pm2 save` — that's a deliberate manual action only
 *
 * Other safety properties:
 *   - All process targeting by name (never "pm2 restart all", "pm2 kill", or
 *     blanket taskkill).
 *   - All shell commands use windowsHide: true so no console flashes appear
 *     during recovery on Windows.
 *   - Auto-restart of itself is provided by PM2 (autorestart: true is default).
 *
 * Every log line is prefixed with "[pogo-watchdog]" for grep-friendliness in
 * `pm2 logs pogo-watchdog`.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const http = require('http');
const { exec } = require('child_process');

// ─── Configuration ──────────────────────────────────────────────────────────

const PROJECT_DIR = path.resolve(__dirname);
const PROJECT_FOLDER_NAME = path.basename(PROJECT_DIR); // "pogosphere"
const APP_NAME = 'pogosphere';
// Lock file path. Read by sibling tools (e.g. scripts/heal-pogo.js) so they
// know to back off while a recovery is in progress — otherwise the heal-pogo
// scheduled task would see pogopoitiers in `stopped` state and helpfully
// `pm2 start ecosystem.config.js` it back, which restarts ALL pogo-* apps
// including this watchdog itself, killing the recovery mid-flight.
const RECOVERY_LOCK = path.join(PROJECT_DIR, 'data', '.watchdog-recovery.lock');
const SIBLING_NAMES = ['pogo-tunnel'];                  // restarted alongside on recovery
const PORT = 3064;
const HEALTH_URL = `http://127.0.0.1:${PORT}/`;

const CHECK_INTERVAL_MS = 60_000;            // 60s between cycles
const FAIL_THRESHOLD = 2;                    // 2 consecutive HTTP failures → recover
const RECOVERY_COOLDOWN_MS = 5 * 60_000;     // 5 min minimum between recoveries
const HTTP_TIMEOUT_MS = 15_000;
const BUILD_TIMEOUT_MS = 6 * 60_000;         // 6 min for npm run build
const GIT_INTERVAL_CYCLES = 15;              // git pull every 15 cycles (~15 min)
const STARTUP_GRACE_MS = 30_000;             // first check delayed to let site warm up

// Files Next standalone doesn't auto-copy after build — required at runtime.
const POST_BUILD_COPY = [
    { from: '.next/static', to: '.next/standalone/.next/static', kind: 'dir' },
    { from: 'public',       to: '.next/standalone/public',       kind: 'dir' },
    { from: '.env.local',   to: '.next/standalone/.env.local',   kind: 'file' },
];

// Build artifacts whose absence indicates a corrupted/missing build.
// `BUILD_ID` is the canonical "this build is complete" marker — Next.js writes
// it last during `next build`. Older versions of this list also pinned
// `.next/standalone/server.js` and a manifest, but PogoSphere uses
// `outputFileTracingRoot` (monorepo-style standalone), which nests the
// standalone files under `.next/standalone/<project>/server.js`. The bare
// path doesn't exist for this project → the watchdog kept "recovering" a
// perfectly healthy build, causing infinite restart loops on the sibling
// tunnel. Sticking to BUILD_ID alone avoids the path-mismatch trap.
const REQUIRED_ARTIFACTS = [
    '.next/BUILD_ID',
];

const PREFIX = '[pogo-watchdog]';

// ─── State ──────────────────────────────────────────────────────────────────

let consecutiveHttpFailures = 0;
let lastRecoveryAt = 0;
let recovering = false;
let cycleCount = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(...args) { console.log(PREFIX, ...args); }
function logErr(...args) { console.error(PREFIX, ...args); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function runCmd(cmd, opts = {}) {
    return new Promise((resolve, reject) => {
        exec(cmd, {
            windowsHide: true,
            maxBuffer: 1024 * 1024 * 20,
            cwd: opts.cwd || PROJECT_DIR,
            timeout: opts.timeout || 0,
            env: { ...process.env, ...(opts.env || {}) },
        }, (err, stdout, stderr) => {
            if (err) {
                err.stdout = stdout || '';
                err.stderr = stderr || '';
                return reject(err);
            }
            resolve(stdout || '');
        });
    });
}

// ─── Health checks ──────────────────────────────────────────────────────────

function structuralCheck() {
    for (const rel of REQUIRED_ARTIFACTS) {
        if (!fs.existsSync(path.join(PROJECT_DIR, rel))) {
            return rel;
        }
    }
    return null;
}

function httpCheck() {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
        const req = http.get(HEALTH_URL, (res) => {
            const code = res.statusCode || 0;
            res.resume(); // drain
            if (code >= 500) finish(`HTTP ${code}`);
            else finish(null);
        });
        req.setTimeout(HTTP_TIMEOUT_MS, () => {
            req.destroy();
            finish('timeout');
        });
        req.on('error', (e) => finish(`net error: ${e.code || e.message}`));
    });
}

// ─── Zombie sweep (Windows-specific, scoped to repo path) ───────────────────

/**
 * Identify node.exe processes whose loaded modules originate from this repo's
 * folder (e.g. a stale next-server holding port 3062). Excludes:
 *   - PIDs of any currently-online PM2 process (protects pogopoitiers itself
 *     once restarted, lucas-site, uppwind, etc.)
 *   - Our own PID and PM2 god daemon
 *
 * Uses PowerShell — the only reliable Windows mechanism to inspect a process's
 * loaded modules without elevating privileges.
 */
async function sweepZombieNodeProcesses() {
    // Collect protected PIDs from PM2.
    const protectedPids = new Set([process.pid]);
    try {
        const json = await runCmd('pm2 jlist');
        const list = JSON.parse(json);
        for (const p of list) {
            if (p && p.pid) protectedPids.add(p.pid);
            if (p && p.pm2_env && p.pm2_env.PM2_GOD_PID) protectedPids.add(p.pm2_env.PM2_GOD_PID);
        }
    } catch (e) {
        log('  (could not read pm2 jlist for protected PIDs:', e.message.split('\n')[0], ')');
    }

    // PowerShell module-path filter: only node.exe processes that have at least
    // one loaded module whose path contains our project folder name.
    const ps =
        `Get-Process node -ErrorAction SilentlyContinue | ` +
        `Where-Object { try { $_.Modules | Where-Object { $_.FileName -like '*\\${PROJECT_FOLDER_NAME}\\*' } } catch { $false } } | ` +
        `Select-Object -ExpandProperty Id`;
    let pids = [];
    try {
        const out = await runCmd(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"')}"`);
        pids = out.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
    } catch (e) {
        logErr('  PowerShell zombie query failed:', e.message.split('\n')[0]);
        return 0;
    }

    let killed = 0;
    for (const pid of pids) {
        if (protectedPids.has(pid)) continue;
        try {
            await runCmd(`taskkill /PID ${pid} /F`);
            log(`  killed zombie node.exe PID ${pid}`);
            killed++;
        } catch (e) {
            // Process might have already exited — non-fatal.
            log(`  could not kill PID ${pid} (probably already gone): ${e.message.split('\n')[0]}`);
        }
    }
    return killed;
}

// ─── Recovery ───────────────────────────────────────────────────────────────

async function copyPostBuildFiles() {
    for (const item of POST_BUILD_COPY) {
        const src = path.join(PROJECT_DIR, item.from);
        const dst = path.join(PROJECT_DIR, item.to);
        if (!fs.existsSync(src)) {
            log(`  skip ${item.from} (not present)`);
            continue;
        }
        try {
            if (item.kind === 'dir') {
                await fsp.cp(src, dst, { recursive: true, force: true });
            } else {
                await fsp.mkdir(path.dirname(dst), { recursive: true });
                await fsp.copyFile(src, dst);
            }
            log(`  copied ${item.from} -> ${item.to}`);
        } catch (e) {
            logErr(`  copy failed for ${item.from}:`, e.message.split('\n')[0]);
        }
    }
}

async function recover(reason) {
    if (recovering) {
        log('recovery already in progress — skipping');
        return;
    }
    const now = Date.now();
    if (lastRecoveryAt && (now - lastRecoveryAt) < RECOVERY_COOLDOWN_MS) {
        const remainingS = Math.ceil((RECOVERY_COOLDOWN_MS - (now - lastRecoveryAt)) / 1000);
        log(`cooldown active (${remainingS}s remaining) — skipping recovery for: ${reason}`);
        return;
    }

    recovering = true;
    lastRecoveryAt = now;
    log('================================================');
    log(`RECOVERY START — reason: ${reason}`);
    log('================================================');

    // Write the lock file so heal-pogo and any other sibling automation
    // knows to back off until we're done. We embed the watchdog PID + a
    // start timestamp so a stale lock from a crashed watchdog can be
    // detected and ignored later.
    try {
        await fsp.mkdir(path.dirname(RECOVERY_LOCK), { recursive: true });
        await fsp.writeFile(RECOVERY_LOCK, JSON.stringify({
            pid: process.pid,
            startedAt: new Date().toISOString(),
            reason,
        }), 'utf8');
    } catch (e) {
        logErr(`could not write lock file: ${e.message.split('\n')[0]}`);
    }

    try {
        // 1. Stop the site cleanly so .next/* file locks are released.
        log(`1. pm2 stop ${APP_NAME}`);
        try { await runCmd(`pm2 stop ${APP_NAME}`); }
        catch (e) { log(`   (pm2 stop returned: ${e.message.split('\n')[0]})`); }
        await sleep(1500);

        // 2. Kill zombie node.exe holding files in this repo (incl. port 3062).
        log('2. sweeping zombie node.exe in this repo');
        const killed = await sweepZombieNodeProcesses();
        log(`   killed ${killed} zombie(s)`);
        await sleep(1000);

        // 3. Clean .next entirely — incremental rebuild on a corrupted .next is
        //    the precise failure mode this watchdog exists to recover from.
        log('3. removing .next/');
        try {
            await fsp.rm(path.join(PROJECT_DIR, '.next'), { recursive: true, force: true });
        } catch (e) {
            logErr(`   rm -rf .next failed: ${e.message.split('\n')[0]}`);
        }

        // 4. Build.
        log('4. npm run build (this can take ~30-60s)');
        const t0 = Date.now();
        await runCmd('npm run build', { timeout: BUILD_TIMEOUT_MS });
        log(`   build OK in ${Math.round((Date.now() - t0) / 1000)}s`);

        // 5. Copy files standalone doesn't auto-copy.
        log('5. copying post-build files to .next/standalone/');
        await copyPostBuildFiles();

        // 6. Restart by name.
        log(`6. pm2 restart ${APP_NAME}`);
        await runCmd(`pm2 restart ${APP_NAME}`);
        for (const sib of SIBLING_NAMES) {
            try {
                log(`   pm2 restart ${sib}`);
                await runCmd(`pm2 restart ${sib}`);
            } catch (e) {
                logErr(`   ${sib} restart failed: ${e.message.split('\n')[0]}`);
            }
        }

        // Reset failure counter — next cycle will re-check.
        consecutiveHttpFailures = 0;
        log('RECOVERY COMPLETE');
    } catch (e) {
        logErr('RECOVERY FAILED:', e.message.split('\n')[0]);
        // Best-effort: even if build failed, try to start the site again so
        // we don't leave it stopped indefinitely.
        try { await runCmd(`pm2 restart ${APP_NAME}`); }
        catch (e2) { logErr('   fallback restart also failed:', e2.message.split('\n')[0]); }
    } finally {
        recovering = false;
        try { await fsp.unlink(RECOVERY_LOCK); } catch { /* lock didn't exist */ }
    }
}

// ─── Git auto-pull (every 15 cycles, skip if dirty) ─────────────────────────

// Skip `git pull --rebase` not just on dirty tree, but also when the repo
// is mid-merge / mid-rebase / has unpushed commits. `pull --rebase` on a
// branch with an unpushed merge commit will UNWIND the merge into
// individual cherry-picks and re-trigger every conflict that was already
// resolved locally — bit lucasmoreau-portfolio in 2026-04, do not repeat.
async function gitPullIfClean() {
    try {
        // Check 1: any active multi-step git operation?
        const blockingFiles = ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG'];
        const blockingDirs = ['rebase-apply', 'rebase-merge'];
        for (const f of blockingFiles) {
            if (fs.existsSync(path.join(PROJECT_DIR, '.git', f))) {
                log(`git pull: skipping (.git/${f} present — multi-step op in progress)`);
                return;
            }
        }
        for (const d of blockingDirs) {
            if (fs.existsSync(path.join(PROJECT_DIR, '.git', d))) {
                log(`git pull: skipping (.git/${d}/ present — rebase in progress)`);
                return;
            }
        }

        // Check 2: working tree dirty?
        const status = await runCmd('git status --porcelain');
        if (status.trim()) {
            log('git pull: skipping (working tree dirty — local changes present)');
            return;
        }

        // Check 3: local has unpushed commits ahead of upstream?
        try {
            const ahead = (await runCmd('git rev-list --count @{u}..HEAD')).trim();
            if (ahead && ahead !== '0') {
                log(`git pull: skipping (local is ${ahead} commit(s) ahead of upstream — don't rewrite unpushed history)`);
                return;
            }
        } catch (e) {
            // No upstream tracking, or detached HEAD — be safe and skip.
            log(`git pull: skipping (rev-list failed: ${e.message.split('\n')[0]})`);
            return;
        }

        const before = (await runCmd('git rev-parse HEAD')).trim();
        try {
            await runCmd('git fetch --quiet');
            await runCmd('git pull --rebase');
        } catch (e) {
            logErr('git pull failed:', e.message.split('\n')[0]);
            return;
        }
        const after = (await runCmd('git rev-parse HEAD')).trim();
        if (before !== after) {
            log(`git pull: ${before.slice(0, 7)} -> ${after.slice(0, 7)} — triggering rebuild`);
            await recover('git pull updated repo');
        }
    } catch (e) {
        logErr('git status failed:', e.message.split('\n')[0]);
    }
}

// ─── Main loop ──────────────────────────────────────────────────────────────

async function tick() {
    if (recovering) return;
    cycleCount++;

    // Structural pre-check — bypasses HTTP failure threshold.
    const missing = structuralCheck();
    if (missing) {
        consecutiveHttpFailures = 0;
        log(`structural failure: missing ${missing} — recovering immediately`);
        await recover(`structural: missing ${missing}`);
        return;
    }

    // HTTP probe.
    const reason = await httpCheck();
    if (reason) {
        consecutiveHttpFailures++;
        log(`health probe failed (${consecutiveHttpFailures}/${FAIL_THRESHOLD}): ${reason}`);
        if (consecutiveHttpFailures >= FAIL_THRESHOLD) {
            await recover(`http: ${reason}`);
        }
    } else {
        if (consecutiveHttpFailures > 0) {
            log(`health restored after ${consecutiveHttpFailures} probe failure(s)`);
        }
        consecutiveHttpFailures = 0;
    }

    // Periodic git pull.
    if (cycleCount % GIT_INTERVAL_CYCLES === 0) {
        await gitPullIfClean();
    }
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────

log(`starting — project=${PROJECT_DIR}`);
log(`config — interval=${CHECK_INTERVAL_MS}ms, threshold=${FAIL_THRESHOLD}, cooldown=${RECOVERY_COOLDOWN_MS}ms`);
log(`monitoring app=${APP_NAME}, siblings=[${SIBLING_NAMES.join(', ')}], port=${PORT}`);

// Clear any stale lock file from a previous watchdog crash (we just started,
// nothing else is in recovery). Otherwise heal-pogo would back off forever.
try {
    if (fs.existsSync(RECOVERY_LOCK)) {
        fs.unlinkSync(RECOVERY_LOCK);
        log('cleared stale recovery lock from previous run');
    }
} catch (e) {
    logErr(`could not clear stale lock: ${e.message.split('\n')[0]}`);
}

// Defer first check so the site has time to come online if we just restarted.
setTimeout(() => {
    tick().catch(e => logErr('first tick error:', e.message.split('\n')[0]));
    setInterval(() => {
        tick().catch(e => logErr('tick error:', e.message.split('\n')[0]));
    }, CHECK_INTERVAL_MS);
}, STARTUP_GRACE_MS);

// Crash visibility (PM2 will autorestart us anyway).
process.on('uncaughtException', (e) => {
    logErr('UNCAUGHT EXCEPTION:', e && e.stack ? e.stack : e);
});
process.on('unhandledRejection', (e) => {
    logErr('UNHANDLED REJECTION:', e && e.stack ? e.stack : e);
});
