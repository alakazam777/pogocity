/**
 * ============================================================
 *  PogoCity — City Configuration
 * ============================================================
 *  This is the ONLY file you need to edit to brand your site.
 *  Every page reads from here: name, city, language, colors...
 *
 *  Secrets (Discord tokens, API keys) do NOT go here — they go
 *  in `.env.local`. See `.env.example` for the full list.
 * ============================================================
 */

const cityConfig = {

  /* ── Identity ─────────────────────────────────────────────
   * siteName : your community brand, shown across the whole site
   * cityName : your city — used in sentences like "... of {city}"
   * domain   : your live domain, NO "https://", NO trailing "/"
   */
  siteName: 'PogoCity',
  cityName: 'Votre Ville',
  domain: 'pogocity.example',

  /* ── Tagline ──────────────────────────────────────────────
   * Short description shown on the homepage and in search engines.
   */
  tagline: {
    fr: 'La communauté Pokémon GO de votre ville',
    en: "Your city's Pokémon GO community",
    ja: 'あなたの街のポケモンGOコミュニティ',
  },

  /* ── Language ─────────────────────────────────────────────
   * defaultLocale : 'fr' | 'en' | 'ja'
   * locales       : languages offered in the language switcher
   */
  defaultLocale: 'fr',
  locales: ['fr', 'en', 'ja'],

  /* ── Map location ─────────────────────────────────────────
   * Your city's GPS coordinates (used by the 3D globe & maps).
   * Google Maps -> right-click your city -> click the coordinates.
   */
  coordinates: { lat: 48.8566, lng: 2.3522 },

  /* ── Look & feel ──────────────────────────────────────────
   * themeColor : main accent color (hex).
   * To change the logo, replace these files in /public:
   *   /public/logo.svg, /public/icon-512.png, /public/og-image.png
   */
  themeColor: '#5b8def',

  /* ── Community ────────────────────────────────────────────
   * Your main Discord invite link (shown in header & footer).
   * Optional — leave empty to hide the button.
   */
  discordInvite: '',

  /* ── Operator & contact ───────────────────────────────────
   * Shown on the legal pages (Privacy, Terms, Account Deletion).
   * App stores and GDPR require users to have a way to reach
   * whoever operates this site.
   */
  contact: {
    operatorName: 'Your Name',
    email: 'you@example.com',
    discord: 'your_discord_handle',
  },

  /* ── Federation with Pogosphere ───────────────────────────
   * Pogosphere (https://pogosphere.com) is the global hub.
   *   pullEvents   : show the shared event calendar from the hub
   *   publishToHub : let the hub list your local rankings & trades
   *                  on the global map (see README — Phase 2)
   * Leave hubUrl as-is unless instructed otherwise.
   */
  federation: {
    hubUrl: 'https://pogosphere.com',
    pullEvents: true,
    publishToHub: true,
  },

};

module.exports = cityConfig;
