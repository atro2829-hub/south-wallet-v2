// =====================================================================
// g2bulk-catalog.ts — Static G2Bulk catalog baked into the APK.
// South Wallet
// =====================================================================
// This module loads the static catalog (games, images, packages, prices)
// that was downloaded at build time and bundled into the APK.
//
// Only RUNTIME API calls (checkPlayerId, placeOrder, orderStatus) go
// through the qt-game-api edge function. Everything else is static.
// =====================================================================

import catalogData from '@/data/g2bulk-catalog.json';

export interface G2BulkGame {
  id: number;
  code: string;
  name: string;
  image_url: string;
  local_image: string;  // local path like /images/games/pubgm.png
  required_fields: string[];
  fields_notes: string;
  servers: Record<string, string>;
}

export interface G2BulkCatalogue {
  id: number;
  name: string;
  amount: number;  // cost price in USD
}

export interface G2BulkCategory {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  product_count: number;
}

const catalog = catalogData as any;

// ─── Games ──────────────────────────────────────────────────────────
export function getAllGames(): G2BulkGame[] {
  return (catalog.games || []).map((g: any) => ({
    id: g.id,
    code: g.code,
    name: g.name,
    image_url: g.image_url || '',
    local_image: g.local_image || g.image_url || '',
    required_fields: g.required_fields || [],
    fields_notes: g.fields_notes || '',
    servers: g.servers || {},
  }));
}

export function getGameByCode(code: string): G2BulkGame | null {
  const games = getAllGames();
  return games.find(g => g.code === code) || null;
}

// ─── Catalogues (packages) ──────────────────────────────────────────
export function getGameCatalogue(gameCode: string): G2BulkCatalogue[] {
  const catalogues = catalog.catalogues?.[gameCode] || [];
  return catalogues.map((c: any) => ({
    id: c.id,
    name: c.name,
    amount: c.amount,
  }));
}

// ─── Categories ─────────────────────────────────────────────────────
export function getAllCategories(): G2BulkCategory[] {
  return (catalog.categories || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    image_url: c.image_url || null,
    product_count: c.product_count || 0,
  }));
}

// ─── Price calculation with profit margin ───────────────────────────
// The margin comes from the database (api_providers.default_commission).
// The admin can change it from the G2Bulk panel in the admin app.
export function calculateSellPrice(costPrice: number, marginPercent: number): number {
  return Number((costPrice * (1 + marginPercent / 100)).toFixed(2));
}

// ─── Image URL helper ───────────────────────────────────────────────
// Images load from G2Bulk CDN (lazy loading) — NOT bundled in APK.
// This keeps the APK small (~10MB) while still showing game images.
export function getGameImageUrl(game: G2BulkGame): string {
  if (game.image_url) {
    return game.image_url.startsWith('http')
      ? game.image_url
      : `https://api.g2bulk.com${game.image_url}`;
  }
  return '';
}

// ─── Catalog metadata ───────────────────────────────────────────────
export function getCatalogMeta() {
  return catalog._meta || {};
}
