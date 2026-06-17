'use client';

import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { ToastProvider, useToast } from '@/components/fahed/toast-provider';
import { useTheme } from 'next-themes';
import { onAuthStateChanged } from '@/lib/supabase-auth';
import { auth } from '@/lib/supabase-auth';
import { database } from '@/lib/db-compat';
import { ref, get, update } from '@/lib/db-compat';
import { generateUserId } from '@/lib/utils';
import { ErrorBoundary } from '@/components/fahed/error-boundary';

// Lazy-loaded screen components for better performance
const AuthScreen = lazy(() => import('@/components/fahed/auth-screen'));
const HomeScreen = lazy(() => import('@/components/fahed/home-screen'));
const ServicesScreen = lazy(() => import('@/components/fahed/services-screen'));
const WalletScreen = lazy(() => import('@/components/fahed/wallet-screen'));
const AccountScreen = lazy(() => import('@/components/fahed/account-screen'));
const KycScreen = lazy(() => import('@/components/fahed/kyc-screen'));
const NotificationsScreen = lazy(() => import('@/components/fahed/notifications-screen'));
const OrdersScreen = lazy(() => import('@/components/fahed/orders-screen'));
const DepositScreen = lazy(() => import('@/components/fahed/deposit-screen'));
const SavingsScreen = lazy(() => import('@/components/fahed/savings-screen'));
const SupportScreen = lazy(() => import('@/components/fahed/support-screen'));
const ExchangeScreen = lazy(() => import('@/components/fahed/exchange-screen'));
const PromoScreen = lazy(() => import('@/components/fahed/promo-screen'));
const QRScreen = lazy(() => import('@/components/fahed/qr-screen'));
const EditProfileScreen = lazy(() => import('@/components/fahed/edit-profile-screen'));
const SplitScreen = lazy(() => import('@/components/fahed/split-screen'));
const SubscriptionsScreen = lazy(() => import('@/components/fahed/subscriptions-screen'));
const ChargingCompaniesScreen = lazy(() => import('@/components/fahed/charging-companies-screen'));
const RechargeScreen = lazy(() => import('@/components/fahed/recharge-screen'));
const SettingsScreen = lazy(() => import('@/components/fahed/settings-screen'));
const CategoryDetailScreen = lazy(() => import('@/components/fahed/category-detail-screen'));
const LegalScreen = lazy(() => import('@/components/fahed/legal-screen'));
const InvestmentScreen = lazy(() => import('@/components/fahed/investment-screen'));
const GiftVoucherScreen = lazy(() => import('@/components/fahed/gift-voucher-screen'));
const PinSetupScreen = lazy(() => import('@/components/fahed/pin-setup-screen'));
const WalletTransferScreen = lazy(() => import('@/components/fahed/wallet-transfer-screen'));
const EscrowScreen = lazy(() => import('@/components/fahed/escrow-screen'));
const DirectChatScreen = lazy(() => import('@/components/fahed/direct-chat-screen'));
const GamesScreen = lazy(() => import('@/components/fahed/games-screen'));

// Eagerly loaded components (critical for initial render or frequently used)
import BottomNav from '@/components/fahed/bottom-nav';
import QuickActionDrawer from '@/components/fahed/quick-action-drawer';
import TransferModal from '@/components/fahed/transfer-modal';
import RequestMoneyModal from '@/components/fahed/request-money-modal';
import OrderBottomSheet from '@/components/fahed/order-bottom-sheet';
import SplashScreen from '@/components/fahed/splash-screen';
import PinScreen from '@/components/fahed/pin-screen';
import { useSupabaseSync } from '@/lib/use-supabase-sync';
import { useAdminSettings } from '@/lib/use-admin-settings';
import { LOGO_BASE64 } from '@/lib/logo';

// Loading spinner component for Suspense fallback
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F5F5' }}>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-3 border-[#800020]/30 border-t-[#800020] rounded-full animate-spin" />
      </div>
    </div>
  );
}

function DarkLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center dark" style={{ background: '#120808' }}>
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 border-3 border-[#800020]/30 border-t-[#800020] rounded-full animate-spin" />
      </div>
    </div>
  );
}

type AppPhase = 'splash' | 'pin' | 'main';

function AppContent() {
  const { user, isAuthenticated, activeTab, activeScreen, setActiveScreen, theme: storeTheme, pinCode, selectedCategory, featureFlags, killSwitch } = useAppStore();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setTheme } = useTheme();
  const { showToast } = useToast();
  const mountedRef = useRef(false);
  const [showUI, setShowUI] = useState(false);
  const [phase, setPhase] = useState<AppPhase>('splash');
  const [authLoading, setAuthLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const authInitializedRef = useRef(false);
  const kycToastShownRef = useRef(false);

  // Sync user data from Supabase (real-time + on focus + on mount)
  useSupabaseSync();
  const { maintenance, forceUpdate } = useAdminSettings();

  // Android back button handler via @capacitor/app
  useEffect(() => {
    if (!isAuthenticated) return;

    let backPressedCount = 0;
    let listener: any = null;

    const setupBackButton = async () => {
      try {
        const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        const isNative = win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform();
        if (!isNative) return;

        const { App } = await import('@capacitor/app');
        listener = await App.addListener('backButton', () => {
          const state = useAppStore.getState();

          // If any modal is open, close it first
          if (state.isTransferOpen) { state.setTransferOpen(false); return; }
          if (state.isOrderOpen) { state.setOrderOpen(false); return; }
          if (state.isDrawerOpen) { state.setDrawerOpen(false); return; }
          if (state.isRequestMoneyOpen) { state.setRequestMoneyOpen(false); return; }

          // If on an overlay screen, go back to main
          if (state.activeScreen && state.activeScreen !== 'main') {
            state.setActiveScreen('main');
            return;
          }

          // If on a non-home tab, go to home tab
          if (state.activeTab !== 'home') {
            state.setActiveTab('home');
            return;
          }

          // On home tab - double press to exit
          if (backPressedCount === 0) {
            backPressedCount = 1;
            showToast('info', 'اضغط مرة أخرى للخروج', '');
            setTimeout(() => { backPressedCount = 0; }, 2000);
          } else if (backPressedCount === 1) {
            App.exitApp();
          }
        });
      } catch (e) {
        // Not running in Capacitor native - ignore
      }
    };

    setupBackButton();

    return () => {
      if (listener && typeof listener.then === 'function') {
        listener.then((l: any) => l?.remove?.()).catch(() => {});
      } else if (listener?.remove) {
        listener.remove();
      }
    };
  }, [isAuthenticated, showToast]);

  // Show KYC verification toast as a floating notification
  useEffect(() => {
    if (!user || !isAuthenticated) {
      kycToastShownRef.current = false;
      return;
    }
    if (user.kycStatus === 'verified') {
      kycToastShownRef.current = false;
      return;
    }
    // Only show once per login session
    if (kycToastShownRef.current) return;
    kycToastShownRef.current = true;

    const statusMessages: Record<string, { title: string; message: string; type: 'warning' | 'info' | 'error' }> = {
      pending: {
        title: 'حسابك غير موثق',
        message: 'لاستخدام جميع مميزات التطبيق، يرجى توثيق حسابك الآن',
        type: 'warning',
      },
      submitted: {
        title: 'طلب التوثيق قيد المراجعة',
        message: 'سيتم إشعارك بعد مراجعة طلب التوثيق',
        type: 'info',
      },
      rejected: {
        title: 'تم رفض طلب التوثيق',
        message: 'يرجى إعادة تقديم طلب التوثيق مع البيانات الصحيحة',
        type: 'error',
      },
    };

    const config = statusMessages[user.kycStatus] || statusMessages.pending;

    // Delay the toast so it doesn't appear during transition
    const timer = setTimeout(() => {
      showToast(config.type, config.title, config.message);
    }, 1500);

    return () => clearTimeout(timer);
  }, [user?.kycStatus, isAuthenticated, showToast]);

  // Listen to Supabase Auth state changes and sync with Zustand store
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Mark that auth has been initialized at least once
      if (!authInitializedRef.current) {
        authInitializedRef.current = true;
      }

      if (firebaseUser) {
        // User is signed in via Supabase Auth.
        // ALWAYS fetch the user's row from Supabase — never trust the cached
        // Zustand state because the previous session may have stored incomplete
        // data (e.g. card_number='' if setUser was called with camelCase keys
        // by mistake). This is what caused the "6-digit ID disappears after
        // restart" bug: the early-return at currentUser.id === firebaseUser.uid
        // meant we never re-fetched card_number.
        try {
          const userRef = ref(database, `users/${firebaseUser.uid}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            // Supabase returns snake_case fields; map them.
            const data = snapshot.val();
            const fullName =
              [data.first_name, data.second_name, data.third_name, data.family_name]
                .filter((n: string) => n && n.trim()).join(' ') ||
              data.display_name || data.name || '';
            const isAdminEmail = (data.email || firebaseUser.email || '').toLowerCase().includes('admin');
            let effectiveRole: 'user' | 'admin' | 'owner' = data.role || 'user';
            if (effectiveRole !== 'owner' && (effectiveRole === 'admin' || isAdminEmail)) {
              effectiveRole = 'admin';
            }
            // Override: founder email is always owner
            if ((firebaseUser.email || '').toLowerCase() === 'm775371829@gmail.com') {
              effectiveRole = 'owner';
            }
            useAppStore.getState().setUser({
              id: firebaseUser.uid,
              email: data.email || firebaseUser.email || '',
              phone: data.phone || '',
              name: fullName,
              firstName: data.first_name || '',
              secondName: data.second_name || '',
              thirdName: data.third_name || '',
              familyName: data.family_name || '',
              nationalId: data.national_id || '',
              avatar: data.avatar_url || '',
              role: effectiveRole,
              userId: data.card_number || '',
              kycStatus: data.kyc_status || 'pending',
              isBlocked: data.is_blocked || false,
              balanceYER: data.balance_yer || 0,
              balanceSAR: data.balance_sar || 0,
              balanceUSD: data.balance_usd || 0,
              cardType: data.card_type || '',
              cardNumber: data.card_number || '',
              cardIssuedAt: data.card_issued_at || '',
              governorate: data.governorate || '',
              theme: data.theme || 'light',
            });
          } else {
            // Auth user exists but no public.users row — create a minimal one.
            // (This is rare since signUp already creates the row, but we handle it
            // for safety / for users created before the migration.)
            const newUserId = generateUserId();
            const email = firebaseUser.email || '';
            const isAdminEmail = email.toLowerCase().includes('admin');
            const newUserData = {
              email,
              phone: '',
              display_name: '',
              first_name: '', second_name: '', third_name: '', family_name: '',
              national_id: null,
              avatar_url: '',
              role: isAdminEmail ? 'admin' : 'user',
              card_number: newUserId,
              card_issued_at: new Date().toISOString(),
              kyc_status: 'pending',
              is_blocked: false,
              balance_yer: 0, balance_sar: 0, balance_usd: 0,
              card_type: '',
              governorate: '',
              theme: 'light',
            };
            await update(ref(database, `users/${firebaseUser.uid}`), newUserData);
            useAppStore.getState().setUser({
              id: firebaseUser.uid,
              email, phone: '', name: '',
              firstName: '', secondName: '', thirdName: '', familyName: '',
              nationalId: '', avatar: '',
              role: isAdminEmail ? 'admin' : 'user',
              userId: newUserId,
              kycStatus: 'pending',
              isBlocked: false,
              balanceYER: 0, balanceSAR: 0, balanceUSD: 0,
              cardType: '', cardNumber: newUserId, cardIssuedAt: '',
              governorate: '', theme: 'light',
            });
          }
        } catch (error) {
          console.error('Error fetching user data on auth state change:', error);
        }
      } else {
        // User is signed out
        const currentState = useAppStore.getState();
        if (currentState.isAuthenticated || currentState.user) {
          useAppStore.getState().logout();
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const raf = requestAnimationFrame(() => {
      setShowUI(true);
    });
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (mountedRef.current) {
      setTheme(storeTheme);
    }
  }, [storeTheme, setTheme]);

  // Initialize Push Notifications (Capacitor native + Web FCM)
  // We request permission as EARLY as possible — even before the user signs in —
  // because Android 13+ requires explicit notification runtime permission and
  // waiting until after login causes users to miss the very first push
  // notifications (welcome, deposit confirmation, gift codes, etc.).
  // On iOS/Web, Notification.requestPermission() is a no-op if already granted.
  useEffect(() => {
    const initPushNotifications = async () => {
      try {
        const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        const isNative = win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform();

        if (isNative) {
          // ─── Native Android/iOS via Capacitor ───
          const { PushNotifications } = await import('@capacitor/push-notifications');

          // Request permission
          const permResult = await PushNotifications.requestPermissions();
          if (permResult.receive !== 'granted') {
            console.warn('Push notification permission denied');
            return;
          }

          // Register for push notifications
          await PushNotifications.register();

          // Listen for registration token
          PushNotifications.addListener('registration', async (token) => {
            console.log('Push registration success, token:', token.value);
            localStorage.setItem('notification-permission', 'granted');
            // Save FCM token directly to Supabase users.fcm_token (snake_case).
            // The previous implementation went through db-compat which wrote
            // to a camelCase `fcmToken` field that doesn't exist in the
            // users table — so the token was silently dropped and push
            // notifications never reached anyone.
            try {
              const { supabase } = await import('@/lib/supabase');
              const currentUser = useAppStore.getState().user;
              if (currentUser?.id) {
                const { error: tokenErr } = await supabase
                  .from('users')
                  .update({ fcm_token: token.value, updated_at: new Date().toISOString() })
                  .eq('id', currentUser.id);
                if (tokenErr) {
                  console.warn('Failed to persist FCM token to users.fcm_token:', tokenErr.message);
                } else {
                  console.log('FCM token saved to Supabase users.fcm_token for user:', currentUser.id);
                }
              }
            } catch (e) {
              console.warn('Failed to save FCM token:', e);
            }
          });

          // Listen for registration errors (don't crash, just log)
          PushNotifications.addListener('registrationError', (error) => {
            console.warn('Push registration error (non-fatal):', error);
          });

          // Listen for push notification received (foreground)
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received:', notification);
            // Show in-app toast
            const store = useAppStore.getState();
            if (notification.title || notification.body) {
              store.addNotification({
                id: `push-${Date.now()}`,
                title: notification.title || 'إشعار جديد',
                body: notification.body || '',
                type: 'info',
                isRead: false,
                createdAt: new Date().toISOString(),
              });

              // Play notification sound
              try {
                const soundType = notification.data?.type || 'info';
                const soundMap: Record<string, string> = {
                  transaction: '/sounds/transfer.wav',
                  security: '/sounds/security.wav',
                  promo: '/sounds/promo.wav',
                  info: '/sounds/notification.wav',
                };
                const audio = new Audio(soundMap[soundType] || soundMap.info);
                audio.volume = 0.5;
                audio.play().catch(() => {});
              } catch {}

              // Vibrate
              if (navigator.vibrate) {
                navigator.vibrate(100);
              }
            }
          });

          // Listen for push notification action (background/closed app tap)
          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Push notification action:', action);
          });

        } else {
          // ─── Web/PWA via Firebase Messaging SDK ───
          try {
            const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
            const { messaging: firebaseMessaging } = await import('@/lib/firebase');

            // Request notification permission
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              localStorage.setItem('notification-permission', 'granted');

              // Get FCM token for web
              const vapidKey = 'BMqFpzYvhfjzEM3v1Oq-gMfPwFwmI_S04g-QC_Lz1yFEPG4bZxqXbHOyI_NzJqPWKMfCgL_2MnC1r8l0G6eFyLA'; // We'll generate this
              const currentToken = await getToken(firebaseMessaging, {
                vapidKey: vapidKey,
              });

              if (currentToken) {
                console.log('Web FCM token:', currentToken);
                // Save FCM token directly to Supabase users.fcm_token (snake_case).
                const currentUser = useAppStore.getState().user;
                if (currentUser?.id) {
                  try {
                    const { supabase } = await import('@/lib/supabase');
                    const { error: tokenErr } = await supabase
                      .from('users')
                      .update({ fcm_token: currentToken, updated_at: new Date().toISOString() })
                      .eq('id', currentUser.id);
                    if (tokenErr) {
                      console.warn('Failed to persist web FCM token:', tokenErr.message);
                    } else {
                      console.log('Web FCM token saved to Supabase users.fcm_token for user:', currentUser.id);
                    }
                  } catch (e) {
                    console.warn('Failed to save web FCM token:', e);
                  }
                }
              }

              // Listen for foreground messages
              onMessage(firebaseMessaging, (payload) => {
                console.log('Foreground message received:', payload);
                const store = useAppStore.getState();

                // Show in-app notification
                store.addNotification({
                  id: `push-${Date.now()}`,
                  title: payload.notification?.title || payload.data?.title || 'إشعار جديد',
                  body: payload.notification?.body || payload.data?.body || '',
                  type: (payload.data?.type as any) || 'info',
                  isRead: false,
                  createdAt: new Date().toISOString(),
                });

                // Play notification sound
                try {
                  const soundType = payload.data?.type || 'info';
                  const soundMap: Record<string, string> = {
                    transaction: '/sounds/transfer.wav',
                    security: '/sounds/security.wav',
                    promo: '/sounds/promo.wav',
                    info: '/sounds/notification.wav',
                  };
                  const audio = new Audio(soundMap[soundType] || soundMap.info);
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                } catch {}

                // Vibrate
                if (navigator.vibrate) {
                  navigator.vibrate(100);
                }
              });
            } else {
              console.warn('Notification permission denied for web');
            }
          } catch (webError) {
            console.warn('Web Firebase Messaging not available (non-fatal):', webError);
          }
        }

      } catch (error) {
        // If anything fails, just log it and continue - don't crash the app
        console.warn('Push notifications initialization failed (non-fatal):', error);
      }
    };

    // Delay initialization to avoid interfering with app startup
    const timer = setTimeout(initPushNotifications, 3000);
    return () => clearTimeout(timer);
  }, []); // Run once on mount — NOT gated on isAuthenticated.

  // When the user signs in (or signs back in), persist their FCM token so the
  // backend can route push notifications to them. This runs whenever the auth
  // state changes; it complements the early-permission-request above.
  useEffect(() => {
    if (!isAuthenticated) return;
    const currentUser = useAppStore.getState().user;
    if (!currentUser?.id) return;
    // Best-effort: re-register the token. If permission was already granted,
    // PushNotifications.register() is a no-op that simply re-emits the token.
    (async () => {
      try {
        const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        const isNative = win.Capacitor?.isNativePlatform?.();
        if (isNative) {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          await PushNotifications.register();
        }
      } catch (e) {
        console.warn('FCM token re-register on login failed (non-fatal):', e);
      }
    })();
  }, [isAuthenticated]);

  const handleSplashComplete = () => {
    setSplashDone(true);
    // Phase transition will happen in the useEffect below
  };

  const handlePinUnlock = () => {
    setPhase('main');
  };

  // Transition phase after both splash is done and auth is resolved
  useEffect(() => {
    if (splashDone && !authLoading) {
      if (isAuthenticated && pinCode) {
        setPhase('pin');
      } else {
        setPhase('main');
      }
    }
  }, [splashDone, authLoading, isAuthenticated, pinCode]);

  useEffect(() => {
    if (phase === 'main' && !isAuthenticated) {
      // User logged out, stay on main (which shows auth screen)
    }
  }, [isAuthenticated, phase]);

  // Show auth loading screen while Firebase Auth is initializing
  if (authLoading && !splashDone) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show loading spinner while auth is resolving after splash
  if (authLoading && splashDone) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)', boxShadow: '0 8px 24px rgba(92,26,27,0.3)' }}>
            <span className="text-white text-sm font-bold">الجنوب</span>
          </div>
          <div className="w-8 h-8 border-2 border-[#5C1A1B]/30 border-t-[#5C1A1B] rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  // ─── Maintenance mode check (HIGHEST PRIORITY — runs BEFORE splash / PIN / loading) ──
  // This must come before EVERYTHING else (including splash, PIN, kill-switch, auth)
  // so that when the admin activates maintenance, the maintenance screen replaces
  // whatever the user is currently looking at — even mid-splash or mid-PIN entry.
  //
  // We also bypass it ONLY for the owner (so the founder can still log in to
  // disable maintenance if needed). This is enforced client-side; the owner's
  // email is the source of truth.
  const currentUserEmail = (useAppStore.getState().user?.email || '').toLowerCase();
  const isOwnerBypass = currentUserEmail === 'm775371829@gmail.com';
  if (!isOwnerBypass && (maintenance?.active || featureFlags.maintenanceMode)) {
    const maintenanceMessage = featureFlags.maintenanceMessage || maintenance?.message || '';
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 60%, #2D0A0A 100%)' }}>
        <div className="flex flex-col items-center px-8 text-center">
          <div className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <img src={LOGO_BASE64} alt="الجنوب" className="w-14 h-14 object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">صيانة مجدولة</h1>
          <p className="text-white/70 text-sm leading-relaxed mb-2">{maintenanceMessage || 'التطبيق حالياً في وضع الصيانة'}</p>
          {maintenance?.estimatedTime && (
            <p className="text-white/50 text-xs">الوقت المتوقع للعودة: {maintenance.estimatedTime}</p>
          )}
        </div>
      </div>
    );
  }

  // Splash screen phase
  if (phase === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // PIN lock phase
  if (phase === 'pin') {
    return <PinScreen onUnlock={handlePinUnlock} />;
  }

  // Main app phase
  if (!showUI) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F0F' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 overflow-hidden" style={{ background: 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)', boxShadow: '0 8px 24px rgba(92,26,27,0.3)' }}>
            <span className="text-white text-sm font-bold">الجنوب</span>
          </div>
          <div className="w-8 h-8 border-2 border-[#5C1A1B]/30 border-t-[#5C1A1B] rounded-full animate-spin" />
        </motion.div>
      </div>
    );
  }

  // ─── Kill switch check (BEFORE maintenance — highest priority) ────────
  // The kill switch is an emergency app shutdown controlled by admin.
  if (killSwitch?.active) {
    // Auto-deactivate if deactivateAt has passed
    const deactivateAt = killSwitch.deactivateAt ? new Date(killSwitch.deactivateAt).getTime() : 0;
    const now = Date.now();
    if (deactivateAt > 0 && now >= deactivateAt) {
      // Auto-deactivate - update Firebase
      update(ref(database, 'adminSettings/killSwitch'), { active: false });
    } else {
      // Calculate countdown
      let countdownText = '';
      if (deactivateAt > 0) {
        const diff = deactivateAt - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        countdownText = `${hours}س ${minutes}د`;
      }
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #B71C1C 0%, #880E4F 60%, #3D0F10 100%)' }}>
          <div className="flex flex-col items-center px-8 text-center">
            <div className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">التطبيق مغلق</h1>
            <p className="text-white/70 text-sm leading-relaxed mb-2">{killSwitch.message || 'التطبيق مغلق مؤقتاً'}</p>
            {countdownText && (
              <p className="text-white/50 text-xs mt-2">الوقت المتبقي: {countdownText}</p>
            )}
          </div>
        </div>
      );
    }
  }

  // ─── (Maintenance check moved to top of render — before splash/PIN) ────
  // The maintenance check now runs at the very top of the component so it
  // intercepts EVERY phase (splash, PIN, loading, main). Do not re-check here.

  // ─── Force update check (BEFORE auth check — applies to ALL users) ─────
  if (forceUpdate?.active) {
    const currentVersion = '0.4.6.5';
    const minVersion = forceUpdate.minVersion || '0.0.0';
    const needsUpdate = currentVersion < minVersion;
    if (needsUpdate) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #1A0A2E 0%, #2D1B4E 50%, #1A0A2E 100%)' }}>
          <div className="flex flex-col items-center px-8 text-center">
            <div className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <img src={LOGO_BASE64} alt="الجنوب" className="w-14 h-14 object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">تحديث مطلوب</h1>
            <p className="text-white/70 text-sm leading-relaxed mb-4">{forceUpdate.message || 'يرجى تحديث التطبيق إلى أحدث إصدار للاستمرار'}</p>
            {forceUpdate.updateUrl && (
              <a
                href={forceUpdate.updateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 rounded-xl text-white font-bold text-sm"
                style={{ background: '#5C1A1B' }}
              >
                تحديث الآن
              </a>
            )}
          </div>
        </div>
      );
    }
  }

  if (!isAuthenticated || !user) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthScreen />
      </Suspense>
    );
  }

  // Full-screen overlays
  const overlayScreens: Record<string, React.ComponentType> = {
    notifications: NotificationsScreen,
    kyc: KycScreen,
    orders: OrdersScreen,
    deposit: DepositScreen,
    savings: SavingsScreen,
    support: SupportScreen,
    exchange: ExchangeScreen,
    promo: PromoScreen,
    qr: QRScreen,
    'edit-profile': EditProfileScreen,
    split: SplitScreen,
    subscriptions: SubscriptionsScreen,
    'charging-companies': ChargingCompaniesScreen,
    recharge: RechargeScreen,
    settings: SettingsScreen,
    'category-detail': CategoryDetailScreen,
    legal: LegalScreen,
    investment: InvestmentScreen,
    'gift-vouchers': GiftVoucherScreen,
    'pin-setup': PinSetupScreen,
    'wallet-transfer': WalletTransferScreen,
    escrow: EscrowScreen,
    'direct-chat': DirectChatScreen,
    games: GamesScreen,
  };

  if (activeScreen in overlayScreens) {
    const OverlayComponent = overlayScreens[activeScreen];
    return (
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#120808] max-w-md mx-auto relative" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <ErrorBoundary
          key={activeScreen}
          onError={(err) => console.error(`Screen ${activeScreen} crashed:`, err)}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <OverlayComponent key={activeScreen === 'category-detail' ? `category-detail-${selectedCategory}` : activeScreen} />
          </Suspense>
        </ErrorBoundary>
        <OrderBottomSheet />
        <TransferModal />
        <RequestMoneyModal />
        <QuickActionDrawer />
      </div>
    );
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <HomeScreen />;
      case 'services': return <ServicesScreen />;
      case 'wallet': return <WalletScreen />;
      case 'account': return <AccountScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#120808] max-w-md mx-auto relative" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Suspense fallback={<LoadingSpinner />}>
              {renderScreen()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />
      <QuickActionDrawer />
      <TransferModal />
      <RequestMoneyModal />
      <OrderBottomSheet />
    </div>
  );
}

export default function Home() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}
