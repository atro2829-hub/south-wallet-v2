// Wallet Addresses Service - محفظة الجنوب
// Manages deposit wallet addresses with QR code support
// Uses Supabase - NO Firebase

import { supabase } from './supabase';

export interface WalletAddress {
  id: string;
  label: string;
  labelAr: string;
  network: string; // TRC20, ERC20, BTC, etc.
  address: string;
  currency: string; // USDT, BTC, ETH, etc.
  icon: string; // emoji or icon key
  color: string; // tailwind color class
  active: boolean;
  minDeposit: number;
  minDepositCurrency: string; // USD
  instructions: string;
  instructionsAr: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  qrCodeDataUrl?: string; // Generated QR code data URL
}

// ===== CRUD =====

export async function getWalletAddresses(): Promise<WalletAddress[]> {
  const { data, error } = await supabase
    .from('wallet_addresses')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching wallet addresses:', error);
    return [];
  }

  return (data || []).map(mapDbWalletToWallet).sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getAllWalletAddresses(): Promise<WalletAddress[]> {
  const { data, error } = await supabase
    .from('wallet_addresses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching all wallet addresses:', error);
    return [];
  }

  return (data || []).map(mapDbWalletToWallet);
}

export async function saveWalletAddress(wallet: Partial<WalletAddress> & { address: string; currency: string }): Promise<string> {
  const now = new Date().toISOString();
  const dbData = mapWalletToDb(wallet, now);

  if (wallet.id) {
    const { data, error } = await supabase
      .from('wallet_addresses')
      .update(dbData)
      .eq('id', wallet.id)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  } else {
    const { data, error } = await supabase
      .from('wallet_addresses')
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }
}

export async function deleteWalletAddress(id: string): Promise<void> {
  const { error } = await supabase.from('wallet_addresses').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleWalletAddress(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('wallet_addresses')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function reorderWalletAddresses(addresses: WalletAddress[]): Promise<void> {
  const updates = addresses.map((addr, index) =>
    supabase.from('wallet_addresses').update({ updated_at: new Date().toISOString() }).eq('id', addr.id)
  );
  await Promise.all(updates);
}

// ===== Realtime Subscription =====

export function subscribeToWalletAddresses(
  callback: (addresses: WalletAddress[]) => void
): () => void {
  // Initial fetch
  getWalletAddresses().then(callback);

  // Subscribe to realtime changes with unique channel name
  const channelName = `wallet-addresses-changes-${Date.now()}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_addresses' }, () => {
      getWalletAddresses().then(callback);
    })
    .subscribe();

  return () => {
    try { supabase.removeChannel(channel); } catch {}
  };
}

// ===== QR Code Generation =====

/**
 * Generate QR code data for a wallet address
 * Returns a string that can be used by qrcode.react component
 * Uses standard crypto URI schemes for each network
 */
export function generateWalletQRData(address: WalletAddress): string {
  const addr = address.address;
  if (!addr) return '';

  // USDT variants
  if (address.currency === 'USDT') {
    if (address.network === 'TRC20') {
      return addr; // TRC20 just uses the plain address
    } else if (address.network === 'ERC20') {
      return `ethereum:${addr}?value=0`;
    } else if (address.network === 'BEP20') {
      return addr; // BEP20 uses plain address (BSC-compatible)
    }
    return addr;
  }

  // Bitcoin
  if (address.currency === 'BTC') {
    return `bitcoin:${addr}`;
  }

  // Ethereum
  if (address.currency === 'ETH') {
    return `ethereum:${addr}`;
  }

  // Solana
  if (address.currency === 'SOL' || address.network === 'SOL') {
    return `solana:${addr}`;
  }

  // BEP20 generic
  if (address.network === 'BEP20') {
    return addr;
  }

  // Default: just the address
  return addr;
}

// ===== Mapping Functions =====

function mapDbWalletToWallet(db: any): WalletAddress {
  return {
    id: db.id,
    label: db.label || db.network_name || db.currency || '',
    labelAr: db.label || db.network_name || db.currency || '',
    network: db.network || 'TRC20',
    address: db.address || '',
    currency: db.currency || 'USDT',
    icon: getNetworkIcon(db.network),
    color: getNetworkColor(db.network),
    active: db.is_active ?? true,
    minDeposit: 10,
    minDepositCurrency: 'USD',
    instructions: `Send ${db.currency || 'USDT'} to the address above on ${db.network || 'TRC20'} network`,
    instructionsAr: `أرسل ${db.currency || 'USDT'} إلى العنوان أعلاه على شبكة ${db.network || 'TRC20'}`,
    order: 0,
    createdAt: db.created_at || '',
    updatedAt: db.updated_at || '',
    qrCodeDataUrl: db.qr_code_url || '',
  };
}

function mapWalletToDb(wallet: Partial<WalletAddress>, now: string): any {
  return {
    network: wallet.network || 'TRC20',
    network_name: wallet.labelAr || wallet.label || wallet.network || '',
    address: wallet.address,
    label: wallet.label || wallet.currency || '',
    currency: wallet.currency || 'USDT',
    qr_code_url: '',
    is_active: wallet.active ?? true,
    updated_at: now,
  };
}

function getNetworkIcon(network: string): string {
  const icons: Record<string, string> = {
    'TRC20': '💰',
    'ERC20': '🔷',
    'BEP20': '🔶',
    'BTC': '₿',
    'ETH': '⟠',
    'SOL': '◎',
  };
  return icons[network] || '💳';
}

function getNetworkColor(network: string): string {
  const colors: Record<string, string> = {
    'TRC20': 'bg-red-500',
    'ERC20': 'bg-blue-500',
    'BEP20': 'bg-yellow-500',
    'BTC': 'bg-orange-500',
    'ETH': 'bg-indigo-500',
    'SOL': 'bg-purple-500',
  };
  return colors[network] || 'bg-primary';
}
