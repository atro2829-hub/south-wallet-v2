'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, X, ToggleLeft, ToggleRight, Trash2, ImagePlus, Image as ImageIcon, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { useAdminContext } from './admin-context';
import type { Banner } from './admin-types';

export default function AdminBanners() {
  const {
    isDark, cardStyle, inputStyle, banners, setBanners,
    handleAddBanner, handleToggleBanner, handleDeleteBanner, handleUpdateBanner, handleReorderBanners
  } = useAdminContext();

  const [showAddBanner, setShowAddBanner] = useState(false);
  const [newBanner, setNewBanner] = useState({ title: '', description: '', imageUrl: '', link: '', order: 0 });
  const [editingBanner, setEditingBanner] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const editBannerFileInputRef = useRef<HTMLInputElement>(null);

  const onAddBanner = () => {
    if (!newBanner.title) return;
    handleAddBanner(newBanner);
    setNewBanner({ title: '', description: '', imageUrl: '', link: '', order: 0 });
    setShowAddBanner(false);
  };

  const handleNewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNewBanner(prev => ({ ...prev, imageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setBanners(banners.map(b => b.id === editingBanner ? { ...b, imageUrl: base64 } : b));
    };
    reader.readAsDataURL(file);
  };

  const onSaveEdit = (banner: Banner) => {
    handleUpdateBanner(banner);
    setEditingBanner(null);
  };

  return (
    <motion.div key="banners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddBanner(!showAddBanner)}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
        style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
        <Plus size={18} strokeWidth={1.5} /><span>إضافة بانر</span>
      </motion.button>

      <AnimatePresence>
        {showAddBanner && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <input type="text" placeholder="عنوان البانر" value={newBanner.title} onChange={e => setNewBanner({ ...newBanner, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <textarea placeholder="وصف البانر" value={newBanner.description} onChange={e => setNewBanner({ ...newBanner, description: e.target.value })} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
            <div className="space-y-2">
              <input type="text" placeholder="رابط الصورة (URL)" value={newBanner.imageUrl.startsWith('data:') ? 'تم رفع صورة' : newBanner.imageUrl} onChange={e => setNewBanner({ ...newBanner, imageUrl: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => bannerFileInputRef.current?.click()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                  <ImageIcon size={14} /><span>رفع صورة</span>
                </motion.button>
                <input ref={bannerFileInputRef} type="file" accept="image/*" onChange={handleNewImageUpload} className="hidden" />
              </div>
              {newBanner.imageUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                  <img src={newBanner.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPreviewBanner(newBanner.imageUrl)}
                    className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}
                  >
                    <Eye size={12} color="#FFF" />
                  </button>
                </div>
              )}
            </div>
            <input type="text" placeholder="رابط عند الضغط (اختياري)" value={newBanner.link} onChange={e => setNewBanner({ ...newBanner, link: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>ترتيب العرض</span>
              <input type="number" value={newBanner.order || ''} onChange={e => setNewBanner({ ...newBanner, order: parseInt(e.target.value) || 0 })} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} dir="ltr" />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAddBanner} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة البانر</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {banners.map((banner, index) => (
        <div key={banner.id} className="rounded-2xl p-4" style={{
          ...cardStyle,
          opacity: banner.isActive ? 1 : 0.6,
        }}>
          {editingBanner === banner.id ? (
            <div className="space-y-3">
              <input type="text" value={banner.title} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, title: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="عنوان البانر" />
              <textarea value={banner.description} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, description: e.target.value } : b))} rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} placeholder="وصف البانر" />
              <div className="flex gap-2">
                <input type="text" placeholder="رابط الصورة" value={banner.imageUrl.startsWith('data:') ? 'تم رفع صورة' : banner.imageUrl} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, imageUrl: e.target.value } : b))} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => editBannerFileInputRef.current?.click()}
                  className="px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                  <ImageIcon size={14} />
                </motion.button>
                <input ref={editBannerFileInputRef} type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
              </div>
              {banner.imageUrl && (
                <div className="w-full h-24 rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                  <img src={banner.imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input type="text" placeholder="رابط عند الضغط" value={banner.link || ''} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, link: e.target.value } : b))} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
              <div className="flex items-center gap-3">
                <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>ترتيب</span>
                <input type="number" value={banner.order} onChange={e => setBanners(banners.map(b => b.id === banner.id ? { ...b, order: parseInt(e.target.value) || 0 } : b))} className="w-20 px-3 py-2.5 rounded-xl text-sm outline-none text-center" style={inputStyle} dir="ltr" />
              </div>
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => onSaveEdit(banner)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5" style={{ background: '#10B981' }}>
                  <Save size={14} /><span>حفظ</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingBanner(null)} className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#CCC' : '#666' }}>
                  <X size={14} /><span>إلغاء</span>
                </motion.button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                {banner.imageUrl ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                    <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPreviewBanner(banner.imageUrl)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.4)' }}
                    >
                      <Eye size={14} color="#FFF" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
                    <ImageIcon size={24} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{banner.title}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>#{banner.order}</span>
                  </div>
                  {banner.description && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: isDark ? '#888' : '#888' }}>{banner.description}</p>}
                  {!banner.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>معطّل</span>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingBanner(banner.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
                      تعديل
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleToggleBanner(banner)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: banner.isActive ? 'rgba(92,26,27,0.1)' : 'rgba(16,185,129,0.1)', color: banner.isActive ? '#5C1A1B' : '#10B981' }}>
                      {banner.isActive ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                      {banner.isActive ? 'تعطيل' : 'تفعيل'}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDeleteBanner(banner)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                      <Trash2 size={10} /> حذف
                    </motion.button>
                    {/* Reorder buttons */}
                    <div className="flex gap-1">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleReorderBanners(banner.id, 'up')} disabled={index === 0}
                        className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        <ChevronUp size={10} color={isDark ? '#AAA' : '#666'} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleReorderBanners(banner.id, 'down')} disabled={index === banners.length - 1}
                        className="w-6 h-6 rounded flex items-center justify-center disabled:opacity-30"
                        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                        <ChevronDown size={10} color={isDark ? '#AAA' : '#666'} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {banners.length === 0 && !showAddBanner && (
        <div className="flex flex-col items-center py-8">
          <ImagePlus size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} />
          <p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد بانرات</p>
          <p className="text-xs mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>أضف بانرات لتظهر على الشاشة الرئيسية</p>
        </div>
      )}

      {/* Banner Preview Modal */}
      <AnimatePresence>
        {previewBanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="w-full max-w-sm">
              <div className="rounded-2xl overflow-hidden" style={{ background: isDark ? '#1A1A1A' : '#FFF' }}>
                <div className="flex items-center justify-between p-4" style={{ borderBottom: isDark ? '1px solid #333' : '1px solid #EEE' }}>
                  <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معاينة البانر</span>
                  <button onClick={() => setPreviewBanner(null)}><X size={18} color={isDark ? '#FFF' : '#333'} /></button>
                </div>
                <div className="p-4">
                  <img src={previewBanner} alt="preview" className="w-full rounded-xl" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
