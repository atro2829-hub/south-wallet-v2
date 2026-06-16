'use client';

import { useState, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
  Trash2,
  Eye,
  CloudUpload,
  FileImage,
} from 'lucide-react';
import { storage, STORAGE_BUCKETS } from '@/lib/supabase';
import type { StorageBucketName } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────

export type UploadStatus = 'idle' | 'compressing' | 'uploading' | 'success' | 'error';

export interface ImageUploadProps {
  /** Callback with the download URL after successful upload */
  onUploadComplete: (url: string) => void;
  /** Callback with upload progress percentage (0-100) */
  onUploadProgress?: (progress: number) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Accepted file types (default: 'image/*') */
  accept?: string;
  /** Maximum file size in MB (default: 5) */
  maxSizeMB?: number;
  /** Supabase Storage bucket name (default: 'general') */
  bucket?: StorageBucketName;
  /** Supabase Storage path within the bucket (default: 'uploads') */
  storagePath?: string;
  /** Arabic label for the upload area */
  label?: string;
  /** Existing image URL for editing */
  preview?: string;
  /** Compact variant for smaller spaces */
  compact?: boolean;
  /** Allow multiple image uploads */
  multiple?: boolean;
  /** Callback for multiple image uploads */
  onMultipleUploadComplete?: (urls: string[]) => void;
  /** Custom class name */
  className?: string;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Hint text below the label */
  hint?: string;
  /** Whether to show the preview as a circle (for avatars) */
  circular?: boolean;
}

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  progress: number;
  url?: string;
  error?: string;
}

// ─── Image Compression Utility ────────────────────────────────────

