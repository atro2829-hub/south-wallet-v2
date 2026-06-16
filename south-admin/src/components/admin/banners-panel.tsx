'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { supabase, DbBanner } from '@/lib/supabase';
import { storage } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { formatNumber, cn } from '@/lib/utils';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
  Plus, Trash2, Edit3, Image as ImageIcon,
  CheckCircle, AlertCircle, Eye, GripVertical,
  Upload, X, Loader2, LayoutDashboard, Smartphone,
  Wallet, LayoutGrid, Globe, CalendarDays, ArrowUpDown,
  Monitor, Link2, Tag, Layers, Activity,
  CalendarClock, Zap, Ban, Move
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ============================================
// Types
// ============================================
type BannerPosition = 'login' | 'home' | 'services' | 'wallet' | 'all';
type BannerLinkType = 'none' | 'url' | 'screen' | 'provider' | 'promo';
type BannerStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

interface BannerFormData {
  title: string;
  description: string;
  image_url: string;
  position: BannerPosition;
  link_type: BannerLinkType;
  link_target: string;
  sort_order: number;
  is_active: boolean;
  start_date: Date | undefined;
  end_date: Date | undefined;
}

// ============================================
// Constants
// ============================================
const POSITION_CONFIG: Record<BannerPosition, { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; dims: string }> = {
  home: { label: 'الرئيسية', icon: LayoutDashboard, color: '#C41E3A', dims: '1200 × 400' },
  login: { label: 'تسجيل الدخول', icon: Smartphone, color: '#5C1A1B', dims: '800 × 600' },
  services: { label: 'الخدمات', icon: LayoutGrid, color: '#3D0F10', dims: '1200 × 400' },
  wallet: { label: 'المحفظة', icon: Wallet, color: '#8B3A3E', dims: '1200 × 400' },
  all: { label: 'جميع المواضع', icon: Globe, color: '#D44A5C', dims: '1200 × 400' },
};

const LINK_TYPE_CONFIG: Record<BannerLinkType, { label: string; placeholder: string }> = {
  none: { label: 'بدون رابط', placeholder: '' },
  url: { label: 'رابط خارجي', placeholder: 'https://example.com' },
  screen: { label: 'شاشة داخلية', placeholder: 'home / services / wallet' },
  provider: { label: 'مزود خدمة', placeholder: 'معرف المزود' },
  promo: { label: 'كود ترويجي', placeholder: 'PROMO-CODE' },
};

const EMPTY_FORM: BannerFormData = {
  title: '',
  description: '',
  image_url: '',
  position: 'home',
  link_type: 'none',
  link_target: '',
  sort_order: 0,
  is_active: true,
  start_date: undefined,
  end_date: undefined,
};

// ============================================
// Helper Functions
// ============================================
function getBannerStatus(banner: DbBanner): BannerStatus {
  if (!banner.is_active) return 'inactive';
  const now = new Date();
  if (banner.start_date && new Date(banner.start_date) > now) return 'scheduled';
  if (banner.end_date && new Date(banner.end_date) < now) return 'expired';
  return 'active';
}

function getStatusConfig(status: BannerStatus) {
  switch (status) {
    case 'active': return { label: 'نشط', color: 'bg-green-500/15 text-green-600 dark:text-green-400', icon: Zap };
    case 'scheduled': return { label: 'مجدول', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', icon: CalendarClock };
    case 'expired': return { label: 'منتهي', color: 'bg-red-500/15 text-red-600 dark:text-red-400', icon: Ban };
    case 'inactive': return { label: 'معطل', color: 'bg-gray-500/15 text-gray-600 dark:text-gray-400', icon: Ban };
  }
}

// ============================================
// Sub-Components
// ============================================

/** Stats Card */
function StatsCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-4 flex items-center gap-3"
    >
      <div className="p-2.5 rounded-xl" style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{formatNumber(value)}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </motion.div>
  );
}

