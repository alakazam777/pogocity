/** @type {import('next').NextConfig} */
const nextConfig = {
    // Allow overriding the build output dir at build time. Used by the
    // zero-downtime deploy flow (build into .next.staging while the live
    // server keeps serving from .next, then atomic swap).
    distDir: process.env.NEXT_DISTDIR || '.next',
    output: 'standalone',
    serverExternalPackages: ['tesseract.js', 'sharp'],
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        formats: ['image/avif', 'image/webp'],
        remotePatterns: [
            { protocol: 'https', hostname: 'cdn.discordapp.com' },
            { protocol: 'https', hostname: 'media.discordapp.net' },
            { protocol: 'https', hostname: 'raw.githubusercontent.com' },
            { protocol: 'https', hostname: 'upload.wikimedia.org' },
            { protocol: 'https', hostname: 'pokemondb.net' },
            { protocol: 'https', hostname: 'img.pokemondb.net' },
        ],
        unoptimized: true,
    },
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
                ],
            },
        ];
    },
    async redirects() {
        // Legacy French routes → new English routes (301).
        // Each entry uses `:path*` so nested URLs (eg /classements/local)
        // and query strings tag along correctly.
        const FR_TO_EN = [
            ['classements', 'rankings'],
            ['evenements', 'events'],
            ['dresseurs', 'trainers'],
            ['echanges', 'trades'],
            ['codes-amis', 'friend-codes'],
            ['attaquants-dynamax', 'attackers-dynamax'],
            ['attaquants-rocket', 'attackers-rocket'],
            ['attaquants', 'attackers'],
            ['annuaire', 'directory'],
            ['communaute', 'community'],
            ['boite', 'box'],
            ['regionaux2', 'regionals2'],
            ['regionaux', 'regionals'],
        ];
        const legacyRedirects = FR_TO_EN.flatMap(([fr, en]) => [
            { source: `/${fr}`, destination: `/${en}`, permanent: true },
            { source: `/${fr}/:path*`, destination: `/${en}/:path*`, permanent: true },
        ]);
        return [
            { source: '/pokedex', destination: '/pokematos', permanent: true },
            { source: '/planet', destination: '/regionals', permanent: true },
            ...legacyRedirects,
        ];
    },
};

module.exports = nextConfig;
