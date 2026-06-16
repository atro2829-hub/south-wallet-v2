'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, set, get, remove, update, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Save, Loader2, Plus, Trash2, Package, FileCode, AlertTriangle, CheckCircle2, XCircle, Copy, Search, Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BulkCodeBatch {
  id: string;
  name: string;
  productId: string;
  productName: string;
  codes: string[];
  usedCodes: string[];
  commission: number;
  totalCodes: number;
  usedCount: number;
  createdAt: string;
  isActive: boolean;
}

export default function BulkCodesPanel() {
  const { showToast } = useAdminStore();
  const [batches, setBatches] = useState<BulkCodeBatch[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; price: number; currency: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formCommission, setFormCommission] = useState(0);
  const [formCodes, setFormCodes] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);

  useEffect(() => {
    const batchesRef = ref(database, 'adminSettings/bulkCodes');
    const unsub1 = onValue(batchesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: BulkCodeBatch[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          name: val.name || '',
          productId: val.productId || '',
          productName: val.productName || '',
          codes: val.codes || [],
          usedCodes: val.usedCodes || [],
          commission: val.commission || 0,
          totalCodes: val.totalCodes || (val.codes || []).length,
          usedCount: val.usedCount || (val.usedCodes || []).length,
          createdAt: val.createdAt || '',
          isActive: val.isActive !== false,
        }));
        setBatches(list);
      } else {
        setBatches([]);
      }
      setLoading(false);
    });

    const productsRef = ref(database, 'packages');
    const unsub2 = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          name: val.name || val.label || '',
          price: val.price || 0,
          currency: val.currency || 'YER',
        }));
        setProducts(list);
      } else {
        setProducts([]);
      }
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const handleSaveBatch = async () => {
    if (!formName.trim() || !formProductId || !formCodes.trim()) {
      showToast('يرجى تعبئة جميع الحقول المطلوبة', 'error');
      return;
    }

    setFormSaving(true);
    try {
      // Parse codes: split by newlines, trim, remove empty lines
      const codesArray = formCodes
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (codesArray.length === 0) {
        showToast('لم يتم إدخال أي أكواد', 'error');
        setFormSaving(false);
        return;
      }

      // Remove duplicates
      const uniqueCodes = [...new Set(codesArray)];

      const product = products.find(p => p.id === formProductId);
      const batchId = `batch-${Date.now()}`;

      const batchData: Omit<BulkCodeBatch, 'id'> = {
        name: formName.trim(),
        productId: formProductId,
        productName: product?.name || '',
        codes: uniqueCodes,
        usedCodes: [],
        commission: formCommission,
        totalCodes: uniqueCodes.length,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      await set(ref(database, `adminSettings/bulkCodes/${batchId}`), batchData);

      showToast(`تم إضافة ${uniqueCodes.length} كود بنجاح`, 'success');
      setShowForm(false);
      setFormName('');
      setFormProductId('');
      setFormCommission(0);
      setFormCodes('');
    } catch {
      showToast('حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      await remove(ref(database, `adminSettings/bulkCodes/${batchId}`));
      showToast('تم حذف الدفعة', 'success');
    } catch {
      showToast('حدث خطأ أثناء الحذف', 'error');
    }
  };

  const handleToggleBatch = async (batch: BulkCodeBatch) => {
    try {
      await update(ref(database, `adminSettings/bulkCodes/${batch.id}`), {
        isActive: !batch.isActive,
      });
      showToast(batch.isActive ? 'تم تعطيل الدفعة' : 'تم تفعيل الدفعة', 'success');
    } catch {
      showToast('حدث خطأ', 'error');
    }
  };

  const handleCopyCodes = (codes: string[], usedCodes: string[]) => {
    const available = codes.filter(c => !usedCodes.includes(c));
    navigator.clipboard.writeText(available.join('\n')).catch(() => {});
    showToast(`تم نسخ ${available.length} كود متاح`, 'success');
  };

  const filteredBatches = batches.filter(b =>
    !searchQuery || b.name.includes(searchQuery) || b.productName.includes(searchQuery)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">أكواد المنتجات بالجملة</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة أكواد الشحن والتسليم التلقائي</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="w-4 h-4 ml-1" />
          {showForm ? 'إلغاء' : 'دفعة جديدة'}
        </Button>
      </div>

      {/* Add Batch Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="admin-card border-0 shadow-none">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-purple-500" /> إضافة أكواد بالجملة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>اسم الدفعة</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: أكواد شدات ببجي 60" />
                </div>

                <div>
                  <Label>المنتج / الفئة</Label>
                  <Select value={formProductId} onValueChange={setFormProductId}>
                    <SelectTrigger><SelectValue placeholder="اختر المنتج" /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.price} {p.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>نسبة العمولة (%)</Label>
                  <Input type="number" value={formCommission} onChange={(e) => setFormCommission(parseFloat(e.target.value) || 0)} dir="ltr" placeholder="0" />
                </div>

                <div>
                  <Label>الأكواد (كود في كل سطر)</Label>
                  <Textarea
                    value={formCodes}
                    onChange={(e) => setFormCodes(e.target.value)}
                    dir="ltr"
                    rows={10}
                    placeholder={"IEBFEI2JDBD\nSKDKENSJE\nHSKDEKRKR\n..."}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    عدد الأكواد: {formCodes.split('\n').filter(l => l.trim()).length}
                  </p>
                </div>

                <Button onClick={handleSaveBatch} disabled={formSaving} className="w-full bg-purple-600 hover:bg-purple-700">
                  {formSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                  حفظ الأكواد ({formCodes.split('\n').filter(l => l.trim()).length} كود)
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="بحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{batches.length}</p>
            <p className="text-xs text-muted-foreground">إجمالي الدفعات</p>
          </CardContent>
        </Card>
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <FileCode className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{batches.reduce((sum, b) => sum + b.totalCodes, 0)}</p>
            <p className="text-xs text-muted-foreground">إجمالي الأكواد</p>
          </CardContent>
        </Card>
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{batches.reduce((sum, b) => sum + b.usedCount, 0)}</p>
            <p className="text-xs text-muted-foreground">أكواد مستخدمة</p>
          </CardContent>
        </Card>
      </div>

      {/* Batch List */}
      {filteredBatches.length === 0 ? (
        <Card className="admin-card border-0 shadow-none">
          <CardContent className="p-8 text-center">
            <FileCode className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium text-muted-foreground">لا توجد أكواد</p>
            <p className="text-xs text-muted-foreground mt-1">أضف أكواد بالجملة للتسليم التلقائي</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map((batch, i) => {
            const available = batch.totalCodes - batch.usedCount;
            return (
              <motion.div key={batch.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                <Card className="admin-card border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(139,92,246,0.1)' }}>
                          <FileCode className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{batch.name}</p>
                          <p className="text-xs text-muted-foreground">{batch.productName}</p>
                        </div>
                      </div>
                      <Badge className={batch.isActive ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                        {batch.isActive ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="text-lg font-bold">{batch.totalCodes}</p>
                        <p className="text-[10px] text-muted-foreground">إجمالي</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="text-lg font-bold text-green-600">{available}</p>
                        <p className="text-[10px] text-muted-foreground">متاح</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted">
                        <p className="text-lg font-bold text-amber-600">{batch.usedCount}</p>
                        <p className="text-[10px] text-muted-foreground">مستخدم</p>
                      </div>
                    </div>

                    {batch.commission > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">العمولة: {batch.commission}%</p>
                    )}

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleToggleBatch(batch)}>
                        {batch.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleCopyCodes(batch.codes, batch.usedCodes)}>
                        <Copy className="w-3 h-3 ml-1" /> نسخ المتاح
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500" onClick={() => handleDeleteBatch(batch.id)}>
                        <Trash2 className="w-3 h-3 ml-1" /> حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
