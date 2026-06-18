/**
 * South Wallet - Edge Functions Client
 * 
 * This module provides a typed client for calling Supabase Edge Functions.
 * All business logic (orders, transfers, deposits, notifications) should go through
 * these functions for server-side validation and atomic operations.
 * 
 * Edge Functions:
 * - manage-sections: CRUD for sections & sub-sections
 * - manage-service-provider: CRUD for providers, packages, API providers
 * - process-order: Order creation, cancellation, completion
 * - manage-balance: Transfers, balance queries, transaction history
 * - send-notification: Push & in-app notifications
 * - process-finance: Deposits, withdrawals, currency exchange
 */

import { supabase } from './supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kifmxseonkdsxuanznny.supabase.co';

// =====================================================
// Generic Edge Function Caller
// =====================================================

async function callEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return data as { success: boolean; data?: T; error?: string; message?: string };
  } catch (err: any) {
    return { success: false, error: err.message || 'Edge function call failed' };
  }
}

// =====================================================
// SECTIONS
// =====================================================

export const edgeSections = {
  list: () => callEdgeFunction('manage-sections', { action: 'list_sections' }),
  
  create: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-sections', { action: 'create_section', data }),
  
  update: (section_id: string, data: Record<string, unknown>) =>
    callEdgeFunction('manage-sections', { action: 'update_section', section_id, data }),
  
  delete: (section_id: string) =>
    callEdgeFunction('manage-sections', { action: 'delete_section', section_id }),
  
  reorder: (orderedIds: string[]) =>
    callEdgeFunction('manage-sections', { action: 'reorder_sections', data: orderedIds }),

  listSubSections: (section_id: string) =>
    callEdgeFunction('manage-sections', { action: 'list_sub_sections', section_id }),
  
  createSubSection: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-sections', { action: 'create_sub_section', data }),
  
  updateSubSection: (sub_section_id: string, data: Record<string, unknown>) =>
    callEdgeFunction('manage-sections', { action: 'update_sub_section', sub_section_id, data }),
  
  deleteSubSection: (sub_section_id: string) =>
    callEdgeFunction('manage-sections', { action: 'delete_sub_section', sub_section_id }),
};

// =====================================================
// SERVICE PROVIDERS
// =====================================================

export const edgeProviders = {
  list: (section_id?: string) =>
    callEdgeFunction('manage-service-provider', { action: 'list_providers', section_id }),
  
  create: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-service-provider', { action: 'create_provider', data }),
  
  update: (provider_id: string, data: Record<string, unknown>) =>
    callEdgeFunction('manage-service-provider', { action: 'update_provider', provider_id, data }),
  
  delete: (provider_id: string) =>
    callEdgeFunction('manage-service-provider', { action: 'delete_provider', provider_id }),

  listPackages: (provider_id: string) =>
    callEdgeFunction('manage-service-provider', { action: 'list_packages', provider_id }),
  
  createPackage: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-service-provider', { action: 'create_package', data }),
  
  updatePackage: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-service-provider', { action: 'update_package', data }),
  
  deletePackage: (id: string) =>
    callEdgeFunction('manage-service-provider', { action: 'delete_package', data: { id } }),

  assignSections: (provider_id: string, sections: any[]) =>
    callEdgeFunction('manage-service-provider', { action: 'assign_provider_sections', provider_id, data: { sections } }),
  
  getSections: (provider_id: string) =>
    callEdgeFunction('manage-service-provider', { action: 'get_provider_sections', provider_id }),

  // API Providers
  listApiProviders: () =>
    callEdgeFunction('manage-service-provider', { action: 'list_api_providers' }),
  
  createApiProvider: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-service-provider', { action: 'create_api_provider', data }),
  
  updateApiProvider: (data: Record<string, unknown>) =>
    callEdgeFunction('manage-service-provider', { action: 'update_api_provider', data }),
  
  deleteApiProvider: (id: string) =>
    callEdgeFunction('manage-service-provider', { action: 'delete_api_provider', data: { id } }),
};

