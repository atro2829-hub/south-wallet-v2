'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import LoginScreen from '@/components/admin/login-screen';
import Sidebar from '@/components/admin/sidebar';
import Dashboard from '@/components/admin/dashboard';
import UsersPanel from '@/components/admin/users-panel';
import OrdersPanel from '@/components/admin/orders-panel';
import DepositPanel from '@/components/admin/deposit-panel';
import WithdrawPanel from '@/components/admin/withdraw-panel';
import KYCPanel from '@/components/admin/kyc-panel';
import InstantRechargePanel from '@/components/admin/instant-recharge-panel';
import PackagesPanel from '@/components/admin/packages-panel';
import ExchangeRatesPanel from '@/components/admin/exchange-rates-panel';
import GiftCodesPanel from '@/components/admin/gift-codes-panel';
import PromoCodesPanel from '@/components/admin/promo-codes-panel';
import BannersPanel from '@/components/admin/banners-panel';
import BanksPanel from '@/components/admin/banks-panel';
import SupportChatPanel from '@/components/admin/support-chat-panel';
import SocialLinksPanel from '@/components/admin/social-links-panel';
import LegalContentPanel from '@/components/admin/legal-content-panel';
import SectionsPanel from '@/components/admin/sections-panel';
import VisibilityPanel from '@/components/admin/visibility-panel';
import NotificationsPanel from '@/components/admin/notifications-panel';
import SettingsPanel from '@/components/admin/settings-panel';
import ActivityLogPanel from '@/components/admin/activity-log-panel';
import BackupPanel from '@/components/admin/backup-panel';
import CommissionsPanel from '@/components/admin/commissions-panel';
import PushNotificationsPanel from '@/components/admin/push-notifications-panel';
import CardColorsPanel from '@/components/admin/card-colors-panel';
import EscrowPanel from '@/components/admin/escrow-panel';
import SupportTicketsPanel from '@/components/admin/support-tickets-panel';
import ChatMonitorPanel from '@/components/admin/chat-monitor-panel';
import G2BulkPanel from '@/components/admin/g2bulk-panel';
import { Menu, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { APP_ICON_BASE64 } from '@/lib/app-icon';

const panelMap: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  users: UsersPanel,
  orders: OrdersPanel,
  escrow: EscrowPanel,
  deposit: DepositPanel,
  withdraw: WithdrawPanel,
  kyc: KYCPanel,
  'instant-recharge': InstantRechargePanel,
  packages: PackagesPanel,
  'exchange-rates': ExchangeRatesPanel,
  'gift-codes': GiftCodesPanel,
  'promo-codes': PromoCodesPanel,
  banners: BannersPanel,
  banks: BanksPanel,
  'support-chat': SupportChatPanel,
  'support-tickets': SupportTicketsPanel,
  'chat-monitor': ChatMonitorPanel,
  'social-links': SocialLinksPanel,
  'legal-content': LegalContentPanel,
  sections: SectionsPanel,
  visibility: VisibilityPanel,
  notifications: NotificationsPanel,
  settings: SettingsPanel,
  'activity-log': ActivityLogPanel,
  backup: BackupPanel,
  commissions: CommissionsPanel,
  'push-notifications': PushNotificationsPanel,
  'card-colors': CardColorsPanel,
  g2bulk: G2BulkPanel,
};

