'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Camera,
  X,
  AlertCircle,
  CheckCircle2,
  SwitchCamera,
  Copy,
  Check,
  Zap,
  ZapOff,
  ShieldAlert,
  Wallet,
  Link2,
  FileText,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/components/fahed/toast-provider';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ScanResultType = 'wallet_address' | 'payment_link' | 'url' | 'text';

interface ScanResult {
  raw: string;
  type: ScanResultType;
  label: string;
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Error Boundary                                                     */
/* ------------------------------------------------------------------ */

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class QrScannerErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[QRScanner] Error boundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-red-500/10">
              <ShieldAlert size={40} strokeWidth={1.5} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold mb-2">حدث خطأ في الماسح</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              حدث خطأ غير متوقع في ماسح QR. يرجى المحاولة مرة أخرى.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground/60 mb-4 font-mono break-all max-h-20 overflow-auto">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white bg-primary"
            >
              إعادة المحاولة
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/*  Scan Animation Overlay                                             */
/* ------------------------------------------------------------------ */

function ScanAnimationOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Semi-transparent backdrop with cutout */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Scanning frame */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72">
          {/* Corner brackets */}
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />

          {/* Scanning line animation */}
          <motion.div
            className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
            initial={{ top: '4%' }}
            animate={{ top: ['4%', '96%', '4%'] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              boxShadow: '0 0 12px 2px rgba(52,211,153,0.4)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Permission Request Modal                                           */
/* ------------------------------------------------------------------ */

function PermissionRequestModal({
  onRequestPermission,
  onSkip,
}: {
  onRequestPermission: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center bg-black/70 z-20 p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-card rounded-2xl p-6 max-w-sm w-full text-center shadow-xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Camera size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold mb-2">الوصول إلى الكاميرا</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          يحتاج التطبيق إلى الوصول إلى الكاميرا لمسح رموز QR. لن يتم استخدام الكاميرا لأي غرض آخر.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onRequestPermission}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold"
          >
            السماح بالوصول
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 bg-muted text-muted-foreground rounded-xl text-sm font-medium"
          >
            إدخال يدوي
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result Type Detection                                              */
/* ------------------------------------------------------------------ */

function detectScanResultType(raw: string): ScanResult {
  const trimmed = raw.trim();

  // Wallet address patterns (crypto)
  if (/^(0x)?[0-9a-fA-F]{40,}$/.test(trimmed)) {
    return {
      raw: trimmed,
      type: 'wallet_address',
      label: 'عنوان محفظة',
      icon: <Wallet size={20} className="text-amber-500" />,
    };
  }

  // Bitcoin address
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(trimmed) || /^bc1[a-z0-9]{39,59}$/.test(trimmed)) {
    return {
      raw: trimmed,
      type: 'wallet_address',
      label: 'عنوان محفظة Bitcoin',
      icon: <Wallet size={20} className="text-orange-500" />,
    };
  }

  // Payment link patterns
  if (/^pay:\/\/|^lightning:|^bitcoin:|^ethereum:|^solana:/i.test(trimmed)) {
    return {
      raw: trimmed,
      type: 'payment_link',
      label: 'رابط دفع',
      icon: <Link2 size={20} className="text-emerald-500" />,
    };
  }

  // URL
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      raw: trimmed,
      type: 'url',
      label: 'رابط',
      icon: <Link2 size={20} className="text-blue-500" />,
    };
  }

  // Default to text
  return {
    raw: trimmed,
    type: 'text',
    label: 'نص',
    icon: <FileText size={20} className="text-muted-foreground" />,
  };
}

/* ------------------------------------------------------------------ */
/*  Vibration Feedback                                                 */
/* ------------------------------------------------------------------ */

function vibrateOnSuccess() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([100, 50, 100]);
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function QrScannerScreen() {
  const { setActiveScreen } = useAppStore();
  const { showToast } = useToast();

  /* ---- State ---- */
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedResult, setScannedResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const [copied, setCopied] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  /* ---- Refs ---- */
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const containerIdRef = useRef(`qr-scanner-reader-${Date.now()}`);

  /* ---------------------------------------------------------------- */
  /*  Dynamic import of Html5Qrcode (avoids hydration issues)          */
  /* ---------------------------------------------------------------- */

  const getHtml5Qrcode = useCallback(async () => {
    try {
      const mod = await import('html5-qrcode');
      return mod.Html5Qrcode;
    } catch {
      console.error('[QRScanner] Failed to load html5-qrcode');
      return null;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Capacitor Camera Fallback                                        */
  /* ---------------------------------------------------------------- */

  const tryCapacitorScan = useCallback(async (): Promise<string | null> => {
    try {
      const { Camera: CapacitorCamera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const photo = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      // Try to decode with a canvas-based approach
      // Use Html5Qrcode.scanFile for image-based scanning
      const Html5Qrcode = await getHtml5Qrcode();
      if (!Html5Qrcode) return null;

      const scanner = new Html5Qrcode(`capacitor-scan-${Date.now()}`);
      try {
        // Create a temporary div for scanning
        const tempDiv = document.createElement('div');
        tempDiv.id = scannerRef.current ? '' : `capacitor-scan-${Date.now()}`;
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);

        // Convert dataURL to File for scanFile
        const dataUrl = photo.dataUrl;
        if (!dataUrl) return null;
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'scan.jpg', { type: blob.type || 'image/jpeg' });
        const result = await scanner.scanFile(file, true);
        document.body.removeChild(tempDiv);
        return result;
      } catch {
        // No QR found in captured image
        try { scanner.clear(); } catch { /* ignore */ }
        return null;
      }
    } catch (err) {
      console.warn('[QRScanner] Capacitor camera not available:', err);
      return null;
    }
  }, [getHtml5Qrcode]);

  /* ---------------------------------------------------------------- */
  /*  Stop Scanning (thorough cleanup)                                 */
  /* ---------------------------------------------------------------- */

  const stopScanning = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        const state = scanner.getState();
        // State 2 = SCANNING
        if (state === 2) {
          await scanner.stop();
        }
      } catch (e) {
        console.warn('[QRScanner] Error stopping scanner:', e);
      }
      try {
        scanner.clear();
      } catch (e) {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
    if (isMountedRef.current) {
      setScanning(false);
      setIsInitializing(false);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Request Permissions                                              */
  /* ---------------------------------------------------------------- */

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      // Try Capacitor native permission first
      try {
        const { Camera: CapacitorCamera } = await import('@capacitor/camera');
        const permission = await CapacitorCamera.requestPermissions();
        // Check if granted
        if (permission.camera === 'granted' || permission.camera === 'limited') {
          return true;
        }
        if (permission.camera === 'denied') {
          setPermissionDenied(true);
          return false;
        }
      } catch {
        // Not running in Capacitor, try web API
      }

      // Web API fallback
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Immediately release the stream
          stream.getTracks().forEach(track => track.stop());
          return true;
        } catch (err: unknown) {
          const domErr = err as DOMException;
          if (domErr.name === 'NotAllowedError') {
            setPermissionDenied(true);
            return false;
          }
          throw err;
        }
      }

      return true;
    } catch (err) {
      console.error('[QRScanner] Permission error:', err);
      return false;
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Start Scanning                                                   */
  /* ---------------------------------------------------------------- */

  const startScanning = useCallback(async () => {
    // Prevent multiple simultaneous start attempts
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    setError(null);
    setIsInitializing(true);

    try {
      // Stop any existing scanner first
      if (scannerRef.current) {
        await stopScanning();
      }

      // Request permission
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        if (isMountedRef.current) {
          setError('تم رفض إذن الكاميرا. يرجى تفعيله من إعدادات التطبيق.');
          showToast('error', 'إذن مرفوض', 'تم رفض إذن الوصول إلى الكاميرا');
        }
        isStartingRef.current = false;
        setIsInitializing(false);
        return;
      }

      // Dynamic import to avoid hydration issues
      const Html5QrcodeClass = await getHtml5Qrcode();
      if (!Html5QrcodeClass) {
        throw new Error('فشل تحميل ماسح QR');
      }

      if (!isMountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      // Create a unique container ID each time to prevent stale DOM references
      const newId = `qr-scanner-reader-${Date.now()}`;
      containerIdRef.current = newId;

      const html5QrCode = new Html5QrcodeClass(newId);
      scannerRef.current = html5QrCode;

      const facingMode = useFrontCamera ? 'user' : 'environment';

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText: string) => {
          // Success callback
          vibrateOnSuccess();
          stopScanning();
          if (isMountedRef.current) {
            const result = detectScanResultType(decodedText);
            setScannedResult(result);
            showToast('success', 'تم المسح', 'تم قراءة رمز QR بنجاح');
          }
        },
        () => {
          // Scan failure - ignore, tries again automatically
        }
      );

      if (isMountedRef.current) {
        setScanning(true);
        setIsInitializing(false);
      }

      // Apply torch state if was on
      if (torchOn) {
        try {
          await html5QrCode.applyVideoConstraints({
            advanced: [{ torch: true } as MediaTrackConstraintSet],
          });
        } catch {
          // Torch not supported
          if (isMountedRef.current) {
            setTorchOn(false);
          }
        }
      }
    } catch (err) {
      console.error('[QRScanner] Camera error:', err);

      if (!isMountedRef.current) {
        isStartingRef.current = false;
        return;
      }

      scannerRef.current = null;
      setScanning(false);
      setIsInitializing(false);

      // Try Capacitor fallback
      const capResult = await tryCapacitorScan();
      if (capResult && isMountedRef.current) {
        vibrateOnSuccess();
        const result = detectScanResultType(capResult);
        setScannedResult(result);
        showToast('success', 'تم المسح', 'تم قراءة رمز QR بنجاح');
      } else if (isMountedRef.current) {
        setError('لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن أو استخدم الإدخال اليدوي.');
        showToast('error', 'خطأ', 'لا يمكن الوصول إلى الكاميرا');
      }
    } finally {
      isStartingRef.current = false;
    }
  }, [stopScanning, showToast, useFrontCamera, torchOn, requestCameraPermission, getHtml5Qrcode, tryCapacitorScan]);

  /* ---------------------------------------------------------------- */
  /*  Torch Toggle                                                     */
  /* ---------------------------------------------------------------- */

  const handleTorchToggle = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || !scanning) return;

