/**
 * Product Icons for محفظة الجنوب (South Wallet)
 *
 * Flat minimalist design matching service-icons.ts style:
 * - White rounded square background (48x48 viewBox, rx=12)
 * - Black outlines (#1a1a1a) with stroke-width 1.5-2
 * - Brand-specific accent colors for key elements
 * - Simple, recognizable icons
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ─── Telecom (5 icons) ─────────────────────────────────────────────

const yemenMobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="16" y="10" width="16" height="28" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="21" y1="12" x2="27" y2="12" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#1a1a1a"/>
  <text x="24" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="8" fill="#5C1A1B">YM</text>
  <path d="M10 14C8.5 16 8 18 8 20" stroke="#5C1A1B" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M7 11C5 14 4.5 17 4 20" stroke="#5C1A1B" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M38 14C39.5 16 40 18 40 20" stroke="#5C1A1B" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M41 11C43 14 43.5 17 44 20" stroke="#5C1A1B" stroke-width="1.8" stroke-linecap="round" fill="none"/>
</svg>`;

const yoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="16" y="10" width="16" height="28" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="21" y1="12" x2="27" y2="12" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#1a1a1a"/>
  <circle cx="24" cy="23" r="6" stroke="#FF6B00" stroke-width="2" fill="none"/>
  <text x="24" y="26" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="7" fill="#FF6B00">Yo</text>
</svg>`;

const sabafonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="16" y="10" width="16" height="28" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="21" y1="12" x2="27" y2="12" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#1a1a1a"/>
  <path d="M24 16L30 23L24 30L18 23Z" stroke="#2563EB" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M24 19L27.5 23L24 27L20.5 23Z" fill="#2563EB" fill-opacity="0.2"/>
</svg>`;

const ySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="16" y="10" width="16" height="28" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="21" y1="12" x2="27" y2="12" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#1a1a1a"/>
  <path d="M19 16L24 24L29 16" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="24" y1="24" x2="24" y2="32" stroke="#059669" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

const yemenNetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="10" y="16" width="24" height="16" rx="2" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="22" y1="32" x2="22" y2="36" stroke="#1a1a1a" stroke-width="1.5"/>
  <line x1="16" y1="36" x2="28" y2="36" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M32 10C33.5 8.5 34 7 33 6" stroke="#8B5CF6" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M35 8C36.5 6.5 37 5 36 4" stroke="#8B5CF6" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M29 12C30.5 10.5 31 9 30 8" stroke="#8B5CF6" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <circle cx="22" cy="24" r="2" fill="#8B5CF6"/>
</svg>`;

// ─── Entertainment / Gaming (18 icons) ──────────────────────────────

const pubgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8C18 8 14 12 14 18V24L17 28H31L34 24V18C34 12 30 8 24 8Z" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="14" y1="22" x2="34" y2="22" stroke="#1a1a1a" stroke-width="1.5"/>
  <rect x="20" y="28" width="8" height="4" rx="1" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <path d="M19 32L17 38" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M29 32L31 38" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="20" cy="16" r="2" fill="#F59E0B"/>
  <circle cx="28" cy="16" r="2" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
</svg>`;

const freefireSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8C20 14 14 16 14 26C14 32 18 38 24 38C30 38 34 32 34 26C34 16 28 14 24 8Z" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M24 16C22 20 19 21 19 27C19 30 21 34 24 34C27 34 29 30 29 27C29 21 26 20 24 16Z" fill="#EC4899" fill-opacity="0.25" stroke="#EC4899" stroke-width="1.5"/>
  <path d="M24 22C23 24 22 25 22 28C22 29.5 23 31 24 31C25 31 26 29.5 26 28C26 25 25 24 24 22Z" fill="#EC4899" fill-opacity="0.5"/>
</svg>`;

const callOfDutySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M14 28L20 20L24 26L28 20L34 28" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M14 34L20 26L24 32L28 26L34 34" stroke="#1a1a1a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="24" y1="10" x2="24" y2="16" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <path d="M21 13L24 10L27 13" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <rect x="20" y="16" width="8" height="2" rx="1" fill="#1a1a1a"/>
</svg>`;

const clashRoyaleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M14 24L18 12H30L34 24" stroke="#1a1a1a" stroke-width="1.8" stroke-linejoin="round" fill="none"/>
  <path d="M16 12H32" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="20" cy="9" r="2.5" stroke="#3B82F6" stroke-width="1.8" fill="none"/>
  <circle cx="24" cy="7" r="2.5" stroke="#3B82F6" stroke-width="1.8" fill="none"/>
  <circle cx="28" cy="9" r="2.5" stroke="#3B82F6" stroke-width="1.8" fill="none"/>
  <rect x="14" y="24" width="20" height="14" rx="2" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="24" cy="31" r="3" stroke="#3B82F6" stroke-width="1.5" fill="none"/>
  <circle cx="24" cy="31" r="1" fill="#3B82F6"/>
</svg>`;

const clashOfClansSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8L36 16V28L24 40L12 28V16Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M24 14L32 19V27L24 34L16 27V19Z" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="24" y1="20" x2="24" y2="30" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <line x1="19" y1="23" x2="29" y2="23" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="24" cy="23" r="2.5" stroke="#F59E0B" stroke-width="1.5" fill="none"/>
</svg>`;

const robloxSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="10" y="10" width="28" height="28" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <rect x="14" y="14" width="20" height="20" rx="2" fill="#5C1A1B" fill-opacity="0.15" stroke="#5C1A1B" stroke-width="1.5"/>
  <text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="16" fill="#5C1A1B">R</text>
</svg>`;

const fortniteSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M20 10H30V16H26V36H20V10Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M26 10L30 10L32 6" stroke="#6D28D9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M18 6L20 10" stroke="#6D28D9" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <rect x="21" y="17" width="5" height="8" rx="1" fill="#6D28D9" fill-opacity="0.2" stroke="#6D28D9" stroke-width="1.2"/>
</svg>`;

const minecraftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="12" y="12" width="10" height="10" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <rect x="22" y="12" width="10" height="10" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <rect x="12" y="22" width="10" height="10" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <rect x="22" y="22" width="10" height="10" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <rect x="12" y="12" width="10" height="10" fill="#4ADE80" fill-opacity="0.3"/>
  <rect x="22" y="22" width="10" height="10" fill="#4ADE80" fill-opacity="0.3"/>
  <rect x="32" y="12" width="5" height="10" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="12" y="32" width="10" height="5" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="22" y="32" width="10" height="5" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="32" y="22" width="5" height="10" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
</svg>`;

const valorantSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M12 14L24 10L36 14" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M16 14L24 38L32 14" stroke="#FF4655" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M20 14L24 28L28 14" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="14" y1="14" x2="34" y2="14" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const leagueLegendsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M18 10V34H30" stroke="#C8AA6E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="24" cy="24" r="12" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M18 10V34H30" stroke="#C8AA6E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="24" cy="24" r="4" stroke="#C8AA6E" stroke-width="1.5" fill="#C8AA6E" fill-opacity="0.15"/>
</svg>`;

const apexLegendsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8L36 32H12Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M24 16L32 32H16Z" fill="#DA292A" fill-opacity="0.2" stroke="#DA292A" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="24" y1="20" x2="24" y2="28" stroke="#DA292A" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 24L24 20L28 24" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const genshinImpactSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8L26.5 17.5L36 14L30 22L38 28L28 27L26 38L24 30L22 38L20 27L10 28L18 22L12 14L21.5 17.5Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <circle cx="24" cy="22" r="4" fill="#FFD700" fill-opacity="0.25" stroke="#FFD700" stroke-width="1.5"/>
  <circle cx="24" cy="22" r="1.5" fill="#FFD700"/>
</svg>`;

const honkaiStarSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8L25.5 18L34 12L28 21L38 24L28 27L34 36L25.5 30L24 40L22.5 30L14 36L20 27L10 24L20 21L14 12L22.5 18Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <circle cx="24" cy="24" r="3.5" fill="#7C3AED" fill-opacity="0.3" stroke="#7C3AED" stroke-width="1.5"/>
  <circle cx="24" cy="24" r="1.2" fill="#7C3AED"/>
  <path d="M12 40C14 38 16 40 18 38" stroke="#7C3AED" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

const eaFcSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="12" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M24 12L21.5 17.5L15 17L20 21.5L18 28L24 24.5L30 28L28 21.5L33 17L26.5 17.5Z" stroke="#1a1a1a" stroke-width="1.2" fill="none" stroke-linejoin="round"/>
  <path d="M18 14L24 12L30 14" stroke="#22C55E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M18 34L24 36L30 34" stroke="#22C55E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="24" cy="24" r="3" fill="#22C55E" fill-opacity="0.2" stroke="#22C55E" stroke-width="1.2"/>
</svg>`;

const steamSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="12" y="12" width="24" height="24" rx="4" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="24" cy="22" r="6" stroke="#1B2838" stroke-width="1.8" fill="none"/>
  <circle cx="24" cy="22" r="2.5" fill="#1B2838" fill-opacity="0.3" stroke="#1B2838" stroke-width="1.2"/>
  <path d="M22 28C22 28 18 30 18 33C18 34.5 19.5 36 21 35C22.5 34 22 32 22 32" stroke="#1B2838" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

const netflixSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M18 10H26L22 38H14Z" fill="#E50914" fill-opacity="0.2"/>
  <path d="M22 10H30L26 38H18Z" fill="#E50914" fill-opacity="0.35"/>
  <path d="M18 10L22 38" stroke="#E50914" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M26 10L22 38" stroke="#E50914" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="18" y1="10" x2="26" y2="10" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

const spotifySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="14" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M16 20C20 18 28 18 34 20" stroke="#1DB954" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M17 25C21 23 29 23 33 25" stroke="#1DB954" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M18 30C21.5 28 28.5 28 32 30" stroke="#1DB954" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

const youtubePremiumSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="8" y="16" width="32" height="20" rx="4" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M20 22L30 26L20 30Z" fill="#FF0000" stroke="#FF0000" stroke-width="1" stroke-linejoin="round"/>
  <circle cx="34" cy="18" r="4" fill="#1a1a1a" stroke="white" stroke-width="1.5"/>
  <path d="M32 18L33.5 19.5L36 16.5" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// ─── Digital Cards (9 icons) ────────────────────────────────────────

const googlePlaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M14 10L34 24L14 38Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M14 10L26 24L14 38" stroke="#34A853" stroke-width="1.8" stroke-linejoin="round" fill="none"/>
  <path d="M14 10L34 24" stroke="#34A853" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="14" y1="10" x2="14" y2="38" stroke="#1a1a1a" stroke-width="1.8"/>
</svg>`;

const appleItunesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="22" cy="28" r="8" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="30" y1="28" x2="30" y2="12" stroke="#007AFF" stroke-width="2" stroke-linecap="round"/>
  <path d="M30 12C30 12 34 14 36 14" stroke="#007AFF" stroke-width="2" stroke-linecap="round" fill="none"/>
  <line x1="30" y1="20" x2="22" y2="22" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const amazonGiftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="10" y="20" width="28" height="18" rx="2" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M16 20V16C16 13 19 11 22 12" stroke="#FF9900" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M32 20V16C32 13 29 11 26 12" stroke="#FF9900" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M22 12C22 14 26 14 26 12" stroke="#FF9900" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <line x1="10" y1="28" x2="38" y2="28" stroke="#1a1a1a" stroke-width="1.2"/>
  <path d="M18 28V20" stroke="#1a1a1a" stroke-width="1.2"/>
  <path d="M30 28V20" stroke="#1a1a1a" stroke-width="1.2"/>
  <circle cx="34" cy="24" r="1.5" fill="#FF9900"/>
</svg>`;

const psnCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M18 10V34C18 34 14 33 14 28V20" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <path d="M18 18C18 18 26 16 30 14C32 13 34 14 34 16C34 18 32 19 30 19L22 20" stroke="#00439C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M18 26C18 26 26 24 30 22C32 21 34 22 34 24C34 26 32 27 30 27L22 28" stroke="#00439C" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="18" cy="18" r="2" fill="#00439C" fill-opacity="0.2"/>
</svg>`;

const xboxCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="12" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M16 16C18 18 21 20 24 20C27 20 30 18 32 16" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M16 32C18 30 21 28 24 28C27 28 30 30 32 32" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <line x1="24" y1="12" x2="24" y2="36" stroke="#107C10" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="12" y1="24" x2="36" y2="24" stroke="#107C10" stroke-width="2.2" stroke-linecap="round"/>
</svg>`;

const nintendoCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="10" y="14" width="13" height="22" rx="4" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <rect x="25" y="14" width="13" height="22" rx="4" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="16.5" cy="18" r="2" fill="#E60012"/>
  <circle cx="31.5" cy="32" r="2" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="29" y="19" width="5" height="1.5" rx="0.5" fill="#1a1a1a"/>
  <rect x="31.25" y="17" width="1.5" height="5" rx="0.5" fill="#1a1a1a"/>
</svg>`;

const visaVirtualSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="8" y="14" width="32" height="22" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="8" y1="22" x2="40" y2="22" stroke="#1a1a1a" stroke-width="1.5"/>
  <text x="24" y="20" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="7" fill="#1A1F71">V</text>
  <rect x="12" y="26" width="10" height="3" rx="1" fill="#1a1a1a" fill-opacity="0.2"/>
  <rect x="12" y="31" width="6" height="2" rx="0.5" fill="#1a1a1a" fill-opacity="0.15"/>
  <path d="M34 10L38 14" stroke="#1A1F71" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M38 10L34 14" stroke="#1A1F71" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const mastercardVirtualSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="8" y="14" width="32" height="22" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="8" y1="22" x2="40" y2="22" stroke="#1a1a1a" stroke-width="1.5"/>
  <circle cx="20" cy="32" r="5" stroke="#EB001B" stroke-width="1.8" fill="none"/>
  <circle cx="28" cy="32" r="5" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M24 28.5C25 29.5 25.5 31 25.5 32.5C25.5 34 25 35.5 24 36.5" stroke="#1a1a1a" stroke-width="0.8" fill="none"/>
  <rect x="12" y="26" width="8" height="2" rx="0.5" fill="#1a1a1a" fill-opacity="0.2"/>
</svg>`;

const paypalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M20 10H28C32 10 34 13 33 17C32 21 28 24 24 24H20L18 34H12L16 18C16.5 14 18 10 20 10Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M20 10H28C32 10 34 13 33 17C32 21 28 24 24 24H20" stroke="#003087" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M22 18H24C26 18 27 16 27.5 14C28 12 27 10 25 10" stroke="#003087" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

// ─── Utilities (2 icons) ─────────────────────────────────────────────

const electricitySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M26 10L18 24H23L22 38L30 22H25L26 10Z" fill="#F59E0B" fill-opacity="0.3" stroke="#F59E0B" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M26 10L18 24H23L22 38L30 22H25L26 10Z" stroke="#1a1a1a" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
  <line x1="20" y1="24" x2="28" y2="24" stroke="#1a1a1a" stroke-width="1" stroke-linecap="round"/>
</svg>`;

const waterSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8C24 8 14 20 14 28C14 33.5 18.5 38 24 38C29.5 38 34 33.5 34 28C34 20 24 8 24 8Z" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M24 16C24 16 19 23 19 28C19 31 21.2 33 24 33C26.8 33 29 31 29 28C29 23 24 16 24 16Z" fill="#06B6D4" fill-opacity="0.25" stroke="#06B6D4" stroke-width="1.5"/>
  <circle cx="24" cy="28" r="2" fill="#06B6D4" fill-opacity="0.5"/>
</svg>`;

// ─── Government (4 icons) ────────────────────────────────────────────

const civilRegistrySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="10" y="12" width="28" height="22" rx="2" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="20" cy="22" r="4" stroke="#6B7280" stroke-width="1.5" fill="none"/>
  <path d="M16 30C16 27 17.8 25 20 25C22.2 25 24 27 24 30" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <line x1="28" y1="20" x2="35" y2="20" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="28" y1="24" x2="35" y2="24" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="28" y1="28" x2="33" y2="28" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round"/>
  <rect x="10" y="12" width="28" height="6" rx="1" fill="#6B7280" fill-opacity="0.15"/>
</svg>`;

const passportSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="12" y="8" width="24" height="32" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="24" cy="22" r="8" stroke="#1E40AF" stroke-width="1.5" fill="none"/>
  <path d="M16 22C18 20 20 18 24 18C28 18 30 20 32 22" stroke="#1E40AF" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <path d="M16 22C18 24 20 26 24 26C28 26 30 24 32 22" stroke="#1E40AF" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <line x1="24" y1="14" x2="24" y2="30" stroke="#1E40AF" stroke-width="1" stroke-linecap="round"/>
  <line x1="18" y1="22" x2="30" y2="22" stroke="#1E40AF" stroke-width="1" stroke-linecap="round"/>
  <line x1="18" y1="34" x2="30" y2="34" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

const trafficSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M14 22C14 16 18 12 24 12C30 12 34 16 34 22C34 26 32 29 28 30V34H20V30C16 29 14 26 14 22Z" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="24" cy="18" r="2.5" fill="#DC2626" fill-opacity="0.3" stroke="#DC2626" stroke-width="1.5"/>
  <circle cx="24" cy="26" r="2.5" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <line x1="20" y1="34" x2="20" y2="38" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="28" y1="34" x2="28" y2="38" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="14" cy="38" r="1.5" fill="#DC2626" fill-opacity="0.2"/>
  <circle cx="34" cy="38" r="1.5" fill="#DC2626" fill-opacity="0.2"/>
</svg>`;

const municipalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8L10 18V38H38V18Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <rect x="14" y="22" width="6" height="8" rx="1" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="28" y="22" width="6" height="8" rx="1" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="20" y="28" width="8" height="10" rx="1" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <path d="M20 28H28V32H20Z" fill="#059669" fill-opacity="0.2"/>
  <line x1="24" y1="8" x2="24" y2="18" stroke="#059669" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M20 12L24 8L28 12" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// ─── Category Icons (6 icons) ────────────────────────────────────────

const telecomCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8V32" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <path d="M18 14L24 8L30 14" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M16 18L24 12L32 18" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M14 22L24 16L34 22" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="18" y1="32" x2="30" y2="32" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <line x1="16" y1="36" x2="32" y2="36" stroke="#1a1a1a" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="24" cy="20" r="2" fill="#1a1a1a"/>
</svg>`;

const entertainmentCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M8 24C8 18 12 16 16 16H32C36 16 40 18 40 24C40 30 38 38 32 38C28 38 26 34 24 34C22 34 20 38 16 38C10 38 8 30 8 24Z" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="13" y1="22" x2="13" y2="28" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="10" y1="25" x2="16" y2="25" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="33" cy="22" r="2.5" fill="#1a1a1a"/>
  <circle cx="29" cy="26" r="1.8" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <circle cx="37" cy="26" r="1.8" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
</svg>`;

const cardsCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="6" y="18" width="26" height="16" rx="2" stroke="#1a1a1a" stroke-width="1.5" fill="none" transform="rotate(-5 6 18)"/>
  <rect x="10" y="16" width="28" height="18" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="white"/>
  <line x1="10" y1="24" x2="38" y2="24" stroke="#1a1a1a" stroke-width="1.5"/>
  <rect x="14" y="27" width="8" height="3" rx="1" fill="#1a1a1a" fill-opacity="0.2"/>
  <rect x="14" y="31" width="5" height="2" rx="0.5" fill="#1a1a1a" fill-opacity="0.15"/>
  <circle cx="34" cy="28" r="2.5" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
</svg>`;

const electricityCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="14" y="14" width="16" height="8" rx="2" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="22" y1="22" x2="22" y2="26" stroke="#1a1a1a" stroke-width="1.5"/>
  <rect x="18" y="26" width="8" height="4" rx="1" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <line x1="18" y1="30" x2="18" y2="36" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="26" y1="30" x2="26" y2="36" stroke="#1a1a1a" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="19" cy="18" r="1.5" fill="#F59E0B"/>
  <path d="M28 16L30 14M30 18L32 16" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const governmentCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 8L8 18H40Z" stroke="#1a1a1a" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <line x1="10" y1="18" x2="10" y2="36" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="38" y1="18" x2="38" y2="36" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="8" y1="36" x2="40" y2="36" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="8" x2="24" y2="36" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="14" y="24" width="6" height="12" rx="1" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <rect x="30" y="24" width="6" height="12" rx="1" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <circle cx="24" cy="14" r="2" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
</svg>`;

const internetCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="12" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <ellipse cx="24" cy="24" rx="5.5" ry="12" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <line x1="12" y1="20" x2="36" y2="20" stroke="#1a1a1a" stroke-width="1.2"/>
  <line x1="12" y1="28" x2="36" y2="28" stroke="#1a1a1a" stroke-width="1.2"/>
  <path d="M33 10C34.5 8.5 35 7 34 6" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M36 8C37.5 6.5 38 5 37 4" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M30 12C31.5 10.5 32 9 31 8" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
  <circle cx="24" cy="24" r="1.5" fill="#1a1a1a"/>
</svg>`;

// ─── General Service Icons (3 icons) ─────────────────────────────────

const yNetInternetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="14" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <ellipse cx="24" cy="24" rx="6" ry="14" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <line x1="10" y1="20" x2="38" y2="20" stroke="#1a1a1a" stroke-width="1"/>
  <line x1="10" y1="28" x2="38" y2="28" stroke="#1a1a1a" stroke-width="1"/>
  <path d="M20 18L24 12L28 18" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="24" y1="18" x2="24" y2="24" stroke="#059669" stroke-width="2" stroke-linecap="round"/>
  <path d="M34 10C35.5 8.5 36 7 35 6" stroke="#059669" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M37 8C38.5 6.5 39 5 38 4" stroke="#059669" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

const sabafonInternetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="14" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <ellipse cx="24" cy="24" rx="6" ry="14" stroke="#1a1a1a" stroke-width="1.2" fill="none"/>
  <line x1="10" y1="20" x2="38" y2="20" stroke="#1a1a1a" stroke-width="1"/>
  <line x1="10" y1="28" x2="38" y2="28" stroke="#1a1a1a" stroke-width="1"/>
  <path d="M24 14L28 20L24 26L20 20Z" stroke="#2563EB" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M24 16.5L26.5 20L24 23.5L21.5 20Z" fill="#2563EB" fill-opacity="0.2"/>
  <path d="M34 10C35.5 8.5 36 7 35 6" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M37 8C38.5 6.5 39 5 38 4" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`;

const giftCardsProductSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="8" y="18" width="32" height="22" rx="2" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <line x1="8" y1="26" x2="40" y2="26" stroke="#1a1a1a" stroke-width="1.5"/>
  <path d="M20 18C20 14 24 10 24 14C24 10 28 14 28 18" stroke="#14B8A6" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <line x1="24" y1="14" x2="24" y2="18" stroke="#14B8A6" stroke-width="1.5"/>
  <circle cx="34" cy="22" r="2" fill="#14B8A6"/>
  <rect x="14" y="30" width="8" height="3" rx="1" fill="#14B8A6" fill-opacity="0.3"/>
</svg>`;

// ─── Export all icons ────────────────────────────────────────────────

export const productIcons: Record<string, string> = {
  // Telecom
  'yemen-mobile': svgToDataUrl(yemenMobileSvg),
  'yo': svgToDataUrl(yoSvg),
  'sabafon': svgToDataUrl(sabafonSvg),
  'y': svgToDataUrl(ySvg),
  'yemen-net': svgToDataUrl(yemenNetSvg),

  // Entertainment / Gaming
  'pubg': svgToDataUrl(pubgSvg),
  'freefire': svgToDataUrl(freefireSvg),
  'call-of-duty': svgToDataUrl(callOfDutySvg),
  'clash-royale': svgToDataUrl(clashRoyaleSvg),
  'clash-of-clans': svgToDataUrl(clashOfClansSvg),
  'roblox': svgToDataUrl(robloxSvg),
  'fortnite': svgToDataUrl(fortniteSvg),
  'minecraft': svgToDataUrl(minecraftSvg),
  'valorant': svgToDataUrl(valorantSvg),
  'league-legends': svgToDataUrl(leagueLegendsSvg),
  'apex-legends': svgToDataUrl(apexLegendsSvg),
  'genshin-impact': svgToDataUrl(genshinImpactSvg),
  'honkai-star': svgToDataUrl(honkaiStarSvg),
  'ea-fc': svgToDataUrl(eaFcSvg),
  'steam': svgToDataUrl(steamSvg),
  'netflix': svgToDataUrl(netflixSvg),
  'spotify': svgToDataUrl(spotifySvg),
  'youtube-premium': svgToDataUrl(youtubePremiumSvg),

  // Digital Cards
  'google-play': svgToDataUrl(googlePlaySvg),
  'apple-itunes': svgToDataUrl(appleItunesSvg),
  'amazon-gift': svgToDataUrl(amazonGiftSvg),
  'psn-card': svgToDataUrl(psnCardSvg),
  'xbox-card': svgToDataUrl(xboxCardSvg),
  'nintendo-card': svgToDataUrl(nintendoCardSvg),
  'visa-virtual': svgToDataUrl(visaVirtualSvg),
  'mastercard-virtual': svgToDataUrl(mastercardVirtualSvg),
  'paypal': svgToDataUrl(paypalSvg),

  // Utilities
  'electricity': svgToDataUrl(electricitySvg),
  'water': svgToDataUrl(waterSvg),

  // Government
  'civil-registry': svgToDataUrl(civilRegistrySvg),
  'passport': svgToDataUrl(passportSvg),
  'traffic': svgToDataUrl(trafficSvg),
  'municipal': svgToDataUrl(municipalSvg),

  // Category Icons
  'telecom-category': svgToDataUrl(telecomCategorySvg),
  'entertainment-category': svgToDataUrl(entertainmentCategorySvg),
  'cards-category': svgToDataUrl(cardsCategorySvg),
  'electricity-category': svgToDataUrl(electricityCategorySvg),
  'government-category': svgToDataUrl(governmentCategorySvg),
  'internet-category': svgToDataUrl(internetCategorySvg),
  'crypto-category': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="12" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <text x="24" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="10" fill="#F7931A">B</text>
  <path d="M20 16L28 16" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M19 24H29" stroke="#F7931A" stroke-width="1" stroke-linecap="round"/>
  <path d="M20 32L28 32" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M8 14C6.5 16 6 18 6 20" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M40 14C41.5 16 42 18 42 20" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`),
  'crypto-invest-category': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 10V38" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M14 20L24 14L34 20" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M14 30L24 24L34 30" stroke="#10B981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="24" cy="20" r="3" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1.2"/>
  <path d="M16 34L20 38L24 34" stroke="#10B981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`),

  // Crypto provider icons
  'bitcoin': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="12" stroke="#F7931A" stroke-width="1.8" fill="none"/>
  <text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="14" fill="#F7931A">B</text>
  <line x1="21" y1="14" x2="21" y2="18" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="27" y1="14" x2="27" y2="18" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="21" y1="30" x2="21" y2="34" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="27" y1="30" x2="27" y2="34" stroke="#F7931A" stroke-width="1.5" stroke-linecap="round"/>
</svg>`),
  'ethereum': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <path d="M24 10L34 24L24 30L14 24Z" stroke="#627EEA" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
  <path d="M24 30L34 24L24 38L14 24Z" fill="#627EEA" fill-opacity="0.15" stroke="#627EEA" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`),
  'usdt': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <circle cx="24" cy="24" r="12" stroke="#26A17B" stroke-width="1.8" fill="none"/>
  <text x="24" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="10" fill="#26A17B">T</text>
  <line x1="20" y1="20" x2="28" y2="20" stroke="#26A17B" stroke-width="2" stroke-linecap="round"/>
</svg>`),

  // General Service Icons
  'y-net-internet': svgToDataUrl(yNetInternetSvg),
  'sabafon-internet': svgToDataUrl(sabafonInternetSvg),
  'gift-cards': svgToDataUrl(giftCardsProductSvg),

  // New Category Icons
  'providers-category': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="8" y="12" width="32" height="24" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <circle cx="18" cy="22" r="4" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <path d="M12 32C12 28 14.5 26 18 26C21.5 26 24 28 24 32" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <circle cx="30" cy="22" r="4" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <path d="M24 32C24 28 26.5 26 30 26C33.5 26 36 28 36 32" stroke="#5C1A1B" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M18 10V14" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M30 10V14" stroke="#5C1A1B" stroke-width="1.5" stroke-linecap="round"/>
</svg>`),
  'wallet-services-category': svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="white"/>
  <rect x="8" y="16" width="28" height="20" rx="3" stroke="#1a1a1a" stroke-width="1.8" fill="none"/>
  <path d="M8 22H36" stroke="#1a1a1a" stroke-width="1.5"/>
  <rect x="28" y="24" width="8" height="6" rx="2" stroke="#1a1a1a" stroke-width="1.5" fill="none"/>
  <circle cx="32" cy="27" r="1.2" fill="#1a1a1a"/>
  <path d="M12 10H20" stroke="#5C1A1B" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M16 7V13" stroke="#5C1A1B" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="36" cy="12" r="3" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <path d="M35 12H37" stroke="#5C1A1B" stroke-width="1.2" stroke-linecap="round"/>
</svg>`),
};

/**
 * Helper to get an icon by key with optional fallback
 */
export function getProductIcon(key: string, fallback: string = 'pubg'): string {
  return productIcons[key] || productIcons[fallback] || '';
}

/**
 * All available product icon keys
 */
export const productIconKeys = Object.keys(productIcons);
