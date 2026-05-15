import { Geist, Geist_Mono, Montserrat, Outfit, Poppins, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BugReportButton from "@/components/BugReportButton";
import ChatBubble from "@/components/ChatBubble";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import IosSpriteShield from "@/components/IosSpriteShield";
import EulaGate from "@/components/EulaGate";
import Analytics from "@/components/Analytics";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Providers } from "@/components/Providers";
import cityConfig from "@/lib/cityConfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  // Prevents iOS Safari from shrinking the HTML viewport when the soft
  // keyboard appears. Instead the keyboard simply overlays content, so
  // `position: fixed` overlays (chat popup, modals, …) keep their original
  // size and position rather than getting squashed / weirdly repositioned
  // when the user focuses an input.
  interactiveWidget: 'resizes-content',
  // Required so `env(safe-area-inset-top)` resolves to the actual iPhone
  // notch / Dynamic Island height inside the Capacitor webview. Without
  // `viewport-fit: cover`, that env() variable is 0 and the Header's
  // `padding-top: env(safe-area-inset-top)` (used to extend the header bg
  // into the status-bar zone so page content doesn't bleed through when
  // scrolling) silently has no effect.
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

// All site identity below is driven by city.config.js — edit that file.
const SITE_URL = `https://${cityConfig.domain}`;
const SITE_DESCRIPTION = `${cityConfig.tagline.en} — events, trades, leaderboards and a 3D community globe.`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${cityConfig.siteName} — ${cityConfig.tagline.en}`,
    template: `%s | ${cityConfig.siteName}`
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "Pokémon GO", cityConfig.siteName, cityConfig.cityName, "Pokémon GO community",
    "Pokémon GO trainers", "Pokémon GO raids", "Pokémon GO trades",
    "Pokémon GO leaderboard", "Pokémon GO 3D globe", "Pokémon GO events",
    "trainer rankings", "shiny trades", "Pokémon GO friend codes"
  ],
  authors: [{ name: `The ${cityConfig.siteName} Community` }],
  creator: cityConfig.siteName,
  alternates: {
    canonical: SITE_URL,
    languages: {
      "en-US": SITE_URL,
      "fr-FR": SITE_URL,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    title: `${cityConfig.siteName} — ${cityConfig.tagline.en}`,
    description: SITE_DESCRIPTION,
    siteName: cityConfig.siteName,
    images: [
      {
        // 1200×630 social share image. Replace /public/og-image.png with
        // your own to customise how links unfurl on Discord, Slack,
        // iMessage, X, etc.
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${cityConfig.siteName} — ${cityConfig.tagline.en}`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${cityConfig.siteName} — ${cityConfig.tagline.en}`,
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Discord, Slack, iMessage, etc. all read OpenGraph.
  other: {
    "theme-color": "#0c0a30",
  },
};

// JSON-LD structured data — gives Google's Knowledge Graph and AI-search
// systems explicit schema for the site, what it does, and where to find it.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: cityConfig.siteName,
      description: SITE_DESCRIPTION,
      inLanguage: ["en-US", "fr-FR"],
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/trainers?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: cityConfig.siteName,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-1024.png`,
      sameAs: [cityConfig.discordInvite].filter(Boolean),
    },
  ],
};



export default function RootLayout({ children }) {
  return (
    <html lang={cityConfig.defaultLocale} suppressHydrationWarning className="bg-[#0a0a0a]">
      <head>
        <meta charSet="utf-8" />
        {/* JSON-LD structured data — declared inline so Next.js leaves
            it untouched (vs. dangerouslySetInnerHTML on a Script
            component which can be deferred and miss SSR crawls). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body
        // bg-[#0a0a0a] on <html> AND <body> so the iOS safe-area / over-scroll
        // bounce never reveals the white system background. Without this,
        // scrolling past the top of the page in the Capacitor webview shows
        // a transparent gap above the fixed header.
        className={`bg-[#0a0a0a] ${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${outfit.variable} ${poppins.variable} ${playfair.variable} antialiased`}
      >
        <Providers>
          <IosSpriteShield />
          <Header />
          {children}
          <Footer />
          <BugReportButton />
          <LanguageSwitcher />
          <ChatBubble />
          {/*
           * EulaGate is mounted last so its modal portals on top of the
           * rest of the UI. It only renders when the active user's
           * `termsVersion` doesn't match the current TERMS_VERSION
           * (lib/legalContent.js) — required for App Store Guideline 1.2
           * compliance (explicit per-user EULA acceptance for any
           * account that posts user-generated content).
           */}
          <EulaGate />
          {/* Floating tab bar — only renders inside the Capacitor iOS /
              Android app webview. On desktop / mobile-web this is a
              no-op and the existing Header handles all navigation. */}
          <MobileBottomNav />
          {/* Privacy-friendly analytics — renders nothing unless one of
              NEXT_PUBLIC_PLAUSIBLE_DOMAIN / NEXT_PUBLIC_UMAMI_ID /
              NEXT_PUBLIC_CF_BEACON_TOKEN is set in .env.local. */}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
