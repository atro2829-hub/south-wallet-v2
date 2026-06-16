'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ImageOff, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';

// ─── In-memory image cache (URL -> 'success' | 'fail') ────────────
const imageCache = new Map<string, 'success' | 'fail'>();

// ─── IntersectionObserver singleton for lazy loading ──────────────
let lazyObserver: IntersectionObserver | null = null;
const lazyCallbacks = new Map<Element, () => void>();

function getLazyObserver(): IntersectionObserver {
  if (lazyObserver) return lazyObserver;
  lazyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cb = lazyCallbacks.get(entry.target);
          if (cb) {
            cb();
            lazyCallbacks.delete(entry.target);
            lazyObserver?.unobserve(entry.target);
          }
        }
      });
    },
    { rootMargin: '100px', threshold: 0.01 }
  );
  return lazyObserver;
}

// ─── SmartImage Props ─────────────────────────────────────────────
export interface SmartImageProps {
  /** Primary image source URL */
  src: string;
  /** Fallback image source when primary fails */
  fallbackSrc?: string;
  /** Alt text for accessibility */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Size preset: 'sm' | 'md' | 'lg' | custom string */
  size?: 'sm' | 'md' | 'lg' | string;
  /** Whether to enable lazy loading (default: true) */
  lazy?: boolean;
  /** Whether to enable blur-up animation (default: true) */
  blurUp?: boolean;
  /** Object fit (default: 'contain') */
  objectFit?: 'contain' | 'cover' | 'fill';
  /** Custom shimmer color */
  shimmerColor?: string;
}

// ─── Size mapping ─────────────────────────────────────────────────
const sizeMap: Record<string, string> = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
};

// ─── Shimmer animation keyframes (injected once) ─────────────────
let shimmerInjected = false;

function injectShimmerStyles() {
  if (typeof document === 'undefined' || shimmerInjected) return;
  shimmerInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes smartImageShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .smart-image-shimmer {
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%);
      background-size: 200% 100%;
      animation: smartImageShimmer 1.5s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}

// ─── SmartImage Component ─────────────────────────────────────────
export default function SmartImage({
  src,
  fallbackSrc,
  alt,
  className = '',
  size = 'md',
  lazy = true,
  blurUp = true,
  objectFit = 'contain',
  shimmerColor,
}: SmartImageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isVisible, setIsVisible] = useState(!lazy);
  const [retryCount, setRetryCount] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);

  // Initialize state from cache (avoiding setState in effect)
  const cachedResult = imageCache.get(src);
  const initialLoadState = cachedResult === 'success' ? 'loaded' : cachedResult === 'fail' ? (fallbackSrc ? 'loading' : 'error') : 'loading';
  const initialUseFallback = cachedResult === 'fail' && !!fallbackSrc;

  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>(initialLoadState);
  const [useFallbackState, setUseFallbackState] = useState(initialUseFallback);
  const effectiveUseFallback = cachedResult === 'fail' && !!fallbackSrc ? true : useFallbackState;

  // Inject shimmer styles on mount
  useEffect(() => {
    injectShimmerStyles();
  }, []);

  // Lazy loading with IntersectionObserver
  useEffect(() => {
    if (!lazy || isVisible || !imgRef.current) return;
    const observer = getLazyObserver();
    lazyCallbacks.set(imgRef.current, () => setIsVisible(true));
    observer.observe(imgRef.current);
    return () => {
      if (imgRef.current) {
        lazyCallbacks.delete(imgRef.current);
        observer.unobserve(imgRef.current);
      }
    };
  }, [lazy, isVisible]);

  const currentSrc = effectiveUseFallback ? (fallbackSrc || '') : src;
  const sizeClass = sizeMap[size] || size;

  const handleLoad = useCallback(() => {
    setLoadState('loaded');
    imageCache.set(src, 'success');
  }, [src]);

  const handleError = useCallback(() => {
    if (!effectiveUseFallback && fallbackSrc) {
      setUseFallbackState(true);
      setLoadState('loading');
      imageCache.set(src, 'fail');
    } else {
      setLoadState('error');
      imageCache.set(src, 'fail');
    }
  }, [effectiveUseFallback, fallbackSrc, src]);

  const handleRetry = useCallback(() => {
    setLoadState('loading');
    setUseFallbackState(false);
    setRetryCount((c) => c + 1);
    imageCache.delete(src);
  }, [src]);

  // ─── Render: Error state with retry ───
  if (loadState === 'error') {
    return (
      <div
        className={`relative flex items-center justify-center ${sizeClass} ${className}`}
        style={{
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderRadius: 12,
        }}
      >
        <button
          onClick={handleRetry}
          className="flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
          title="إعادة المحاولة"
        >
          <ImageOff
            size={size === 'lg' ? 20 : 14}
            strokeWidth={1.5}
            color={isDark ? '#555' : '#BBB'}
          />
          <RefreshCw
            size={size === 'lg' ? 10 : 7}
            strokeWidth={2}
            color={isDark ? '#444' : '#CCC'}
            className="mt-0.5"
          />
        </button>
      </div>
    );
  }

  // ─── Render: Fallback icon (for fallbackSrc) ───
  if (effectiveUseFallback && fallbackSrc && loadState === 'error') {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={`${sizeClass} ${className}`}
        style={{ objectFit }}
        draggable={false}
      />
    );
  }

  // ─── Render: Loading + Image ───
  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${sizeClass} ${className}`}
      style={{ borderRadius: 12 }}
    >
      {/* Shimmer placeholder while loading */}
      {loadState === 'loading' && (
        <div
          className="absolute inset-0 smart-image-shimmer"
          style={{
            background: shimmerColor || (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
          }}
        />
      )}

      {/* Actual image (only rendered when visible) */}
      {isVisible && (
        <img
          key={`${currentSrc}-${retryCount}`}
          src={currentSrc}
          alt={alt}
          className={`w-full h-full transition-all duration-500 ${
            blurUp && loadState === 'loading' ? 'blur-md scale-110 opacity-0' : 'blur-0 scale-100 opacity-100'
          }`}
          style={{ objectFit }}
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}
