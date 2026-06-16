'use client';

import { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useTheme } from 'next-themes';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const toastConfig: Record<ToastType, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  success: { icon: CheckCircle2, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  error: { icon: XCircle, color: '#5C1A1B', bg: 'rgba(92,26,27,0.12)' },
  warning: { icon: AlertTriangle, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  info: { icon: Info, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.3}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80) {
          onRemove(toast.id);
        }
      }}
      className="w-full max-w-sm mx-auto"
    >
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{
          background: isDark
            ? 'rgba(30,30,30,0.95)'
            : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: config.bg }}
        >
          <Icon size={18} strokeWidth={1.5} color={config.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-bold"
            style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
          >
            {toast.title}
          </p>
          <p
            className="text-xs mt-0.5 leading-relaxed"
            style={{ color: isDark ? '#AAA' : '#888' }}
          >
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
        >
          <X size={12} strokeWidth={1.5} color={isDark ? '#888' : '#AAA'} />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [{ id, type, title, message }, ...prev].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
        <div className="max-w-md mx-auto px-4 pt-4 space-y-2 pointer-events-auto">
          <AnimatePresence>
            {toasts.map((toast) => (
              <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}
