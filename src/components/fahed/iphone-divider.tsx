'use client';

import { useTheme } from 'next-themes';

interface IPhoneDividerProps {
  /** Inset from the start edge in pixels. In RTL, this is the right side. Default: 48 */
  insetStart?: number;
  /** Override isDark detection */
  isDark?: boolean;
  /** Position of the divider within the parent. Default: 'bottom' */
  position?: 'top' | 'bottom';
}

/**
 * iPhone-style list divider — a very thin inset line.
 * In RTL layouts the inset is from the right edge (the "start" side).
 *
 * Usage: place inside a relatively-positioned list item.
 * The divider is absolutely positioned within the parent.
 *
 * ```tsx
 * <div className="relative">
 *   ... item content ...
 *   {index < items.length - 1 && <IPhoneDivider />}
 * </div>
 * ```
 */
export default function IPhoneDivider({ insetStart = 48, isDark: isDarkProp, position = 'bottom' }: IPhoneDividerProps) {
  const { theme } = useTheme();
  const isDark = isDarkProp ?? theme === 'dark';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
        right: `${insetStart}px`, // RTL: inset from right (start) side
        left: 0,
        height: '0.5px',
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)',
      }}
    />
  );
}
