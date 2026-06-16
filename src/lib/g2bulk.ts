// G2Bulk API Service - Compatibility Layer
// This file re-exports functions from api-providers.ts for backward compatibility
// All G2Bulk functionality is now handled via api-providers.ts
// which supports multiple API providers including G2Bulk

export {
  getApiProvider,
  getApiProviders,
  getG2BulkBalance as checkG2BulkBalance,
  syncG2BulkCategories as getG2BulkCategories,
  syncG2BulkProducts as getG2BulkProducts,
  syncG2BulkGames as getG2BulkGames,
  fullG2BulkSync,
  syncAllProviders,
  purchaseProduct as purchaseG2BulkProduct,
  checkOrderDelivery as checkG2BulkOrder,
  testProviderConnection as testG2BulkConnection,
  placeGameOrder,
  checkGameOrderStatus,
  getGameCatalogue,
  getGameFields,
  getGameServers,
  checkPlayerId,
  initializeDefaultProviders,
  G2BULK_API_KEY,
  G2BULK_BASE_URL,
} from './api-providers';

export type {
  ApiCategory as G2BulkCategory,
  ApiProduct as G2BulkProduct,
  PurchaseResult as G2BulkPurchaseResult,
  ProviderBalance as G2BulkBalance,
  ApiProvider,
  ApiGame,
  ApiGameCatalogue,
  ApiGameFields,
  GameOrderResult,
  OrderStatus,
} from './api-providers';
