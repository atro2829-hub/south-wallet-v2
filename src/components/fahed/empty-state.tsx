'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

// ─── Empty State Props ─────────────────────────────────────────────
export interface EmptyStateProps {
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Main title text */
  title: string;
  /** Description text */
  description: string;
  /** Optional action button label */
  actionLabel?: string;
  /** Optional action button click handler */
  onAction?: () => void;
  /** Icon color (defaults to app red) */
  iconColor?: string;
  /** Custom className for the container */
  className?: string;
}

// ─── Empty State Component ─────────────────────────────────────────
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  iconColor = '#5C1A1B',
  className = '',
}: EmptyStateProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`flex flex-col items-center justify-center py-8 px-6 ${className}`}
    >
      {/* Icon with animated background ring */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, duration: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
        className="relative mb-4"
      >
        {/* Outer glow ring */}
        <div
          className="absolute inset-0 rounded-full scale-150"
          style={{
            background: `radial-gradient(circle, ${iconColor}15 0%, transparent 70%)`,
          }}
        />
        {/* Icon container */}
        <div
          className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: isDark ? '#1A1A1A' : '#F5F5F5',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
            boxShadow: `0 4px 16px ${iconColor}10`,
          }}
        >
          <Icon size={36} strokeWidth={1.2} color={isDark ? '#444' : '#CCC'} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-base font-bold text-center"
        style={{ color: isDark ? '#888' : '#AAA' }}
      >
        {title}
      </motion.p>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-[12px] mt-1.5 text-center max-w-[240px] leading-relaxed"
        style={{ color: isDark ? '#555' : '#BBB' }}
      >
        {description}
      </motion.p>

      {/* Optional Action Button */}
      {actionLabel && onAction && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          className="mt-5 px-6 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform"
          style={{
            background: iconColor,
            boxShadow: `0 4px 12px ${iconColor}30`,
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
