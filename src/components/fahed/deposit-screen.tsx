'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  Minus,
  Upload,
  CreditCard,
  Building2,
  MapPin,
  Gift,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Receipt,
  ChevronDown,
  Image as ImageIcon,
  Tag,
  Info,
  Wallet,
  Copy,
  Check,
  Coins,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppStore } from '@/lib/store';
import { formatNumber, generateReference, compressBase64Image, defaultExchangeRates } from '@/lib/utils';
import { playTransactionSound } from '@/lib/transaction-sounds';
import { supabase, supabaseService } from '@/lib/supabase';
import { getWalletAddresses, generateWalletQRData, type WalletAddress } from '@/lib/wallet-addresses';

type Tab = 'deposit' | 'withdraw';
type DepositMethod = 'bank_transfer' | 'cash' | 'card' | 'crypto';
type WithdrawMethod = 'bank_transfer' | 'cash' | 'crypto';

const depositMethods: { id: DepositMethod; label: string; icon: typeof Building2; desc: string }[] = [
  { id: 'bank_transfer', label: 'حوالة بنكية', icon: Building2, desc: 'تحويل عبر البنك' },
  { id: 'crypto', label: 'عملات رقمية', icon: Coins, desc: 'USDT وغيرها' },
  { id: 'cash', label: 'نقطة بيع', icon: MapPin, desc: 'الدفع نقداً' },
  { id: 'card', label: 'كرت شحن', icon: CreditCard, desc: 'إدخال كرت شحن' },
];

const withdrawMethods: { id: WithdrawMethod; label: string; icon: typeof Building2; desc: string }[] = [
  { id: 'bank_transfer', label: 'حوالة بنكية', icon: Building2, desc: 'تحويل لحسابك' },
  { id: 'crypto', label: 'عملات رقمية', icon: Coins, desc: 'سحب كريبتو' },
  { id: 'cash', label: 'نقطة بيع', icon: MapPin, desc: 'استلام نقداً' },
];

interface BankInfo {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  color: string;
  icon: string;
  isActive: boolean;
}

interface CryptoNetwork {
  networkName: string;
  walletAddress: string;
  isActive: boolean;
}

interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  network: string;
  address: string;
  icon: string;
  color: string;
  isActive: boolean;
  minDeposit: number;
  minWithdraw: number;
  networks?: CryptoNetwork[];
  code?: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'قيد الانتظار', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)', icon: Clock },
  approved: { label: 'تمت الموافقة', color: '#10B981', bgColor: 'rgba(16,185,129,0.12)', icon: CheckCircle2 },
  rejected: { label: 'مرفوض', color: '#5C1A1B', bgColor: 'rgba(92,26,27,0.12)', icon: XCircle },
};

// Helper: mask account number (show first 3 and last 4 digits)
function maskAccountNumber(accNum: string): string {
  if (!accNum || accNum.length <= 7) return accNum;
  return accNum.substring(0, 3) + '****' + accNum.substring(accNum.length - 4);
}

