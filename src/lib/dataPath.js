import path from 'path';

// Stable data directory — survives Next.js standalone builds.
//
// Background: Next.js's `output: 'standalone'` injects `process.chdir(__dirname)`
// at boot, which moves cwd to `.next/standalone/`. Anything writing to
// `path.join(process.cwd(), 'data')` ends up inside the `.next/` tree, which
// `rm -rf .next` blows away on every deploy. That's how live Pokémon
// collections, OCR quota counters, and similar files were silently lost.
//
// `POGO_DATA_DIR` is set in ecosystem.config.js to an absolute path on the
// host that lives outside `.next/`, so writes persist across rebuilds.
export const DATA_DIR = process.env.POGO_DATA_DIR
    ? path.resolve(process.env.POGO_DATA_DIR)
    : path.join(process.cwd(), 'data');
