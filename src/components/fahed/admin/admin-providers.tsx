'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ToggleLeft, ToggleRight, ImagePlus, Server, Edit3, Save, X } from 'lucide-react';
import { useAdminContext } from './admin-context';
import type { ServiceProvider } from '@/lib/store';

export default function AdminProviders() {
  const {
    isDark, cardStyle, inputStyle, providers, setProviders,
    handleAddProvider, handleToggleProvider, handleDeleteProvider, handleUpdateProvider
  } = useAdminContext();

  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', color: '#5C1A1B', categoryId: 'telecom', inputLabel: '', inputType: 'phone' as 'phone' | 'text', inputPrefix: '+967', icon: '' });
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editProviderData, setEditProviderData] = useState<ServiceProvider | null>(null);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const onAddProvider = () => {
    if (!newProvider.name) return;
    handleAddProvider(newProvider);
    setNewProvider({ name: '', color: '#5C1A1B', categoryId: 'telecom', inputLabel: '', inputType: 'phone', inputPrefix: '+967', icon: '' });
    setShowAddProvider(false);
  };

  const handleNewIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNewProvider(prev => ({ ...prev, icon: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (editProviderData) {
        setEditProviderData({ ...editProviderData, icon: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const onSaveEdit = () => {
    if (editProviderData) {
      handleUpdateProvider(editProviderData);
      setEditingProvider(null);
      setEditProviderData(null);
    }
  };

  const startEditing = (provider: ServiceProvider) => {
    setEditingProvider(provider.id);
    setEditProviderData({ ...provider });
  };

  return (
    <motion.div key="providers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddProvider(!showAddProvider)}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
        style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
        <Plus size={18} strokeWidth={1.5} /><span>إضافة مزود خدمة</span>
      </motion.button>

      <AnimatePresence>
        {showAddProvider && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <input type="text" placeholder="اسم المزود" value={newProvider.name} onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <select value={newProvider.categoryId} onChange={(e) => setNewProvider({ ...newProvider, categoryId: e.target.value, inputLabel: e.target.value === 'telecom' ? 'رقم الهاتف' : 'Player ID', inputType: e.target.value === 'telecom' ? 'phone' : 'text', inputPrefix: e.target.value === 'telecom' ? '+967' : '' })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
              <option value="telecom">الاتصالات والإنترنت</option><option value="games">الألعاب والبطاقات</option>
            </select>
            <div className="flex gap-2">
              <input type="text" placeholder="تسمية الحقل" value={newProvider.inputLabel} onChange={(e) => setNewProvider({ ...newProvider, inputLabel: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
              <input type="text" placeholder="بادئة" value={newProvider.inputPrefix} onChange={(e) => setNewProvider({ ...newProvider, inputPrefix: e.target.value })} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} dir="ltr" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
              <input type="color" value={newProvider.color} onChange={(e) => setNewProvider({ ...newProvider, color: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
            </div>
            <div>
              <input type="file" ref={addFileInputRef} accept="image/*" onChange={handleNewIconUpload} className="hidden" />
              <div className="flex items-center gap-3">
                <button onClick={() => addFileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                  <ImagePlus size={14} /><span>رفع أيقونة</span>
                </button>
                {newProvider.icon && <img src={newProvider.icon} alt="icon" className="w-8 h-8 rounded-lg object-cover" />}
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAddProvider} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة المزود</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {providers.map((provider) => (
        <div key={provider.id} className="rounded-2xl p-4" style={{
          ...cardStyle,
          opacity: provider.isActive ? 1 : 0.6,
        }}>
          {editingProvider === provider.id && editProviderData ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-2">
                {editProviderData.icon && editProviderData.icon.startsWith('data:') ? (
                  <img src={editProviderData.icon} alt={editProviderData.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${editProviderData.color}18` }}>
                    <span className="font-bold" style={{ color: editProviderData.color }}>{editProviderData.name.charAt(0)}</span>
                  </div>
                )}
                <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>تعديل المزود</span>
              </div>
              <input type="text" value={editProviderData.name} onChange={e => setEditProviderData({ ...editProviderData, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="اسم المزود" />
              <select value={editProviderData.categoryId} onChange={e => setEditProviderData({ ...editProviderData, categoryId: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                <option value="telecom">الاتصالات والإنترنت</option><option value="games">الألعاب والبطاقات</option>
              </select>
              <div className="flex gap-2">
                <input type="text" value={editProviderData.inputLabel} onChange={e => setEditProviderData({ ...editProviderData, inputLabel: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="تسمية الحقل" />
                <input type="text" value={editProviderData.inputPrefix || ''} onChange={e => setEditProviderData({ ...editProviderData, inputPrefix: e.target.value })} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} placeholder="بادئة" dir="ltr" />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
                <input type="color" value={editProviderData.color} onChange={e => setEditProviderData({ ...editProviderData, color: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
              </div>
              <div>
                <input type="file" ref={editFileInputRef} accept="image/*" onChange={handleEditIconUpload} className="hidden" />
                <div className="flex items-center gap-3">
                  <button onClick={() => editFileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ ...inputStyle, color: isDark ? '#AAA' : '#888' }}>
                    <ImagePlus size={14} /><span>رفع أيقونة جديدة</span>
                  </button>
                  {editProviderData.icon && <img src={editProviderData.icon} alt="icon" className="w-8 h-8 rounded-lg object-cover" />}
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={onSaveEdit} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5" style={{ background: '#10B981' }}>
                  <Save size={14} /><span>حفظ التعديلات</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditingProvider(null); setEditProviderData(null); }} className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                  <X size={14} /><span>إلغاء</span>
                </motion.button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {provider.icon && provider.icon.startsWith('data:') ? (
                  <img src={provider.icon} alt={provider.name} className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${provider.color}18` }}>
                    <span className="font-bold" style={{ color: provider.color }}>{provider.name.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{provider.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${provider.color}15`, color: provider.color }}>{provider.categoryId === 'telecom' ? 'اتصالات' : 'ألعاب'}</span>
                    <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{provider.inputLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => startEditing(provider)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <Edit3 size={12} color="#3B82F6" />
                </motion.button>
                <button onClick={() => handleToggleProvider(provider.id)}>
                  {provider.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
                </button>
                <button onClick={() => handleDeleteProvider(provider.id)}><Trash2 size={14} color="#5C1A1B" /></button>
              </div>
            </div>
          )}
        </div>
      ))}

      {providers.length === 0 && !showAddProvider && (
        <div className="flex flex-col items-center py-8">
          <Server size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
          <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد مزودون</p>
        </div>
      )}
    </motion.div>
  );
}