// =====================================================
// ORDERS
// =====================================================

export const edgeOrders = {
  process: (data: { user_id: string; provider_id: string; package_id: string; amount?: number; currency?: string }) =>
    callEdgeFunction('process-order', { action: 'process_order', data }),
  
  cancel: (order_id: string, refund = true) =>
    callEdgeFunction('process-order', { action: 'cancel_order', data: { order_id, refund } }),
  
  complete: (data: { order_id: string; pin_code?: string; serial_number?: string; receipt_data?: any }) =>
    callEdgeFunction('process-order', { action: 'complete_order', data }),
  
  list: (data: { user_id?: string; status?: string; limit?: number; offset?: number }) =>
    callEdgeFunction('process-order', { action: 'list_orders', data }),
};

// =====================================================
// BALANCE & TRANSFERS
// =====================================================

export const edgeBalance = {
  get: (user_id: string) =>
    callEdgeFunction('manage-balance', { action: 'get_balance', data: { user_id } }),
  
  transfer: (data: { from_user_id: string; to_user_id: string; amount: number; currency?: string; fee?: number; note?: string }) =>
    callEdgeFunction('manage-balance', { action: 'transfer', data }),
  
  getTransactions: (data: { user_id?: string; type?: string; limit?: number; offset?: number }) =>
    callEdgeFunction('manage-balance', { action: 'get_transactions', data }),
};

// =====================================================
// NOTIFICATIONS
// =====================================================

export const edgeNotifications = {
  send: (data: { user_id: string; title: string; body: string; type?: string; data?: any }) =>
    callEdgeFunction('send-notification', { action: 'send_notification', data }),
  
  sendBulk: (data: { title: string; body: string; type?: string; user_ids: string[]; data?: any }) =>
    callEdgeFunction('send-notification', { action: 'send_bulk_notification', data }),
  
  sendAdmin: (data: { title: string; body: string; type?: string; data?: any }) =>
    callEdgeFunction('send-notification', { action: 'send_admin_notification', data }),
  
  listUser: (data: { user_id: string; limit?: number; unread_only?: boolean }) =>
    callEdgeFunction('send-notification', { action: 'list_user_notifications', data }),
  
  markRead: (notification_id: string) =>
    callEdgeFunction('send-notification', { action: 'mark_read', data: { notification_id } }),
};

// =====================================================
// FINANCE (Deposits, Withdrawals, Exchange)
// =====================================================

export const edgeFinance = {
  // Deposits
  createDepositRequest: (data: { user_id: string; amount: number; currency?: string; method?: string; bank_details?: any; crypto_details?: any }) =>
    callEdgeFunction('process-finance', { action: 'create_deposit_request', data }),
  
  approveDeposit: (data: { request_id: string; admin_id: string }) =>
    callEdgeFunction('process-finance', { action: 'approve_deposit', data }),
  
  rejectDeposit: (data: { request_id: string; admin_id: string; reason?: string }) =>
    callEdgeFunction('process-finance', { action: 'reject_deposit', data }),

  // Withdrawals
  createWithdrawRequest: (data: { user_id: string; amount: number; currency?: string; method?: string; bank_iban?: string; crypto_details?: any }) =>
    callEdgeFunction('process-finance', { action: 'create_withdraw_request', data }),
  
  approveWithdraw: (data: { request_id: string; admin_id: string }) =>
    callEdgeFunction('process-finance', { action: 'approve_withdraw', data }),
  
  rejectWithdraw: (data: { request_id: string; admin_id: string }) =>
    callEdgeFunction('process-finance', { action: 'reject_withdraw', data }),

  // Exchange
  exchangeCurrency: (data: { user_id: string; from_currency: string; to_currency: string; amount: number }) =>
    callEdgeFunction('process-finance', { action: 'exchange_currency', data }),
};
