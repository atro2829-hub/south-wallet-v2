// محفظة الجنوب - South Wallet Products Data
// All products are now loaded dynamically from Supabase + API providers
// NO hardcoded products - everything is database-driven

export interface ProductItem {
  id: string;
  providerId: string;
  name: string;
  price: number;      // USD price (display and transactions in USD only)
  priceUSD: number;   // Original USD price
  currency: 'USD';
  executionType: 'manual' | 'auto' | 'api';
  isActive: boolean;
}

// All products now come from Supabase product_packages table
// Use supabaseService.getProductPackages() to get products for a provider

export function getProductsByProvider(providerId: string): ProductItem[] {
  // This function is now a placeholder - products are loaded from Supabase
  // Use useSupabaseSync or direct supabase queries instead
  return [];
}

export function getProductsByCategory(
  categoryId: string,
  providers: { id: string; categoryId: string }[]
): ProductItem[] {
  // This function is now a placeholder - products are loaded from Supabase
  // Use useSupabaseSync or direct supabase queries instead
  return [];
}
