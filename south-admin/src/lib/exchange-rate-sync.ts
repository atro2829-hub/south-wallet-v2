/**
 * Exchange Rate Sync Utility
 * Fetches rates from yemenrates.com API via Supabase proxy
 * and updates Supabase database
 */

import { supabase } from './supabase';

const EXCHANGE_RATE_API_BASE = 'https://cygrlhmnmckoefefnsjc.supabase.co/functions/v1/public-api/latest';

export interface ExchangeRateData {
  YER_USD: number;  // 1 USD = X YER (sell rate)
  YER_SAR: number;  // 1 SAR = X YER (sell rate)
  USD_buy: number;  // Buy rate for USD
  USD_sell: number; // Sell rate for USD
  SAR_buy: number;  // Buy rate for SAR
  SAR_sell: number; // Sell rate for SAR
  lastSynced: string;
  source: string;
  commission: number;
}

export interface SimplifiedRates {
  YER: number;
  SAR: number;
  USD: number;
  commission: number;
  lastSynced: string;
  buyRates: {
    USD: number;
    SAR: number;
  };
  sellRates: {
    USD: number;
    SAR: number;
  };
}

interface ApiRateEntry {
  code: string;
  name: string;
  sell: number;
  buy: number;
  trend: string;
}

interface ApiResponse {
  success: boolean;
  data: Array<{
    city: string;
    rates: ApiRateEntry[];
    updatedAt: string;
  }>;
  meta: {
    timestamp: string;
    source: string;
  };
}

/**
 * Fetch exchange rates from the API for a specific currency
 */
async function fetchApiRates(currency: string, city: string = 'aden'): Promise<ApiResponse> {
  const url = `${EXCHANGE_RATE_API_BASE}?city=${city}&currency=${currency}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json();
}

/**
 * Fetch all rates (USD and SAR) from the API and update Supabase
 */
export async function syncExchangeRatesFromApi(): Promise<SimplifiedRates> {
  // Fetch both USD and SAR rates in parallel
  const [usdResponse, sarResponse] = await Promise.all([
    fetchApiRates('usd', 'aden'),
    fetchApiRates('sar', 'aden'),
  ]);

  if (!usdResponse.success || !sarResponse.success) {
    throw new Error('فشل في جلب أسعار الصرف من API');
  }

  const usdRate = usdResponse.data[0]?.rates[0];
  const sarRate = sarResponse.data[0]?.rates[0];

  if (!usdRate || !sarRate) {
    throw new Error('بيانات أسعار الصرف غير متوفرة');
  }

  const now = new Date().toISOString();
  const source = usdResponse.meta?.source || 'yemenrates.com';

  // Use sell rates as the primary rate (what it costs to buy foreign currency)
  const usdSell = usdRate.sell || usdRate.buy;
  const sarSell = sarRate.sell || sarRate.buy;
  const usdBuy = usdRate.buy || usdRate.sell;
  const sarBuy = sarRate.buy || sarRate.sell;

  const exchangeData: ExchangeRateData = {
    YER_USD: usdSell,
    YER_SAR: sarSell,
    USD_buy: usdBuy,
    USD_sell: usdSell,
    SAR_buy: sarBuy,
    SAR_sell: sarSell,
    lastSynced: now,
    source,
    commission: 2, // Default commission, will be preserved from existing
  };

  // Get existing commission from Supabase
  try {
    const { data: existingRate } = await supabase
      .from('exchange_rates')
      .select('usd_to_yer, sar_to_yer')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingRate) {
      // Preserve existing commission by checking app_config
      const { data: configData } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'exchange_commission')
        .single();

      if (configData?.value && typeof configData.value.commission === 'number') {
        exchangeData.commission = configData.value.commission;
      }
    }
  } catch {
    // Keep default commission
  }

  // Get manual overrides from admin settings
  try {
    const { data: overrideData } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'manual_rate_overrides')
      .single();

    if (overrideData?.value) {
      const overrides = overrideData.value;
      if (overrides.YER_USD && overrides.YER_USD > 0) exchangeData.YER_USD = overrides.YER_USD;
      if (overrides.YER_SAR && overrides.YER_SAR > 0) exchangeData.YER_SAR = overrides.YER_SAR;
    }
  } catch {
    // No overrides
  }

  // Update Supabase exchange_rates table
  // First, deactivate existing rates
  await supabase
    .from('exchange_rates')
    .update({ is_active: false })
    .eq('is_active', true);

  // Insert new rate
  await supabase
    .from('exchange_rates')
    .insert({
      usd_to_yer: exchangeData.YER_USD,
      usd_to_sar: (1 / exchangeData.YER_SAR * exchangeData.YER_USD), // derived
      sar_to_yer: exchangeData.YER_SAR,
      source: exchangeData.source,
      is_active: true,
      updated_by: null,
    });

  // Also update app_config with the full exchange data for admin reference
  await supabase
    .from('app_config')
    .upsert({
      key: 'exchange_rate_data',
      value: exchangeData,
      description: 'Current exchange rate data including buy/sell rates',
      updated_at: now,
    }, { onConflict: 'key' });

  return {
    YER: 1,
    SAR: sarSell,
    USD: usdSell,
    commission: exchangeData.commission,
    lastSynced: now,
    buyRates: { USD: usdBuy, SAR: sarBuy },
    sellRates: { USD: usdSell, SAR: sarSell },
  };
}

/**
 * Get exchange rates from Supabase (local read, no API call)
 */
export async function getExchangeRatesFromFirebase(): Promise<SimplifiedRates> {
  try {
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      // Also try to get extended data from app_config
      let buyUsd = data.usd_to_yer;
      let buySar = data.sar_to_yer;
      let sellUsd = data.usd_to_yer;
      let sellSar = data.sar_to_yer;
      let commission = 2;

      try {
        const { data: configData } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'exchange_rate_data')
          .single();

        if (configData?.value) {
          const ext = configData.value;
          buyUsd = ext.USD_buy || ext.YER_USD || buyUsd;
          buySar = ext.SAR_buy || ext.YER_SAR || buySar;
          sellUsd = ext.USD_sell || ext.YER_USD || sellUsd;
          sellSar = ext.SAR_sell || ext.YER_SAR || sellSar;
          commission = ext.commission || commission;
        }
      } catch {
        // Use basic rates
      }

      return {
        YER: 1,
        SAR: data.sar_to_yer || 410,
        USD: data.usd_to_yer || 1550,
        commission,
        lastSynced: data.updated_at || new Date().toISOString(),
        buyRates: { USD: buyUsd, SAR: buySar },
        sellRates: { USD: sellUsd, SAR: sellSar },
      };
    }
  } catch {
    // Fall through to defaults
  }

  // Default fallback
  return {
    YER: 1,
    SAR: 410,
    USD: 1558,
    commission: 2,
    lastSynced: new Date().toISOString(),
    buyRates: { USD: 1550, SAR: 409 },
    sellRates: { USD: 1558, SAR: 410 },
  };
}
