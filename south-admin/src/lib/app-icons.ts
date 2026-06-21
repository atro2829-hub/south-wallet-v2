// =====================================================================
// app-icons.ts — South Wallet custom flat-design icons.
// Inspired by Jaib's icon style: flat, minimalist, maroon accent.
// Each icon is an SVG data URL that renders crisply at any size.
// =====================================================================

// Helper: convert SVG string to data URL
function svg(svgString: string): string {
  return `data:image/svg+xml;base64,${typeof window !== 'undefined' ? btoa(svgString) : Buffer.from(svgString).toString('base64')}`;
}

// Brand color
const MAROON = '#5C1A1B';
const MAROON_LIGHT = '#8B3A3B';
const WHITE = '#FFFFFF';
const ACCENT = '#C41E3A';

// ─── Recharge (شحن رصيد) — phone with signal ───────────────────────
const rechargeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="14" y="6" width="20" height="36" rx="4" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <rect x="18" y="10" width="12" height="22" rx="1" fill="${MAROON}" opacity="0.1"/>
  <circle cx="24" cy="37" r="2" fill="${MAROON}"/>
  <path d="M20 18 L24 14 L28 18" stroke="${MAROON}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M20 24 L24 20 L28 24" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// ─── Games (الألعاب) — game controller ──────────────────────────────
const gamesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M16 18 C10 18 6 22 6 28 C6 34 10 38 14 38 C16 38 18 36 20 34 L28 34 C30 36 32 38 34 38 C38 38 42 34 42 28 C42 22 38 18 32 18 Z" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="15" cy="27" r="2.5" fill="${MAROON}"/>
  <circle cx="33" cy="25" r="2" fill="${ACCENT}"/>
  <circle cx="37" cy="29" r="2" fill="${ACCENT}"/>
  <path d="M14 24 L14 27 M12 27 L16 27" stroke="${MAROON}" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ─── Transfer (تحويل) — two arrows ──────────────────────────────────
const transferSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M12 18 L36 18 M30 12 L36 18 L30 24" stroke="${MAROON}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M36 30 L12 30 M18 24 L12 30 L18 36" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// ─── Deposit (إيداع) — down arrow into wallet ───────────────────────
const depositSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="20" width="32" height="22" rx="4" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <path d="M24 8 L24 24 M18 18 L24 24 L30 18" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="32" cy="31" r="3" fill="${MAROON}"/>
</svg>`;

// ─── USDT — dollar in circle ────────────────────────────────────────
const usdtSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="18" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <path d="M24 14 L24 34 M18 19 C18 16 21 15 24 15 C27 15 30 16 30 19 C30 22 27 23 24 23 C21 23 18 24 18 27 C18 30 21 31 24 31 C27 31 30 30 30 27" stroke="${MAROON}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M21 12 L24 14 L27 12" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M21 36 L24 34 L27 36" stroke="${ACCENT}" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

// ─── Escrow (وسيط وضمان) — shield with check ───────────────────────
const escrowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M24 6 L40 12 L40 26 C40 34 33 40 24 44 C15 40 8 34 8 26 L8 12 Z" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M17 24 L22 29 L31 19" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// ─── Investment (استثمار) — upward chart ───────────────────────────
const investmentSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="8" y="8" width="32" height="32" rx="4" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <path d="M14 30 L20 24 L26 27 L34 16" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M30 16 L34 16 L34 20" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="14" cy="30" r="2" fill="${MAROON}"/>
  <circle cx="20" cy="24" r="2" fill="${MAROON}"/>
  <circle cx="26" cy="27" r="2" fill="${MAROON}"/>
</svg>`;

// ─── Exchange (صرافة) — two circular arrows ────────────────────────
const exchangeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M14 16 C14 12 18 8 24 8 C30 8 34 12 34 16" stroke="${MAROON}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M30 12 L34 16 L30 20" stroke="${MAROON}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M34 32 C34 36 30 40 24 40 C18 40 14 36 14 32" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <path d="M18 36 L14 32 L18 28" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <text x="24" y="27" text-anchor="middle" font-size="10" font-weight="bold" fill="${MAROON}">$</text>
</svg>`;

// ─── Support (الدعم) — headset ──────────────────────────────────────
const supportSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M12 26 C12 18 17 12 24 12 C31 12 36 18 36 26" stroke="${MAROON}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <rect x="8" y="24" width="8" height="12" rx="3" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <rect x="32" y="24" width="8" height="12" rx="3" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <path d="M32 34 C32 38 28 40 24 40" stroke="${ACCENT}" stroke-width="2.5" stroke-linecap="round" fill="none"/>
  <circle cx="32" cy="34" r="3" fill="${ACCENT}"/>
</svg>`;

// ─── Gift Cards (بطاقات وأكواد) — gift box ──────────────────────────
const giftCardsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="6" y="16" width="36" height="26" rx="3" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5"/>
  <path d="M6 24 L42 24" stroke="${MAROON}" stroke-width="2"/>
  <path d="M24 16 L24 42" stroke="${MAROON}" stroke-width="2"/>
  <path d="M18 16 C14 16 12 12 14 10 C16 8 20 10 24 16 C28 10 32 8 34 10 C36 12 34 16 30 16 Z" fill="${ACCENT}"/>
  <circle cx="24" cy="30" r="2" fill="${MAROON}"/>
</svg>`;

// ─── Favorites (المفضلة) — heart ────────────────────────────────────
const favoritesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <path d="M24 40 C24 40 8 30 8 18 C8 12 13 8 18 8 C21 8 23 10 24 12 C25 10 27 8 30 8 C35 8 40 12 40 18 C40 30 24 40 24 40 Z" fill="${WHITE}" stroke="${MAROON}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M24 36 C24 36 12 28 12 19 C12 15 15 12 18 12 C20 12 22 14 24 17 C26 14 28 12 30 12 C33 12 36 15 36 19 C36 28 24 36 24 36 Z" fill="${ACCENT}" opacity="0.3"/>
</svg>`;

// ─── Export all icons as data URLs ──────────────────────────────────
export const appIcons: Record<string, string> = {
  recharge: svg(rechargeSvg),
  games: svg(gamesSvg),
  transfer: svg(transferSvg),
  deposit: svg(depositSvg),
  usdt: svg(usdtSvg),
  escrow: svg(escrowSvg),
  investment: svg(investmentSvg),
  exchange: svg(exchangeSvg),
  support: svg(supportSvg),
  'gift-cards': svg(giftCardsSvg),
  favorites: svg(favoritesSvg),
};

// Helper to get an icon by key
export function getAppIcon(key: string): string {
  return appIcons[key] || appIcons.recharge;
}