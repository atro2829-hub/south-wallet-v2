// API Providers Service - محفظة الجنوب
// Multi-provider support for game top-up, digital products, and services
// Uses Supabase for storage - NO Firebase

import { supabase } from './supabase';

// ===== Constants =====
export const G2BULK_API_KEY = process.env.NEXT_PUBLIC_G2BULK_API_KEY || '';
export const G2BULK_BASE_URL = 'https://api.g2bulk.com';

// ===== Types =====

export interface ApiProvider {
  id: string;
  name: string;
  nameAr: string;
  type: 'g2bulk' | 'custom';
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
  markupPercent: number;
  supportsProducts: boolean;
  supportsGames: boolean;
  lastSync: string | null;
  balance: number;
  balanceCurrency: string;
  description: string;
  descriptionAr: string;
  logo: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  // Custom headers for other APIs
  authHeaderName: string; // e.g., 'X-API-Key', 'Authorization', 'Bearer'
  authHeaderPrefix: string; // e.g., '', 'Bearer ', 'Key '
}

export interface ApiCategory {
  id: number;
  title: string;
  description: string;
  image_url: string | null;
  product_count: number;
  provider_id: string;
  enabled: boolean;
  custom_name?: string;
  custom_nameAr?: string;
}

export interface ApiProduct {
  id: number;
  title: string;
  description: string;
  category_id: number;
  category_title: string;
  unit_price: number;
  image_url: string | null;
  stock: number;
  provider_id: string;
  enabled: boolean;
  custom_price?: number;
  markupPercent?: number;
}

export interface ApiGame {
  id: number;
  code: string;
  name: string;
  image_url: string;
  provider_id: string;
  enabled: boolean;
}

export interface ApiGameCatalogue {
  id: number;
  name: string;
  amount: number;
  provider_id: string;
}

export interface ApiGameFields {
  fields: string[];
  notes: string;
}

export interface ApiGameServer {
  [regionName: string]: string;
}

export interface PurchaseResult {
  success: boolean;
  order_id?: number;
  transaction_id?: number;
  product_id?: number;
  product_title?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  delivery_items?: string[] | null;
  poll_url?: string | null;
  message?: string;
}

export interface GameOrderResult {
  success: boolean;
  message: string;
  order: {
    order_id: number;
    game: string;
    catalogue: string;
    player_id: string;
    player_name?: string;
    price: number;
    status: string;
    callback_url?: string;
  };
}

export interface OrderStatus {
  order_id: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  delivery_items?: string[] | null;
  message?: string;
}

export interface ProviderBalance {
  success: boolean;
  user_id?: number;
  username?: string;
  balance: number;
  currency?: string;
}

// ===== Provider CRUD (Supabase) =====

export async function getApiProviders(): Promise<ApiProvider[]> {
  const { data, error } = await supabase
    .from('api_providers')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching API providers:', error);
    return [];
  }

  return (data || []).map(mapDbProviderToApiProvider);
}

export async function getApiProvider(providerId: string): Promise<ApiProvider | null> {
  const { data, error } = await supabase
    .from('api_providers')
    .select('*')
    .eq('id', providerId)
    .single();

  if (error) {
    console.error('Error fetching API provider:', error);
    return null;
  }

  return data ? mapDbProviderToApiProvider(data) : null;
}

export async function saveApiProvider(provider: Partial<ApiProvider> & { name: string }): Promise<string> {
  const now = new Date().toISOString();
  const dbData = mapApiProviderToDb(provider, now);

  if (provider.id) {
    // Update existing provider
    const { data, error } = await supabase
      .from('api_providers')
      .update(dbData)
      .eq('id', provider.id)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } else {
    // Create new provider
    const { data, error } = await supabase
      .from('api_providers')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }
}

export async function deleteApiProvider(providerId: string): Promise<void> {
  // Also clean up cached data
  await supabase.from('api_categories').delete().eq('api_provider_id', providerId);

  const { error } = await supabase.from('api_providers').delete().eq('id', providerId);
  if (error) throw error;
}

export async function toggleApiProvider(providerId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('api_providers')
    .update({ is_active: enabled, updated_at: new Date().toISOString() })
    .eq('id', providerId);

  if (error) throw error;
}

// ===== Generic API Request =====

