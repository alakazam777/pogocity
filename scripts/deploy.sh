#!/bin/bash
# Zero-downtime deploy for pogosphere.
#
# Build into .next.staging/ while the live server keeps running from .next/.
# Then stop, atomic mv-swap, restart. Real downtime is ~3-5 seconds instead
# of the ~30s of the in-place rebuild.
#
# Usage:  scripts/deploy.sh
#
# Notes:
#  – pogosphere's next.config.js sets `outputFileTracingRoot` to "..", which
#    pulls in shared code from e:/Websites/_shared/. As a side effect the
#    standalone build is emitted one level deeper than usual: at
#       .next.staging/standalone/<project-dir-name>/server.js
#    instead of the usual
#       .next.staging/standalone/server.js
#    The script detects the standalone root dynamically so it survives if
#    the project dir is ever renamed.
#  – pogosphere doesn't have its own Cloudflare tunnel process — it's
#    fronted by an upstream proxy — so we only restart pogosphere +
#    pogosphere-watchdog, not pogo-tunnel.

set -e
cd "$(dirname "$0")/.."

echo "==> Building into .next.staging/ (live site stays up during this step)"
[ -d .next.staging ] && rm -rf .next.staging
NEXT_DISTDIR=.next.staging npm run build

# ─── Locate the standalone root ──────────────────────────────────────────
# Without outputFileTracingRoot:   .next.staging/standalone/server.js
# With    outputFileTracingRoot:   .next.staging/standalone/<dirname>/server.js
if [ -f .next.staging/standalone/server.js ]; then
    STANDALONE_ROOT=".next.staging/standalone"
elif [ -d .next.staging/standalone ]; then
    # Find the single child directory that contains server.js
    STANDALONE_ROOT=$(find .next.staging/standalone -maxdepth 2 -name server.js -printf "%h\n" | head -1)
fi

if [ -z "$STANDALONE_ROOT" ] || [ ! -f "$STANDALONE_ROOT/server.js" ]; then
    echo "==> ABORT: could not locate standalone server.js anywhere under .next.staging/standalone/. Live site untouched."
    exit 1
fi
echo "==> Standalone root: $STANDALONE_ROOT"

# ─── Rename the inner .next.staging → .next subtree ──────────────────────
# Next bakes the distDir name into the standalone subtree:
#   $STANDALONE_ROOT/.next.staging/server/middleware-manifest.json
# The runtime expects:
#   $STANDALONE_ROOT/.next/server/middleware-manifest.json
if [ -d "$STANDALONE_ROOT/.next.staging" ]; then
    echo "==> Renaming inner standalone subtree (.next.staging -> .next)"
    mv "$STANDALONE_ROOT/.next.staging" "$STANDALONE_ROOT/.next"
fi

# ─── Sanity check: bail before swap if any required artifact missing ─────
for f in "$STANDALONE_ROOT/server.js" "$STANDALONE_ROOT/.next/server/middleware-manifest.json" "$STANDALONE_ROOT/.next/BUILD_ID"; do
    if [ ! -f "$f" ]; then
        echo "==> ABORT: build is missing $f. Live site untouched."
        exit 1
    fi
done

# ─── Copy post-build assets into the standalone bundle ───────────────────
echo "==> Preparing standalone assets"
cp -r .next.staging/static "$STANDALONE_ROOT/.next/" 2>/dev/null || true
cp -r public "$STANDALONE_ROOT/" 2>/dev/null || true
cp .env.local "$STANDALONE_ROOT/" 2>/dev/null || true

# ─── Atomic swap ─────────────────────────────────────────────────────────
echo "==> Atomic swap (downtime starts here)"
SWAP_START=$(date +%s)
pm2 stop pogosphere >/dev/null 2>&1 || true
[ -d .next.old ] && rm -rf .next.old
[ -d .next ] && mv .next .next.old
mv .next.staging .next
pm2 restart pogosphere --update-env >/dev/null 2>&1
SWAP_END=$(date +%s)
echo "==> Swap done in $((SWAP_END - SWAP_START))s"

echo "==> Restarting watchdog"
pm2 restart pogosphere-watchdog --update-env >/dev/null 2>&1

echo "==> Background cleanup of .next.old"
rm -rf .next.old &

echo "==> Smoke test"
sleep 3
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3064/ -m 10 || echo "000")
echo "    local /  -> $HTTP"

echo "==> Deploy complete."