export default function DepositScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, depositRequests, addDepositRequest, withdrawRequests, addWithdrawRequest, applyPromoCode } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>('deposit');

  // Deposit form
  const [depositAmount, setDepositAmount] = useState('');
  const [depositCurrency] = useState<'USD'>('USD');
  const [depositMethod, setDepositMethod] = useState<DepositMethod>('bank_transfer');
  const [receiptImage, setReceiptImage] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Selected bank for deposit
  const [selectedBankId, setSelectedBankId] = useState('');

  // Crypto deposit form
  const [selectedCryptoId, setSelectedCryptoId] = useState('');
  const [selectedCryptoNetwork, setSelectedCryptoNetwork] = useState('');
  const [cryptoTxHash, setCryptoTxHash] = useState('');

  // Wallet addresses from Supabase
  const [walletAddresses, setWalletAddresses] = useState<WalletAddress[]>([]);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawCurrency] = useState<'USD'>('USD');
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawMethod>('bank_transfer');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  // Selected bank for withdraw
  const [selectedWithdrawBankId, setSelectedWithdrawBankId] = useState('');

  // Crypto withdraw form
  const [selectedWithdrawCryptoId, setSelectedWithdrawCryptoId] = useState('');
  const [selectedWithdrawCryptoNetwork, setSelectedWithdrawCryptoNetwork] = useState('');
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Banks from Supabase
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  // Crypto currencies derived from wallet addresses
  const [cryptoCurrencies, setCryptoCurrencies] = useState<CryptoCurrency[]>([]);
  const [cryptoLoading, setCryptoLoading] = useState(true);

  // Exchange rates from Supabase
  const [exchangeRates, setExchangeRates] = useState(defaultExchangeRates);

  // Copy feedback
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);
  const [copiedCryptoId, setCopiedCryptoId] = useState<string | null>(null);
  const [copiedNetworkKey, setCopiedNetworkKey] = useState<string | null>(null);

  // Card code feedback
  const [cardError, setCardError] = useState('');
  const [cardSuccess, setCardSuccess] = useState(false);

  // Fetch banks, crypto currencies (wallet addresses), and exchange rates from Supabase on mount
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase.from('banks').select('*').eq('is_active', true);
        if (error) {
          console.error('Error fetching banks:', error);
          setBanks([]);
        } else {
          const banksList: BankInfo[] = (data || []).map((item: Record<string, any>) => ({
            id: item.id || '',
            bankName: item.bank_name || item.bankName || item.name || '',
            accountName: item.account_name || item.accountName || item.account_holder || '',
            accountNumber: item.account_number || item.accountNumber || '',
            color: item.color || '#5C1A1B',
            icon: item.icon || '',
            isActive: item.is_active ?? true,
          }));
          setBanks(banksList.filter(b => b.isActive));
        }
      } catch (error) {
        console.error('Error fetching banks:', error);
        setBanks([]);
      }
      setBanksLoading(false);
    };

    const fetchCryptoCurrencies = async () => {
      try {
        // Fetch wallet addresses from Supabase via wallet-addresses service
        const addresses = await getWalletAddresses();
        setWalletAddresses(addresses);

        // Build crypto currencies list from wallet addresses
        const cryptoMap = new Map<string, CryptoCurrency>();

        for (const addr of addresses) {
          const key = `${addr.currency}-${addr.network}`;
          if (!cryptoMap.has(key)) {
            const networkColor = addr.color || '#26A17B';
            cryptoMap.set(key, {
              id: key,
              name: `${addr.currency} (${addr.network})`,
              symbol: addr.currency,
              network: addr.network,
              address: addr.address,
              icon: addr.icon,
              color: networkColor,
              isActive: addr.active,
              minDeposit: addr.minDeposit || 10,
              minWithdraw: 20,
              networks: [{
                networkName: addr.network,
                walletAddress: addr.address,
                isActive: addr.active,
              }],
            });
          } else {
            // Add additional network to existing crypto
            const existing = cryptoMap.get(key)!;
            if (!existing.networks) existing.networks = [];
            existing.networks.push({
              networkName: addr.network,
              walletAddress: addr.address,
              isActive: addr.active,
            });
          }
        }

        // Also group by currency for multi-network currencies
        const currencyCryptoMap = new Map<string, CryptoCurrency>();
        for (const addr of addresses) {
          const currKey = addr.currency;
          if (!currencyCryptoMap.has(currKey)) {
            currencyCryptoMap.set(currKey, {
              id: currKey,
              name: addr.currency,
              symbol: addr.currency,
              network: addr.network,
              address: addr.address,
              icon: addr.icon,
              color: addr.color || '#26A17B',
              isActive: addr.active,
              minDeposit: addr.minDeposit || 10,
              minWithdraw: 20,
              networks: [{
                networkName: addr.network,
                walletAddress: addr.address,
                isActive: addr.active,
              }],
            });
          } else {
            const existing = currencyCryptoMap.get(currKey)!;
            if (!existing.networks) existing.networks = [];
            // Avoid duplicates
            const alreadyExists = existing.networks.some(n => n.networkName === addr.network);
            if (!alreadyExists) {
              existing.networks.push({
                networkName: addr.network,
                walletAddress: addr.address,
                isActive: addr.active,
              });
            }
          }
        }

        // Use currency-grouped list for display
        const cryptoList = Array.from(currencyCryptoMap.values()).filter(c => c.isActive);
        setCryptoCurrencies(cryptoList);
      } catch (error) {
        console.error('Error fetching crypto currencies:', error);
        setCryptoCurrencies([]);
        setWalletAddresses([]);
      }
      setCryptoLoading(false);
    };

    const fetchExchangeRates = async () => {
      try {
        const rate = await supabaseService.getExchangeRates();
        if (rate) {
          setExchangeRates({
            YER: rate.usd_to_yer ?? defaultExchangeRates.YER,
            SAR: rate.usd_to_sar ?? defaultExchangeRates.SAR,
            USD: 1,
          });
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };

    fetchBanks();
    fetchCryptoCurrencies();
    fetchExchangeRates();
  }, []);

  const handleCopyText = useCallback((text: string, type: 'bank' | 'crypto' | 'network', id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'bank') setCopiedBankId(id);
      else if (type === 'crypto') setCopiedCryptoId(id);
      else setCopiedNetworkKey(id);
      setTimeout(() => {
        if (type === 'bank') setCopiedBankId(null);
        else if (type === 'crypto') setCopiedCryptoId(null);
        else setCopiedNetworkKey(null);
      }, 2000);
    }).catch(() => {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      if (type === 'bank') setCopiedBankId(id);
      else if (type === 'crypto') setCopiedCryptoId(id);
      else setCopiedNetworkKey(id);
      setTimeout(() => {
        if (type === 'bank') setCopiedBankId(null);
        else if (type === 'crypto') setCopiedCryptoId(null);
        else setCopiedNetworkKey(null);
      }, 2000);
    });
  }, []);

  const getBalance = (currency: string): number => {
    if (!user) return 0;
    const field = `balance${currency}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  const currentBalance = getBalance(depositCurrency);
  const depositAmountNum = parseFloat(depositAmount) || 0;
  const balanceAfterDeposit = currentBalance + depositAmountNum + promoDiscount;

  const withdrawAmountNum = parseFloat(withdrawAmount) || 0;
  const withdrawBalance = getBalance(withdrawCurrency);
  const balanceAfterWithdraw = withdrawBalance - withdrawAmountNum;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        const compressed = await compressBase64Image(base64, 400, 0.7);
        setReceiptImage(compressed);
      } catch {
        setReceiptImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    const result = await applyPromoCode(promoCode.trim().toUpperCase());
    if (result) {
      setPromoApplied(true);
      if (result.type === 'fixed') {
        setPromoDiscount(result.discount);
      } else {
        setPromoDiscount(Math.round(depositAmountNum * result.discount / 100));
      }
    }
  };

  // Validate and redeem recharge card code against Supabase bulk_codes
  const handleRedeemCardCode = async () => {
    if (!user || !cardCode.trim()) return;

    setCardError('');
    setCardSuccess(false);
    setIsSubmitting(true);

    try {
      // Search for the code in bulk_codes table
      const { data: codeData, error: codeError } = await supabase
        .from('bulk_codes')
        .select('*')
        .eq('code', cardCode.trim())
        .eq('status', 'active')
        .single();

      if (codeError || !codeData) {
        setCardError('كود الشحن غير صالح أو مستخدم مسبقاً');
        setIsSubmitting(false);
        return;
      }

      if (codeData.used || codeData.status === 'used') {
        setCardError('كود الشحن غير صالح أو مستخدم مسبقاً');
        setIsSubmitting(false);
        return;
      }

      // Mark the code as used
      const { error: updateCodeError } = await supabase
        .from('bulk_codes')
        .update({
          used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
          status: 'used',
        })
        .eq('id', codeData.id);

      if (updateCodeError) {
        console.error('Error marking code as used:', updateCodeError);
        setCardError('حدث خطأ أثناء تحديث الكود');
        setIsSubmitting(false);
        return;
      }

      // Credit the user's balance via Supabase
      const cardAmount = codeData.amount || codeData.value || 0;
      const cardCurrency = codeData.currency || 'USD';
      const balanceKey = `balance${cardCurrency}` as keyof typeof user;

      if (cardAmount > 0 && user.id) {
        // Get current balance and update
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`balance_${cardCurrency.toLowerCase()}`)
          .eq('id', user.id)
          .single();

        if (!userError && userData) {
          const currentVal = userData[`balance_${cardCurrency.toLowerCase()}`] || 0;
          const newBalance = currentVal + cardAmount;

          await supabase
            .from('users')
            .update({ [`balance_${cardCurrency.toLowerCase()}`]: newBalance, updated_at: new Date().toISOString() })
            .eq('id', user.id);

          // Update local store
          const storeUser = useAppStore.getState().user;
          if (storeUser) {
            useAppStore.getState().setUser({
              ...storeUser,
              [balanceKey]: newBalance,
            });
          }
        }
      }

      setCardSuccess(true);
      setCardCode('');
      setTimeout(() => setCardSuccess(false), 3000);
    } catch (error) {
      console.error('Error redeeming card code:', error);
      setCardError('حدث خطأ أثناء التحقق من الكود');
    }
    setIsSubmitting(false);
  };

  const handleSubmitDeposit = async () => {
    if (!user || !depositAmountNum || depositAmountNum <= 0) return;

    // If card method, use the card redemption flow instead
    if (depositMethod === 'card') {
      await handleRedeemCardCode();
      return;
    }

    // Crypto deposit validation
    if (depositMethod === 'crypto' && !selectedCryptoId) {
      return;
    }
    if (depositMethod === 'crypto' && !cryptoTxHash.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const requestId = generateReference();
      const request: Record<string, any> = {
        id: requestId,
        userId: user.id,
        userName: user.name,
        amount: depositAmountNum + promoDiscount,
        currency: depositCurrency,
        method: depositMethod,
        receiptImage: depositMethod === 'bank_transfer' ? receiptImage : '',
        status: 'pending' as const,
        notes: promoApplied ? `كود خصم مطبق: ${promoCode}` : '',
        createdAt: new Date().toISOString(),
      };

      // Add crypto-specific fields
      if (depositMethod === 'crypto') {
        const selectedCrypto = cryptoCurrencies.find(c => c.id === selectedCryptoId);
        const activeNetworkName = selectedCryptoNetwork || selectedCrypto?.network || '';
        const activeNetworkData = selectedCrypto?.networks?.find(n => n.networkName === activeNetworkName);
        const depositAddress = activeNetworkData?.walletAddress || selectedCrypto?.address || '';
        request.cryptoId = selectedCryptoId;
        request.cryptoSymbol = selectedCrypto?.symbol || '';
        request.cryptoNetwork = activeNetworkName;
        request.cryptoDepositAddress = depositAddress;
        request.cryptoTxHash = cryptoTxHash.trim();
        request.notes = `إيداع ${selectedCrypto?.symbol || ''} - شبكة: ${activeNetworkName} - العنوان: ${depositAddress} - Hash: ${cryptoTxHash.trim()}`;
      }

      // Save to Supabase
      await supabaseService.createDepositRequest({
        id: requestId,
        user_id: user.id,
        amount: depositAmountNum + promoDiscount,
        currency: depositCurrency,
        method: depositMethod,
        bank_name: depositMethod === 'bank_transfer' ? (banks.find(b => b.id === selectedBankId)?.bankName || '') : '',
        bank_account: '',
        sender_name: user.name,
        transfer_receipt_url: depositMethod === 'bank_transfer' ? receiptImage : '',
        crypto_network: depositMethod === 'crypto' ? (request.cryptoNetwork || '') : '',
        crypto_wallet_address: depositMethod === 'crypto' ? (request.cryptoDepositAddress || '') : '',
        crypto_tx_hash: depositMethod === 'crypto' ? (request.cryptoTxHash || '') : '',
        status: 'pending',
        rejection_reason: '',
        admin_notes: request.notes || '',
        reviewed_by: null,
        reviewed_at: null,
        transaction_id: null,
        updated_at: new Date().toISOString(),
      });

      // Send notification to admin about new deposit
      try {
        const { notifyDepositRequest } = await import('@/lib/notifications');
        await notifyDepositRequest(user.id, user.name, parseFloat(depositAmount) || 0, depositCurrency);
      } catch {
        // Non-critical
      }

      // Update local store
      addDepositRequest(request as any);

      // Play deposit sound
      playTransactionSound('deposit');

      // Reset form
      setDepositAmount('');
      setReceiptImage('');
      setCardCode('');
      setPromoCode('');
      setPromoApplied(false);
      setPromoDiscount(0);
      setSelectedCryptoId('');
      setCryptoTxHash('');
      setSelectedCryptoNetwork('');
      setSelectedBankId('');
    } catch (error) {
      console.error('Error submitting deposit:', error);
    }
    setIsSubmitting(false);
  };

  const handleSubmitWithdraw = async () => {
    if (!user || !withdrawAmountNum || withdrawAmountNum <= 0) return;
    if (withdrawAmountNum > withdrawBalance) return;

    // Crypto withdraw validation
    if (withdrawMethod === 'crypto' && !selectedWithdrawCryptoId) {
      return;
    }
    if (withdrawMethod === 'crypto' && !cryptoWalletAddress.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const requestId = generateReference();
      const request: Record<string, any> = {
        id: requestId,
        userId: user.id,
        userName: user.name,
        amount: withdrawAmountNum,
        currency: withdrawCurrency,
        method: withdrawMethod,
        bankDetails: withdrawMethod === 'bank_transfer' ? `${bankName} - ${bankAccountNumber}` : '',
        status: 'pending' as const,
        notes: '',
        createdAt: new Date().toISOString(),
      };

      // Add crypto-specific fields
      if (withdrawMethod === 'crypto') {
        const selectedCrypto = cryptoCurrencies.find(c => c.id === selectedWithdrawCryptoId);
        const activeNetworkName = selectedWithdrawCryptoNetwork || selectedCrypto?.network || '';
        request.cryptoId = selectedWithdrawCryptoId;
        request.cryptoSymbol = selectedCrypto?.symbol || '';
        request.cryptoNetwork = activeNetworkName;
        request.cryptoWalletAddress = cryptoWalletAddress.trim();
        request.notes = `سحب ${selectedCrypto?.symbol || ''} - شبكة: ${activeNetworkName} - محفظة: ${cryptoWalletAddress.trim()}`;
      }

      // Save to Supabase
      await supabaseService.createWithdrawRequest({
        id: requestId,
        user_id: user.id,
        amount: withdrawAmountNum,
        currency: withdrawCurrency,
        method: withdrawMethod,
        bank_name: withdrawMethod === 'bank_transfer' ? bankName : '',
        bank_account: withdrawMethod === 'bank_transfer' ? bankAccountNumber : '',
        bank_iban: '',
        crypto_network: withdrawMethod === 'crypto' ? (request.cryptoNetwork || '') : '',
        crypto_wallet_address: withdrawMethod === 'crypto' ? (request.cryptoWalletAddress || '') : '',
        status: 'pending',
        rejection_reason: '',
        admin_notes: request.notes || '',
        reviewed_by: null,
        reviewed_at: null,
        processed_by: null,
        processed_at: null,
        transaction_id: null,
        updated_at: new Date().toISOString(),
      });

      // Send notification to admin about new withdraw request
      try {
        const { notifyWithdrawRequest } = await import('@/lib/notifications');
        await notifyWithdrawRequest(user.id, user.name, withdrawAmountNum, withdrawCurrency);
      } catch {
        // Non-critical
      }

      // Update local store
      addWithdrawRequest(request as any);

      // Play withdraw sound
      playTransactionSound('withdraw');

      // Reset form
      setWithdrawAmount('');
      setBankAccountNumber('');
      setBankName('');
      setSelectedWithdrawBankId('');
      setSelectedWithdrawCryptoId('');
      setSelectedWithdrawCryptoNetwork('');
      setCryptoWalletAddress('');
    } catch (error) {
      console.error('Error submitting withdraw:', error);
    }
    setIsSubmitting(false);
  };

  const methodLabel = (method: string): string => {
    switch (method) {
      case 'bank_transfer': return 'حوالة بنكية';
      case 'cash': return 'نقطة بيع';
      case 'card': return 'كرت شحن';
      case 'crypto': return 'عملات رقمية';
      default: return method;
    }
  };

  // Get selected crypto for display
  const selectedCrypto = cryptoCurrencies.find(c => c.id === selectedCryptoId);
  const selectedWithdrawCrypto = cryptoCurrencies.find(c => c.id === selectedWithdrawCryptoId);

  // Get active networks for selected crypto
  const selectedCryptoActiveNetworks = selectedCrypto?.networks?.filter(n => n.isActive && n.walletAddress) || [];
  // If no networks array, create one from legacy fields
  const selectedCryptoNetworks = selectedCryptoActiveNetworks.length > 0
    ? selectedCryptoActiveNetworks
    : (selectedCrypto?.address || selectedCrypto?.network
      ? [{ networkName: selectedCrypto.network || '', walletAddress: selectedCrypto.address || '', isActive: true }]
      : []);

  const selectedWithdrawCryptoActiveNetworks = selectedWithdrawCrypto?.networks?.filter(n => n.isActive) || [];
  const selectedWithdrawCryptoNetworks = selectedWithdrawCryptoActiveNetworks.length > 0
    ? selectedWithdrawCryptoActiveNetworks
    : (selectedWithdrawCrypto?.network
      ? [{ networkName: selectedWithdrawCrypto.network || '', walletAddress: '', isActive: true }]
      : []);

  // Get the currently selected network data for deposit
  const selectedDepositNetworkData = selectedCryptoNetworks.find(n => n.networkName === selectedCryptoNetwork);
  // Get the currently selected network data for withdraw
  const selectedWithdrawNetworkData = selectedWithdrawCryptoNetworks.find(n => n.networkName === selectedWithdrawCryptoNetwork);

  // Get the WalletAddress object for QR code generation
  const getSelectedWalletAddress = useCallback((): WalletAddress | null => {
    if (!selectedDepositNetworkData) return null;
    return walletAddresses.find(wa =>
      wa.address === selectedDepositNetworkData.walletAddress &&
      wa.network === selectedDepositNetworkData.networkName
    ) || null;
  }, [selectedDepositNetworkData, walletAddresses]);

  // Get selected bank for display
  const selectedBank = banks.find(b => b.id === selectedBankId);
  const selectedWithdrawBank = banks.find(b => b.id === selectedWithdrawBankId);

  // Auto-select bank when only one exists
  useEffect(() => {
    if (!banksLoading && banks.length === 1 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
    if (!banksLoading && banks.length === 1 && !selectedWithdrawBankId) {
      setSelectedWithdrawBankId(banks[0].id);
    }
  }, [banks, banksLoading, selectedBankId, selectedWithdrawBankId]);

  return (
    <div className="min-h-screen pb-6" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => useAppStore.getState().setActiveScreen('main')}
            className="w-10 h-10 rounded-2xl flex items-center justify-center glass"
          >
            <ArrowRight size={18} strokeWidth={1.5} style={{ color: isDark ? '#FFF' : '#333' }} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            {activeTab === 'deposit' ? 'إيداع' : 'سحب'}
          </h1>
        </div>
      </motion.div>

      {/* Tab Toggle */}
      <div className="px-5 mt-2">
        <div
          className="flex rounded-2xl p-1"
          style={{
            background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
          }}
        >
          <button
            onClick={() => setActiveTab('deposit')}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: activeTab === 'deposit' ? '#5C1A1B' : 'transparent',
              color: activeTab === 'deposit' ? '#FFF' : (isDark ? '#AAA' : '#666'),
              boxShadow: activeTab === 'deposit' ? '0 2px 8px rgba(92,26,27,0.25)' : 'none',
            }}
          >
            <Plus size={14} strokeWidth={2} />
            إيداع
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: activeTab === 'withdraw' ? '#5C1A1B' : 'transparent',
              color: activeTab === 'withdraw' ? '#FFF' : (isDark ? '#AAA' : '#666'),
              boxShadow: activeTab === 'withdraw' ? '0 2px 8px rgba(92,26,27,0.25)' : 'none',
            }}
          >
            <Minus size={14} strokeWidth={2} />
            سحب
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'deposit' ? (
          <motion.div
            key="deposit"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="px-5 mt-4"
          >
            <div className="space-y-3">
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 py-2">
                {[
                  { num: 1, label: 'الطريقة' },
                  { num: 2, label: 'التفاصيل' },
                  { num: 3, label: 'تأكيد' },
                ].map((step, i) => {
                  const isCompleted = (depositMethod !== 'bank_transfer' || selectedBankId) && i === 0;
                  const isCurrentStep = (i === 0 && !depositAmount) ||
                    (i === 1 && depositAmount && (!selectedBankId && depositMethod === 'bank_transfer')) ||
                    (i === 2 && depositAmount && (selectedBankId || depositMethod !== 'bank_transfer'));
                  return (
                    <div key={step.num} className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300"
                          style={{
                            background: isCurrentStep
                              ? 'linear-gradient(135deg, #5C1A1B, #3D0F10)'
                              : isCompleted
                                ? '#10B981'
                                : (isDark ? '#222' : '#E5E5E5'),
                            color: isCurrentStep || isCompleted ? '#FFF' : (isDark ? '#555' : '#AAA'),
                            boxShadow: isCurrentStep ? '0 2px 8px rgba(92,26,27,0.4)' : 'none',
                          }}
                        >
                          {isCompleted ? <Check size={12} strokeWidth={2.5} /> : step.num}
                        </div>
                        <span className="text-[9px] mt-1" style={{ color: isCurrentStep ? '#5C1A1B' : (isDark ? '#555' : '#AAA') }}>
                          {step.label}
                        </span>
                      </div>
                      {i < 2 && (
                        <div
                          className="w-8 h-[2px] rounded-full"
                          style={{
                            background: isCompleted ? '#10B981' : (isDark ? '#222' : '#E5E5E5'),
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Amount Input */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>المبلغ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent outline-none text-2xl font-bold"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                  <span className="text-sm font-medium" style={{ color: isDark ? '#888' : '#AAA' }}>
                    USD
                  </span>
                </div>
              </div>

              {/* Method Selector */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>طريقة الإيداع</label>
                <div className="space-y-2">
                  {depositMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => { setDepositMethod(method.id); setCardError(''); setCardSuccess(false); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{
                          background: depositMethod === method.id ? 'rgba(92,26,27,0.08)' : (isDark ? '#1A1A1A' : '#F8F8F8'),
                          border: depositMethod === method.id ? '1px solid rgba(92,26,27,0.2)' : '1px solid transparent',
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: depositMethod === method.id ? 'rgba(92,26,27,0.12)' : (isDark ? '#222' : '#F0F0F0') }}>
                          <Icon size={16} strokeWidth={1.5} color={depositMethod === method.id ? '#5C1A1B' : (isDark ? '#666' : '#AAA')} />
                        </div>
                        <div className="text-right flex-1">
                          <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{method.label}</p>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{method.desc}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: depositMethod === method.id ? '#5C1A1B' : (isDark ? '#333' : '#DDD') }}>
                          {depositMethod === method.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5C1A1B' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bank Transfer Method */}
              {depositMethod === 'bank_transfer' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} color="#5C1A1B" strokeWidth={1.5} />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>بيانات التحويل البنكي</span>
                  </div>

                  {banksLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                    </div>
                  ) : banks.length === 0 ? (
                    <div className="flex flex-col items-center py-6">
                      <Building2 size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد بنوك متاحة حالياً</p>
                    </div>
                  ) : (
                    <>
                      {/* Bank Selector */}
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اختر البنك</label>
                      <div className="space-y-2 mb-4">
                        {banks.map((bank) => {
                          const bankColor = bank.color || '#5C1A1B';
                          const bankFirstLetter = bank.bankName ? bank.bankName.charAt(0) : 'B';
                          return (
                            <button
                              key={bank.id}
                              onClick={() => setSelectedBankId(bank.id)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                              style={{
                                background: selectedBankId === bank.id ? `${bankColor}15` : (isDark ? '#1A1A1A' : '#F8F8F8'),
                                border: selectedBankId === bank.id ? `1px solid ${bankColor}40` : '1px solid transparent',
                              }}
                            >
                              {bank.icon ? (
                                <img src={bank.icon} alt={bank.bankName} className="w-10 h-10 rounded-xl object-cover" />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: bankColor }}
                                >
                                  {bankFirstLetter}
                                </div>
                              )}
                              <div className="text-right flex-1">
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{bank.bankName}</p>
                              </div>
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedBankId === bank.id ? bankColor : (isDark ? '#333' : '#DDD') }}>
                                {selectedBankId === bank.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: bankColor }} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Show selected bank details */}
                      {selectedBank && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl p-3"
                          style={{
                            background: isDark ? '#1A1A1A' : '#F8F8F8',
                            borderRight: `3px solid ${selectedBank.color || '#5C1A1B'}`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {selectedBank.icon ? (
                              <img src={selectedBank.icon} alt={selectedBank.bankName} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                style={{ backgroundColor: selectedBank.color || '#5C1A1B' }}
                              >
                                {selectedBank.bankName ? selectedBank.bankName.charAt(0) : 'B'}
                              </div>
                            )}
                            <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{selectedBank.bankName}</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>اسم الحساب</span>
                              <span className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#333' }}>{selectedBank.accountName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>رقم الحساب</span>
                              <button
                                onClick={() => handleCopyText(selectedBank.accountNumber, 'bank', selectedBank.id)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all"
                                style={{ background: isDark ? '#222' : '#F0F0F0' }}
                              >
                                <span className="text-xs font-medium font-mono" style={{ color: isDark ? '#CCC' : '#333' }} dir="ltr">{selectedBank.accountNumber}</span>
                                {copiedBankId === selectedBank.id ? (
                                  <Check size={12} color="#10B981" />
                                ) : (
                                  <Copy size={12} color={isDark ? '#666' : '#AAA'} />
                                )}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* Receipt Upload */}
                  <div className="mt-3">
                    <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>إيصال التحويل</label>
                    {receiptImage ? (
                      <div className="relative rounded-xl overflow-hidden">
                        <img src={receiptImage} alt="Receipt" className="w-full h-40 object-cover rounded-xl" />
                        <button
                          onClick={() => setReceiptImage('')}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <XCircle size={14} color="#FFF" />
                        </button>
                      </div>
                    ) : (
                      <label className="block rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer" style={{ background: isDark ? '#1A1A1A' : '#F8F8F8', border: `2px dashed ${isDark ? '#333' : '#DDD'}` }}>
                        <ImageIcon size={24} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                        <span className="text-xs" style={{ color: isDark ? '#555' : '#AAA' }}>اضغط لرفع الإيصال</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Crypto Deposit Method */}
              {depositMethod === 'crypto' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Coins size={14} color="#26A17B" strokeWidth={1.5} />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إيداع عملات رقمية</span>
                  </div>

                  {/* Wallet Addresses from Supabase */}
                  {walletAddresses.length > 0 && (
                    <div className="mb-4">
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>عناوين الإيداع</label>
                      <div className="space-y-3">
                        {walletAddresses.filter(a => a.active).map((addr) => (
                          <div
                            key={addr.id}
                            className="p-3 rounded-xl"
                            style={{
                              background: isDark ? '#1A1A1A' : '#F8F8F8',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{addr.label}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#5C1A1B15', color: '#5C1A1B' }}>
                                  {addr.network}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#26A17B15', color: '#26A17B' }}>
                                  {addr.currency}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-[10px] flex-1 truncate px-2 py-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }} dir="ltr">
                                {addr.address}
                              </code>
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(addr.address);
                                  } catch {}
                                }}
                                className="shrink-0 p-1.5 rounded-lg active:scale-95 transition-transform"
                                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                              >
                                <Copy size={14} strokeWidth={1.5} color={isDark ? '#AAA' : '#666'} />
                              </button>
                            </div>
                            {addr.minDeposit > 0 && (
                              <p className="text-[9px] mt-1.5" style={{ color: isDark ? '#555' : '#999' }}>
                                الحد الأدنى: ${addr.minDeposit} USD
                              </p>
                            )}
                            {/* QR Code for wallet address - tap to copy */}
                            <div className="flex justify-center my-3">
                              <button
                                onClick={() => handleCopyText(addr.address, 'crypto', addr.id)}
                                className="relative group active:scale-95 transition-transform"
                                title="اضغط لنسخ العنوان"
                              >
                                <QRCodeSVG
                                  value={generateWalletQRData(addr)}
                                  size={200}
                                  bgColor={isDark ? '#1e1b4b' : '#ffffff'}
                                  fgColor={isDark ? '#ffffff' : '#000000'}
                                  level="M"
                                />
                                {/* Copy overlay on tap */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 rounded-lg transition-all">
                                  {copiedCryptoId === addr.id ? (
                                    <div className="bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg">
                                      <Check size={14} strokeWidth={2} className="inline mr-1" />
                                      تم النسخ
                                    </div>
                                  ) : (
                                    <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg transition-opacity">
                                      <Copy size={14} strokeWidth={1.5} className="inline mr-1" />
                                      اضغط للنسخ
                                    </div>
                                  )}
                                </div>
                              </button>
                            </div>
                            {addr.instructionsAr && (
                              <p className="text-[9px] mt-1" style={{ color: isDark ? '#444' : '#BBB' }}>{addr.instructionsAr}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cryptoLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    </div>
                  ) : cryptoCurrencies.length === 0 && walletAddresses.length === 0 ? (
                    <div className="flex flex-col items-center py-6">
                      <Coins size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد عملات رقمية متاحة حالياً</p>
                    </div>
                  ) : (
                    <>
                      {/* Crypto Currency Selector */}
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اختر العملة</label>
                      <div className="space-y-2 mb-4">
                        {cryptoCurrencies.map((crypto) => {
                          const availableNetworks = crypto.networks?.filter(n => n.isActive && n.walletAddress) || [];
                          const legacyFallback = (crypto.address || crypto.network) ? [{ networkName: crypto.network || '', walletAddress: crypto.address || '', isActive: true }] : [];
                          const allNetworks = availableNetworks.length > 0 ? availableNetworks : legacyFallback;
                          return (
                            <button
                              key={crypto.id}
                              onClick={() => { setSelectedCryptoId(crypto.id); setSelectedCryptoNetwork(''); }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                              style={{
                                background: selectedCryptoId === crypto.id ? `${crypto.color}15` : (isDark ? '#1A1A1A' : '#F8F8F8'),
                                border: selectedCryptoId === crypto.id ? `1px solid ${crypto.color}40` : '1px solid transparent',
                              }}
                            >
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: crypto.color }}
                              >
                                {crypto.icon && crypto.icon.length > 5 ? (
                                  <img src={crypto.icon} alt={crypto.symbol} className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <span>{crypto.symbol.substring(0, 2)}</span>
                                )}
                              </div>
                              <div className="text-right flex-1">
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{crypto.name}</p>
                                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                                  {allNetworks.length > 1
                                    ? `${allNetworks.length} شبكات متاحة`
                                    : allNetworks.length === 1
                                      ? `شبكة: ${allNetworks[0].networkName}`
                                      : 'لا توجد شبكات'}
                                </p>
                              </div>
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedCryptoId === crypto.id ? crypto.color : (isDark ? '#333' : '#DDD') }}>
                                {selectedCryptoId === crypto.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: crypto.color }} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Show networks and QR for selected crypto */}
                      {selectedCrypto && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          {/* Network Selector (if multiple networks) */}
                          {selectedCryptoNetworks.length > 1 && (
                            <div>
                              <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اختر الشبكة</label>
                              <div className="space-y-2 mb-3">
                                {selectedCryptoNetworks.map((net) => (
                                  <button
                                    key={net.networkName}
                                    onClick={() => setSelectedCryptoNetwork(net.networkName)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all"
                                    style={{
                                      background: selectedCryptoNetwork === net.networkName ? `${selectedCrypto.color}15` : (isDark ? '#1A1A1A' : '#F8F8F8'),
                                      border: selectedCryptoNetwork === net.networkName ? `1px solid ${selectedCrypto.color}40` : '1px solid transparent',
                                    }}
                                  >
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                                      style={{ backgroundColor: selectedCrypto.color }}
                                    >
                                      {net.networkName.substring(0, 3)}
                                    </div>
                                    <div className="text-right flex-1">
                                      <p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{net.networkName}</p>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedCryptoNetwork === net.networkName ? selectedCrypto.color : (isDark ? '#333' : '#DDD') }}>
                                      {selectedCryptoNetwork === net.networkName && <div className="w-2 h-2 rounded-full" style={{ background: selectedCrypto.color }} />}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Auto-select first network if only one */}
                          {selectedCryptoNetworks.length === 1 && !selectedCryptoNetwork && (
                            <></>
                          )}

                          {/* Wallet Address + QR Code for selected network */}
                          {(() => {
                            const displayNetwork = selectedCryptoNetwork || (selectedCryptoNetworks.length === 1 ? selectedCryptoNetworks[0].networkName : '');
                            const displayNetData = selectedCryptoNetworks.find(n => n.networkName === displayNetwork);
                            if (!displayNetData || !displayNetData.walletAddress) return null;

                            // Find the WalletAddress object for QR generation
                            const walletAddr = walletAddresses.find(wa =>
                              wa.address === displayNetData.walletAddress &&
                              wa.network === displayNetData.networkName
                            );

                            return (
                              <div className="rounded-xl p-3" style={{ background: isDark ? '#1A1A1A' : '#F8F8F8', borderRight: `3px solid ${selectedCrypto.color}` }}>
                                <div className="flex items-center gap-2 mb-2">
                                  <QrCode size={12} color={selectedCrypto.color} strokeWidth={1.5} />
                                  <span className="text-[10px] font-bold" style={{ color: isDark ? '#AAA' : '#666' }}>
                                    عنوان الإيداع ({displayNetData.networkName})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-mono break-all flex-1" style={{ color: isDark ? '#CCC' : '#333' }} dir="ltr">
                                    {displayNetData.walletAddress}
                                  </p>
                                  <button
                                    onClick={() => handleCopyText(displayNetData.walletAddress, 'network', `${selectedCrypto.id}-${displayNetData.networkName}`)}
                                    className="p-2 rounded-lg flex-shrink-0"
                                    style={{ background: isDark ? '#222' : '#F0F0F0' }}
                                  >
                                    {copiedNetworkKey === `${selectedCrypto.id}-${displayNetData.networkName}` ? (
                                      <Check size={14} color="#10B981" />
                                    ) : (
                                      <Copy size={14} color={isDark ? '#666' : '#AAA'} />
                                    )}
                                  </button>
                                </div>
                                {/* QR Code using QRCodeSVG with generateWalletQRData - tap to copy */}
                                <div className="flex justify-center my-3">
                                  <button
                                    onClick={() => handleCopyText(displayNetData.walletAddress, 'network', `${selectedCrypto.id}-${displayNetData.networkName}`)}
                                    className="relative group active:scale-95 transition-transform"
                                    title="اضغط لنسخ العنوان"
                                  >
                                    <QRCodeSVG
                                      value={walletAddr ? generateWalletQRData(walletAddr) : displayNetData.walletAddress}
                                      size={200}
                                      bgColor={isDark ? '#1e1b4b' : '#ffffff'}
                                      fgColor={isDark ? '#ffffff' : '#000000'}
                                      level="M"
                                    />
                                    {/* Copy overlay on tap */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 rounded-lg transition-all">
                                      {copiedNetworkKey === `${selectedCrypto.id}-${displayNetData.networkName}` ? (
                                        <div className="bg-green-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg">
                                          <Check size={14} strokeWidth={2} className="inline mr-1" />
                                          تم النسخ
                                        </div>
                                      ) : (
                                        <div className="opacity-0 group-hover:opacity-100 bg-black/60 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg transition-opacity">
                                          <Copy size={14} strokeWidth={1.5} className="inline mr-1" />
                                          اضغط للنسخ
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Min deposit info */}
                          {selectedCrypto.minDeposit > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Info size={10} color={selectedCrypto.color} />
                              <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                                الحد الأدنى للإيداع: ${selectedCrypto.minDeposit} USD
                              </span>
                            </div>
                          )}

                          {/* Transaction Hash Input */}
                          <div>
                            <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>
                              رقم المعاملة (Transaction Hash)
                            </label>
                            <input
                              type="text"
                              value={cryptoTxHash}
                              onChange={(e) => setCryptoTxHash(e.target.value)}
                              placeholder="أدخل رقم المعاملة كدليل على التحويل"
                              className="w-full bg-transparent outline-none text-sm p-2.5 rounded-xl"
                              style={{
                                color: isDark ? '#FFF' : '#1a1a1a',
                                background: isDark ? '#1A1A1A' : '#F8F8F8',
                              }}
                              dir="ltr"
                            />
                          </div>

                          <div className="flex items-start gap-1.5 p-2 rounded-lg" style={{ background: `${selectedCrypto.color}10` }}>
                            <AlertCircle size={12} color={selectedCrypto.color} className="flex-shrink-0 mt-0.5" />
                            <span className="text-[10px]" style={{ color: isDark ? '#AAA' : '#666' }}>
                              {selectedCryptoNetworks.length > 1
                                ? 'تأكد من إرسال العملات على الشبكة المحددة فقط. الإرسال على شبكة خاطئة قد يؤدي لفقدان أموالك.'
                                : `تأكد من إرسال ${selectedCrypto.symbol} على شبكة ${selectedCrypto.network} فقط. الإرسال على شبكة خاطئة قد يؤدي لفقدان أموالك.`}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Cash Method */}
              {depositMethod === 'cash' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} color="#5C1A1B" strokeWidth={1.5} />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>أقرب نقاط البيع</span>
                  </div>
                  <div className="space-y-2">
                    {['عدن - المنصورة', 'عدن - خور مكسر', 'لحج - الحوطة', 'أبين - زنجبار'].map((loc, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: isDark ? '#1A1A1A' : '#F8F8F8' }}>
                        <MapPin size={12} color="#5C1A1B" strokeWidth={1.5} />
                        <span className="text-xs" style={{ color: isDark ? '#CCC' : '#333' }}>{loc}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Recharge Card Method - Auto-credit flow */}
              {depositMethod === 'card' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard size={14} color="#5C1A1B" strokeWidth={1.5} />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>كرت الشحن</span>
                  </div>
                  <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>رقم كرت الشحن</label>
                  <input
                    type="text"
                    value={cardCode}
                    onChange={(e) => { setCardCode(e.target.value); setCardError(''); setCardSuccess(false); }}
                    placeholder="أدخل رقم كرت الشحن"
                    className="w-full bg-transparent outline-none text-lg font-bold tracking-wider p-2 rounded-xl"
                    style={{
                      color: isDark ? '#FFF' : '#1a1a1a',
                      background: isDark ? '#1A1A1A' : '#F8F8F8',
                    }}
                    dir="ltr"
                  />

                  {/* Card error message */}
                  {cardError && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-2 p-2 rounded-lg"
                      style={{ background: 'rgba(92,26,27,0.1)' }}
                    >
                      <XCircle size={12} color="#5C1A1B" />
                      <span className="text-[10px] font-medium" style={{ color: '#5C1A1B' }}>{cardError}</span>
                    </motion.div>
                  )}

                  {/* Card success message */}
                  {cardSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-1.5 mt-2 p-2 rounded-lg"
                      style={{ background: 'rgba(16,185,129,0.1)' }}
                    >
                      <CheckCircle2 size={12} color="#10B981" />
                      <span className="text-[10px] font-medium" style={{ color: '#10B981' }}>تم شحن الرصيد بنجاح!</span>
                    </motion.div>
                  )}

                  <div className="flex items-start gap-1.5 mt-2">
                    <Info size={10} color={isDark ? '#666' : '#AAA'} className="flex-shrink-0 mt-0.5" />
                    <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                      أدخل كود الشحن وسيتم إضافة الرصيد تلقائياً لحسابك
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Promo Code - hidden for card method since it's auto-credited */}
              {depositMethod !== 'card' && (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>كود الخصم</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => { setPromoCode(e.target.value); setPromoApplied(false); setPromoDiscount(0); }}
                      placeholder="أدخل كود الخصم"
                      className="flex-1 bg-transparent outline-none text-sm p-2.5 rounded-xl"
                      style={{
                        color: isDark ? '#FFF' : '#1a1a1a',
                        background: isDark ? '#1A1A1A' : '#F8F8F8',
                      }}
                    />
                    <button
                      onClick={handleApplyPromo}
                      disabled={promoApplied || !promoCode.trim()}
                      className="px-4 py-2.5 rounded-xl text-xs font-medium"
                      style={{
                        background: promoApplied ? 'rgba(16,185,129,0.12)' : '#5C1A1B',
                        color: promoApplied ? '#10B981' : '#FFF',
                      }}
                    >
                      {promoApplied ? 'مطبق' : 'تطبيق'}
                    </button>
                  </div>
                  {promoApplied && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Tag size={10} color="#10B981" />
                      <span className="text-[10px]" style={{ color: '#10B981' }}>خصم ${formatNumber(promoDiscount)} USD</span>
                    </div>
                  )}
                </div>
              )}

              {/* Balance After Deposit Preview */}
              {depositAmountNum > 0 && depositMethod !== 'card' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/50 text-[10px]">الرصيد بعد الإيداع</p>
                      <p className="text-white text-xl font-bold">${formatNumber(balanceAfterDeposit)} USD</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <Wallet size={18} color="#FFF" strokeWidth={1.5} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitDeposit}
                disabled={
                  isSubmitting ||
                  (depositMethod === 'card'
                    ? !cardCode.trim()
                    : !depositAmountNum || depositAmountNum <= 0) ||
                  (depositMethod === 'crypto' && (!selectedCryptoId || !cryptoTxHash.trim()))
                }
                className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: (depositMethod === 'card' ? cardCode.trim() : depositAmountNum > 0) ? '#5C1A1B' : (isDark ? '#1A1A1A' : '#EEE'),
                  color: (depositMethod === 'card' ? cardCode.trim() : depositAmountNum > 0) ? '#FFF' : (isDark ? '#444' : '#AAA'),
                  boxShadow: (depositMethod === 'card' ? cardCode.trim() : depositAmountNum > 0) ? '0 4px 16px rgba(92,26,27,0.3)' : 'none',
                }}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} strokeWidth={2} />
                    {depositMethod === 'card' ? 'شحن الرصيد' : 'تأكيد الطلب'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="withdraw"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="px-5 mt-4"
          >
            <div className="space-y-3">
              {/* Withdraw Amount */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>المبلغ</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent outline-none text-2xl font-bold"
                    style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                    dir="ltr"
                  />
                  <span className="text-sm font-medium" style={{ color: isDark ? '#888' : '#AAA' }}>
                    USD
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Info size={10} color={isDark ? '#666' : '#AAA'} />
                  <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                    الرصيد المتاح: ${formatNumber(withdrawBalance)} USD
                  </span>
                </div>
              </div>

              {/* Method Selector */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                }}
              >
                <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>طريقة السحب</label>
                <div className="space-y-2">
                  {withdrawMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setWithdrawMethod(method.id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{
                          background: withdrawMethod === method.id ? 'rgba(92,26,27,0.08)' : (isDark ? '#1A1A1A' : '#F8F8F8'),
                          border: withdrawMethod === method.id ? '1px solid rgba(92,26,27,0.2)' : '1px solid transparent',
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: withdrawMethod === method.id ? 'rgba(92,26,27,0.12)' : (isDark ? '#222' : '#F0F0F0') }}>
                          <Icon size={16} strokeWidth={1.5} color={withdrawMethod === method.id ? '#5C1A1B' : (isDark ? '#666' : '#AAA')} />
                        </div>
                        <div className="text-right flex-1">
                          <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{method.label}</p>
                          <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{method.desc}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: withdrawMethod === method.id ? '#5C1A1B' : (isDark ? '#333' : '#DDD') }}>
                          {withdrawMethod === method.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#5C1A1B' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bank Details for bank transfer */}
              {withdrawMethod === 'bank_transfer' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} color="#5C1A1B" strokeWidth={1.5} />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>بيانات السحب البنكي</span>
                  </div>

                  {banksLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                    </div>
                  ) : banks.length === 0 ? (
                    <>
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اسم البنك</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="مثال: بنك الكريمي"
                        className="w-full bg-transparent outline-none text-sm p-2.5 rounded-xl mb-3"
                        style={{
                          color: isDark ? '#FFF' : '#1a1a1a',
                          background: isDark ? '#1A1A1A' : '#F8F8F8',
                        }}
                      />
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>رقم الحساب</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="أدخل رقم الحساب البنكي"
                        className="w-full bg-transparent outline-none text-sm p-2.5 rounded-xl"
                        style={{
                          color: isDark ? '#FFF' : '#1a1a1a',
                          background: isDark ? '#1A1A1A' : '#F8F8F8',
                        }}
                        dir="ltr"
                      />
                    </>
                  ) : (
                    <>
                      {/* Bank Selector for Withdraw */}
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اختر البنك</label>
                      <div className="space-y-2 mb-4">
                        {banks.map((bank) => {
                          const bankColor = bank.color || '#5C1A1B';
                          const bankFirstLetter = bank.bankName ? bank.bankName.charAt(0) : 'B';
                          return (
                            <button
                              key={bank.id}
                              onClick={() => {
                                setSelectedWithdrawBankId(bank.id);
                                setBankName(bank.bankName);
                              }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                              style={{
                                background: selectedWithdrawBankId === bank.id ? `${bankColor}15` : (isDark ? '#1A1A1A' : '#F8F8F8'),
                                border: selectedWithdrawBankId === bank.id ? `1px solid ${bankColor}40` : '1px solid transparent',
                              }}
                            >
                              {bank.icon ? (
                                <img src={bank.icon} alt={bank.bankName} className="w-10 h-10 rounded-xl object-cover" />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: bankColor }}
                                >
                                  {bankFirstLetter}
                                </div>
                              )}
                              <div className="text-right flex-1">
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{bank.bankName}</p>
                              </div>
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedWithdrawBankId === bank.id ? bankColor : (isDark ? '#333' : '#DDD') }}>
                                {selectedWithdrawBankId === bank.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: bankColor }} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Bank name (auto-filled from selection, editable) */}
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اسم البنك</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => { setBankName(e.target.value); setSelectedWithdrawBankId(''); }}
                        placeholder="مثال: بنك الكريمي"
                        className="w-full bg-transparent outline-none text-sm p-2.5 rounded-xl mb-3"
                        style={{
                          color: isDark ? '#FFF' : '#1a1a1a',
                          background: isDark ? '#1A1A1A' : '#F8F8F8',
                        }}
                      />
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>رقم الحساب</label>
                      <input
                        type="text"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        placeholder="أدخل رقم الحساب البنكي"
                        className="w-full bg-transparent outline-none text-sm p-2.5 rounded-xl"
                        style={{
                          color: isDark ? '#FFF' : '#1a1a1a',
                          background: isDark ? '#1A1A1A' : '#F8F8F8',
                        }}
                        dir="ltr"
                      />
                    </>
                  )}
                </motion.div>
              )}

              {/* Crypto Withdraw Method */}
              {withdrawMethod === 'crypto' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Coins size={14} color="#26A17B" strokeWidth={1.5} />
                    <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سحب عملات رقمية</span>
                  </div>

                  {cryptoLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
                    </div>
                  ) : cryptoCurrencies.length === 0 ? (
                    <div className="flex flex-col items-center py-6">
                      <Coins size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                      <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد عملات رقمية متاحة حالياً</p>
                    </div>
                  ) : (
                    <>
                      {/* Crypto Currency Selector */}
                      <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اختر العملة</label>
                      <div className="space-y-2 mb-4">
                        {cryptoCurrencies.map((crypto) => {
                          const availableNetworks = crypto.networks?.filter(n => n.isActive) || [];
                          const legacyFallback = crypto.network ? [{ networkName: crypto.network, walletAddress: '', isActive: true }] : [];
                          const allNetworks = availableNetworks.length > 0 ? availableNetworks : legacyFallback;
                          return (
                            <button
                              key={crypto.id}
                              onClick={() => { setSelectedWithdrawCryptoId(crypto.id); setSelectedWithdrawCryptoNetwork(''); }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl transition-all"
                              style={{
                                background: selectedWithdrawCryptoId === crypto.id ? `${crypto.color}15` : (isDark ? '#1A1A1A' : '#F8F8F8'),
                                border: selectedWithdrawCryptoId === crypto.id ? `1px solid ${crypto.color}40` : '1px solid transparent',
                              }}
                            >
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: crypto.color }}
                              >
                                {crypto.icon && crypto.icon.length > 5 ? (
                                  <img src={crypto.icon} alt={crypto.symbol} className="w-6 h-6 rounded object-cover" />
                                ) : (
                                  <span>{crypto.symbol.substring(0, 2)}</span>
                                )}
                              </div>
                              <div className="text-right flex-1">
                                <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{crypto.name}</p>
                                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                                  {allNetworks.length > 1
                                    ? `${allNetworks.length} شبكات متاحة`
                                    : allNetworks.length === 1
                                      ? `شبكة: ${allNetworks[0].networkName}`
                                      : 'لا توجد شبكات'}
                                </p>
                              </div>
                              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedWithdrawCryptoId === crypto.id ? crypto.color : (isDark ? '#333' : '#DDD') }}>
                                {selectedWithdrawCryptoId === crypto.id && <div className="w-2.5 h-2.5 rounded-full" style={{ background: crypto.color }} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Wallet Address Input */}
                      {selectedWithdrawCrypto && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          {/* Network Selector for withdraw (if multiple networks) */}
                          {selectedWithdrawCryptoNetworks.length > 1 && (
                            <div>
                              <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>اختر الشبكة</label>
                              <div className="space-y-2 mb-3">
                                {selectedWithdrawCryptoNetworks.map((net) => (
                                  <button
                                    key={net.networkName}
                                    onClick={() => setSelectedWithdrawCryptoNetwork(net.networkName)}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all"
                                    style={{
                                      background: selectedWithdrawCryptoNetwork === net.networkName ? `${selectedWithdrawCrypto.color}15` : (isDark ? '#1A1A1A' : '#F8F8F8'),
                                      border: selectedWithdrawCryptoNetwork === net.networkName ? `1px solid ${selectedWithdrawCrypto.color}40` : '1px solid transparent',
                                    }}
                                  >
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                                      style={{ backgroundColor: selectedWithdrawCrypto.color }}
                                    >
                                      {net.networkName.substring(0, 3)}
                                    </div>
                                    <div className="text-right flex-1">
                                      <p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{net.networkName}</p>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: selectedWithdrawCryptoNetwork === net.networkName ? selectedWithdrawCrypto.color : (isDark ? '#333' : '#DDD') }}>
                                      {selectedWithdrawCryptoNetwork === net.networkName && <div className="w-2 h-2 rounded-full" style={{ background: selectedWithdrawCrypto.color }} />}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const withdrawNetwork = selectedWithdrawCryptoNetwork || (selectedWithdrawCryptoNetworks.length === 1 ? selectedWithdrawCryptoNetworks[0].networkName : '') || selectedWithdrawCrypto.network;
                            return (
                              <>
                                <div>
                                  <label className="text-xs font-medium block mb-2" style={{ color: isDark ? '#AAA' : '#666' }}>
                                    عنوان محفظتك ({withdrawNetwork})
                                  </label>
                                  <input
                                    type="text"
                                    value={cryptoWalletAddress}
                                    onChange={(e) => setCryptoWalletAddress(e.target.value)}
                                    placeholder={`أدخل عنوان محفظة ${selectedWithdrawCrypto.symbol}`}
                                    className="w-full bg-transparent outline-none text-sm p-2.5 rounded-xl"
                                    style={{
                                      color: isDark ? '#FFF' : '#1a1a1a',
                                      background: isDark ? '#1A1A1A' : '#F8F8F8',
                                    }}
                                    dir="ltr"
                                  />
                                </div>

                                {/* Min withdraw info */}
                                {selectedWithdrawCrypto.minWithdraw > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <Info size={10} color={selectedWithdrawCrypto.color} />
                                    <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>
                                      الحد الأدنى للسحب: ${selectedWithdrawCrypto.minWithdraw} USD
                                    </span>
                                  </div>
                                )}

                                <div className="flex items-start gap-1.5 p-2 rounded-lg" style={{ background: `${selectedWithdrawCrypto.color}10` }}>
                                  <AlertCircle size={12} color={selectedWithdrawCrypto.color} className="flex-shrink-0 mt-0.5" />
                                  <span className="text-[10px]" style={{ color: isDark ? '#AAA' : '#666' }}>
                                    تأكد من إدخال عنوان صحيح على شبكة {withdrawNetwork}. الإرسال لعنوان خاطئ قد يؤدي لفقدان أموالك.
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </motion.div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Balance After Withdraw */}
              {withdrawAmountNum > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: balanceAfterWithdraw >= 0
                      ? 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)'
                      : 'linear-gradient(145deg, #3D0F10 0%, #2D0A0A 100%)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/50 text-[10px]">الرصيد بعد السحب</p>
                      <p className="text-white text-xl font-bold">${formatNumber(Math.max(0, balanceAfterWithdraw))} USD</p>
                      {balanceAfterWithdraw < 0 && (
                        <p className="text-[10px] mt-1" style={{ color: '#FCA5A5' }}>المبلغ يتجاوز الرصيد المتاح</p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <Wallet size={18} color="#FFF" strokeWidth={1.5} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitWithdraw}
                disabled={
                  !withdrawAmountNum || withdrawAmountNum <= 0 || withdrawAmountNum > withdrawBalance || isSubmitting ||
                  (withdrawMethod === 'crypto' && (!selectedWithdrawCryptoId || !cryptoWalletAddress.trim()))
                }
                className="w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                style={{
                  background: withdrawAmountNum > 0 && withdrawAmountNum <= withdrawBalance ? '#5C1A1B' : (isDark ? '#1A1A1A' : '#EEE'),
                  color: withdrawAmountNum > 0 && withdrawAmountNum <= withdrawBalance ? '#FFF' : (isDark ? '#444' : '#AAA'),
                  boxShadow: withdrawAmountNum > 0 && withdrawAmountNum <= withdrawBalance ? '0 4px 16px rgba(92,26,27,0.3)' : 'none',
                }}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} strokeWidth={2} />
                    تأكيد طلب السحب
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      <div className="px-5 mt-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>السجل</h3>

        <AnimatePresence mode="wait">
          {activeTab === 'deposit' ? (
            <motion.div
              key="deposit-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {depositRequests.length === 0 ? (
                <div
                  className="rounded-2xl p-6 flex flex-col items-center"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <Receipt size={28} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد طلبات إيداع</p>
                </div>
              ) : (
                depositRequests.map((req, index) => {
                  const status = statusConfig[req.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * index }}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{
                        background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: status.bgColor }}>
                        <StatusIcon size={16} strokeWidth={1.5} color={status.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                            ${formatNumber(req.amount)} USD
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#5C1A1B' }}>
                            USD
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{methodLabel(req.method)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: status.bgColor, color: status.color }}>
                        {status.label}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="withdraw-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {withdrawRequests.length === 0 ? (
                <div
                  className="rounded-2xl p-6 flex flex-col items-center"
                  style={{
                    background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <Receipt size={28} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                  <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد طلبات سحب</p>
                </div>
              ) : (
                withdrawRequests.map((req, index) => {
                  const status = statusConfig[req.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 * index }}
                      className="flex items-center gap-3 p-3 rounded-2xl"
                      style={{
                        background: isDark ? 'rgba(30,30,30,0.6)' : 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: status.bgColor }}>
                        <StatusIcon size={16} strokeWidth={1.5} color={status.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                            ${formatNumber(req.amount)} USD
                          </p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-white" style={{ background: '#5C1A1B' }}>
                            USD
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{methodLabel(req.method)}</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full font-medium" style={{ background: status.bgColor, color: status.color }}>
                        {status.label}
                      </span>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
