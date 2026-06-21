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
// Tries static catalog first; if empty, fetches from G2Bulk API on demand.
// This keeps the APK small (no 4643 catalogues bundled) while still
// showing packages instantly for cached games.
const catalogueCache: Record<string, G2BulkCatalogue[]> = {};

export function getGameCatalogue(gameCode: string): G2BulkCatalogue[] {
  // Check static catalog first
  const staticCat = catalog.catalogues?.[gameCode] || [];
  if (staticCat.length > 0) {
    return staticCat.map((c: any) => ({
      id: c.id,
      name: c.name,
      amount: c.amount,
    }));
  }
  // Check runtime cache
  if (catalogueCache[gameCode]) {
    return catalogueCache[gameCode];
  }
  return []; // Will be fetched on demand via fetchGameCatalogue()
}

// Fetch catalogue from G2Bulk API on demand (called from games-screen)
export async function fetchGameCatalogue(gameCode: string): Promise<G2BulkCatalogue[]> {
  // Check cache first
  if (catalogueCache[gameCode]) {
    return catalogueCache[gameCode];
  }

  try {
    // Use the qt-game-api proxy (no API key in client)
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk3NzAsImV4cCI6MjA5NzA0NTc3MH0.4KbBtMruP_xrPiHe_XtcoHG7NVQhlflhUUkJFWgQxkM';
    const res = await fetch(
      `https://kifmxseonkdsxuanznny.functions.supabase.co/g2bulk-proxy/v1/games/${gameCode}/catalogue`,
      {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const cats: G2BulkCatalogue[] = (data.catalogues || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      amount: c.amount,
    }));
    // Cache for future use
    catalogueCache[gameCode] = cats;
    return cats;
  } catch {
    return [];
  }
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

// ─── Filter categories by type (gift cards, streaming, etc.) ────────
export function getCategoriesByType(type: 'gift' | 'streaming' | 'shopping'): G2BulkCategory[] {
  const all = getAllCategories();
  const keywords: Record<string, string[]> = {
    gift: ['itunes', 'google play', 'amazon', 'psn', 'playstation', 'steam', 'gift', 'card'],
    streaming: ['netflix', 'spotify', 'youtube', 'disney', 'shahid', 'subscription'],
    shopping: ['ebay', 'aliexpress', 'shopping'],
  };
  const kw = keywords[type] || [];
  return all.filter(c => {
    const title = (c.title || '').toLowerCase();
    return kw.some(k => title.includes(k));
  });
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