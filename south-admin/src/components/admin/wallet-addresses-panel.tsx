'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Search, Plus, Edit, Trash2, Copy, Check, Coins, QrCode, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

const networkPresets = [
  { network: 'TRC20', currency: 'USDT', label: 'USDT (TRC20)' },
  { network: 'ERC20', currency: 'USDT', label: 'USDT (ERC20)' },
  { network: 'BEP20', currency: 'USDT', label: 'USDT (BEP20)' },
  { network: 'Bitcoin', currency: 'BTC', label: 'Bitcoin (BTC)' },
  { network: 'Ethereum', currency: 'ETH', label: 'Ethereum (ETH)' },
  { network: 'TRC20', currency: 'USDC', label: 'USDC (TRC20)' },
  { network: 'BEP20', currency: 'BNB', label: 'BNB (BEP20)' },
  { network: 'Solana', currency: 'SOL', label: 'Solana (SOL)' },
  { network: 'TRC20', currency: 'TRX', label: 'TRON (TRX)' },
];

const networkColors: Record<string, string> = {
  TRC20: '#EF0027',
  ERC20: '#627EEA',
  BEP20: '#F3BA2F',
  Bitcoin: '#F7931A',
  Ethereum: '#627EEA',
  Solana: '#9945FF',
};

export default function WalletAddressesPanel() {
  const { showToast } = useAdminStore();
  const [addresses, setAddresses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQrFor, setShowQrFor] = useState<string | null>(null);

  // Form state
  const [network, setNetwork] = useState('TRC20');
  const [currency, setCurrency] = useState('USDT');
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [minDeposit, setMinDeposit] = useState(10);
  const [maxDeposit, setMaxDeposit] = useState(100000);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const addrRef = ref(database, 'adminSettings/walletAddresses');
    const unsub = onValue(addrRef, (snapshot) => {
      setAddresses(snapshot.val() || {});
      setLoading(false);
    }, (error) => {
      console.error('[WalletAddressesPanel] Firebase listen error:', error);
      showToast('خطأ في تحميل العناوين من Firebase', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [showToast]);

  const resetForm = () => {
    setNetwork('TRC20'); setCurrency('USDT'); setAddress(''); setLabel('');
    setIsActive(true); setMinDeposit(10); setMaxDeposit(100000); setNotes('');
    setEditing(null);
  };

  const handlePresetClick = (preset: typeof networkPresets[0]) => {
    setNetwork(preset.network);
    setCurrency(preset.currency);
    setLabel(preset.label);
  };

  const handleSave = async () => {
    if (!address.trim() || !label.trim()) {
      showToast('يرجى إدخال العنوان والتسمية', 'error');
      return;
    }
    setSaving(true);
    try {
      const id = editing || `wa-${Date.now()}`;
      const data = {
        id,
        network: network.trim(),
        currency: currency.trim(),
        address: address.trim(),
        label: label.trim(),
        isActive,
        minDeposit,
        maxDeposit,
        notes: notes.trim(),
        updatedAt: new Date().toISOString(),
        createdAt: editing && addresses[editing]?.createdAt ? addresses[editing].createdAt : new Date().toISOString(),
      };
      await update(ref(database, `adminSettings/walletAddresses/${id}`), data);
      showToast(editing ? 'تم تحديث العنوان بنجاح' : 'تم إضافة العنوان بنجاح', 'success');
      setDialog(false);
      resetForm();
    } catch (e) {
      console.error('[WalletAddressesPanel] handleSave error:', e);
      showToast(`حدث خطأ أثناء الحفظ: ${e instanceof Error ? e.message : 'خطأ غير معروف'}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العنوان؟')) return;
    try {
      await remove(ref(database, `adminSettings/walletAddresses/${id}`));
      showToast('تم حذف العنوان بنجاح', 'success');
    } catch (e) {
      console.error('[WalletAddressesPanel] handleDelete error:', e);
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await update(ref(database, `adminSettings/walletAddresses/${id}`), {
        isActive: active,
        updatedAt: new Date().toISOString(),
      });
      showToast(active ? 'تم تفعيل العنوان' : 'تم تعطيل العنوان', 'success');
    } catch (e) {
      console.error('[WalletAddressesPanel] handleToggleActive error:', e);
      showToast('حدث خطأ أثناء تحديث الحالة', 'error');
    }
  };

  const handleCopy = async (addr: string, id: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('تم نسخ العنوان', 'success');
    } catch {
      showToast('فشل النسخ', 'error');
    }
  };

  const addressList = Object.entries(addresses).map(([id, a]) => ({ id, ...a }));
  const filteredAddresses = addressList.filter((a: any) =>
    !search || a.label?.includes(search) || a.network?.includes(search) || a.currency?.includes(search) || a.address?.includes(search)
  );

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">عناوين المحافظ</h1>
          <p className="text-muted-foreground text-sm mt-1">{addressList.length} عنوان للإيداع</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setDialog(true); }}>
          <Plus className="w-4 h-4 ml-1" /> عنوان جديد
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
      </div>

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
        {filteredAddresses.map((addr: any, i) => {
          const networkColor = networkColors[addr.network] || '#5C1A1B';
          const isQrShown = showQrFor === addr.id;

          return (
            <motion.div key={addr.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
              <Card className="admin-card border-0 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: networkColor + '20' }}>
                        <Coins className="w-5 h-5" style={{ color: networkColor }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{addr.label}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] py-0" style={{ borderColor: networkColor + '60', color: networkColor }}>{addr.network}</Badge>
                          <Badge variant="outline" className="text-[10px] py-0">{addr.currency}</Badge>
                          <Badge className={addr.isActive !== false ? 'bg-green-500/20 text-green-600 text-[9px] py-0' : 'bg-red-500/20 text-red-500 text-[9px] py-0'}>
                            {addr.isActive !== false ? 'نشط' : 'معطل'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 max-w-full">
                          <code className="text-[10px] bg-muted/50 px-2 py-0.5 rounded truncate max-w-[200px] block" dir="ltr">{addr.address}</code>
                          <button
                            onClick={() => handleCopy(addr.address, addr.id)}
                            className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
                            title="نسخ"
                          >
                            {copiedId === addr.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                          </button>
                        </div>
                        {addr.minDeposit > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            الحد الأدنى: {addr.minDeposit} | الحد الأقصى: {addr.maxDeposit || 'غير محدود'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowQrFor(isQrShown ? null : addr.id)} title="رمز QR">
                        <QrCode className="w-4 h-4" />
                      </Button>
                      <Switch checked={addr.isActive !== false} onCheckedChange={(v) => handleToggleActive(addr.id, v)} />
                      <Button variant="ghost" size="sm" onClick={() => {
                        setEditing(addr.id);
                        setNetwork(addr.network || 'TRC20');
                        setCurrency(addr.currency || 'USDT');
                        setAddress(addr.address || '');
                        setLabel(addr.label || '');
                        setIsActive(addr.isActive !== false);
                        setMinDeposit(addr.minDeposit || 10);
                        setMaxDeposit(addr.maxDeposit || 100000);
                        setNotes(addr.notes || '');
                        setDialog(true);
                      }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(addr.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  {isQrShown && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-border/50 flex justify-center">
                        <div className="bg-white p-4 rounded-xl shadow-sm">
                          <QRCodeSVG
                            value={addr.address}
                            size={160}
                            level="M"
                            includeMargin={false}
                            fgColor="#000000"
                            bgColor="#FFFFFF"
                          />
                          <p className="text-center text-[10px] text-muted-foreground mt-2 truncate max-w-[160px] mx-auto" dir="ltr">{addr.address}</p>
                          <p className="text-center text-[10px] font-medium mt-0.5">{addr.label}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {filteredAddresses.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد عناوين محافظ</p>}
      </div>

      {/* Address Dialog */}
      <Dialog open={dialog} onOpenChange={(open) => { setDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'تعديل العنوان' : 'إضافة عنوان'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>إضافة سريعة</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {networkPresets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${network === preset.network && currency === preset.currency ? 'bg-purple-500 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>الشبكة</Label><Input value={network} onChange={(e) => setNetwork(e.target.value)} placeholder="TRC20" dir="ltr" /></div>
              <div><Label>العملة</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USDT" dir="ltr" /></div>
            </div>
            <div><Label>التسمية</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="USDT (TRC20) - المحفظة الرئيسية" /></div>
            <div><Label>عنوان المحفظة</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="T..." dir="ltr" className="text-left" /></div>

            {/* Live QR preview for the address being entered */}
            {address.trim().length > 10 && (
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-xl shadow-sm">
                  <QRCodeSVG
                    value={address.trim()}
                    size={120}
                    level="L"
                    fgColor="#000000"
                    bgColor="#FFFFFF"
                  />
                  <p className="text-center text-[9px] text-muted-foreground mt-1">معاينة رمز QR</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div><Label>الحد الأدنى للإيداع</Label><Input type="number" value={minDeposit} onChange={(e) => setMinDeposit(Number(e.target.value))} dir="ltr" /></div>
              <div><Label>الحد الأقصى للإيداع</Label><Input type="number" value={maxDeposit} onChange={(e) => setMaxDeposit(Number(e.target.value))} dir="ltr" /></div>
            </div>
            <div><Label>ملاحظات</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)" /></div>
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>نشط</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialog(false); resetForm(); }}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : null}
              {editing ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
