/**
 * Service Icons for محفظة الجنوب (South Wallet)
 * 
 * Theme-consistent design:
 * - Primary color (#5C1A1B) for all strokes with 2px stroke width
 * - Soft maroon backgrounds (#FDF0F0) with rounded corners (rx=14)
 * - Brand-specific accent colors kept for telecom logos
 * - 48x48 viewBox, consistent 2px stroke width
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ─── Home Services (9 icons) ────────────────────────────────────────

const instantPaySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="24" cy="24" r="14" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M26 12L18 26H23L22 36L30 22H25L26 12Z" fill="#5C1A1B" stroke="#5C1A1B" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

const transferSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M14 18C14 18 18 12 28 12C34 12 36 15 36 15" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M33 11L37 15.5L32.5 18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M34 30C34 30 30 36 20 36C14 36 12 33 12 33" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
  <path d="M15 37L11 32.5L15.5 30" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.6"/>
  <circle cx="24" cy="24" r="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
</svg>`;

const walletTransferSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="16" width="28" height="20" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M8 22H36" stroke="#5C1A1B" stroke-width="2"/>
  <rect x="28" y="24" width="8" height="6" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="32" cy="27" r="1.2" fill="#5C1A1B"/>
  <path d="M33 10L39 16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M39 10L33 16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M36 8V18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const rechargeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="16" y="10" width="16" height="28" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="21" y1="12" x2="27" y2="12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#5C1A1B"/>
  <path d="M12 16C10 18 9 20 9 22" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M9 12C6 15 5 19 5 22" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

const appStoreSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M12 20L16 10H32L36 20" stroke="#5C1A1B" stroke-width="2" stroke-linejoin="round" fill="none"/>
  <rect x="10" y="20" width="28" height="20" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="15" y="24" width="5" height="5" rx="1.5" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <rect x="21.5" y="24" width="5" height="5" rx="1.5" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <rect x="28" y="24" width="5" height="5" rx="1.5" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <rect x="15" y="31" width="5" height="5" rx="1.5" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <rect x="21.5" y="31" width="5" height="5" rx="1.5" fill="#5C1A1B" stroke="#5C1A1B" stroke-width="1.5"/>
  <rect x="28" y="31" width="5" height="5" rx="1.5" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
</svg>`;

const instantChargeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="15" y="8" width="18" height="32" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="21" y1="10" x2="27" y2="10" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M27 18L22 26H26L21 34" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const healthSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 8C18 8 10 13 10 22C10 32 24 40 24 40C24 40 38 32 38 22C38 13 30 8 24 8Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="20" y="18" width="8" height="3" rx="1" fill="#5C1A1B"/>
  <rect x="22.5" y="15.5" width="3" height="8" rx="1" fill="#5C1A1B"/>
</svg>`;

const gamesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M8 22C8 16 12 14 16 14H32C36 14 40 16 40 22C40 28 38 36 32 36C28 36 26 32 24 32C22 32 20 36 16 36C10 36 8 28 8 22Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="13" y1="22" x2="13" y2="28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="10" y1="25" x2="16" y2="25" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="33" cy="22" r="2.5" fill="#5C1A1B" fill-opacity="0.3"/>
  <circle cx="30" cy="26" r="1.8" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <circle cx="36" cy="26" r="1.8" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
</svg>`;

const digitalWalletSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="18" width="28" height="18" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="28" y="24" width="8" height="6" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="32" cy="27" r="1.2" fill="#5C1A1B"/>
  <path d="M18 18V14C18 12 20 10 22 10" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M24 9C26 9 28 10.5 28 12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M36 10C37.5 8.5 38 7 37 6" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M39 8C40.5 6.5 41 5 40 4" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M33 12C34.5 10.5 35 9 34 8" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
</svg>`;

// ─── Telecom Companies (5 icons) ────────────────────────────────────

const yemenMobileSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="15" y="10" width="18" height="28" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="20" y1="12" x2="28" y2="12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#5C1A1B"/>
  <text x="24" y="27" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="8" fill="#5C1A1B">YM</text>
  <path d="M10 14C8.5 16 8 18 8 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M7 11C5 14 4.5 17 4 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M38 14C39.5 16 40 18 40 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M41 11C43 14 43.5 17 44 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
</svg>`;

const yoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="15" y="10" width="18" height="28" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="20" y1="12" x2="28" y2="12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#5C1A1B"/>
  <circle cx="24" cy="23" r="6" stroke="#FF6B00" stroke-width="2" fill="none"/>
  <text x="24" y="26" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="7" fill="#FF6B00">Yo</text>
</svg>`;

const sabafonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="15" y="10" width="18" height="28" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="20" y1="12" x2="28" y2="12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#5C1A1B"/>
  <path d="M24 16L30 23L24 30L18 23Z" stroke="#2563EB" stroke-width="2" fill="none" stroke-linejoin="round"/>
  <path d="M24 19L27.5 23L24 27L20.5 23Z" fill="#2563EB" fill-opacity="0.2"/>
</svg>`;

const ySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="15" y="10" width="18" height="28" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="20" y1="12" x2="28" y2="12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#5C1A1B"/>
  <path d="M19 16L24 24L29 16" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="24" y1="24" x2="24" y2="32" stroke="#059669" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const yemenNetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="14" width="26" height="18" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="21" y1="32" x2="21" y2="36" stroke="#5C1A1B" stroke-width="2"/>
  <line x1="14" y1="36" x2="28" y2="36" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M33 10C34.5 8.5 35 7 34 6" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M36 8C37.5 6.5 38 5 37 4" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M30 12C31.5 10.5 32 9 31 8" stroke="#8B5CF6" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="21" cy="23" r="2" fill="#8B5CF6"/>
</svg>`;

// ─── Services Screen (5 icons) ──────────────────────────────────────

const payBillSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M14 6H34V40C34 41 33 42 32 42H16C15 42 14 41 14 40V6Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M14 6C14 6 16 4 24 4C32 4 34 6 34 6" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="18" y1="16" x2="30" y2="16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="21" x2="30" y2="21" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="26" x2="26" y2="26" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M26 30L29 33L35 27" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const transferIntlSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="24" cy="24" r="13" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <ellipse cx="24" cy="24" rx="6" ry="13" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <line x1="11" y1="20" x2="37" y2="20" stroke="#5C1A1B" stroke-width="1.5"/>
  <line x1="11" y1="28" x2="37" y2="28" stroke="#5C1A1B" stroke-width="1.5"/>
  <path d="M37 10L41 14L37 18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M11 30L7 34L11 38" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const printReceiptSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="14" y="6" width="20" height="14" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="8" y="20" width="32" height="14" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="16" y="30" width="16" height="12" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="20" y1="34" x2="28" y2="34" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="20" y1="38" x2="26" y2="38" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <rect x="18" y="23" width="4" height="3" rx="1" fill="#5C1A1B"/>
  <rect x="26" y="23" width="4" height="3" rx="1" fill="#5C1A1B"/>
</svg>`;

const payBillsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="12" y="8" width="20" height="28" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="16" y="12" width="20" height="28" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="20" y="8" width="18" height="32" rx="3" stroke="#5C1A1B" stroke-width="2" fill="#FDF0F0"/>
  <line x1="24" y1="15" x2="34" y2="15" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="20" x2="34" y2="20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="24" y1="25" x2="31" y2="25" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <rect x="24" y="29" width="10" height="6" rx="1.5" fill="#5C1A1B" fill-opacity="0.2" stroke="#5C1A1B" stroke-width="1.5"/>
</svg>`;

const transferAccountSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="20" cy="17" r="6" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M10 34C10 28 14 24 20 24C26 24 30 28 30 34" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M32 18L38 24L32 30" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="28" y1="24" x2="38" y2="24" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

// ─── Games & Entertainment (3 icons) ────────────────────────────────

const pubgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 8C18 8 13 13 13 19V24L16 28H32L35 24V19C35 13 30 8 24 8Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="13" y1="22" x2="35" y2="22" stroke="#5C1A1B" stroke-width="2"/>
  <rect x="20" y="28" width="8" height="4" rx="1.5" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M18 32L16 38" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M30 32L32 38" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="20" cy="16" r="2" fill="#5C1A1B" fill-opacity="0.5"/>
  <circle cx="28" cy="16" r="2" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <circle cx="24" cy="13" r="1" fill="#5C1A1B"/>
</svg>`;

const freefireSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 8C20 14 14 16 14 26C14 32 18 38 24 38C30 38 34 32 34 26C34 16 28 14 24 8Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M24 16C22 20 19 21 19 27C19 30 21 34 24 34C27 34 29 30 29 27C29 21 26 20 24 16Z" fill="#5C1A1B" fill-opacity="0.15" stroke="#5C1A1B" stroke-width="2"/>
  <path d="M24 22C23 24 22 25 22 28C22 29.5 23 31 24 31C25 31 26 29.5 26 28C26 25 25 24 24 22Z" fill="#5C1A1B" fill-opacity="0.4"/>
</svg>`;

const giftCardsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="18" width="32" height="22" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="8" y1="26" x2="40" y2="26" stroke="#5C1A1B" stroke-width="2"/>
  <path d="M20 18C20 14 24 10 24 14C24 10 28 14 28 18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <line x1="24" y1="14" x2="24" y2="18" stroke="#5C1A1B" stroke-width="2"/>
  <circle cx="34" cy="22" r="2" fill="#5C1A1B" fill-opacity="0.4"/>
</svg>`;

// ─── Other (3 icons) ────────────────────────────────────────────────

const supportSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M12 24V20C12 13.4 17.4 8 24 8C30.6 8 36 13.4 36 20V24" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <rect x="8" y="24" width="6" height="10" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="34" y="24" width="6" height="10" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M36 34V36C36 38 34 40 32 40H28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="24" cy="40" r="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M22.5 39.5L24 41.5L26 38.5" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const offersSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M12 8L36 8L40 24L36 40L12 40L8 24L12 8Z" stroke="#5C1A1B" stroke-width="2" fill="none" stroke-linejoin="round"/>
  <line x1="14" y1="18" x2="34" y2="18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="14" y1="24" x2="30" y2="24" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="14" y1="30" x2="26" y2="30" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="32" cy="30" r="4" fill="#5C1A1B" fill-opacity="0.15" stroke="#5C1A1B" stroke-width="2"/>
  <text x="32" y="32.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="6" fill="#5C1A1B">%</text>
</svg>`;

const ordersSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="12" y="6" width="24" height="36" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="18" y="4" width="12" height="6" rx="2" stroke="#5C1A1B" stroke-width="2" fill="#FDF0F0"/>
  <line x1="18" y1="18" x2="30" y2="18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="24" x2="30" y2="24" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="30" x2="30" y2="30" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 17L22 19L26 15" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M20 23L22 25L26 21" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

// ─── Additional Service Icons ────────────────────────────────────────

const depositSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="18" width="28" height="18" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="28" y="24" width="8" height="6" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="32" cy="27" r="1.2" fill="#5C1A1B"/>
  <path d="M24 8V16" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M20 12L24 8L28 12" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M18 16H30" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const exchangeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="24" cy="24" r="12" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <text x="24" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="10" fill="#5C1A1B">$</text>
  <path d="M16 14L12 18L16 22" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M12 18H20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 26L36 30L32 34" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M36 30H28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const savingsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 10C17 10 12 15 12 20C12 25 16 28 16 28V36C16 37.5 17 38 18 38H30C31 38 32 37.5 32 36V28C32 28 36 25 36 20C36 15 31 10 24 10Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="16" y1="28" x2="32" y2="28" stroke="#5C1A1B" stroke-width="2"/>
  <circle cx="24" cy="20" r="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <text x="24" y="23" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="7" fill="#5C1A1B">$</text>
  <path d="M21 34H27" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ─── Service Providers & Wallet Services Category Icons ─────────────

const providersSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="12" width="32" height="24" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="18" cy="22" r="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M12 32C12 28 14.5 26 18 26C21.5 26 24 28 24 32" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <circle cx="30" cy="22" r="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M24 32C24 28 26.5 26 30 26C33.5 26 36 28 36 32" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M18 10V14" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M30 10V14" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const walletServicesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="8" y="16" width="28" height="20" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M8 22H36" stroke="#5C1A1B" stroke-width="2"/>
  <rect x="28" y="24" width="8" height="6" rx="2" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="32" cy="27" r="1.2" fill="#5C1A1B"/>
  <path d="M12 10H20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M16 7V13" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="36" cy="12" r="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M35 12H37" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ─── Category Icons (for sections without custom icons) ──────────────

const telecomCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="15" y="10" width="18" height="28" rx="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="20" y1="12" x2="28" y2="12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="34" r="1.5" fill="#5C1A1B"/>
  <path d="M10 14C8.5 16 8 18 8 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M7 11C5 14 4.5 17 4 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M38 14C39.5 16 40 18 40 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <path d="M41 11C43 14 43.5 17 44 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
  <circle cx="24" cy="24" r="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
</svg>`;

const internetCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="24" cy="24" r="14" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <ellipse cx="24" cy="24" rx="6" ry="14" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <line x1="10" y1="20" x2="38" y2="20" stroke="#5C1A1B" stroke-width="1.5"/>
  <line x1="10" y1="28" x2="38" y2="28" stroke="#5C1A1B" stroke-width="1.5"/>
  <path d="M14 14L18 18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M34 14L30 18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="24" cy="24" r="2" fill="#5C1A1B"/>
</svg>`;

const electricityCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M26 8L18 22H23L22 36L30 22H25L26 8Z" fill="#5C1A1B" stroke="#5C1A1B" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="18" cy="32" r="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="30" cy="32" r="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="18" y1="35" x2="18" y2="38" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="30" y1="35" x2="30" y2="38" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const governmentCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 8L8 18H40L24 8Z" stroke="#5C1A1B" stroke-width="2" stroke-linejoin="round" fill="none"/>
  <rect x="10" y="18" width="28" height="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="12" y="22" width="4" height="14" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="22" y="22" width="4" height="14" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="32" y="22" width="4" height="14" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="8" y="36" width="32" height="4" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <circle cx="24" cy="13" r="2" fill="#5C1A1B"/>
</svg>`;

const cryptoCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="24" cy="24" r="12" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M20 18V30" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M28 18V30" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 22H28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 26H28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M16 12L12 16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 12L36 16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <circle cx="12" cy="16" r="2" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
  <circle cx="36" cy="16" r="2" stroke="#5C1A1B" stroke-width="1.5" fill="none"/>
</svg>`;

const cryptoInvestCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="20" cy="20" r="8" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M18 16V24" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M22 16V24" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M18 19H22" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M28 14L36 10" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M28 20L36 16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M36 10L38 12L36 14L38 16L36 18" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M14 28L10 36" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M20 28L16 36" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M26 28L22 36" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 28L28 36" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M10 36H28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ─── Default/Fallback Category Icons ─────────────────────────────────

const defaultCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="10" y="10" width="12" height="12" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="26" y="10" width="12" height="12" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="10" y="26" width="12" height="12" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <rect x="26" y="26" width="12" height="12" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
</svg>`;

const manualCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <rect x="12" y="8" width="24" height="32" rx="3" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <line x1="18" y1="16" x2="30" y2="16" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="22" x2="30" y2="22" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="28" x2="26" y2="28" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const apiCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 10L36 17V31L24 38L12 31V17L24 10Z" stroke="#5C1A1B" stroke-width="2" stroke-linejoin="round" fill="none"/>
  <path d="M24 10V38" stroke="#5C1A1B" stroke-width="1.5"/>
  <path d="M12 17L36 31" stroke="#5C1A1B" stroke-width="1.5"/>
  <path d="M36 17L12 31" stroke="#5C1A1B" stroke-width="1.5"/>
  <circle cx="24" cy="24" r="3" fill="#5C1A1B" fill-opacity="0.3" stroke="#5C1A1B" stroke-width="1.5"/>
</svg>`;

const escrowCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M24 8L12 14V24C12 32 17.5 38 24 40C30.5 38 36 32 36 24V14L24 8Z" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <path d="M19 24L22 27L29 20" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const investmentCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M10 36L18 22L24 28L32 14L38 18" stroke="#5C1A1B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="18" cy="22" r="2" fill="#5C1A1B"/>
  <circle cx="32" cy="14" r="2" fill="#5C1A1B"/>
  <line x1="10" y1="36" x2="38" y2="36" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const usdtCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <circle cx="24" cy="24" r="12" stroke="#5C1A1B" stroke-width="2" fill="none"/>
  <text x="24" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="9" fill="#5C1A1B">₮</text>
  <path d="M24 8V12" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
  <path d="M24 36V40" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const linkCategorySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
  <rect x="2" y="2" width="44" height="44" rx="14" fill="#FDF0F0"/>
  <path d="M20 28L16 32C14 34 14 37 16 39C18 41 21 41 23 39L27 35" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M28 20L32 16C34 14 34 11 32 9C30 7 27 7 25 9L21 13" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M20 28L28 20" stroke="#5C1A1B" stroke-width="2" stroke-linecap="round"/>
</svg>`;

// ─── Export all icons ────────────────────────────────────────────────

export const serviceIcons: Record<string, string> = {
  // Home Services
  'instant-pay': svgToDataUrl(instantPaySvg),
  'transfer': svgToDataUrl(transferSvg),
  'wallet-transfer': svgToDataUrl(walletTransferSvg),
  'recharge': svgToDataUrl(rechargeSvg),
  'app-store': svgToDataUrl(appStoreSvg),
  'instant-charge': svgToDataUrl(instantChargeSvg),
  'health': svgToDataUrl(healthSvg),
  'games': svgToDataUrl(gamesSvg),
  'digital-wallet': svgToDataUrl(digitalWalletSvg),

  // Telecom Companies
  'yemen-mobile': svgToDataUrl(yemenMobileSvg),
  'yo': svgToDataUrl(yoSvg),
  'sabafon': svgToDataUrl(sabafonSvg),
  'y': svgToDataUrl(ySvg),
  'yemen-net': svgToDataUrl(yemenNetSvg),

  // Services Screen
  'pay-bill': svgToDataUrl(payBillSvg),
  'transfer-intl': svgToDataUrl(transferIntlSvg),
  'print-receipt': svgToDataUrl(printReceiptSvg),
  'pay-bills': svgToDataUrl(payBillsSvg),
  'transfer-account': svgToDataUrl(transferAccountSvg),

  // Games & Entertainment
  'pubg': svgToDataUrl(pubgSvg),
  'freefire': svgToDataUrl(freefireSvg),
  'gift-cards': svgToDataUrl(giftCardsSvg),

  // Other
  'support': svgToDataUrl(supportSvg),
  'offers': svgToDataUrl(offersSvg),
  'orders': svgToDataUrl(ordersSvg),

  // Additional Services
  'deposit': svgToDataUrl(depositSvg),
  'exchange': svgToDataUrl(exchangeSvg),
  'currency-exchange': svgToDataUrl(exchangeSvg),
  'savings': svgToDataUrl(savingsSvg),

  // Category Icons
  'providers': svgToDataUrl(providersSvg),
  'providers-category': svgToDataUrl(providersSvg),
  'wallet-services': svgToDataUrl(walletServicesSvg),
  'wallet-services-category': svgToDataUrl(walletServicesSvg),
  'telecom': svgToDataUrl(telecomCategorySvg),
  'telecom-category': svgToDataUrl(telecomCategorySvg),
  'internet': svgToDataUrl(internetCategorySvg),
  'internet-category': svgToDataUrl(internetCategorySvg),
  'electricity': svgToDataUrl(electricityCategorySvg),
  'electricity-category': svgToDataUrl(electricityCategorySvg),
  'government': svgToDataUrl(governmentCategorySvg),
  'government-category': svgToDataUrl(governmentCategorySvg),
  'crypto': svgToDataUrl(cryptoCategorySvg),
  'crypto-category': svgToDataUrl(cryptoCategorySvg),
  'crypto-invest': svgToDataUrl(cryptoInvestCategorySvg),
  'crypto-invest-category': svgToDataUrl(cryptoInvestCategorySvg),

  // Default/Fallback Category Icons
  'default': svgToDataUrl(defaultCategorySvg),
  'manual': svgToDataUrl(manualCategorySvg),
  'manual-category': svgToDataUrl(manualCategorySvg),
  'api': svgToDataUrl(apiCategorySvg),
  'api-category': svgToDataUrl(apiCategorySvg),
  'api-products': svgToDataUrl(apiCategorySvg),
  'api-games': svgToDataUrl(gamesSvg),
  'escrow': svgToDataUrl(escrowCategorySvg),
  'escrow-category': svgToDataUrl(escrowCategorySvg),
  'investment': svgToDataUrl(investmentCategorySvg),
  'investment-category': svgToDataUrl(investmentCategorySvg),
  'usdt': svgToDataUrl(usdtCategorySvg),
  'usdt-category': svgToDataUrl(usdtCategorySvg),
  'wallet': svgToDataUrl(walletServicesSvg),
  'link': svgToDataUrl(linkCategorySvg),
  'link-category': svgToDataUrl(linkCategorySvg),
};

/**
 * Helper to get an icon by key with optional fallback
 */
export function getServiceIcon(key: string, fallback: string = 'default'): string {
  return serviceIcons[key] || serviceIcons[fallback] || serviceIcons['default'] || '';
}

/**
 * All available icon keys
 */
export const serviceIconKeys = Object.keys(serviceIcons);