async function compressImage(file: File, maxSizeBytes: number = 1024 * 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Start with original quality and reduce until under max size
        let quality = 0.85;
        let maxWidth = 1920;

        const tryCompress = (): void => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Scale down if wider than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }

              // If still too large, reduce quality or size
              if (blob.size > maxSizeBytes && quality > 0.1) {
                quality -= 0.15;
                tryCompress();
              } else if (blob.size > maxSizeBytes && maxWidth > 400) {
                maxWidth = Math.floor(maxWidth * 0.7);
                quality = 0.8;
                tryCompress();
              } else {
                const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ─── Supabase Upload Utility ──────────────────────────────────────

async function uploadToSupabase(
  file: File,
  bucket: StorageBucketName,
  path: string,
  onProgress: (progress: number) => void
): Promise<string> {
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
  const filePath = `${path}/${fileName}`;
  const contentType = file.type || 'image/jpeg';

  // Simulate progress since Supabase JS client doesn't support upload progress events
  let progress = 0;
  const progressInterval = setInterval(() => {
    // Increment by a random amount, maxing out at 90 (final 100% is set on completion)
    progress = Math.min(progress + Math.floor(Math.random() * 15) + 5, 90);
    onProgress(progress);
  }, 200);

  try {
    const result = await storage.upload(bucket, filePath, file, contentType);

    clearInterval(progressInterval);

    if (result.error) {
      throw new Error(result.error);
    }

    // Return the public URL if available, otherwise construct it
    if (result.publicUrl) {
      onProgress(100);
      return result.publicUrl;
    }

    // For private buckets (like kyc-documents), get a signed URL
    if (bucket === STORAGE_BUCKETS.kycDocuments) {
      const signedResult = await storage.getSignedUrl(bucket, result.path || filePath);
      onProgress(100);
      if (signedResult.error) {
        throw new Error(signedResult.error);
      }
      return signedResult.url || '';
    }

    // Fallback: construct the public URL manually
    const fallbackUrl = storage.getPublicUrl(bucket, result.path || filePath);
    onProgress(100);
    return fallbackUrl;
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
}

// ─── Generate unique ID ───────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ─── ImagePreview Sub-Component ───────────────────────────────────

export interface ImagePreviewProps {
  images: ImageItem[];
  onRemove?: (id: string) => void;
  onPreviewClick?: (url: string) => void;
  compact?: boolean;
  circular?: boolean;
}

export function ImagePreview({
  images,
  onRemove,
  onPreviewClick,
  compact = false,
  circular = false,
}: ImagePreviewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (images.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', compact ? 'gap-1.5' : 'gap-3')}>
      <AnimatePresence mode="popLayout">
        {images.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'relative group',
              circular
                ? 'w-20 h-20'
                : compact
                  ? 'w-16 h-16'
                  : 'w-24 h-24 sm:w-28 sm:h-28'
            )}
          >
            {/* Image container */}
            <div
              className={cn(
                'w-full h-full overflow-hidden border-2 transition-all duration-300',
                circular ? 'rounded-full' : 'rounded-xl',
                item.status === 'success'
                  ? 'border-green-500/50'
                  : item.status === 'error'
                    ? 'border-red-500/50'
                    : item.status === 'uploading'
                      ? 'border-[#C41E3A]/50'
                      : 'border-transparent',
                isDark
                  ? 'bg-[#3D0F10]/50'
                  : 'bg-[#F0DEE0]/50'
              )}
            >
              <img
                src={item.preview}
                alt="معاينة"
                className={cn(
                  'w-full h-full object-cover transition-all duration-300',
                  item.status === 'uploading' && 'opacity-60',
                  circular && 'rounded-full'
                )}
              />
            </div>

            {/* Progress overlay */}
            <AnimatePresence>
              {item.status === 'uploading' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    circular ? 'rounded-full' : 'rounded-xl',
                    'bg-black/40 backdrop-blur-sm'
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2
                        size={compact ? 16 : 22}
                        className="text-white"
                      />
                    </motion.div>
                    {!compact && (
                      <span className="text-[10px] text-white font-bold">
                        {item.progress}%
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Compressing overlay */}
            <AnimatePresence>
              {item.status === 'compressing' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    circular ? 'rounded-full' : 'rounded-xl',
                    'bg-black/40 backdrop-blur-sm'
                  )}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2
                      size={compact ? 14 : 18}
                      className="text-yellow-300"
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success overlay */}
            <AnimatePresence>
              {item.status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className={cn(
                    'absolute -top-1 -left-1 w-5 h-5 rounded-full',
                    'bg-green-500 flex items-center justify-center',
                    'shadow-lg shadow-green-500/30'
                  )}
                >
                  <CheckCircle2 size={12} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error overlay */}
            <AnimatePresence>
              {item.status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className={cn(
                    'absolute -top-1 -left-1 w-5 h-5 rounded-full',
                    'bg-red-500 flex items-center justify-center',
                    'shadow-lg shadow-red-500/30'
                  )}
                >
                  <AlertCircle size={12} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remove button */}
            {onRemove && item.status !== 'uploading' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  'absolute -top-2 -right-2 w-6 h-6 rounded-full',
                  'bg-red-500 flex items-center justify-center',
                  'shadow-lg shadow-red-500/30',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                  'z-10'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(item.id);
                }}
                aria-label="حذف الصورة"
              >
                <X size={12} className="text-white" />
              </motion.button>
            )}

            {/* Preview button on hover */}
            {onPreviewClick && item.status === 'success' && item.url && (
              <motion.button
                initial={{ opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  circular ? 'rounded-full' : 'rounded-xl',
                  'bg-black/0 group-hover:bg-black/30',
                  'transition-all duration-200 cursor-pointer',
                  'opacity-0 group-hover:opacity-100'
                )}
                onClick={() => onPreviewClick(item.url!)}
                aria-label="عرض الصورة"
              >
                <Eye size={20} className="text-white drop-shadow-lg" />
              </motion.button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ImageUpload Component ───────────────────────────────────

export default function ImageUpload({
  onUploadComplete,
  onUploadProgress,
  onError,
  accept = 'image/*',
  maxSizeMB = 5,
  bucket = STORAGE_BUCKETS.general,
  storagePath = 'uploads',
  label = 'رفع صورة',
  preview,
  compact = false,
  multiple = false,
  onMultipleUploadComplete,
  className,
  disabled = false,
  hint,
  circular = false,
}: ImageUploadProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [images, setImages] = useState<ImageItem[]>(() => {
    if (preview) {
      return [{
        id: generateId(),
        file: new File([], 'existing'),
        preview: preview,
        status: 'success',
        progress: 100,
        url: preview,
      }];
    }
    return [];
  });
  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fullscreenPreview, setFullscreenPreview] = useState<string | null>(null);

  // ─── Validate file ────────────────────────────────────────────

  const validateFile = useCallback((file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type) && !file.type.startsWith('image/')) {
      return 'نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WebP)';
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `حجم الملف كبير جداً. الحد الأقصى ${maxSizeMB} ميجابايت`;
    }
    return null;
  }, [maxSizeMB]);

  // ─── Process and upload single file ──────────────────────────

  const processFile = useCallback(async (file: File) => {
    // Validate
    const validationError = validateFile(file);
    if (validationError) {
      setGlobalError(validationError);
      onError?.(validationError);
      return;
    }

    setGlobalError(null);

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    const itemId = generateId();

    const newItem: ImageItem = {
      id: itemId,
      file,
      preview: previewUrl,
      status: 'compressing',
      progress: 0,
    };

    if (multiple) {
      setImages((prev) => [...prev, newItem]);
    } else {
      // Clean up old preview URL
      setImages((prev) => {
        prev.forEach((img) => {
          if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
        });
        return [newItem];
      });
    }

    try {
      // Compress
      let compressedFile = file;
      try {
        compressedFile = await compressImage(file, 1024 * 1024); // Max 1MB after compression
      } catch {
        // If compression fails, use original
        console.warn('Image compression failed, using original file');
      }

      // Update status to uploading
      setImages((prev) =>
        prev.map((img) =>
          img.id === itemId ? { ...img, status: 'uploading' as UploadStatus } : img
        )
      );

      // Upload to Supabase
      const downloadUrl = await uploadToSupabase(compressedFile, bucket, storagePath, (progress) => {
        setImages((prev) =>
          prev.map((img) =>
            img.id === itemId ? { ...img, progress } : img
          )
        );
        onUploadProgress?.(progress);
      });

      // Update status to success
      setImages((prev) =>
        prev.map((img) =>
          img.id === itemId
            ? { ...img, status: 'success' as UploadStatus, progress: 100, url: downloadUrl }
            : img
        )
      );

      onUploadComplete(downloadUrl);

      // For multiple, collect all successful URLs
      if (multiple) {
        setImages((prev) => {
          const successUrls = prev
            .filter((img) => img.status === 'success' && img.url)
            .map((img) => img.url!);
          if (successUrls.length > 0) {
            onMultipleUploadComplete?.(successUrls);
          }
          return prev;
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل رفع الصورة';
      setImages((prev) =>
        prev.map((img) =>
          img.id === itemId
            ? { ...img, status: 'error' as UploadStatus, error: errorMessage }
            : img
        )
      );
      setGlobalError(errorMessage);
      onError?.(errorMessage);
    }
  }, [validateFile, multiple, bucket, storagePath, onUploadComplete, onUploadProgress, onMultipleUploadComplete, onError]);

  // ─── Handle file selection ────────────────────────────────────

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0 || disabled) return;

    if (multiple) {
      Array.from(files).forEach((file) => processFile(file));
    } else {
      processFile(files[0]);
    }
  }, [multiple, processFile, disabled]);

  // ─── Drag and drop handlers ───────────────────────────────────

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we leave the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect, disabled]);

  // ─── Remove image ─────────────────────────────────────────────

  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  // ─── Retry failed upload ──────────────────────────────────────

  const handleRetry = useCallback((id: string) => {
    const item = images.find((img) => img.id === id);
    if (item && item.status === 'error') {
      handleRemove(id);
      processFile(item.file);
    }
  }, [images, handleRemove, processFile]);

  // ─── Clear error ──────────────────────────────────────────────

  const clearError = useCallback(() => {
    setGlobalError(null);
  }, []);

  // ─── Animation variants ──────────────────────────────────────

  const dropzoneVariants = {
    idle: {
      borderColor: isDark ? 'rgba(196, 30, 58, 0.15)' : 'rgba(92, 26, 27, 0.15)',
      backgroundColor: isDark ? 'rgba(61, 15, 16, 0.3)' : 'rgba(240, 222, 224, 0.3)',
      scale: 1,
    },
    dragging: {
      borderColor: '#C41E3A',
      backgroundColor: isDark ? 'rgba(196, 30, 58, 0.12)' : 'rgba(196, 30, 58, 0.08)',
      scale: 1.02,
    },
    disabled: {
      opacity: 0.5,
      scale: 1,
    },
  };

  return (
    <div className={cn('w-full', className)} dir="rtl">
      {/* Label */}
      {label && (
        <motion.label
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            'block mb-2 font-semibold',
            compact ? 'text-xs' : 'text-sm',
            isDark ? 'text-[#F5E6E8]' : 'text-[#2A1215]'
          )}
        >
          {label}
        </motion.label>
      )}

      {/* Hint */}
      {hint && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={cn(
            'mb-2',
            compact ? 'text-[10px]' : 'text-xs',
            isDark ? 'text-[#B08A8E]' : 'text-[#8B5A5E]'
          )}
        >
          {hint}
        </motion.p>
      )}

      {/* Drop Zone */}
      <motion.div
        ref={dropZoneRef}
        variants={dropzoneVariants}
        animate={disabled ? 'disabled' : isDragging ? 'dragging' : 'idle'}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          'relative overflow-hidden cursor-pointer',
          'border-2 border-dashed',
          circular ? 'w-24 h-24 mx-auto' : 'w-full',
          compact ? 'rounded-xl' : 'rounded-2xl',
          circular && 'rounded-full',
          !compact && !circular && 'py-8 px-4',
          compact && !circular && 'py-4 px-3',
          'transition-shadow duration-300',
          isDragging && 'shadow-lg shadow-[#C41E3A]/20',
          disabled && 'cursor-not-allowed',
          // Glassmorphism background
          isDark
            ? 'bg-[#3D0F10]/30 backdrop-blur-xl'
            : 'bg-[#F0DEE0]/40 backdrop-blur-xl',
          // Border glow on drag
          isDragging && (
            isDark
              ? 'border-[#C41E3A] shadow-[0_0_30px_rgba(196,30,58,0.2)]'
              : 'border-[#C41E3A] shadow-[0_0_20px_rgba(196,30,58,0.15)]'
          )
        )}
      >
        {/* Animated background gradient on drag */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 animated-gradient"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(92,26,27,0.2) 0%, rgba(196,30,58,0.15) 50%, rgba(92,26,27,0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(92,26,27,0.05) 0%, rgba(196,30,58,0.08) 50%, rgba(92,26,27,0.05) 100%)',
                backgroundSize: '200% 200%',
              }}
            />
          )}
        </AnimatePresence>

        {/* Inner content */}
        {circular ? (
          /* Circular variant (for avatars) */
          <div className="w-full h-full flex items-center justify-center relative">
            {images.length > 0 && images[0].status === 'success' ? (
              <img
                src={images[0].preview}
                alt="الصورة الشخصية"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <motion.div
                animate={isDragging ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.6 }}
                className="flex flex-col items-center gap-0.5"
              >
                <Camera
                  size={24}
                  className={cn(
                    'transition-colors duration-300',
                    isDark ? 'text-[#C41E3A]' : 'text-[#5C1A1B]'
                  )}
                />
                <span className={cn(
                  'text-[9px]',
                  isDark ? 'text-[#B08A8E]' : 'text-[#8B5A5E]'
                )}>
                  صورة
                </span>
              </motion.div>
            )}
            {/* Overlay on hover */}
            {!disabled && (
              <div className={cn(
                'absolute inset-0 rounded-full flex items-center justify-center',
                'bg-black/0 hover:bg-black/40 transition-all duration-300',
                'opacity-0 hover:opacity-100'
              )}>
                <Camera size={20} className="text-white" />
              </div>
            )}
          </div>
        ) : (
          /* Standard rectangular drop zone */
          <div className="relative flex flex-col items-center justify-center gap-2 text-center">
            <motion.div
              animate={
                isDragging
                  ? { y: [0, -6, 0], scale: [1, 1.1, 1] }
                  : { y: 0, scale: 1 }
              }
              transition={
                isDragging
                  ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }
                  : { type: 'spring', stiffness: 300, damping: 20 }
              }
            >
              {isDragging ? (
                <CloudUpload
                  size={compact ? 28 : 40}
                  className="text-[#C41E3A] drop-shadow-lg"
                />
              ) : (
                <div className={cn(
                  'rounded-2xl flex items-center justify-center',
                  compact ? 'w-12 h-12' : 'w-16 h-16',
                  isDark
                    ? 'bg-[#5C1A1B]/20'
                    : 'bg-[#5C1A1B]/10'
                )}>
                  <Upload
                    size={compact ? 20 : 28}
                    className={cn(
                      'transition-colors duration-300',
                      isDark ? 'text-[#C41E3A]' : 'text-[#5C1A1B]'
                    )}
                  />
                </div>
              )}
            </motion.div>

            <motion.div
              animate={isDragging ? { opacity: 1 } : { opacity: 0.9 }}
              className="flex flex-col items-center gap-0.5"
            >
              <span className={cn(
                'font-medium',
                compact ? 'text-xs' : 'text-sm',
                isDark ? 'text-[#F5E6E8]' : 'text-[#2A1215]'
              )}>
                {isDragging ? 'أفلت الصورة هنا' : 'اسحب الصورة هنا أو اضغط للاختيار'}
              </span>
              <span className={cn(
                compact ? 'text-[10px]' : 'text-xs',
                isDark ? 'text-[#B08A8E]' : 'text-[#8B5A5E]'
              )}>
                {`JPG, PNG, WebP • حتى ${maxSizeMB} ميجابايت`}
              </span>
            </motion.div>

            {/* Action buttons row */}
            {!compact && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-2 mt-1"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium',
                    'transition-all duration-200',
                    isDark
                      ? 'bg-[#5C1A1B]/30 text-[#F5E6E8] hover:bg-[#5C1A1B]/50'
                      : 'bg-[#5C1A1B]/10 text-[#5C1A1B] hover:bg-[#5C1A1B]/20'
                  )}
                >
                  <ImagePlus size={14} />
                  اختر صورة
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  disabled={disabled}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium',
                    'transition-all duration-200',
                    isDark
                      ? 'bg-[#5C1A1B]/30 text-[#F5E6E8] hover:bg-[#5C1A1B]/50'
                      : 'bg-[#5C1A1B]/10 text-[#5C1A1B] hover:bg-[#5C1A1B]/20'
                  )}
                >
                  <Camera size={14} />
                  التقاط صورة
                </motion.button>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Preview Grid */}
      <AnimatePresence>
        {images.length > 0 && !circular && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="mt-3"
          >
            <ImagePreview
              images={images}
              onRemove={handleRemove}
              onPreviewClick={(url) => setFullscreenPreview(url)}
              compact={compact}
              circular={circular}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress bars for uploading images */}
      <AnimatePresence>
        {images.some((img) => img.status === 'uploading') && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-3 space-y-2"
          >
            {images
              .filter((img) => img.status === 'uploading')
              .map((img) => (
                <div key={img.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FileImage size={12} className={isDark ? 'text-[#C41E3A]' : 'text-[#5C1A1B]'} />
                      <span className={cn(
                        'text-[10px]',
                        isDark ? 'text-[#B08A8E]' : 'text-[#8B5A5E]'
                      )}>
                        جاري الرفع...
                      </span>
                    </div>
                    <span className={cn(
                      'text-[10px] font-bold tabular-nums',
                      isDark ? 'text-[#C41E3A]' : 'text-[#5C1A1B]'
                    )}>
                      {img.progress}%
                    </span>
                  </div>
                  {/* Custom progress bar */}
                  <div className={cn(
                    'h-1.5 rounded-full overflow-hidden',
                    isDark ? 'bg-[#3D0F10]' : 'bg-[#F0DEE0]'
                  )}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${img.progress}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="h-full rounded-full relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(90deg, #5C1A1B, #C41E3A)',
                      }}
                    >
                      {/* Shimmer effect on progress bar */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s infinite',
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error items - tap to retry */}
      <AnimatePresence>
        {images.some((img) => img.status === 'error') && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2 space-y-1"
          >
            {images
              .filter((img) => img.status === 'error')
              .map((img) => (
                <motion.button
                  key={img.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRetry(img.id)}
                  className={cn(
                    'w-full flex items-center gap-2 p-2 rounded-xl',
                    'text-xs text-right',
                    isDark
                      ? 'bg-red-900/20 text-red-300 hover:bg-red-900/30'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  )}
                >
                  <AlertCircle size={14} />
                  <span className="flex-1">{img.error || 'فشل الرفع'}</span>
                  <span className={cn(
                    'text-[10px] font-medium px-2 py-0.5 rounded-lg',
                    isDark ? 'bg-red-900/30' : 'bg-red-100'
                  )}>
                    إعادة المحاولة
                  </span>
                </motion.button>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global error message */}
      <AnimatePresence>
        {globalError && (
          <motion.div
            initial={{ opacity: 0, y: 5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            className="mt-2"
          >
            <div className={cn(
              'flex items-center gap-2 p-2.5 rounded-xl text-xs',
              isDark
                ? 'bg-red-900/20 text-red-300 border border-red-900/30'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1">{globalError}</span>
              <button
                onClick={clearError}
                className="shrink-0 p-0.5 rounded-full hover:bg-red-500/10 transition-colors"
                aria-label="إغلاق"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success summary */}
      <AnimatePresence>
        {images.length > 0 && images.every((img) => img.status === 'success') && images.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="mt-2"
          >
            <div className={cn(
              'flex items-center gap-2 p-2 rounded-xl text-xs',
              isDark
                ? 'bg-green-900/20 text-green-300 border border-green-900/30'
                : 'bg-green-50 text-green-700 border border-green-200'
            )}>
              <CheckCircle2 size={14} className="shrink-0" />
              <span>تم رفع {images.length} صور بنجاح</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear all button for multiple mode */}
      <AnimatePresence>
        {multiple && images.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                images.forEach((img) => {
                  if (img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
                });
                setImages([]);
              }}
              disabled={disabled}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs',
                'transition-colors duration-200',
                isDark
                  ? 'text-red-400 hover:bg-red-900/20'
                  : 'text-red-600 hover:bg-red-50'
              )}
            >
              <Trash2 size={12} />
              حذف الكل
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {fullscreenPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={() => setFullscreenPreview(null)}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-lg"
            />

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              whileTap={{ scale: 0.9 }}
              className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl flex items-center justify-center text-white"
              onClick={() => setFullscreenPreview(null)}
              aria-label="إغلاق المعاينة"
            >
              <X size={20} />
            </motion.button>

            {/* Image */}
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              src={fullscreenPreview}
              alt="معاينة كاملة"
              className="relative max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
