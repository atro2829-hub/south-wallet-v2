'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit3, Save, X, ToggleLeft, ToggleRight, Trash2, Package, Upload } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols } from '@/lib/utils';
import { ref, update, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { generateReference } from '@/lib/utils';

export default function AdminProducts() {
  const {
    isDark, cardStyle, inputStyle, providers, packages,
    handleAddProduct, handleToggleProduct, handleDeleteProduct, updatePackage
  } = useAdminContext();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, currency: 'YER' as 'YER' | 'SAR' | 'USD', providerId: '', executionType: 'manual' as 'manual' | 'auto' });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState({ name: '', price: 0, description: '' });
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProviderId, setBulkProviderId] = useState('');
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const onAddProduct = () => {
    if (!newProduct.name || !newProduct.providerId || newProduct.price <= 0) return;
    handleAddProduct(newProduct);
    setNewProduct({ name: '', price: 0, currency: 'YER', providerId: '', executionType: 'manual' });
    setShowAddProduct(false);
  };

  const onBulkImport = () => {
    if (!bulkProviderId || !bulkText.trim()) return;
    const lines = bulkText.trim().split('\n');
    let imported = 0;
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const price = parseFloat(parts[1]);
        const currency = (parts[2] || 'YER') as 'YER' | 'SAR' | 'USD';
        const executionType = (parts[3] || 'manual') as 'manual' | 'auto';
        if (name && price > 0) {
          const id = generateReference();
          const pkg = { id, providerId: bulkProviderId, name, price, currency, executionType, isActive: true };
          try { set(ref(database, `packages/${id}`), pkg); } catch {}
          imported++;
        }
      }
    }
    setBulkText('');
    setBulkProviderId('');
    setShowBulkImport(false);
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setBulkText(reader.result as string);
    };
    reader.readAsText(file);
  };

  const productCountPerProvider = providers.map(p => ({
    provider: p,
    count: packages.filter(pkg => pkg.providerId === p.id).length,
    activeCount: packages.filter(pkg => pkg.providerId === p.id && pkg.isActive).length,
  }));

  return (
    <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowAddProduct(!showAddProduct); setShowBulkImport(false); }}
          className="flex-1 py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
          <Plus size={18} strokeWidth={1.5} /><span>إضافة منتج</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowBulkImport(!showBulkImport); setShowAddProduct(false); }}
          className="py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)', color: isDark ? '#CCC' : '#666', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
          <Upload size={18} strokeWidth={1.5} /><span>استيراد</span>
        </motion.button>
      </div>

      {/* Add product form */}
      <AnimatePresence>
        {showAddProduct && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <select value={newProduct.providerId} onChange={(e) => setNewProduct({ ...newProduct, providerId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="">اختر المزود</option>
              {providers.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <div className="flex gap-2">
              <input type="number" placeholder="السعر" value={newProduct.price || ''} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
              <select value={newProduct.currency} onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
              </select>
            </div>
            <select value={newProduct.executionType} onChange={(e) => setNewProduct({ ...newProduct, executionType: e.target.value as 'manual' | 'auto' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="manual">تنفيذ يدوي</option><option value="auto">تنفيذ تلقائي</option>
            </select>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAddProduct} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة المنتج</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk import form */}
      <AnimatePresence>
        {showBulkImport && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <Upload size={16} color="#5C1A1B" />
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>استيراد منتجات</h3>
            </div>
            <select value={bulkProviderId} onChange={(e) => setBulkProviderId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="">اختر المزود</option>
              {providers.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <textarea
              placeholder="الاسم، السعر، العملة(YER/SAR/USD)، النوع(manual/auto)&#10;مثال: شحن 500، 500، YER، manual&#10;شحن 1000، 1000، YER، manual"
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none font-mono"
              style={inputStyle}
              dir="ltr"
            />
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => bulkFileRef.current?.click()}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                <Upload size={14} /> رفع ملف CSV
              </motion.button>
              <input ref={bulkFileRef} type="file" accept=".csv,.txt" onChange={handleBulkFileUpload} className="hidden" />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onBulkImport} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>استيراد المنتجات</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl" style={cardStyle}>
        <Search size={16} color={isDark ? '#555' : '#AAA'} />
        <input type="text" placeholder="بحث في المنتجات..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
      </div>

      {/* Provider product counts summary */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>عدد المنتجات لكل مزود</h3>
        <div className="space-y-2">
          {productCountPerProvider.map(({ provider, count, activeCount }) => (
            <div key={provider.id} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                {provider.icon && provider.icon.startsWith('data:') ? (
                  <img src={provider.icon} alt={provider.name} className="w-5 h-5 rounded object-cover" />
                ) : (
                  <span className="font-bold text-[10px]" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>
                )}
              </div>
              <span className="text-xs font-medium flex-1" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</span>
              <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{count}</span>
              <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>منتج</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{activeCount} نشط</span>
            </div>
          ))}
          {productCountPerProvider.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا يوجد مزودون</p>
          )}
        </div>
      </div>

      {/* Products by provider */}
      {providers.map((provider) => {
        const providerProducts = packages.filter(p => p.providerId === provider.id && (!productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())));
        if (providerProducts.length === 0) return null;
        return (
          <div key={provider.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                {provider.icon && provider.icon.startsWith('data:') ? (
                  <img src={provider.icon} alt={provider.name} className="w-6 h-6 rounded object-cover" />
                ) : <span className="font-bold text-xs" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>}
              </div>
              <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</span>
              <span className="text-[10px] mr-auto" style={{ color: isDark ? '#666' : '#AAA' }}>{providerProducts.length} منتج</span>
            </div>
            {providerProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between px-4 py-3" style={{
                borderBottom: index < providerProducts.length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)') : 'none',
                opacity: product.isActive ? 1 : 0.5,
              }}>
                <div>
                  {editingProduct === product.id ? (
                    <div className="flex items-center gap-2">
                      <input type="text" value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} className="px-2 py-1 rounded text-xs outline-none w-28" style={inputStyle} />
                      <input type="number" value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) || 0 })} className="px-2 py-1 rounded text-xs outline-none w-16" style={inputStyle} dir="ltr" />
                      <button onClick={() => { updatePackage(product.id, { name: editProductData.name, price: editProductData.price }); try { update(ref(database, `packages/${product.id}`), { name: editProductData.name, price: editProductData.price }); } catch {} setEditingProduct(null); }}><Save size={14} color="#10B981" /></button>
                      <button onClick={() => setEditingProduct(null)}><X size={14} color="#5C1A1B" /></button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{product.price.toLocaleString()} {currencySymbols[product.currency]}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: product.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: product.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                          {product.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                {editingProduct !== product.id && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingProduct(product.id); setEditProductData({ name: product.name, price: product.price, description: '' }); }}><Edit3 size={12} color={isDark ? '#888' : '#AAA'} /></button>
                    <button onClick={() => handleToggleProduct(product.id)}>
                      {product.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id)}><Trash2 size={14} color="#5C1A1B" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}
      {packages.length === 0 && (
        <div className="flex flex-col items-center py-8"><Package size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد منتجات</p></div>
      )}
    </motion.div>
  );
}
