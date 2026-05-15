// Privacy-friendly analytics loader. Renders nothing until you pick a
// provider and set its env var — then this component injects the right
// beacon script for that provider. Pick ONE; setting more than one will
// inject all of them but you'll just have duplicate page views in two
// dashboards (not the end of the world, but pointless).
//
// Supported providers (all set as NEXT_PUBLIC_* so the value is inlined
// into the client bundle at build time):
//
//   NEXT_PUBLIC_PLAUSIBLE_DOMAIN
//     – e.g. "pogosphere.com"
//     – Plausible.io, $9/mo for 10k pageviews. GDPR/CCPA-friendly,
//       no cookies, no personal data, full feature dashboard.
//     – Sign up at https://plausible.io and use your verified domain.
//
//   NEXT_PUBLIC_UMAMI_ID + NEXT_PUBLIC_UMAMI_SRC
//     – e.g. "abc12345-…" and "https://cloud.umami.is/script.js"
//     – Umami.is. Free cloud tier (10k events/mo) or self-host for free.
//       Same cookie-less, GDPR-friendly model as Plausible.
//
//   NEXT_PUBLIC_CF_BEACON_TOKEN
//     – e.g. "abc123…" (the token from Cloudflare's Web Analytics tab)
//     – Cloudflare Web Analytics. Completely free, no signup separate
//       from Cloudflare itself. PogoSphere already routes through CF
//       so this is the least-friction option to bootstrap with.
//
// All three render via `<script defer …>` so they never block first
// paint and never run before hydration. None of them set cookies. None
// of them pass IP addresses to a third party in a personally
// identifiable form (Plausible/Umami hash on the server, CF doesn't
// log them at all).
//
// To exclude admin traffic from your own dashboard, blacklist your IP
// in the provider settings — keeping that logic out of the client
// avoids leaking who-is-admin to the page bundle.

import Script from 'next/script';

export default function Analytics() {
    const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    const umamiId = process.env.NEXT_PUBLIC_UMAMI_ID;
    const umamiSrc = process.env.NEXT_PUBLIC_UMAMI_SRC;
    const cfBeacon = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

    return (
        <>
            {plausibleDomain && (
                <Script
                    defer
                    data-domain={plausibleDomain}
                    src="https://plausible.io/js/script.js"
                    strategy="afterInteractive"
                />
            )}
            {umamiId && umamiSrc && (
                <Script
                    defer
                    data-website-id={umamiId}
                    src={umamiSrc}
                    strategy="afterInteractive"
                />
            )}
            {cfBeacon && (
                <Script
                    defer
                    src="https://static.cloudflareinsights.com/beacon.min.js"
                    data-cf-beacon={JSON.stringify({ token: cfBeacon })}
                    strategy="afterInteractive"
                />
            )}
        </>
    );
}
