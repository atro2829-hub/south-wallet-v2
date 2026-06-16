'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ToggleLeft, ToggleRight, ImagePlus,
  Edit3, Save, X, ChevronDown, ChevronUp, Smartphone,
  Wifi, Phone, Upload, Package,
} from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, generateReference } from '@/lib/utils';
import { ref, set, get, update, remove, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { ServiceProvider } from '@/lib/store';

interface SubSection {
  id: string;
  name: string;
  icon: string;
  order: number;
  categoryIds: string[];
}

const defaultRechargeSubSections: SubSection[] = [
  { id: 'sub-telecom', name: 'الاتصالات', icon: '', order: 0, categoryIds: ['telecom'] },
  { id: 'sub-internet', name: 'الإنترنت', icon: '', order: 1, categoryIds: ['internet'] },
];

// Category IDs that belong to recharge section
const rechargeCategoryIds = ['telecom', 'internet'];

export default function AdminRechargeProviders() {
  const {
    isDark, cardStyle, inputStyle, providers, packages,
    handleAddProduct, handleToggleProduct, handleDeleteProduct,
    handleAddProvider, handleToggleProvider, handleDeleteProvider, handleUpdateProvider,
    updatePackage, addAuditEntry,
  } = useAdminContext();

  const [subSections, setSubSections] = useState<SubSection[]>(defaultRechargeSubSections);
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [showAddSubSection, setShowAddSubSection] = useState(false);
  const [newSubSection, setNewSubSection] = useState({ name: '', icon: '', categoryIds: '' });
  const addSubIconRef = useRef<HTMLInputElement>(null);

  // Provider add state
  const [showAddProvider, setShowAddProvider] = useState<string | null>(null); // sub-section id
  const [newProvider, setNewProvider] = useState({ name: '', color: '#5C1A1B', categoryId: 'telecom', inputLabel: '', inputType: 'phone' as 'phone' | 'text', inputPrefix: '+967', icon: '' });
  const addProviderIconRef = useRef<HTMLInputElement>(null);

  // Product add state
  const [showAddProduct, setShowAddProduct] = useState<string | null>(null); // provider id
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, currency: 'YER' as 'YER' | 'SAR' | 'USD', providerId: '', executionType: 'manual' as 'manual' | 'auto' });

  // Edit provider state
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editProviderData, setEditProviderData] = useState<ServiceProvider | null>(null);
  const editProviderIconRef = useRef<HTMLInputElement>(null);

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editProductData, setEditProductData] = useState({ name: '', price: 0 });

  // Load sub-sections from Firebase
  useEffect(() => {
    const subRef = ref(database, 'adminSettings/rechargeSubSections');
    const unsubscribe = onValue(subRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data) as SubSection[];
        setSubSections(list.sort((a, b) => a.order - b.order));
      } else {
        // Initialize defaults
        setSubSections(defaultRechargeSubSections);
        defaultRechargeSubSections.forEach(sub => {
          try { set(ref(database, `adminSettings/rechargeSubSections/${sub.id}`), sub); } catch {}
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Filter providers that belong to recharge categories
  const rechargeProviders = providers.filter(p =>
    rechargeCategoryIds.includes(p.categoryId)
  );

  // Get providers for a specific sub-section
  const getProvidersForSub = (sub: SubSection) => {
    return rechargeProviders.filter(p => sub.categoryIds.includes(p.categoryId));
  };

  // Get products for a provider
  const getProductsForProvider = (providerId: string) => {
    return packages.filter(p => p.providerId === providerId);
  };

  // Sub-section handlers
  const handleAddSubSection = () => {
    if (!newSubSection.name) return;
    const id = `sub-${Date.now()}`;
    const sub: SubSection = {
      id,
      name: newSubSection.name,
      icon: newSubSection.icon,
      order: subSections.length,
      categoryIds: newSubSection.categoryIds ? newSubSection.categoryIds.split(',').map(s => s.trim()) : ['telecom'],
    };
    try {
      set(ref(database, `adminSettings/rechargeSubSections/${id}`), sub);
      addAuditEntry(`تم إضافة قسم فرعي ${sub.name} في مزودي الشحن الفوري`);
    } catch {}
    setNewSubSection({ name: '', icon: '', categoryIds: '' });
    setShowAddSubSection(false);
  };

  const handleDeleteSubSection = (sub: SubSection) => {
    try {
      remove(ref(database, `adminSettings/rechargeSubSections/${sub.id}`));
      addAuditEntry(`تم حذف القسم الفرعي ${sub.name}`);
    } catch {}
  };

  const handleSubIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewSubSection(prev => ({ ...prev, icon: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Provider handlers
  const onAddProvider = (subSectionId: string) => {
    if (!newProvider.name) return;
    const sub = subSections.find(s => s.id === subSectionId);
    if (sub && sub.categoryIds.length > 0 && !sub.categoryIds.includes(newProvider.categoryId)) {
      setNewProvider(prev => ({ ...prev, categoryId: sub.categoryIds[0] }));
    }
    handleAddProvider(newProvider);
    setNewProvider({ name: '', color: '#5C1A1B', categoryId: 'telecom', inputLabel: '', inputType: 'phone', inputPrefix: '+967', icon: '' });
    setShowAddProvider(null);
  };

  const handleNewProviderIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProvider(prev => ({ ...prev, icon: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditProviderIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (editProviderData) {
        setEditProviderData({ ...editProviderData, icon: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const startEditing = (provider: ServiceProvider) => {
    setEditingProvider(provider.id);
    setEditProviderData({ ...provider });
  };

  const onSaveEdit = () => {
    if (editProviderData) {
      handleUpdateProvider(editProviderData);
      setEditingProvider(null);
      setEditProviderData(null);
    }
  };

  // Product handlers
  const onAddProduct = () => {
    if (!newProduct.name || !newProduct.providerId || newProduct.price <= 0) return;
    handleAddProduct(newProduct);
    setNewProduct({ name: '', price: 0, currency: 'YER', providerId: '', executionType: 'manual' });
    setShowAddProduct(null);
  };

  const renderProviderIcon = (provider: ServiceProvider, size: number = 40) => {
    if (provider.icon && provider.icon.startsWith('data:')) {
      return <img src={provider.icon} alt={provider.name} className="rounded-xl object-cover" style={{ width: size, height: size }} />;
    }
    return (
      <div className="rounded-xl flex items-center justify-center" style={{ width: size, height: size, background: `${provider.color}18` }}>
        <span className="font-bold" style={{ color: provider.color, fontSize: size * 0.35 }}>{provider.name.charAt(0)}</span>
      </div>
    );
  };

  return (
    <motion.div key="rechargeProviders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
          <Smartphone size={20} color="#10B981" />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>مزودي الشحن الفوري</h2>
          <p className="text-[10px]" style={{ color: isDark ? '#888' : '#999' }}>إدارة مزودي الاتصالات والإنترنت وأقسامهم</p>
        </div>
      </div>

      {/* Add sub-section button */}
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddSubSection(!showAddSubSection)}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
        style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)', backdropFilter: 'blur(20px)' }}>
        <Plus size={18} strokeWidth={1.5} /><span>إضافة قسم فرعي</span>
      </motion.button>

      {/* Add sub-section form */}
      <AnimatePresence>
        {showAddSubSection && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <input type="text" placeholder="اسم القسم الفرعي" value={newSubSection.name} onChange={(e) => setNewSubSection({ ...newSubSection, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <input type="text" placeholder="معرفات الفئات (مفصولة بفواصل: telecom, internet)" value={newSubSection.categoryIds} onChange={(e) => setNewSubSection({ ...newSubSection, categoryIds: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
            <div>
              <input type="file" ref={addSubIconRef} accept="image/*" onChange={handleSubIconUpload} className="hidden" />
              <div className="flex items-center gap-3">
                <button onClick={() => addSubIconRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                  <ImagePlus size={14} /><span>رفع أيقونة</span>
                </button>
                {newSubSection.icon && <img src={newSubSection.icon} alt="icon" className="w-8 h-8 rounded-lg object-cover" />}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleAddSubSection} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#10B981' }}>إضافة القسم</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sub-sections */}
      {subSections.map((sub) => {
        const subProviders = getProvidersForSub(sub);
        const isExpanded = expandedSub === sub.id;

        return (
          <div key={sub.id} className="rounded-2xl overflow-hidden" style={cardStyle}>
            {/* Sub-section header */}
            <div
              className="px-4 py-3 flex items-center gap-3 cursor-pointer"
              onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
              style={{ borderBottom: isExpanded ? (isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)') : 'none' }}
            >
              {sub.icon && sub.icon.startsWith('data:') ? (
                <img src={sub.icon} alt={sub.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  {sub.categoryIds.includes('telecom') ? <Phone size={16} color="#10B981" /> : <Wifi size={16} color="#10B981" />}
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{sub.name}</p>
                <p className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>{subProviders.length} مزود</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleDeleteSubSection(sub); }} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.08)' }}>
                  <Trash2 size={12} color="#5C1A1B" />
                </button>
                {isExpanded ? <ChevronUp size={16} color={isDark ? '#888' : '#AAA'} /> : <ChevronDown size={16} color={isDark ? '#888' : '#AAA'} />}
              </div>
            </div>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-3 space-y-3">
                    {/* Add provider button for this sub-section */}
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => {
                      setShowAddProvider(showAddProvider === sub.id ? null : sub.id);
                      const firstCategory = sub.categoryIds[0] || 'telecom';
                      setNewProvider(prev => ({ ...prev, categoryId: firstCategory, inputLabel: firstCategory === 'telecom' ? 'رقم الهاتف' : 'رقم الحساب', inputType: firstCategory === 'telecom' ? 'phone' : 'text', inputPrefix: firstCategory === 'telecom' ? '+967' : '' }));
                    }}
                      className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-medium"
                      style={{ background: 'rgba(92,26,27,0.08)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.15)' }}>
                      <Plus size={14} /><span>إضافة مزود</span>
                    </motion.button>

                    {/* Add provider form */}
                    <AnimatePresence>
                      {showAddProvider === sub.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-xl p-3 space-y-2 overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                          <input type="text" placeholder="اسم المزود" value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} />
                          <select value={newProvider.categoryId} onChange={(e) => setNewProvider({ ...newProvider, categoryId: e.target.value })} className="w-full px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle}>
                            {sub.categoryIds.map(catId => (
                              <option key={catId} value={catId}>{catId === 'telecom' ? 'الاتصالات' : catId === 'internet' ? 'الإنترنت' : catId}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input type="text" placeholder="تسمية الحقل" value={newProvider.inputLabel} onChange={(e) => setNewProvider({ ...newProvider, inputLabel: e.target.value })} className="flex-1 px-3 py-2 rounded-lg text-xs outline-none" style={inputStyle} />
                            <input type="text" placeholder="بادئة" value={newProvider.inputPrefix} onChange={(e) => setNewProvider({ ...newProvider, inputPrefix: e.target.value })} className="w-16 px-2 py-2 rounded-lg text-xs outline-none text-center" style={inputStyle} dir="ltr" />
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-[10px]" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
                            <input type="color" value={newProvider.color} onChange={(e) => setNewProvider({ ...newProvider, color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" style={{ background: 'transparent' }} />
                          </div>
                          <div>
                            <input type="file" ref={addProviderIconRef} accept="image/*" onChange={handleNewProviderIconUpload} className="hidden" />
                            <div className="flex items-center gap-2">
                              <button onClick={() => addProviderIconRef.current?.click()} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px]" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                                <ImagePlus size={12} /><span>أيقونة</span>
                              </button>
                              {newProvider.icon && <img src={newProvider.icon} alt="icon" className="w-6 h-6 rounded object-cover" />}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => onAddProvider(sub.id)} className="flex-1 py-2 rounded-lg text-[10px] font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة</motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddProvider(null)} className="flex-1 py-2 rounded-lg text-[10px] font-medium" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#CCC' : '#666' }}>إلغاء</motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Providers list */}
                    {subProviders.map((provider) => {
                      const providerProducts = getProductsForProvider(provider.id);

                      return (
                        <div key={provider.id} className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', opacity: provider.isActive ? 1 : 0.6 }}>
                          {/* Provider header */}
                          <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)' }}>
                            {editingProvider === provider.id && editProviderData ? (
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  {renderProviderIcon(editProviderData, 32)}
                                  <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تعديل المزود</span>
                                </div>
                                <input type="text" value={editProviderData.name} onChange={e => setEditProviderData({ ...editProviderData, name: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} placeholder="اسم المزود" />
                                <select value={editProviderData.categoryId} onChange={e => setEditProviderData({ ...editProviderData, categoryId: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                                  <option value="telecom">الاتصالات</option>
                                  <option value="internet">الإنترنت</option>
                                </select>
                                <div className="flex gap-2">
                                  <input type="text" value={editProviderData.inputLabel} onChange={e => setEditProviderData({ ...editProviderData, inputLabel: e.target.value })} className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} placeholder="تسمية الحقل" />
                                  <input type="text" value={editProviderData.inputPrefix || ''} onChange={e => setEditProviderData({ ...editProviderData, inputPrefix: e.target.value })} className="w-16 px-2 py-1.5 rounded-lg text-xs outline-none text-center" style={inputStyle} dir="ltr" />
                                </div>
                                <div className="flex items-center gap-3">
                                  <input type="color" value={editProviderData.color} onChange={e => setEditProviderData({ ...editProviderData, color: e.target.value })} className="w-8 h-6 rounded cursor-pointer" style={{ background: 'transparent' }} />
                                  <input type="file" ref={editProviderIconRef} accept="image/*" onChange={handleEditProviderIconUpload} className="hidden" />
                                  <button onClick={() => editProviderIconRef.current?.click()} className="flex items-center gap-1 text-[10px]" style={{ color: isDark ? '#AAA' : '#888' }}>
                                    <ImagePlus size={12} />أيقونة
                                  </button>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={onSaveEdit} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center justify-center gap-1" style={{ background: '#10B981' }}><Save size={10} />حفظ</button>
                                  <button onClick={() => { setEditingProvider(null); setEditProviderData(null); }} className="flex-1 py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#CCC' : '#666' }}><X size={10} />إلغاء</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 flex-1">
                                  {renderProviderIcon(provider, 32)}
                                  <div>
                                    <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${provider.color}15`, color: provider.color }}>{provider.categoryId === 'telecom' ? 'اتصالات' : 'إنترنت'}</span>
                                      <span className="text-[9px]" style={{ color: isDark ? '#666' : '#AAA' }}>{providerProducts.length} منتج</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => { setShowAddProduct(showAddProduct === provider.id ? null : provider.id); setNewProduct(prev => ({ ...prev, providerId: provider.id })); }} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                                    <Plus size={10} color="#10B981" />
                                  </button>
                                  <button onClick={() => startEditing(provider)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                                    <Edit3 size={10} color="#3B82F6" />
                                  </button>
                                  <button onClick={() => handleToggleProvider(provider.id)}>
                                    {provider.isActive ? <ToggleRight size={18} color="#10B981" /> : <ToggleLeft size={18} color={isDark ? '#444' : '#CCC'} />}
                                  </button>
                                  <button onClick={() => handleDeleteProvider(provider.id)} className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.08)' }}>
                                    <Trash2 size={10} color="#5C1A1B" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Add product form */}
                          <AnimatePresence>
                            {showAddProduct === provider.id && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 py-2 overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                <div className="space-y-2">
                                  <input type="text" placeholder="اسم المنتج" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} />
                                  <div className="flex gap-2">
                                    <input type="number" placeholder="السعر" value={newProduct.price || ''} onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })} className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} dir="ltr" />
                                    <select value={newProduct.currency} onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                                      <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                                    </select>
                                  </div>
                                  <select value={newProduct.executionType} onChange={(e) => setNewProduct({ ...newProduct, executionType: e.target.value as 'manual' | 'auto' })} className="w-full px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                                    <option value="manual">تنفيذ يدوي</option><option value="auto">تنفيذ تلقائي</option>
                                  </select>
                                  <div className="flex gap-2">
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={onAddProduct} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة منتج</motion.button>
                                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddProduct(null)} className="flex-1 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#CCC' : '#666' }}>إلغاء</motion.button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Products list */}
                          {providerProducts.length > 0 && editingProvider !== provider.id && (
                            <div>
                              {providerProducts.map((product, idx) => (
                                <div key={product.id} className="flex items-center justify-between px-3 py-2" style={{
                                  borderBottom: idx < providerProducts.length - 1 ? (isDark ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(0,0,0,0.03)') : 'none',
                                  opacity: product.isActive ? 1 : 0.5,
                                }}>
                                  {editingProduct === product.id ? (
                                    <div className="flex items-center gap-1.5 flex-1">
                                      <input type="text" value={editProductData.name} onChange={e => setEditProductData({ ...editProductData, name: e.target.value })} className="px-2 py-1 rounded text-[10px] outline-none flex-1" style={inputStyle} />
                                      <input type="number" value={editProductData.price} onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) || 0 })} className="px-2 py-1 rounded text-[10px] outline-none w-16" style={inputStyle} dir="ltr" />
                                      <button onClick={() => { updatePackage(product.id, { name: editProductData.name, price: editProductData.price }); try { update(ref(database, `packages/${product.id}`), { name: editProductData.name, price: editProductData.price }); } catch {} setEditingProduct(null); }}><Save size={10} color="#10B981" /></button>
                                      <button onClick={() => setEditingProduct(null)}><X size={10} color="#5C1A1B" /></button>
                                    </div>
                                  ) : (
                                    <>
                                      <div>
                                        <p className="text-[11px] font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{product.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[10px] font-bold" style={{ color: '#5C1A1B' }}>{product.price.toLocaleString()} {currencySymbols[product.currency]}</span>
                                          <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: product.executionType === 'manual' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: product.executionType === 'manual' ? '#F59E0B' : '#10B981' }}>
                                            {product.executionType === 'manual' ? 'يدوي' : 'تلقائي'}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <button onClick={() => { setEditingProduct(product.id); setEditProductData({ name: product.name, price: product.price }); }}><Edit3 size={10} color={isDark ? '#888' : '#AAA'} /></button>
                                        <button onClick={() => handleToggleProduct(product.id)}>
                                          {product.isActive ? <ToggleRight size={16} color="#10B981" /> : <ToggleLeft size={16} color={isDark ? '#444' : '#CCC'} />}
                                        </button>
                                        <button onClick={() => handleDeleteProduct(product.id)}><Trash2 size={10} color="#5C1A1B" /></button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {subProviders.length === 0 && (
                      <div className="flex flex-col items-center py-4">
                        <Smartphone size={24} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
                        <p className="text-[10px] mt-1" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد مزودون في هذا القسم</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {subSections.length === 0 && (
        <div className="flex flex-col items-center py-8">
          <Smartphone size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
          <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أقسام فرعية</p>
        </div>
      )}
    </motion.div>
  );
}
