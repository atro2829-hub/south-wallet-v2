/**
 * Exchange Rate Sync Utility
 * Fetches rates from yemenrates.com API via Supabase proxy
 * and updates Firebase Realtime Database
 */

import { get, update, ref, set } from 'firebase/database';
import { database } from './firebase';

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
 * Fetch all rates (USD and SAR) from the API and update Firebase
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

  // Get existing commission from Firebase
  try {
    const snapshot = await get(ref(database, 'adminSettings/exchangeRates/commission'));
    if (snapshot.exists() && typeof snapshot.val() === 'number') {
      exchangeData.commission = snapshot.val();
    }
  } catch {
    // Keep default
  }

  // Get manual overrides from admin settings
  try {
    const snapshot = await get(ref(database, 'adminSettings/apiSettings/manualOverrides'));
    if (snapshot.exists()) {
      const overrides = snapshot.val();
      if (overrides.YER_USD && overrides.YER_USD > 0) exchangeData.YER_USD = overrides.YER_USD;
      if (overrides.YER_SAR && overrides.YER_SAR > 0) exchangeData.YER_SAR = overrides.YER_SAR;
    }
  } catch {
    // No overrides
  }

  // Update Firebase
  await set(ref(database, 'adminSettings/exchangeRates'), exchangeData);

  // Also update the legacy path for compatibility
  await set(ref(database, 'settings/exchangeRates'), {
    YER: 1,
    SAR: sarSell,
    USD: usdSell,
    commission: exchangeData.commission,
  });

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
 * Get exchange rates from Firebase (local read, no API call)
 */
export async function getExchangeRatesFromFirebase(): Promise<SimplifiedRates> {
  const snapshot = await get(ref(database, 'adminSettings/exchangeRates'));
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      YER: 1,
      SAR: data.YER_SAR || 410,
      USD: data.YER_USD || 1550,
      commission: data.commission || 2,
      lastSynced: data.lastSynced || new Date().toISOString(),
      buyRates: {
        USD: data.USD_buy || data.YER_USD || 1550,
        SAR: data.SAR_buy || data.YER_SAR || 410,
      },
      sellRates: {
        USD: data.USD_sell || data.YER_USD || 1550,
        SAR: data.SAR_sell || data.YER_SAR || 410,
      },
    };
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
