'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGO_BASE64 } from '@/lib/logo';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'loading' | 'logo' | 'name' | 'exiting'>('loading');
  const [progress, setProgress] = useState(0);

  // Phase 1: Loading with progress bar (0-1500ms)
  useEffect(() => {
    const loadDuration = 1500;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / loadDuration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setPhase('logo');
      }
    }, 16);
    return () => clearInterval(interval);
  }, []);

  // Phase 2: Logo appears (1500ms)
  useEffect(() => {
    if (phase !== 'logo') return;
    const timer = setTimeout(() => {
      setPhase('name');
    }, 500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 3: App name fades in (2000ms)
  useEffect(() => {
    if (phase !== 'name') return;
    const timer = setTimeout(() => {
      setPhase('exiting');
    }, 800);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 4: Exit
  useEffect(() => {
    if (phase !== 'exiting') return;
    const timer = setTimeout(() => {
      onComplete();
    }, 500);
    return () => clearTimeout(timer);
  }, [phase, onComplete]);

  const showLogo = phase === 'logo' || phase === 'name';
  const showName = phase === 'name';

  return (
    <AnimatePresence>
      {phase !== 'exiting' ? (
        <motion.div
          className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: '#1A0A0E' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* Subtle background decoration */}
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full" style={{ background: 'rgba(196,30,58,0.1)' }} />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full" style={{ background: 'rgba(92,26,27,0.12)' }} />
          <div className="absolute top-1/4 -left-12 w-36 h-36 rounded-full" style={{ background: 'rgba(196,30,58,0.06)' }} />
          <div className="absolute bottom-1/3 -right-10 w-32 h-32 rounded-full" style={{ background: 'rgba(92,26,27,0.08)' }} />

          {/* Loading phase - pulse animation */}
          {phase === 'loading' && (
            <motion.div
              className="relative flex items-center justify-center"
              style={{ width: 100, height: 100 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '2px solid rgba(255,255,255,0.15)' }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.1, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <div
                className="rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  width: 72,
                  height: 72,
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(196,30,58,0.1)',
                }}
              >
                <img src={LOGO_BASE64} alt="محفظة الجنوب" className="w-[54px] h-[54px] object-cover" />
              </div>
            </motion.div>
          )}

          {/* Logo - appears after loading */}
          {showLogo && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
              className="flex flex-col items-center"
            >
              {/* Logo with subtle pulse */}
              <motion.div
                animate={{
                  scale: [1, 1.03, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <div
                  className="rounded-2xl overflow-hidden flex items-center justify-center mb-5"
                  style={{
                    width: 88,
                    height: 88,
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(196,30,58,0.15)',
                  }}
                >
                  <img src={LOGO_BASE64} alt="محفظة الجنوب" className="w-[66px] h-[66px] object-cover" />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* App Name */}
          {showName && (
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-2xl font-bold text-white"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
            >
              محفظة الجنوب
            </motion.h1>
          )}

          {/* Loading progress bar at bottom */}
          {phase === 'loading' && (
            <div className="absolute bottom-16 left-10 right-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>جارٍ التحميل</span>
                <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.45)' }} dir="ltr">
                  {Math.round(progress)}%
                </span>
              </div>
              <div
                className="h-[2px] rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, rgba(196,30,58,0.6) 0%, rgba(245,230,232,0.95) 50%, rgba(196,30,58,0.6) 100%)',
                    width: `${progress}%`,
                  }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          className="fixed inset-0"
          style={{ background: '#1A0A0E' }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      )}
    </AnimatePresence>
  );
}
