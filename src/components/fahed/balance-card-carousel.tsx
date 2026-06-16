'use client';

import { useState, useRef, useCallback, useEffect, ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Wifi, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatBalance, currencySymbols, currencyBadgeColors } from '@/lib/utils';
import { LOGO_BASE64 } from '@/lib/logo';

// ========================================
// Shared Types
// ========================================

export interface BalanceCard {
  currency: 'YER' | 'SAR' | 'USD';
  accentColor: string;
  accentColorEnd: string;
  glowColor: string;
  patternColor: string;
}

// ========================================
// Shared Constants
// ========================================

export const balanceCards: BalanceCard[] = [
  { currency: 'YER', accentColor: '#5C1A1B', accentColorEnd: '#3D0F10', glowColor: 'rgba(92,26,27,0.35)', patternColor: 'rgba(255,255,255,0.06)' },
  { currency: 'SAR', accentColor: '#0D5A1F', accentColorEnd: '#1B7A2B', glowColor: 'rgba(13,90,31,0.35)', patternColor: 'rgba(255,255,255,0.06)' },
  { currency: 'USD', accentColor: '#0D47A1', accentColorEnd: '#1565C0', glowColor: 'rgba(13,71,161,0.35)', patternColor: 'rgba(255,255,255,0.06)' },
];

// ========================================
// Shared Helpers
// ========================================

export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
}

// ========================================
// Animated Counter Hook
// ========================================

export function useAnimatedCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (prevTarget.current === target) return;
    const start = prevTarget.current;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevTarget.current = target;
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return value;
}

// ========================================
// Animated Balance Component
// ========================================

export function AnimatedBalance({ amount, currency, visible }: { amount: number; currency: string; visible: boolean }) {
  const animatedValue = useAnimatedCounter(amount);
  if (!visible) return <span className="text-white text-2xl font-bold tracking-wide">****</span>;
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-white text-2xl font-bold tracking-wide">{formatBalance(animatedValue, currency)}</span>
      <span className="text-white/40 text-xs">{currencySymbols[currency]}</span>
    </div>
  );
}

// ========================================
// Income/Expense Section (for wallet screen)
// ========================================