async function apiRequest<T>(
  provider: ApiProvider,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const headerName = provider.authHeaderName || 'X-API-Key';
  const headerPrefix = provider.authHeaderPrefix || '';

  const headers: Record<string, string> = {
    [headerName]: `${headerPrefix}${provider.apiKey}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = { method, headers };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  const baseUrl = provider.baseUrl.replace(/\/$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.success === false) {
    throw new Error(data.message || data.detail?.message || 'API request failed');
  }
  return data as T;
}

// ===== G2Bulk Specific Functions =====

export async function getG2BulkBalance(provider: ApiProvider): Promise<ProviderBalance> {
  try {
    const data = await apiRequest<any>(provider, '/v1/getMe');
    return {
      success: data.success ?? true,
      user_id: data.user_id,
      username: data.username,
      balance: data.balance ?? 0,
      currency: 'USD',
    };
  } catch (error: any) {
    return {
      success: false,
      balance: 0,
      currency: 'USD',
    };
  }
}

export async function syncG2BulkCategories(provider: ApiProvider): Promise<ApiCategory[]> {
  const data = await apiRequest<{ success: boolean; categories: any[] }>(provider, '/v1/category');
  const categories: ApiCategory[] = (data.categories || []).map((cat: any) => ({
    id: cat.id,
    title: cat.title,
    description: cat.description || '',
    image_url: cat.image_url || null,
    product_count: cat.product_count || 0,
    provider_id: provider.id,
    enabled: true,
  }));

  // Cache to Supabase api_categories table
  for (const cat of categories) {
    const { error: catError } = await supabase
      .from('api_categories')
      .upsert({
        api_provider_id: provider.id,
        api_category_id: String(cat.id),
        title: cat.title,
        title_en: cat.title,
        description: cat.description,
        image_url: cat.image_url,
        product_count: cat.product_count,
        is_active: true,
        is_synced: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'api_provider_id,api_category_id' });

    if (catError) {
      console.error(`Error syncing category ${cat.id}:`, catError);
    }

    // Also create/update a section entry for each category so it appears on the home screen
    const sectionSlug = `g2bulk-${cat.id}`;
    const { error: sectionError } = await supabase
      .from('sections')
      .upsert({
        id: sectionSlug,
        name: cat.title,
        name_en: cat.title,
        description: cat.description || '',
        icon: cat.image_url || '',
        image_url: cat.image_url || '',
        type: 'api',
        api_provider_id: provider.id,
        is_active: true,
        sort_order: 1000 + cat.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (sectionError) {
      console.error(`Error syncing section for category ${cat.id}:`, sectionError);
    }
  }

  // Update last sync
  await supabase
    .from('api_providers')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', provider.id);

  return categories;
}

export async function syncG2BulkProducts(provider: ApiProvider): Promise<ApiProduct[]> {
  const data = await apiRequest<{ success: boolean; products: any[] }>(provider, '/v1/products');
  const products: ApiProduct[] = (data.products || []).map((prod: any) => ({
    id: prod.id,
    title: prod.title,
    description: prod.description || '',
    category_id: prod.category_id,
    category_title: prod.category_title || '',
    unit_price: prod.unit_price,
    image_url: prod.image_url || null,
    stock: prod.stock || 0,
    provider_id: provider.id,
    enabled: true,
  }));

  // Cache to Supabase - create service_providers and product_packages
  for (const prod of products) {
    try {
      // Check for existing service_provider entry
      const { data: existingProvider } = await supabase
        .from('service_providers')
        .select('id')
        .eq('api_product_id', String(prod.id))
        .eq('api_provider_id', provider.id)
        .single();

      let serviceProviderId: string;

      if (existingProvider) {
        serviceProviderId = existingProvider.id;
      } else {
        // Create a new service_provider for this product
        const sectionSlug = `g2bulk-${prod.category_id}`;
        const { data: newProvider, error: createError } = await supabase
          .from('service_providers')
          .insert({
            name: prod.category_title || prod.title,
            name_en: prod.category_title || prod.title,
            description: prod.description || '',
            section_id: sectionSlug,
            api_product_id: String(prod.id),
            api_provider_id: provider.id,
            is_active: true,
            sort_order: prod.id,
            execution_type: 'api',
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`Error creating service_provider for product ${prod.id}:`, createError);
          continue;
        }
        serviceProviderId = newProvider.id;
      }

      // Upsert product_packages with USD pricing
      const { error: pkgError } = await supabase
        .from('product_packages')
        .upsert({
          provider_id: serviceProviderId,
          name: prod.title,
          name_en: prod.title,
          description: prod.description,
          price_usd: prod.unit_price,
          price_yer: 0, // USD only
          price_sar: 0, // USD only
          cost_price: prod.unit_price,
          cost_currency: 'USD',
          execution_type: 'api',
          api_product_id: String(prod.id),
          is_active: true,
        }, { onConflict: 'provider_id,api_product_id' });

      if (pkgError) {
        console.error(`Error syncing product package ${prod.id}:`, pkgError);
      }

      // Also upsert to api_products table for direct API product queries
      const { error: apiProdError } = await supabase
        .from('api_products')
        .upsert({
          api_provider_id: provider.id,
          api_category_id: String(prod.category_id),
          api_product_id: String(prod.id),
          title: prod.title,
          description: prod.description || '',
          unit_price: prod.unit_price,
          stock: prod.stock || 0,
          image_url: prod.image_url || '',
          is_active: true,
          is_synced: true,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'api_provider_id,api_product_id' });

      if (apiProdError) {
        // api_products table may not exist yet - non-fatal
        console.warn(`Could not sync to api_products for product ${prod.id}:`, apiProdError.message);
      }
    } catch (err) {
      console.error(`Error processing product ${prod.id}:`, err);
    }
  }

  // Update last sync
  await supabase
    .from('api_providers')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', provider.id);

  return products;
}

export async function syncG2BulkGames(provider: ApiProvider): Promise<ApiGame[]> {
  const data = await apiRequest<{ success: boolean; games: any[] }>(provider, '/v1/games');
  const games: ApiGame[] = (data.games || []).map((game: any) => ({
    id: game.id,
    code: game.code,
    name: game.name,
    image_url: game.image_url || '',
    provider_id: provider.id,
    enabled: true,
  }));

  // Cache to Supabase
  for (const game of games) {
    const { error: gameError } = await supabase
      .from('api_categories')
      .upsert({
        api_provider_id: provider.id,
        api_category_id: `game_${game.code}`,
        title: game.name,
        title_en: game.name,
        description: `Game: ${game.name}`,
        image_url: game.image_url,
        is_active: true,
        is_synced: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'api_provider_id,api_category_id' });

    if (gameError) {
      console.error(`Error syncing game ${game.code}:`, gameError);
    }
  }

  // Create a "Games" section entry for the home screen if it doesn't exist
  const { error: sectionError } = await supabase
    .from('sections')
    .upsert({
      id: `g2bulk-games-${provider.id}`,
      name: 'الألعاب',
      name_en: 'Games',
      description: 'شحن الألعاب والمزيد',
      icon: '',
      image_url: '',
      type: 'api' as const,
      api_provider_id: provider.id,
      is_active: true,
      sort_order: 900,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (sectionError) {
    console.error('Error syncing games section:', sectionError);
  }

  // Update last sync
  await supabase
    .from('api_providers')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', provider.id);

  return games;
}

export async function fullG2BulkSync(provider: ApiProvider): Promise<{
  categories: number;
  products: number;
  games: number;
}> {
  // Sync in sequence: categories first (creates sections), then products, then games
  const categories = await syncG2BulkCategories(provider);
  const products = await syncG2BulkProducts(provider);
  const games = await syncG2BulkGames(provider);
  return {
    categories: categories.length,
    products: products.length,
    games: games.length,
  };
}

/**
 * Sync all active providers - multi-provider support
 */
export async function syncAllProviders(): Promise<{
  totalCategories: number;
  totalProducts: number;
  totalGames: number;
  errors: string[];
}> {
  const providers = await getApiProviders();
  const activeProviders = providers.filter(p => p.enabled);
  const errors: string[] = [];
  let totalCategories = 0;
  let totalProducts = 0;
  let totalGames = 0;

  for (const provider of activeProviders) {
    try {
      const result = await fullG2BulkSync(provider);
      totalCategories += result.categories;
      totalProducts += result.products;
      totalGames += result.games;
    } catch (error: any) {
      errors.push(`Provider ${provider.name}: ${error.message}`);
    }
  }

  return { totalCategories, totalProducts, totalGames, errors };
}

// ===== Game Top-up Functions =====

export async function getGameFields(provider: ApiProvider, gameCode: string): Promise<ApiGameFields> {
  try {
    const data = await apiRequest<any>(provider, '/v1/games/fields', 'POST', { game: gameCode });
    return {
      fields: data.info?.fields || data.fields || [],
      notes: data.info?.notes || data.notes || '',
    };
  } catch {
    return { fields: [], notes: '' };
  }
}

export async function getGameServers(provider: ApiProvider, gameCode: string): Promise<ApiGameServer> {
  try {
    const data = await apiRequest<any>(provider, '/v1/games/servers', 'POST', { game: gameCode });
    return data.servers || {};
  } catch (error: any) {
    if (error.message?.includes('403') || error.message?.includes('does not require')) {
      return {};
    }
    throw error;
  }
}

export async function checkPlayerId(
  provider: ApiProvider,
  gameCode: string,
  userId: string,
  serverId?: string,
  charname?: string
): Promise<{ valid: boolean; name?: string; openid?: string }> {
  const body: Record<string, any> = { game: gameCode, user_id: userId };
  if (serverId) body.server_id = serverId;
  if (charname) body.charname = charname;

  const data = await apiRequest<any>(provider, '/v1/games/checkPlayerId', 'POST', body);
  return {
    valid: data.valid === 'valid',
    name: data.name,
    openid: data.openid,
  };
}

export async function getGameCatalogue(provider: ApiProvider, gameCode: string): Promise<ApiGameCatalogue[]> {
  const data = await apiRequest<{ success: boolean; catalogues: any[] }>(provider, `/v1/games/${gameCode}/catalogue`);
  return (data.catalogues || []).map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    amount: cat.amount,
    provider_id: provider.id,
  }));
}

export async function placeGameOrder(
  provider: ApiProvider,
  gameCode: string,
  catalogueName: string,
  playerId: string,
  serverId?: string,
  charname?: string,
  remark?: string
): Promise<GameOrderResult> {
  const body: Record<string, any> = {
    catalogue_name: catalogueName,
    player_id: playerId,
  };
  if (serverId) body.server_id = serverId;
  if (charname) body.charname = charname;
  if (remark) body.remark = remark;

  return apiRequest<GameOrderResult>(provider, `/v1/games/${gameCode}/order`, 'POST', body);
}

export async function checkGameOrderStatus(
  provider: ApiProvider,
  orderId: number,
  gameCode: string
): Promise<OrderStatus> {
  const data = await apiRequest<any>(provider, '/v1/games/order/status', 'POST', {
    order_id: orderId,
    game: gameCode,
  });
  return {
    order_id: orderId,
    status: data.order?.status || data.status,
    delivery_items: data.order?.delivery_items || data.delivery_items,
    message: data.order?.message || data.message,
  };
}

// ===== Product Purchase Functions =====

export async function purchaseProduct(
  provider: ApiProvider,
  productId: number,
  quantity: number = 1,
  customerId?: string
): Promise<PurchaseResult> {
  const body: Record<string, any> = { quantity };
  if (customerId) body.customer_id = customerId;

  return apiRequest<PurchaseResult>(provider, `/v1/products/${productId}/purchase`, 'POST', body);
}

export async function checkOrderDelivery(
  provider: ApiProvider,
  orderId: number
): Promise<PurchaseResult> {
  return apiRequest<PurchaseResult>(provider, `/v1/orders/${orderId}/delivery`);
}

export async function getOrderHistory(
  provider: ApiProvider,
  page: number = 1,
  limit: number = 50
): Promise<any> {
  return apiRequest<any>(provider, `/v1/orders?page=${page}&limit=${limit}`);
}

// ===== Cached Data Access (Supabase) =====

export function subscribeToProviderCache(
  providerId: string,
  callback: (data: {
    categories: ApiCategory[];
    products: ApiProduct[];
    games: ApiGame[];
  }) => void
): () => void {
  // Initial load
  getCachedProviderData(providerId).then(callback);

  // Subscribe to realtime changes with unique channel name
  const channel = supabase
    .channel(`provider-cache-${providerId}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'api_categories', filter: `api_provider_id=eq.${providerId}` }, () => {
      getCachedProviderData(providerId).then(callback);
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

export async function getCachedProviderData(providerId: string): Promise<{
  categories: ApiCategory[];
  products: ApiProduct[];
  games: ApiGame[];
}> {
  // Fetch categories from Supabase
  const { data: catData } = await supabase
    .from('api_categories')
    .select('*')
    .eq('api_provider_id', providerId)
    .eq('is_active', true);

  const categories: ApiCategory[] = (catData || [])
    .filter(c => !c.api_category_id?.startsWith('game_'))
    .map(c => ({
      id: Number(c.api_category_id),
      title: c.title || '',
      description: c.description || '',
      image_url: c.image_url || null,
      product_count: c.product_count || 0,
      provider_id: providerId,
      enabled: c.is_active ?? true,
    }));

  const games: ApiGame[] = (catData || [])
    .filter(c => c.api_category_id?.startsWith('game_'))
    .map(c => ({
      id: Number(c.api_category_id.replace('game_', '')),
      code: c.api_category_id.replace('game_', ''),
      name: c.title || '',
      image_url: c.image_url || '',
      provider_id: providerId,
      enabled: c.is_active ?? true,
    }));

  // Fetch products from Supabase
  const { data: providerData } = await supabase
    .from('service_providers')
    .select('id')
    .eq('api_provider_id', providerId);

  let products: ApiProduct[] = [];
  if (providerData && providerData.length > 0) {
    const providerIds = providerData.map(p => p.id);
    const { data: pkgData } = await supabase
      .from('product_packages')
      .select('*')
      .in('provider_id', providerIds)
      .eq('is_active', true);

    products = (pkgData || []).map(pkg => ({
      id: Number(pkg.api_product_id || 0),
      title: pkg.name || '',
      description: pkg.description || '',
      category_id: 0,
      category_title: '',
      unit_price: pkg.price_usd || 0, // USD only
      image_url: null,
      stock: 999,
      provider_id: providerId,
      enabled: true,
    }));
  }

  return { categories, products, games };
}

// ===== Test Provider Connection =====

export async function testProviderConnection(provider: ApiProvider): Promise<{
  success: boolean;
  balance?: number;
  username?: string;
  error?: string;
}> {
  try {
    const balance = await getG2BulkBalance(provider);
    return {
      success: balance.success,
      balance: balance.balance,
      username: balance.username,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ===== Initialize Default G2Bulk Provider =====

export async function initializeDefaultProviders(): Promise<void> {
  const providers = await getApiProviders();
  const g2bulkExists = providers.some(p => p.type === 'g2bulk');

  if (!g2bulkExists) {
    await saveApiProvider({
      name: 'G2Bulk',
      nameAr: 'G2Bulk',
      type: 'g2bulk',
      apiKey: G2BULK_API_KEY,
      baseUrl: G2BULK_BASE_URL,
      enabled: true,
      markupPercent: 16,
      supportsProducts: true,
      supportsGames: true,
      description: 'Digital products and game top-up provider',
      descriptionAr: 'مزود منتجات رقمية وشحن ألعاب',
      logo: '',
      color: '#8B1E3A',
      authHeaderName: 'X-API-Key',
      authHeaderPrefix: '',
    });
  }
}

// ===== Mapping Functions =====

function mapDbProviderToApiProvider(db: any): ApiProvider {
  return {
    id: db.id,
    name: db.name || '',
    nameAr: db.name || '',
    type: (db.name?.toLowerCase().includes('g2bulk') || db.api_url?.includes('g2bulk')) ? 'g2bulk' : 'custom',
    apiKey: db.api_key || '',
    baseUrl: db.api_url || '',
    enabled: db.is_active ?? true,
    markupPercent: db.default_commission || 16,
    supportsProducts: db.sync_products ?? true,
    supportsGames: db.sync_categories ?? true,
    lastSync: db.last_sync_at || null,
    balance: db.balance || 0,
    balanceCurrency: db.balance_currency || 'USD',
    description: db.description || '',
    descriptionAr: db.description || '',
    logo: db.website || '',
    color: db.config?.color || '#8B1E3A',
    createdAt: db.created_at || '',
    updatedAt: db.updated_at || '',
    authHeaderName: db.auth_header || 'X-API-Key',
    authHeaderPrefix: db.auth_type === 'bearer' ? 'Bearer ' : '',
  };
}

function mapApiProviderToDb(provider: Partial<ApiProvider> & { name: string }, now: string): any {
  return {
    name: provider.nameAr || provider.name,
    description: provider.descriptionAr || provider.description || '',
    website: provider.logo || '',
    api_url: provider.baseUrl || '',
    api_key: provider.apiKey || '',
    auth_header: provider.authHeaderName || 'X-API-Key',
    auth_type: provider.authHeaderPrefix?.includes('Bearer') ? 'bearer' : 'header',
    is_active: provider.enabled ?? true,
    balance: provider.balance || 0,
    balance_currency: provider.balanceCurrency || 'USD',
    default_commission: provider.markupPercent || 16,
    commission_type: 'percentage',
    sync_categories: provider.supportsGames ?? true,
    sync_products: provider.supportsProducts ?? true,
    config: {
      type: provider.type || 'custom',
      color: provider.color || '#8B1E3A',
    },
    updated_at: now,
  };
}