export default function AdminApp() {
  const { isAuthenticated, adminUser, activePanel, setAdminUser, logout, setSidebarOpen } = useAdminStore();
  const [initializing, setInitializing] = useState(true);
  const [newNotifications, setNewNotifications] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const roleRef = ref(database, `users/${user.uid}/role`);
          const roleSnapshot = await get(roleRef);
          const role = roleSnapshot.val();

          if (role === 'admin' || role === 'owner') {
            const nameRef = ref(database, `users/${user.uid}`);
            const nameSnapshot = await get(nameRef);
            const userData = nameSnapshot.val() || {};

            setAdminUser({
              uid: user.uid,
              email: user.email || '',
              displayName: userData.name || userData.firstName || user.email?.split('@')[0] || '',
              role,
              photoURL: userData.avatar || user.photoURL || undefined,
            });
          } else {
            logout();
          }
        } catch (e) {
          console.error('Error checking auth state:', e);
          logout();
        }
      } else {
        logout();
      }
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen for admin notifications (order/deposit/withdraw)
  useEffect(() => {
    if (!isAuthenticated) return;
    const notifRef = ref(database, 'adminNotifications');
    const unsub = onValue(notifRef, (snapshot) => {
      const data = snapshot.val() || {};
      const now = new Date();
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
      let count = 0;
      Object.values(data).forEach((n: any) => {
        if (n.sentAt && new Date(n.sentAt) > fiveMinAgo) count++;
      });
      setNewNotifications(count);
    });
    return () => unsub();
  }, [isAuthenticated]);

  // Initialize Capacitor Push Notifications for admin app
  useEffect(() => {
    if (!isAuthenticated || !adminUser) return;

    const initPushNotifications = async () => {
      try {
        // Check if running in Capacitor native environment
        const win = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
        const isNative = win.Capacitor && win.Capacitor.isNativePlatform && win.Capacitor.isNativePlatform();

        if (isNative) {
          const { PushNotifications } = await import('@capacitor/push-notifications');

          const permResult = await PushNotifications.requestPermissions();
          if (permResult.receive !== 'granted') {
            console.warn('Admin push notification permission denied');
            return;
          }

          await PushNotifications.register();

          PushNotifications.addListener('registration', async (token) => {
            console.log('Admin push registration success:', token.value);
            // Save FCM token to Firebase for admin
            try {
              const { ref, set: firebaseSet } = await import('firebase/database');
              await firebaseSet(ref(database, `users/${adminUser.uid}/fcmToken`), token.value);
            } catch (e) {
              console.warn('Failed to save admin FCM token:', e);
            }
          });

          PushNotifications.addListener('registrationError', (error) => {
            console.warn('Admin push registration error:', error);
          });

          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Admin push notification received:', notification);
            // Play notification sound
            try {
              const audio = new Audio('/sounds/notification.wav');
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch {}
            // Vibrate
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Admin push notification action:', action);
          });
        } else {
          // Web/PWA Firebase Messaging
          try {
            const { getToken, onMessage } = await import('firebase/messaging');
            const { getMessaging, isSupported } = await import('firebase/messaging');

            const supported = await isSupported();
            if (!supported) return;

            const { getApp } = await import('firebase/app');
            const messaging = getMessaging(getApp());

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const vapidKey = 'BMqFpzYvhfjzEM3v1Oq-gMfPwFwmI_S04g-QC_Lz1yFEPG4bZxqXbHOyI_NzJqPWKMfCgL_2MnC1r8l0G6eFyLA';
              const currentToken = await getToken(messaging, { vapidKey });

              if (currentToken) {
                const { ref, set: firebaseSet } = await import('firebase/database');
                await firebaseSet(ref(database, `users/${adminUser.uid}/fcmToken`), currentToken);
                console.log('Admin web FCM token saved');
              }

              onMessage(messaging, (payload) => {
                console.log('Admin foreground message:', payload);
                try {
                  const audio = new Audio('/sounds/notification.wav');
                  audio.volume = 0.5;
                  audio.play().catch(() => {});
                } catch {}
                if (navigator.vibrate) navigator.vibrate(100);
              });
            }
          } catch (webError) {
            console.warn('Admin web Firebase Messaging not available:', webError);
          }
        }
      } catch (error) {
        console.warn('Admin push notifications init failed (non-fatal):', error);
      }
    };

    const timer = setTimeout(initPushNotifications, 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, adminUser]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-gradient">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center overflow-hidden">
            <img src={APP_ICON_BASE64} alt="" className="w-10 h-10 object-contain" />
          </div>
          <p className="text-purple-300/70 text-sm">جاري التحقق...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated || !adminUser) {
    return <LoginScreen />;
  }

  // If admin tries to access owner-only panel, redirect to dashboard
  const ownerOnlyPanels = ['card-colors', 'sections', 'visibility', 'api-settings', 'activity-log', 'backup'];
  const effectivePanel = (adminUser.role !== 'owner' && ownerOnlyPanels.includes(activePanel)) ? 'dashboard' : activePanel;
  const ActivePanelComponent = panelMap[effectivePanel] || Dashboard;

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0F0F0F]">
      <Sidebar />

      <div className="lg:mr-72 min-h-screen">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-muted-foreground">
                  {adminUser.role === 'owner' ? 'المالك' : 'المدير'}: {adminUser.displayName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {newNotifications > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{newNotifications} جديد</span>
              )}
              <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
              <span className="text-xs text-muted-foreground">متصل</span>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={effectivePanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ActivePanelComponent />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