function IncomeExpenseSection({ income, expense, balanceVisible }: { income: number; expense: number; balanceVisible: boolean }) {
  return (
    <div className="flex gap-4 mt-3">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          <TrendingUp size={11} strokeWidth={2} color="#FFF" />
        </div>
        <div>
          <p className="text-white/35 text-[9px]">وارد</p>
          <p className="text-white text-xs font-bold">{balanceVisible ? income.toLocaleString('ar-SA') : '****'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
          <TrendingDown size={11} strokeWidth={2} color="#FFF" />
        </div>
        <div>
          <p className="text-white/35 text-[9px]">صادر</p>
          <p className="text-white text-xs font-bold">{balanceVisible ? expense.toLocaleString('ar-SA') : '****'}</p>
        </div>
      </div>
    </div>
  );
}

// ========================================
// Balance Card Carousel Component
// ========================================

export interface BalanceCardCarouselProps {
  /** Whether to show income/expense section inside cards (wallet screen) */
  showIncomeExpense?: boolean;
  /** Income amount (only used when showIncomeExpense is true) */
  income?: number;
  /** Expense amount (only used when showIncomeExpense is true) */
  expense?: number;
  /** Active card height for the active card */
  activeCardHeight?: number;
  /** Inactive card height */
  inactiveCardHeight?: number;
  /** Card content padding class (e.g., 'p-6' or 'p-5') */
  cardPadding?: string;
  /** SVG pattern ID prefix to avoid conflicts */
  patternIdPrefix?: string;
  /** Whether to include height transition in active/inactive cards */
  animateHeight?: boolean;
  /** Optional extra content rendered below the balance section */
  extraContent?: (card: BalanceCard, index: number) => ReactNode;
}

export default function BalanceCardCarousel({
  showIncomeExpense = false,
  income = 0,
  expense = 0,
  activeCardHeight = 195,
  inactiveCardHeight = 190,
  cardPadding = 'p-6',
  patternIdPrefix = 'grid',
  animateHeight = true,
  extraContent,
}: BalanceCardCarouselProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, balanceVisible, toggleBalance } = useAppStore();

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(375);

  // Touch/drag tracking
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const prevTranslate = useRef(0);

  const CARD_GAP = 12;
  const CARD_SIDE_PADDING = 32;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const getCardWidth = useCallback(() => {
    return containerWidth * 0.78;
  }, [containerWidth]);

  const getStepWidth = useCallback(() => {
    return getCardWidth() + CARD_GAP;
  }, [getCardWidth]);

  const getBalance = (currency: string): number => {
    if (!user) return 0;
    const field = `balance${currency}` as keyof typeof user;
    return (user[field] as number) || 0;
  };

  // Snap to card
  const snapToCard = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, balanceCards.length - 1));
    setActiveCardIndex(clamped);
    const targetTranslate = -clamped * getStepWidth();
    currentTranslate.current = targetTranslate;
    prevTranslate.current = targetTranslate;

    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transform = `translateX(${targetTranslate}px)`;
        track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
      }
    }
  }, [getStepWidth]);

  const setTrackPosition = useCallback((translateX: number) => {
    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transform = `translateX(${translateX}px)`;
      }
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isDragging.current = true;
    startX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
    prevTranslate.current = currentTranslate.current;

    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transition = 'none';
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return;
    const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = currentX - startX.current;
    const newTranslate = prevTranslate.current + diff;

    const minTranslate = -(balanceCards.length - 1) * getStepWidth();
    const maxTranslate = 0;

    let clampedTranslate = newTranslate;
    if (newTranslate > maxTranslate) {
      clampedTranslate = maxTranslate + (newTranslate - maxTranslate) * 0.3;
    } else if (newTranslate < minTranslate) {
      clampedTranslate = minTranslate + (newTranslate - minTranslate) * 0.3;
    }

    currentTranslate.current = clampedTranslate;
    setTrackPosition(clampedTranslate);
  }, [getStepWidth, setTrackPosition]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const movedBy = currentTranslate.current - prevTranslate.current;
    const stepWidth = getStepWidth();
    const threshold = stepWidth * 0.2;

    let newIndex = activeCardIndex;

    if (movedBy < -threshold) {
      newIndex = Math.min(activeCardIndex + 1, balanceCards.length - 1);
    } else if (movedBy > threshold) {
      newIndex = Math.max(activeCardIndex - 1, 0);
    }

    const targetTranslate = -newIndex * stepWidth;
    currentTranslate.current = targetTranslate;
    prevTranslate.current = targetTranslate;

    if (containerRef.current) {
      const track = containerRef.current.querySelector('[data-carousel-track]') as HTMLElement;
      if (track) {
        track.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
        track.style.transform = `translateX(${targetTranslate}px)`;
      }
    }

    setActiveCardIndex(newIndex);
  }, [activeCardIndex, getStepWidth]);

  useEffect(() => {
    currentTranslate.current = 0;
    prevTranslate.current = 0;
  }, []);

  const isActive = (index: number) => index === activeCardIndex;
  const cardHeight = (index: number) => isActive(index) ? activeCardHeight : inactiveCardHeight;

  return (
    <div className="relative z-20">
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ touchAction: 'pan-y', paddingLeft: CARD_SIDE_PADDING, paddingRight: CARD_SIDE_PADDING }}
        dir="ltr"
      >
        <div
          data-carousel-track=""
          className="flex cursor-grab active:cursor-grabbing select-none"
          style={{ gap: CARD_GAP }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={() => { if (isDragging.current) handleTouchEnd(); }}
        >
          {balanceCards.map((card, index) => (
            <div
              key={card.currency}
              className="shrink-0 relative overflow-hidden select-none"
              style={{
                width: getCardWidth(),
                height: cardHeight(index),
                borderRadius: 20,
                background: isActive(index)
                  ? `linear-gradient(145deg, ${card.accentColor}DD, ${card.accentColorEnd}CC)`
                  : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.55)',
                backdropFilter: isActive(index) ? 'blur(40px)' : 'blur(30px)',
                WebkitBackdropFilter: isActive(index) ? 'blur(40px)' : 'blur(30px)',
                border: isActive(index)
                  ? `1px solid rgba(${hexToRgb(card.accentColor)}, 0.5)`
                  : isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: isActive(index)
                  ? `0 8px 16px rgba(0,0,0,0.12), 0 12px 40px ${card.glowColor}, 0 0 60px rgba(${hexToRgb(card.accentColor)}, 0.15), inset 0 1px 0 rgba(255,255,255,0.2)`
                  : `0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.3)'}`,
                transform: isActive(index) ? 'scale(1)' : 'scale(0.92)',
                opacity: isActive(index) ? 1 : 0.7,
                transition: `transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease, box-shadow 0.5s ease, background 0.5s ease, border 0.5s ease, backdrop-filter 0.5s ease${animateHeight ? ', height 0.3s ease' : ''}`,
              }}
              onClick={() => snapToCard(index)}
              dir="rtl"
            >
              {/* Noise Texture Overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-[1] opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px 128px',
                  mixBlendMode: 'overlay',
                }}
              />
              {/* Gradient Border Overlay */}
              {isActive(index) && (
                <div
                  className="absolute inset-0 pointer-events-none z-[2] rounded-[20px]"
                  style={{
                    background: `linear-gradient(135deg, rgba(${hexToRgb(card.accentColor)}, 0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.15) 100%)`,
                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    maskComposite: 'exclude',
                    WebkitMaskComposite: 'xor',
                    padding: '1px',
                    borderRadius: 20,
                  }}
                />
              )}
              {/* Light refraction / rainbow highlight on active card */}
              {isActive(index) && (
                <div
                  className="absolute inset-0 pointer-events-none z-[3] rounded-[20px] opacity-[0.06]"
                  style={{
                    background: `linear-gradient(125deg, 
                      transparent 0%, 
                      rgba(255,100,100,0.4) 15%, 
                      rgba(255,200,100,0.3) 25%, 
                      rgba(100,255,100,0.3) 35%, 
                      rgba(100,200,255,0.4) 45%, 
                      transparent 55%
                    )`,
                  }}
                />
              )}
              {/* Logo Watermark */}
              <img src={LOGO_BASE64} alt="" className="absolute bottom-1 left-1 w-24 h-24 object-contain opacity-[0.03] pointer-events-none select-none z-[1]" aria-hidden="true" />
              <div className="absolute inset-0 shimmer pointer-events-none z-[1]" />
              {/* Card SVG Pattern */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id={`${patternIdPrefix}-${card.currency}`} width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1" fill={card.patternColor} />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#${patternIdPrefix}-${card.currency})`} />
              </svg>
              {/* Decorative circles */}
              <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full" style={{ background: isActive(index) ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }} />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full" style={{ background: isActive(index) ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)' }} />
              {/* Decorative wave */}
              <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 300 40" preserveAspectRatio="none" style={{ height: '35px' }}>
                <path d="M0,30 C50,10 100,40 150,25 C200,10 250,35 300,20 L300,40 L0,40 Z" fill={isActive(index) ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'} />
              </svg>
              {/* Animated gradient border glow for active card - 3 layer shadows */}
              {isActive(index) && (
                <div
                  className="absolute inset-0 pointer-events-none z-[4]"
                  style={{
                    borderRadius: 20,
                    border: `1px solid rgba(${hexToRgb(card.accentColor)}, 0.2)`,
                    boxShadow: `
                      inset 0 0 20px rgba(${hexToRgb(card.accentColor)}, 0.08),
                      0 0 20px rgba(${hexToRgb(card.accentColor)}, 0.06),
                      0 0 40px rgba(${hexToRgb(card.accentColor)}, 0.04),
                      0 0 80px rgba(${hexToRgb(card.accentColor)}, 0.02)
                    `,
                    animation: 'pulse 3s ease-in-out infinite',
                  }}
                />
              )}

              {/* Card Content */}
              <div className={`relative z-10 h-full flex flex-col justify-between ${cardPadding}`}>
                {/* Top Row - Logo + Brand Name (right) | Eye toggle (left) */}
                <div className="flex items-center justify-between">
                  {/* Logo + Brand Name */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                    >
                      <img src={LOGO_BASE64} alt="الجنوب" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col leading-none">
                      <span className="text-white text-sm font-bold tracking-wide">الجنوب</span>
                      <span className="text-white/40 text-[9px] font-medium mt-0.5" dir="ltr">Alganob</span>
                    </div>
                  </div>
                  {/* Eye toggle + Wifi */}
                  <div className="flex items-center gap-2">
                    <Wifi size={12} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />
                    <button onClick={(e) => { e.stopPropagation(); toggleBalance(); }}>
                      {balanceVisible ? (
                        <Eye size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                      ) : (
                        <EyeOff size={14} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Balance Section */}
                <div className="flex flex-col items-start">
                  <p className="text-white/50 text-[12px] mb-1">رصيدك الآن</p>
                  <AnimatedBalance amount={getBalance(card.currency)} currency={card.currency} visible={balanceVisible} />
                  {/* Income/Expense section (wallet screen) */}
                  {showIncomeExpense && (
                    <IncomeExpenseSection income={income} expense={expense} balanceVisible={balanceVisible} />
                  )}
                  {/* Extra content slot */}
                  {extraContent && extraContent(card, index)}
                </div>

                {/* Bottom Row - Currency badge + User ID */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-6 rounded-md" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0.15) 100%)', border: '1px solid rgba(255,215,0,0.15)' }} />
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold text-white" style={{ background: currencyBadgeColors[card.currency] }}>
                      {card.currency}
                    </span>
                  </div>
                  {/* Card number dots */}
                  <div className="flex items-center gap-1.5" dir="ltr">
                    {[0,1,2,3].map((i) => (
                      <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
                    ))}
                    <span className="text-white/35 text-[10px] font-mono mr-1">
                      {user?.userId || '------'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-4" dir="rtl">
          {balanceCards.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => snapToCard(index)}
              className="rounded-full"
              animate={{
                width: activeCardIndex === index ? 14 : 6,
                backgroundColor: activeCardIndex === index ? balanceCards[index].accentColor : (isDark ? '#333' : '#D4D4D4'),
              }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ height: 6 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