/** Date Picker Field */
function DatePickerField({
  label,
  date,
  onSelect,
  placeholder,
}: {
  label: string;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-right h-11 font-normal rounded-xl',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarDays className="ml-2 h-4 w-4" />
            {date ? format(date, 'yyyy/MM/dd', { locale: ar }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => { onSelect(d); setOpen(false); }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Image Upload Zone with Drag-and-Drop */
function ImageUploadZone({
  imageUrl,
  onImageSet,
  onImageClear,
  position,
  uploading,
  uploadProgress,
}: {
  imageUrl: string;
  onImageSet: (file: File) => void;
  onImageClear: () => void;
  position: BannerPosition;
  uploading: boolean;
  uploadProgress: number;
}) {
  const [dragOver, setDragOver] = useState(false);
  const dims = POSITION_CONFIG[position]?.dims || '1200 × 400';

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSet(file);
    }
  }, [onImageSet]);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">صورة البانر</Label>

      {imageUrl ? (
        <div className="relative group rounded-xl overflow-hidden border border-border/30">
          <img
            src={imageUrl}
            alt="معاينة البانر"
            className="w-full h-40 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-lg"
              onClick={onImageClear}
            >
              <X className="w-4 h-4 ml-1" />
              إزالة
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 right-2">
            <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-0">
              {dims} بكسل (مستحسن)
            </Badge>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer min-h-[140px]',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border/40 hover:border-primary/50 bg-muted/10'
          )}
          onClick={() => document.getElementById('banner-image-input')?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">جاري الرفع... {uploadProgress}%</p>
              <div className="w-full max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-primary/10">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">اسحب الصورة هنا أو اضغط للرفع</p>
                <p className="text-xs text-muted-foreground mt-1">الأبعاد المستحسنة: {dims} بكسل</p>
              </div>
            </>
          )}
          <input
            id="banner-image-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImageSet(file);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Position Preview Card */
function PositionPreviewCard({
  position,
  banners,
}: {
  position: BannerPosition;
  banners: DbBanner[];
}) {
  const config = POSITION_CONFIG[position];
  const Icon = config.icon;
  const now = new Date();
  const visibleBanners = banners.filter((b) => {
    if (!b.is_active) return false;
    if (b.start_date && new Date(b.start_date) > now) return false;
    if (b.end_date && new Date(b.end_date) < now) return false;
    return true;
  }).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: config.color }} />
        <span className="text-sm font-semibold text-foreground">{config.label}</span>
        <Badge variant="secondary" className="text-[10px]">{formatNumber(visibleBanners.length)} بانر</Badge>
      </div>

      {position === 'login' ? (
        <div className="relative w-48 h-72 mx-auto rounded-3xl border-2 border-border/30 overflow-hidden bg-background shadow-lg">
          <div className="absolute inset-0 flex items-center justify-center">
            {visibleBanners.length > 0 ? (
              <img
                src={visibleBanners[0].image_url}
                alt={visibleBanners[0].title}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 flex items-center justify-center bg-muted/30">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <div className="w-20 h-1.5 rounded-full bg-white/40 mx-auto flex gap-1 justify-center">
              {visibleBanners.slice(0, 3).map((_, idx) => (
                <div key={idx} className={cn('h-1 rounded-full flex-1', idx === 0 ? 'bg-white' : 'bg-white/40')} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/30 overflow-hidden bg-muted/10">
          <div className="h-8 flex items-center px-3 bg-muted/30">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
          </div>
          <div className="p-2 space-y-2">
            {visibleBanners.length > 0 ? (
              visibleBanners.slice(0, 3).map((b) => (
                <div key={b.id} className="rounded-lg overflow-hidden h-16 relative">
                  <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
                    <p className="text-white text-[9px] font-medium truncate">{b.title}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
                لا توجد بانرات
              </div>
            )}
            {visibleBanners.length > 3 && (
              <p className="text-[10px] text-center text-muted-foreground">
                +{formatNumber(visibleBanners.length - 3)} بانرات أخرى
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================
export default function BannersPanel() {
  const { showToast } = useAdminStore();

  // Data
  const [banners, setBanners] = useState<DbBanner[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [positionFilter, setPositionFilter] = useState<BannerPosition | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | BannerStatus>('all');

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<DbBanner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<DbBanner | null>(null);

  // Form
  const [form, setForm] = useState<BannerFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // Auto-expire check interval
  useEffect(() => {
    const interval = setInterval(() => {
      setBanners((prev) => {
        let changed = false;
        const updated = prev.map((b) => {
          if (b.is_active && b.end_date && new Date(b.end_date) < new Date()) {
            changed = true;
            return { ...b, is_active: false };
          }
          return b;
        });
        return changed ? updated : prev;
      });
    }, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load banners from Supabase
  const loadBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      startTransition(() => {
        setBanners((data as DbBanner[]) || []);
        setLoading(false);
      });
    } catch (err) {
      console.error('Error loading banners:', err);
      startTransition(() => { setLoading(false); });
    }
  }, []);

  // Initial load
  useEffect(() => {
    startTransition(() => { loadBanners(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtered banners
  const filteredBanners = banners.filter((b) => {
    if (positionFilter !== 'all' && b.position !== positionFilter) return false;
    if (statusFilter !== 'all' && getBannerStatus(b) !== statusFilter) return false;
    return true;
  });

  // Stats
  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => getBannerStatus(b) === 'active').length;
  const scheduledBanners = banners.filter((b) => getBannerStatus(b) === 'scheduled').length;
  const expiredBanners = banners.filter((b) => getBannerStatus(b) === 'expired').length;
  const activePerPosition = (pos: BannerPosition) =>
    banners.filter((b) => (b.position === pos || b.position === 'all') && getBannerStatus(b) === 'active').length;

  // ============================================
  // Image Upload to Firebase Storage
  // ============================================
  const uploadImageToStorage = async (file: File): Promise<string> => {
    const fileName = `banners/${Date.now()}_${file.name}`;
    const sRef = storageRef(storage, fileName);
    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(sRef, file);
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const handleImageSelected = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleImageClear = () => {
    setImageFile(null);
    setImagePreview('');
    setForm((prev) => ({ ...prev, image_url: '' }));
  };

  // ============================================
  // CRUD Operations
  // ============================================
  const openCreateDialog = () => {
    setEditingBanner(null);
    setForm({ ...EMPTY_FORM });
    setImageFile(null);
    setImagePreview('');
    setUploadProgress(0);
    setDialogOpen(true);
  };

  const openEditDialog = (banner: DbBanner) => {
    setEditingBanner(banner);
    setForm({
      title: banner.title || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      position: banner.position || 'home',
      link_type: banner.link_type || 'none',
      link_target: banner.link_target || '',
      sort_order: banner.sort_order || 0,
      is_active: banner.is_active,
      start_date: banner.start_date ? new Date(banner.start_date) : undefined,
      end_date: banner.end_date ? new Date(banner.end_date) : undefined,
    });
    setImagePreview(banner.image_url || '');
    setImageFile(null);
    setUploadProgress(0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      showToast('يرجى إدخال عنوان البانر', 'error');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.image_url;

      // Upload new image if selected
      if (imageFile) {
        setUploading(true);
        imageUrl = await uploadImageToStorage(imageFile);
        setUploading(false);
      }

      if (!imageUrl) {
        showToast('يرجى رفع صورة للبانر', 'error');
        setSaving(false);
        return;
      }

      const bannerData = {
        title: form.title,
        description: form.description,
        image_url: imageUrl,
        position: form.position,
        link_type: form.link_type,
        link_target: form.link_type !== 'none' ? form.link_target : '',
        sort_order: form.sort_order,
        is_active: form.is_active,
        start_date: form.start_date ? form.start_date.toISOString() : null,
        end_date: form.end_date ? form.end_date.toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      if (editingBanner) {
        const { error } = await supabase
          .from('banners')
          .update(bannerData)
          .eq('id', editingBanner.id);
        if (error) throw error;
        showToast('تم تحديث البانر بنجاح', 'success');
      } else {
        const { error } = await supabase
          .from('banners')
          .insert({ ...bannerData, created_at: new Date().toISOString() });
        if (error) throw error;
        showToast('تم إضافة البانر بنجاح', 'success');
      }

      setDialogOpen(false);
      loadBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      showToast('خطأ في حفظ البانر', 'error');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleToggleActive = async (banner: DbBanner) => {
    try {
      const { error } = await supabase
        .from('banners')
        .update({ is_active: !banner.is_active, updated_at: new Date().toISOString() })
        .eq('id', banner.id);
      if (error) throw error;
      showToast(banner.is_active ? 'تم تعطيل البانر' : 'تم تفعيل البانر', 'success');
      loadBanners();
    } catch (err) {
      console.error('Error toggling banner:', err);
      showToast('خطأ في تحديث البانر', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingBanner) return;
    try {
      // Try to delete image from Firebase Storage
      if (deletingBanner.image_url && deletingBanner.image_url.includes('firebasestorage')) {
        try {
          const imageRef = storageRef(storage, deletingBanner.image_url);
          await deleteObject(imageRef);
        } catch {
          // Image may not exist in storage, continue with deletion
        }
      }

      const { error } = await supabase
        .from('banners')
        .delete()
        .eq('id', deletingBanner.id);
      if (error) throw error;
      showToast('تم حذف البانر بنجاح', 'success');
      loadBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      showToast('خطأ في حذف البانر', 'error');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingBanner(null);
    }
  };

  const handleReorder = async (reordered: DbBanner[]) => {
    // Optimistic update
    const updatedBanners = banners.map((b) => {
      const idx = reordered.findIndex((r) => r.id === b.id);
      if (idx !== -1) return { ...b, sort_order: idx };
      return b;
    });
    setBanners(updatedBanners);

    try {
      const updates = reordered.map((b, index) =>
        supabase.from('banners').update({ sort_order: index, updated_at: new Date().toISOString() }).eq('id', b.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error('Error reordering banners:', err);
      showToast('خطأ في إعادة الترتيب', 'error');
      loadBanners();
    }
  };

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري تحميل البانرات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة البانرات الإعلانية</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إدارة البانرات الإعلانية في جميع أنحاء التطبيق
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewDialogOpen(true)}
            className="rounded-xl"
          >
            <Eye className="w-4 h-4 ml-1" />
            معاينة
          </Button>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 ml-1" />
            بانر جديد
          </Button>
        </div>
      </div>

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard icon={Layers} label="إجمالي البانرات" value={totalBanners} color="#5C1A1B" />
        <StatsCard icon={Zap} label="بانرات نشطة" value={activeBanners} color="#2E7D32" />
        <StatsCard icon={CalendarClock} label="مجدولة" value={scheduledBanners} color="#F57F17" />
        <StatsCard icon={Ban} label="منتهية الصلاحية" value={expiredBanners} color="#C62828" />
      </div>

      {/* Active per position mini-stats */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(POSITION_CONFIG) as BannerPosition[]).map((pos) => {
          const config = POSITION_CONFIG[pos];
          const Icon = config.icon;
          return (
            <Badge
              key={pos}
              variant="secondary"
              className="text-xs py-1.5 px-3 rounded-lg cursor-pointer hover:bg-primary/10 transition-colors"
              style={{ borderColor: `${config.color}30`, borderWidth: 1 }}
              onClick={() => setPositionFilter(pos === positionFilter ? 'all' : pos)}
            >
              <Icon className="w-3 h-3 ml-1" style={{ color: config.color }} />
              {config.label}: {formatNumber(activePerPosition(pos))}
            </Badge>
          );
        })}
      </div>

      {/* ===== Filters ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Tabs
          value={positionFilter}
          onValueChange={(v) => setPositionFilter(v as BannerPosition | 'all')}
          className="flex-1"
        >
          <TabsList className="w-full sm:w-auto rounded-xl h-10 p-1 bg-muted/50">
            <TabsTrigger value="all" className="rounded-lg text-xs">الكل</TabsTrigger>
            {(Object.keys(POSITION_CONFIG) as BannerPosition[]).map((pos) => {
              const config = POSITION_CONFIG[pos];
              const Icon = config.icon;
              return (
                <TabsTrigger key={pos} value={pos} className="rounded-lg text-xs gap-1">
                  <Icon className="w-3 h-3" style={{ color: config.color }} />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | BannerStatus)}>
          <SelectTrigger className="w-full sm:w-[160px] rounded-xl h-10">
            <Activity className="w-4 h-4 ml-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="scheduled">مجدول</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="inactive">معطل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ===== Banners List with Drag Reorder ===== */}
      {filteredBanners.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="p-4 rounded-2xl bg-muted/30 mb-4">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
          <p className="text-muted-foreground font-medium">لا توجد بانرات</p>
          <p className="text-xs text-muted-foreground mt-1">
            {positionFilter !== 'all' || statusFilter !== 'all'
              ? 'جرّب تغيير الفلاتر أو أضف بانر جديد'
              : 'أضف أول بانر إعلاني لتطبيقك'}
          </p>
          <Button
            size="sm"
            onClick={openCreateDialog}
            className="mt-4 rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4 ml-1" />
            إضافة بانر
          </Button>
        </motion.div>
      ) : (
        <Reorder.Group
          axis="y"
          values={filteredBanners}
          onReorder={(reordered) => {
            setBanners((prev) => {
              // Merge reordered filtered items back into full list
              const reorderedIds = new Set(reordered.map((r) => r.id));
              const nonFiltered = prev.filter((b) => !reorderedIds.has(b.id));
              const merged = [...nonFiltered, ...reordered];
              return merged.sort((a, b) => a.sort_order - b.sort_order);
            });
            handleReorder(reordered);
          }}
          className="space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredBanners.map((banner, i) => {
              const status = getBannerStatus(banner);
              const statusCfg = getStatusConfig(status);
              const posConfig = POSITION_CONFIG[banner.position as BannerPosition] || POSITION_CONFIG.home;
              const PosIcon = posConfig.icon;

              return (
                <Reorder.Item
                  key={banner.id}
                  value={banner}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <Card className="ios-card border-0 overflow-hidden card-press">
                    <div className="flex">
                      {/* Drag Handle */}
                      <div className="flex items-center px-2 border-l border-border/10">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                      </div>

                      {/* Banner Image */}
                      <div className="w-28 sm:w-40 shrink-0">
                        {banner.image_url ? (
                          <img
                            src={banner.image_url}
                            alt={banner.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full min-h-[100px] flex items-center justify-center bg-muted/30">
                            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      {/* Banner Info */}
                      <CardContent className="flex-1 p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm text-foreground truncate">
                                {banner.title || 'بدون عنوان'}
                              </h3>
                              <Badge className={cn('text-[10px] px-2 py-0 h-5', statusCfg.color)}>
                                <statusCfg.icon className="w-3 h-3 ml-0.5" />
                                {statusCfg.label}
                              </Badge>
                            </div>

                            {banner.description && (
                              <p className="text-xs text-muted-foreground truncate mb-2">
                                {banner.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <PosIcon className="w-3 h-3" style={{ color: posConfig.color }} />
                                {posConfig.label}
                              </span>
                              <span className="flex items-center gap-1">
                                <ArrowUpDown className="w-3 h-3" />
                                ترتيب: {banner.sort_order}
                              </span>
                              {banner.link_type !== 'none' && banner.link_target && (
                                <span className="flex items-center gap-1">
                                  <Link2 className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]" dir="ltr">{banner.link_target}</span>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1">
                                    {LINK_TYPE_CONFIG[banner.link_type as BannerLinkType]?.label}
                                  </Badge>
                                </span>
                              )}
                            </div>

                            {/* Scheduling Info */}
                            {(banner.start_date || banner.end_date) && (
                              <div className="flex items-center gap-2 mt-2 text-[10px]">
                                {banner.start_date && (
                                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <CalendarDays className="w-3 h-3" />
                                    من: {new Date(banner.start_date).toLocaleDateString('ar-SA')}
                                  </span>
                                )}
                                {banner.end_date && (
                                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <CalendarDays className="w-3 h-3" />
                                    إلى: {new Date(banner.end_date).toLocaleDateString('ar-SA')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Switch
                              checked={banner.is_active}
                              onCheckedChange={() => handleToggleActive(banner)}
                              className="scale-75"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditDialog(banner)}
                            >
                              <Edit3 className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setDeletingBanner(banner);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </Reorder.Item>
              );
            })}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* ===== Create/Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingBanner ? 'تعديل البانر' : 'إضافة بانر جديد'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="w-3 h-3" />
                العنوان *
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="عنوان البانر الإعلاني..."
                className="h-11 rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">الوصف</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="وصف مختصر للبانر..."
                className="h-11 rounded-xl"
              />
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                الموضع
              </Label>
              <Select
                value={form.position}
                onValueChange={(v) => setForm((p) => ({ ...p, position: v as BannerPosition }))}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(POSITION_CONFIG) as BannerPosition[]).map((pos) => {
                    const config = POSITION_CONFIG[pos];
                    const Icon = config.icon;
                    return (
                      <SelectItem key={pos} value={pos}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color: config.color }} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Image Upload */}
            <ImageUploadZone
              imageUrl={imagePreview || form.image_url}
              onImageSet={handleImageSelected}
              onImageClear={handleImageClear}
              position={form.position}
              uploading={uploading}
              uploadProgress={uploadProgress}
            />

            {/* Link Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                نوع الرابط
              </Label>
              <Select
                value={form.link_type}
                onValueChange={(v) => setForm((p) => ({ ...p, link_type: v as BannerLinkType, link_target: '' }))}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LINK_TYPE_CONFIG) as BannerLinkType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {LINK_TYPE_CONFIG[type].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link Target */}
            {form.link_type !== 'none' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <Label className="text-xs text-muted-foreground">الرابط المستهدف</Label>
                <Input
                  value={form.link_target}
                  onChange={(e) => setForm((p) => ({ ...p, link_target: e.target.value }))}
                  placeholder={LINK_TYPE_CONFIG[form.link_type]?.placeholder}
                  dir="ltr"
                  className="h-11 rounded-xl text-left"
                />
              </motion.div>
            )}

            {/* Sort Order */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Move className="w-3 h-3" />
                الترتيب
              </Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                dir="ltr"
                className="h-11 rounded-xl"
                min={0}
              />
            </div>

            <Separator />

            {/* Scheduling */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                الجدولة (اختياري)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <DatePickerField
                  label="تاريخ البداية"
                  date={form.start_date}
                  onSelect={(d) => setForm((p) => ({ ...p, start_date: d }))}
                  placeholder="بدون تحديد"
                />
                <DatePickerField
                  label="تاريخ الانتهاء"
                  date={form.end_date}
                  onSelect={(d) => setForm((p) => ({ ...p, end_date: d }))}
                  placeholder="بدون تحديد"
                />
              </div>
              {form.start_date && form.end_date && form.start_date > form.end_date && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية
                </p>
              )}
            </div>

            <Separator />

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
              <div>
                <p className="text-sm font-medium text-foreground">تفعيل البانر</p>
                <p className="text-xs text-muted-foreground">سيكون البانر مرئياً عند التفعيل</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
              disabled={saving}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                  {uploading ? 'جاري الرفع...' : 'جاري الحفظ...'}
                </>
              ) : editingBanner ? (
                <>
                  <CheckCircle className="w-4 h-4 ml-1" />
                  تحديث
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-1" />
                  إضافة
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirmation Dialog ===== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">حذف البانر</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              هل أنت متأكد من حذف البانر &quot;{deletingBanner?.title || 'بدون عنوان'}&quot;؟
              <br />
              لا يمكن التراجع عن هذا الإجراء وسيتم حذف الصورة أيضاً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 ml-1" />
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Position Preview Dialog ===== */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              معاينة البانرات حسب الموضع
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-2">
              {(Object.keys(POSITION_CONFIG) as BannerPosition[]).map((pos) => (
                <PositionPreviewCard
                  key={pos}
                  position={pos}
                  banners={banners.filter((b) => b.position === pos || b.position === 'all')}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
