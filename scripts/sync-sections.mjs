#!/usr/bin/env node
/**
 * sync-sections.mjs — Prebuild script
 * South Wallet — fetches the app structure (sections, sub_sections,
 * service_providers, product_packages, escrow_categories, usdt_categories,
 * investment_plans) from Supabase and writes it to public/data/sections.json
 * so the static export bundles the structure inside the APK.
 *
 * This makes the app load instantly on first paint (no Supabase round-trip
 * required for structure). Realtime subscriptions still push admin changes
 * (visibility toggles, new sections, etc.) at runtime — the JSON is just
 * a "boot loader" so the first render is fast.
 *
 * Usage:
 *   node scripts/sync-sections.mjs
 *
 * Or via package.json:
 *   "prebuild": "node scripts/sync-sections.mjs"
 */

import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase config (anon key is safe to ship — RLS allows public read on these tables)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://kifmxseonkdsxuanznny.supabase.co';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZm14c2Vvbmtkc3h1YW56bm55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk3NzAsImV4cCI6MjA5NzA0NTc3MH0.4KbBtMruP_xrPiHe_XtcoHG7NVQhlflhUUkJFWgQxkM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false },
});

const OUT_FILE = resolve(__dirname, '..', 'public', 'data', 'sections.json');

async function fetchAll(table, select = '*', orderBy = 'sort_order', limit = 1000) {
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .order(orderBy, { ascending: true })
    .limit(limit);
  if (error) {
    console.warn(`[sync-sections] WARNING: failed to fetch ${table}:`, error.message);
    return [];
  }
  return data || [];
}

async function main() {
  console.log('[sync-sections] Fetching app structure from Supabase...');

  const [
    sections,
    sub_sections,
    service_providers,
    product_packages,
    api_providers,
    api_games,
    api_categories,
    api_game_catalogues,
    escrow_categories,
    usdt_categories,
    investment_plans,
    wallet_addresses,
    banners,
    banks,
    exchange_rates,
  ] = await Promise.all([
    fetchAll('sections'),
    fetchAll('sub_sections'),
    fetchAll('service_providers'),
    fetchAll('product_packages'),
    fetchAll('api_providers'),
    fetchAll('api_games'),
    fetchAll('api_categories'),
    fetchAll('api_game_catalogues'),
    fetchAll('escrow_categories'),
    fetchAll('usdt_categories'),
    fetchAll('investment_plans'),
    fetchAll('wallet_addresses', '*', 'currency'),
    fetchAll('banners'),
    fetchAll('banks'),
    fetchAll('exchange_rates', '*', 'updated_at'),
  ]);

  const payload = {
    _meta: {
      generated_at: new Date().toISOString(),
      version: 1,
      counts: {
        sections: sections.length,
        sub_sections: sub_sections.length,
        service_providers: service_providers.length,
        product_packages: product_packages.length,
        api_providers: api_providers.length,
        api_games: api_games.length,
        api_categories: api_categories.length,
        api_game_catalogues: api_game_catalogues.length,
        escrow_categories: escrow_categories.length,
        usdt_categories: usdt_categories.length,
        investment_plans: investment_plans.length,
        wallet_addresses: wallet_addresses.length,
        banners: banners.length,
        banks: banks.length,
        exchange_rates: exchange_rates.length,
      },
    },
    sections,
    sub_sections,
    service_providers,
    product_packages,
    api_providers,
    api_games,
    api_categories,
    api_game_catalogues,
    escrow_categories,
    usdt_categories,
    investment_plans,
    wallet_addresses,
    banners,
    banks,
    exchange_rates,
  };

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2), 'utf8');

  const sizeKB = (JSON.stringify(payload).length / 1024).toFixed(1);
  console.log(`[sync-sections] ✓ Wrote ${OUT_FILE}`);
  console.log(`[sync-sections]   Total size: ${sizeKB} KB`);
  console.log(`[sync-sections]   Counts:`, payload._meta.counts);
}

main().catch((err) => {
  console.error('[sync-sections] FAILED:', err);
  // Don't fail the build — the app falls back to runtime fetch if the JSON is missing
  process.exit(0);
});