    try {
      if (!torchOn) {
        await scanner.applyVideoConstraints({
          advanced: [{ torch: true } as MediaTrackConstraintSet],
        });
        setTorchOn(true);
      } else {
        // Turn off torch by re-applying without torch
        await scanner.applyVideoConstraints({
          advanced: [{ torch: false } as MediaTrackConstraintSet],
        });
        setTorchOn(false);
      }
    } catch {
      showToast('info', 'غير متاح', 'الفلاش غير مدعوم على هذا الجهاز');
    }
  }, [scanning, torchOn, showToast]);

  /* ---------------------------------------------------------------- */
  /*  Camera Flip                                                      */
  /* ---------------------------------------------------------------- */

  const handleFlipCamera = useCallback(async () => {
    await stopScanning();
    setUseFrontCamera(prev => !prev);
    setTorchOn(false);
    // Delay start to allow camera to release
    setTimeout(() => {
      if (isMountedRef.current) {
        startScanning();
      }
    }, 500);
  }, [stopScanning, startScanning]);

  /* ---------------------------------------------------------------- */
  /*  Manual input submit                                              */
  /* ---------------------------------------------------------------- */

  const handleManualSubmit = useCallback(() => {
    if (!manualInput.trim()) {
      showToast('error', 'خطأ', 'يرجى إدخال بيانات صالحة');
      return;
    }
    vibrateOnSuccess();
    const result = detectScanResultType(manualInput.trim());
    setScannedResult(result);
    stopScanning();
  }, [manualInput, showToast, stopScanning]);

  /* ---------------------------------------------------------------- */
  /*  Copy result                                                      */
  /* ---------------------------------------------------------------- */

  const handleCopyResult = useCallback(async () => {
    if (!scannedResult) return;
    try {
      await navigator.clipboard.writeText(scannedResult.raw);
      setCopied(true);
      showToast('success', 'تم النسخ', 'تم نسخ البيانات إلى الحافظة');
      setTimeout(() => {
        if (isMountedRef.current) setCopied(false);
      }, 2000);
    } catch {
      showToast('error', 'خطأ', 'فشل نسخ البيانات');
    }
  }, [scannedResult, showToast]);

  /* ---------------------------------------------------------------- */
  /*  Reset scanner                                                    */
  /* ---------------------------------------------------------------- */

  const handleReset = useCallback(() => {
    setScannedResult(null);
    setManualInput('');
    setError(null);
    setPermissionDenied(false);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Handle initial start (permission flow)                           */
  /* ---------------------------------------------------------------- */

  const handleStartPress = useCallback(async () => {
    setShowPermissionModal(false);
    await startScanning();
  }, [startScanning]);

  const handleRequestPermission = useCallback(() => {
    setShowPermissionModal(true);
  }, []);

  const handleSkipPermission = useCallback(() => {
    setShowPermissionModal(false);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Lifecycle: Cleanup on unmount                                    */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Synchronous-ish cleanup to avoid zombie scanners
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          const state = scanner.getState();
          if (state === 2) {
            // Must stop before clear
            scanner.stop().then(() => {
              try { scanner.clear(); } catch { /* ignore */ }
              scannerRef.current = null;
            }).catch(() => {
              try { scanner.clear(); } catch { /* ignore */ }
              scannerRef.current = null;
            });
          } else {
            try { scanner.clear(); } catch { /* ignore */ }
            scannerRef.current = null;
          }
        } catch {
          try { scanner.clear(); } catch { /* ignore */ }
          scannerRef.current = null;
        }
      }

      // Also clean up any leftover DOM elements from html5-qrcode
      try {
        const leftover = document.getElementById(containerIdRef.current);
        if (leftover) {
          leftover.innerHTML = '';
        }
      } catch { /* ignore */ }
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Auto-restart when useFrontCamera changes                         */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    // Only auto-restart if we were previously scanning and flipped camera
    // (The flip handler already restarts)
  }, [useFrontCamera]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <QrScannerErrorBoundary>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-navy-gradient px-4 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { stopScanning(); setActiveScreen('main'); }}
              className="p-2 glass rounded-xl"
            >
              <ArrowRight className="h-5 w-5 text-white" />
            </button>
            <h1 className="text-white text-lg font-bold">مسح QR</h1>
          </div>
        </div>

        <div className="px-4 mt-4 flex-1 flex flex-col gap-4 pb-6">
          <AnimatePresence mode="wait">
            {scannedResult ? (
              /* ---- Result View ---- */
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card rounded-2xl p-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </motion.div>

                <h3 className="text-lg font-bold mb-1">تم المسح بنجاح</h3>
                <p className="text-sm text-muted-foreground mb-4">تم التعرف على المحتوى</p>

                {/* Result type badge */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
                    {scannedResult.icon}
                    {scannedResult.label}
                  </span>
                </div>

                {/* Result content */}
                <div className="bg-muted rounded-xl p-4 mb-6">
                  <p className="text-xs font-mono break-all leading-relaxed" dir="ltr">
                    {scannedResult.raw}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCopyResult}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    {copied ? (
                      <>
                        <Check size={14} strokeWidth={2} />
                        تم النسخ
                      </>
                    ) : (
                      <>
                        <Copy size={14} strokeWidth={1.5} />
                        نسخ البيانات
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold active:scale-95 transition-transform"
                  >
                    مسح مرة أخرى
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ---- Scanner View ---- */
              <motion.div
                key="scanner"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-4"
              >
                {/* Camera View */}
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="relative aspect-square bg-black">
                    {/* QR Reader container - uses dynamic ID */}
                    <div
                      id={containerIdRef.current}
                      className="absolute inset-0 w-full h-full"
                      style={{ display: scanning ? 'block' : 'none' }}
                    />

                    {/* Scan animation overlay */}
                    {scanning && <ScanAnimationOverlay />}

                    {/* Initializing indicator */}
                    {isInitializing && !scanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                        <Loader2 className="h-10 w-10 text-white animate-spin mb-3" />
                        <p className="text-white/70 text-sm">جاري تشغيل الكاميرا...</p>
                      </div>
                    )}

                    {/* Idle state */}
                    {!scanning && !error && !isInitializing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.1 }}
                          className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-4"
                        >
                          <Camera className="h-10 w-10 text-white/60" />
                        </motion.div>
                        <p className="text-white/70 text-sm mb-5">وجه الكاميرا نحو رمز QR</p>
                        <button
                          onClick={handleRequestPermission}
                          className="px-8 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold active:scale-95 transition-transform"
                        >
                          بدء المسح
                        </button>
                      </div>
                    )}

                    {/* Error state */}
                    {error && !scanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-6 z-20">
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center mb-3"
                        >
                          <AlertCircle className="h-7 w-7 text-red-400" />
                        </motion.div>
                        <p className="text-white/90 text-sm text-center mb-2 font-medium">لا يمكن الوصول إلى الكاميرا</p>
                        <p className="text-white/60 text-xs text-center mb-5 leading-relaxed">{error}</p>
                        <div className="flex gap-3">
                          {permissionDenied && (
                            <a
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                showToast('info', 'الإعدادات', 'يرجى تفعيل إذن الكاميرا من إعدادات التطبيق');
                              }}
                              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-white/10 text-white"
                            >
                              فتح الإعدادات
                            </a>
                          )}
                          <button
                            onClick={startScanning}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground"
                          >
                            إعادة المحاولة
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom controls when scanning */}
                    {scanning && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-3 z-20">
                        <button
                          onClick={handleTorchToggle}
                          className={`p-2.5 rounded-xl transition-colors ${
                            torchOn
                              ? 'bg-amber-500 text-white'
                              : 'bg-black/70 text-white'
                          }`}
                          title={torchOn ? 'إيقاف الفلاش' : 'تشغيل الفلاش'}
                        >
                          {torchOn ? <Zap size={18} strokeWidth={1.5} /> : <ZapOff size={18} strokeWidth={1.5} />}
                        </button>
                        <button
                          onClick={handleFlipCamera}
                          className="p-2.5 rounded-xl bg-black/70 text-white"
                          title={useFrontCamera ? 'الكاميرا الخلفية' : 'الكاميرا الأمامية'}
                        >
                          <SwitchCamera size={18} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={stopScanning}
                          className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 bg-black/70 text-white"
                        >
                          <X size={16} strokeWidth={1.5} />
                          إيقاف
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Input */}
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-sm font-bold mb-3">أو أدخل البيانات يدوياً</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="عنوان محفظة، رابط، أو نص..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit(); }}
                      className="flex-1 px-4 py-3 bg-muted rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/30 outline-none"
                      dir="ltr"
                    />
                    <button
                      onClick={handleManualSubmit}
                      className="px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold active:scale-95 transition-transform"
                    >
                      تأكيد
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    يدعم عناوين المحافظ، روابط الدفع، والروابط العادية
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Permission Request Modal */}
        <AnimatePresence>
          {showPermissionModal && (
            <PermissionRequestModal
              onRequestPermission={handleStartPress}
              onSkip={handleSkipPermission}
            />
          )}
        </AnimatePresence>
      </div>
    </QrScannerErrorBoundary>
  );
}
