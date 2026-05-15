import { NextResponse } from 'next/server';
import cityConfig from '@/lib/cityConfig';

// Edge middleware:
//  1. Canonical host — redirect the `www.` subdomain to the bare domain.
//  2. Cache-Control — force HTML pages to revalidate so visitors always
//     get the latest deploy (hash-named /_next assets stay cached).

export function middleware(request) {
    const host = (request.headers.get('host') || '').toLowerCase();

    // Redirect www.<domain> -> <domain> (canonical host).
    if (host === `www.${cityConfig.domain}`) {
        const url = new URL(request.url);
        url.hostname = cityConfig.domain;
        url.protocol = 'https:';
        url.port = '';
        return NextResponse.redirect(url, 301);
    }

    // Force HTML pages to revalidate on every request so users see new
    // deploys instantly. Hash-named JS/CSS under /_next/ stays cached.
    const url = new URL(request.url);
    const path = url.pathname;
    const isStaticAsset = (
        path.startsWith('/_next/') ||
        path.startsWith('/api/') ||
        /\.[a-z0-9]+$/i.test(path)  // any file with an extension
    );

    const res = NextResponse.next();
    if (!isStaticAsset) {
        res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    }
    return res;
}

// Run on every path EXCEPT Next.js internals and static assets.
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
    ],
};
