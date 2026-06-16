'use client';

import { useEffect, useRef, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, get, onValue, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { useAppStore } from '@/lib/store';
import type { ServiceProvider, ProductPackage, ServiceCategory } from '@/lib/store';

/**
 * Syncs user data and transactions from Firebase Realtime Database to the local Zustand store.
 * 
 * - On mount: Fetches fresh user data and transactions from Firebase
 * - Real-time: Listens for balance changes and new transactions via onValue
 * - On window focus: Refreshes user data and transactions
 * - On reconnect: Refreshes user data and transactions
 * 
 * FIXED: Uses queries for transactions instead of downloading the entire table.
 * FIXED: Uses refs for callbacks to prevent infinite re-render loops.
 */
export function useFirebaseSync() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const setNotifications = useAppStore((s) => s.setNotifications);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const txUnsubscribeRef = useRef<(() => void) | null>(null);
  const notifUnsubscribeRef = useRef<(() => void) | null>(null);
  const providersUnsubscribeRef = useRef<(() => void) | null>(null);
  const packagesUnsubscribeRef = useRef<(() => void) | null>(null);
  const categoriesUnsubscribeRef = useRef<(() => void) | null>(null);
  const isRefreshing = useRef(false);

  // Use refs for stable references in callbacks
  const userIdRef = useRef(user?.id);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const setUserRef = useRef(setUser);
  const setTransactionsRef = useRef(setTransactions);
  const setNotificationsRef = useRef(setNotifications);

  // Keep refs in sync with latest values
  useEffect(() => {
    userIdRef.current = user?.id;
    isAuthenticatedRef.current = isAuthenticated;
    setUserRef.current = setUser;
    setTransactionsRef.current = setTransactions;
    setNotificationsRef.current = setNotifications;
  });

  // Fetch fresh user data from Firebase and update store
  const refreshUser = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const currentIsAuth = isAuthenticatedRef.current;
    if (!currentUserId || !currentIsAuth) return;
    if (isRefreshing.current) return;
    
    isRefreshing.current = true;
    try {
      const userRef = ref(database, `users/${currentUserId}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const currentUser = useAppStore.getState().user;
        
        // Only update if data actually changed (avoid unnecessary re-renders)
        if (currentUser) {
          const fullName = [data.firstName, data.secondName, data.thirdName, data.familyName].filter((n: string) => n && n.trim()).join(' ') || data.name || '';
          const hasChanges = (
            currentUser.balanceYER !== (data.balanceYER || 0) ||
            currentUser.balanceSAR !== (data.balanceSAR || 0) ||
            currentUser.balanceUSD !== (data.balanceUSD || 0) ||
            currentUser.name !== fullName ||
            currentUser.firstName !== (data.firstName || '') ||
            currentUser.secondName !== (data.secondName || '') ||
            currentUser.thirdName !== (data.thirdName || '') ||
            currentUser.familyName !== (data.familyName || '') ||
            currentUser.nationalId !== (data.nationalId || '') ||
            currentUser.kycStatus !== (data.kycStatus || 'pending') ||
            currentUser.isBlocked !== (data.isBlocked || false) ||
            currentUser.phone !== (data.phone || '') ||
            currentUser.avatar !== (data.avatar || '') ||
            currentUser.cardType !== (data.cardType || '') ||
            currentUser.cardNumber !== (data.cardNumber || '') ||
            currentUser.governorate !== (data.governorate || '') ||
            currentUser.role !== (data.role || 'user') ||
            currentUser.theme !== (data.theme || 'light')
          );

          if (hasChanges) {
            setUserRef.current({
              id: currentUser.id,
              email: data.email || currentUser.email,
              phone: data.phone || '',
              name: fullName,
              firstName: data.firstName || '',
              secondName: data.secondName || '',
              thirdName: data.thirdName || '',
              familyName: data.familyName || '',
              nationalId: data.nationalId || '',
              avatar: data.avatar || '',
              role: data.role || 'user',
              userId: data.userId || '',
              kycStatus: data.kycStatus || 'pending',
              isBlocked: data.isBlocked || false,
              balanceYER: data.balanceYER || 0,
              balanceSAR: data.balanceSAR || 0,
              balanceUSD: data.balanceUSD || 0,
              cardType: data.cardType || '',
              cardNumber: data.cardNumber || '',
              cardIssuedAt: data.cardIssuedAt || '',
              governorate: data.governorate || '',
              theme: data.theme || 'light',
            });
          }
        }
      }

      // Also refresh transactions
      await refreshTransactions();
    } catch (error) {
      console.error('Firebase sync error:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []); // Empty deps - uses refs internally

  // Fetch transactions from Firebase - ONLY for the current user
  const refreshTransactions = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const currentIsAuth = isAuthenticatedRef.current;
    if (!currentUserId || !currentIsAuth) return;
    
    try {
      // Use query to only fetch transactions involving the current user
      // Try querying by fromUserId first
      const sentTxRef = query(
        ref(database, 'transactions'),
        orderByChild('fromUserId'),
        equalTo(currentUserId),
        limitToLast(100)
      );
      const sentSnapshot = await get(sentTxRef);

      // Also query by toUserId
      const receivedTxRef = query(
        ref(database, 'transactions'),
        orderByChild('toUserId'),
        equalTo(currentUserId),
        limitToLast(100)
      );
      const receivedSnapshot = await get(receivedTxRef);

      const allTxMap = new Map<string, any>();

      // Process sent transactions
      if (sentSnapshot.exists()) {
        const data = sentSnapshot.val();
        Object.entries(data).forEach(([key, tx]: [string, any]) => {
          allTxMap.set(key, tx);
        });
      }

      // Process received transactions
      if (receivedSnapshot.exists()) {
        const data = receivedSnapshot.val();
        Object.entries(data).forEach(([key, tx]: [string, any]) => {
          allTxMap.set(key, tx);
        });
      }

      const transactions = Array.from(allTxMap.values())
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((tx: any) => ({
          id: tx.id || '',
          fromUserId: tx.fromUserId || '',
          toUserId: tx.toUserId || '',
          amount: tx.amount || 0,
          currency: tx.currency || 'YER',
          type: tx.type || 'order',
          status: tx.status || 'completed',
          description: tx.description || '',
          createdAt: tx.createdAt || new Date().toISOString(),
        }));

      setTransactionsRef.current(transactions);
    } catch (error) {
      console.error('Firebase transactions sync error:', error);
      // Fallback: try fetching all transactions but only if queries fail
      try {
        const txRef = ref(database, 'transactions');
        const snapshot = await get(txRef);
        if (snapshot.exists()) {
          const currentUserId = userIdRef.current;
          const data = snapshot.val();
          const userTx = Object.values(data).filter((tx: any) => 
            tx.fromUserId === currentUserId || tx.toUserId === currentUserId
          ) as any[];
          
          const transactions = userTx
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((tx: any) => ({
              id: tx.id, fromUserId: tx.fromUserId || '', toUserId: tx.toUserId || '',
              amount: tx.amount || 0, currency: tx.currency || 'YER', type: tx.type || 'order',
              status: tx.status || 'completed', description: tx.description || '',
              createdAt: tx.createdAt || new Date().toISOString(),
            }));
          setTransactionsRef.current(transactions);
        }
      } catch (fallbackError) {
        console.error('Firebase transactions fallback sync error:', fallbackError);
      }
    }
  }, []); // Empty deps - uses refs internally

  // Fetch notifications from Firebase
  const refreshNotifications = useCallback(async () => {
    const currentUserId = userIdRef.current;
    const currentIsAuth = isAuthenticatedRef.current;
    if (!currentUserId || !currentIsAuth) return;

    try {
      const notifRef = ref(database, `notifications/${currentUserId}`);
      const snapshot = await get(notifRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifications = Object.values(data)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((n: any) => ({
            id: n.id || '',
            title: n.title || '',
            body: n.body || '',
            type: n.type || 'info' as const,
            isRead: n.isRead || false,
            createdAt: n.createdAt || new Date().toISOString(),
            navigationTarget: n.navigationTarget || n.navigation_target || undefined,
            navigationParams: n.navigationParams || n.navigation_params || undefined,
            data: n.data || undefined,
          }));

        setNotificationsRef.current(notifications);
      } else {
        setNotificationsRef.current([]);
      }
    } catch (error) {
      console.error('Firebase notifications sync error:', error);
    }
  }, []); // Empty deps - uses refs internally

  // Set up real-time listener for user data
  // This effect only depends on user?.id and isAuthenticated
  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      // Clean up listener when not authenticated
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (txUnsubscribeRef.current) {
        txUnsubscribeRef.current();
        txUnsubscribeRef.current = null;
      }
      if (notifUnsubscribeRef.current) {
        notifUnsubscribeRef.current();
        notifUnsubscribeRef.current = null;
      }
      return;
    }

    const userRef = ref(database, `users/${user.id}`);
    
    // Real-time listener - updates store whenever Firebase data changes
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const currentUser = useAppStore.getState().user;
        
        if (currentUser) {
          const fullName = [data.firstName, data.secondName, data.thirdName, data.familyName].filter((n: string) => n && n.trim()).join(' ') || data.name || '';
          setUserRef.current({
            id: currentUser.id,
            email: data.email || currentUser.email,
            phone: data.phone || '',
            name: fullName,
            firstName: data.firstName || '',
            secondName: data.secondName || '',
            thirdName: data.thirdName || '',
            familyName: data.familyName || '',
            nationalId: data.nationalId || '',
            avatar: data.avatar || '',
            role: data.role || 'user',
            userId: data.userId || '',
            kycStatus: data.kycStatus || 'pending',
            isBlocked: data.isBlocked || false,
            balanceYER: data.balanceYER || 0,
            balanceSAR: data.balanceSAR || 0,
            balanceUSD: data.balanceUSD || 0,
            cardType: data.cardType || '',
            cardNumber: data.cardNumber || '',
            cardIssuedAt: data.cardIssuedAt || '',
            governorate: data.governorate || '',
            theme: data.theme || 'light',
          });
        }
      }
    }, (error) => {
      console.error('Firebase onValue error:', error);
    });

    unsubscribeRef.current = unsubscribe;

    // Real-time listener for transactions - use queries instead of downloading all
    const sentTxRef = query(
      ref(database, 'transactions'),
      orderByChild('fromUserId'),
      equalTo(user.id),
      limitToLast(50)
    );

    const txUnsubscribe = onValue(sentTxRef, (snapshot) => {
      const currentUserId = useAppStore.getState().user?.id;
      if (!currentUserId) return;

      const allTxMap = new Map<string, any>();

      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([key, tx]: [string, any]) => {
          allTxMap.set(key, tx);
        });
      }

      // We also need to fetch received transactions
      // But to avoid a double listener, we do a one-time fetch for received
      const receivedTxRef = query(
        ref(database, 'transactions'),
        orderByChild('toUserId'),
        equalTo(currentUserId),
        limitToLast(50)
      );
      
      get(receivedTxRef).then((receivedSnapshot) => {
        if (receivedSnapshot.exists()) {
          const data = receivedSnapshot.val();
          Object.entries(data).forEach(([key, tx]: [string, any]) => {
            allTxMap.set(key, tx);
          });
        }

        const transactions = Array.from(allTxMap.values())
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((tx: any) => ({
            id: tx.id || '',
            fromUserId: tx.fromUserId || '',
            toUserId: tx.toUserId || '',
            amount: tx.amount || 0,
            currency: tx.currency || 'YER',
            type: tx.type || 'order',
            status: tx.status || 'completed',
            description: tx.description || '',
            createdAt: tx.createdAt || new Date().toISOString(),
          }));

        setTransactionsRef.current(transactions);
      }).catch((error) => {
        console.error('Firebase received transactions onValue error:', error);
      });
    }, (error) => {
      console.error('Firebase transactions onValue error:', error);
    });

    txUnsubscribeRef.current = txUnsubscribe;

    // Real-time listener for notifications
    const notifRef = ref(database, `notifications/${user.id}`);
    const notifUnsubscribe = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const notifications = Object.values(data)
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((n: any) => ({
            id: n.id || '',
            title: n.title || '',
            body: n.body || '',
            type: n.type || 'info' as const,
            isRead: n.isRead || false,
            createdAt: n.createdAt || new Date().toISOString(),
            navigationTarget: n.navigationTarget || n.navigation_target || undefined,
            navigationParams: n.navigationParams || n.navigation_params || undefined,
            data: n.data || undefined,
          }));

        setNotificationsRef.current(notifications);
      } else {
        setNotificationsRef.current([]);
      }
    }, (error) => {
      console.error('Firebase notifications onValue error:', error);
    });

    notifUnsubscribeRef.current = notifUnsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
      txUnsubscribe();
      txUnsubscribeRef.current = null;
      notifUnsubscribe();
      notifUnsubscribeRef.current = null;
    };
  }, [user?.id, isAuthenticated]); // Only depend on user?.id and isAuthenticated

  // Refresh on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      refreshUser();
      refreshNotifications();
    }
  }, [isAuthenticated, user?.id]); // Only depend on stable values

  // Refresh on window focus (user returns to the app)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticatedRef.current && userIdRef.current) {
        refreshUser();
        refreshNotifications();
      }
    };

    window.addEventListener('focus', handleFocus);
    
    // Also handle visibility change (mobile browsers)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticatedRef.current && userIdRef.current) {
        refreshUser();
        refreshNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle online/offline
    const handleOnline = () => {
      if (isAuthenticatedRef.current && userIdRef.current) {
        refreshUser();
        refreshNotifications();
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []); // Empty deps - uses refs internally

  // ─────────────────────────────────────────────────────────
  //  Sync global data: providers, packages, categories,
  //  sections, wallet services, API providers, visibility
  //  These are NOT user-specific — load on mount regardless of auth
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Providers listener
    const providersRef = ref(database, 'providers');
    const provUnsubscribe = onValue(providersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const providers: ServiceProvider[] = Object.values(data).map((p: any) => ({
          id: p.id || '',
          categoryId: p.categoryId || '',
          name: p.name || '',
          color: p.color || '',
          icon: p.icon || '',
          isActive: p.isActive !== undefined ? p.isActive : true,
          inputLabel: p.inputLabel || '',
          inputType: p.inputType || 'text',
          inputPrefix: p.inputPrefix || undefined,
        }));
        useAppStore.getState().setProviders(providers);
      }
      // If no data in Firebase, keep the default values already in the store
    }, (error) => {
      console.error('Firebase providers onValue error:', error);
    });
    providersUnsubscribeRef.current = provUnsubscribe;

    // Packages listener
    const packagesRef = ref(database, 'packages');
    const pkgUnsubscribe = onValue(packagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const packages: ProductPackage[] = Object.values(data).map((p: any) => ({
          id: p.id || '',
          providerId: p.providerId || '',
          name: p.name || '',
          price: p.price || 0,
          currency: p.currency || 'YER',
          executionType: p.executionType || 'manual',
          isActive: p.isActive !== undefined ? p.isActive : true,
        }));
        useAppStore.getState().setPackages(packages);
      }
    }, (error) => {
      console.error('Firebase packages onValue error:', error);
    });
    packagesUnsubscribeRef.current = pkgUnsubscribe;

    // Categories listener (stored under adminSettings/categories)
    const categoriesRef = ref(database, 'adminSettings/categories');
    const catUnsubscribe = onValue(categoriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const categories: ServiceCategory[] = Object.values(data).map((c: any) => ({
          id: c.id || '',
          name: c.name || '',
          type: c.type || 'telecom',
          icon: c.icon || '',
        }));
        useAppStore.getState().setCategories(categories);
      }
    }, (error) => {
      console.error('Firebase categories onValue error:', error);
    });
    categoriesUnsubscribeRef.current = catUnsubscribe;

    // Sections listener (stored under sections/)
    const sectionsRef = ref(database, 'sections');
    const secUnsubscribe = onValue(sectionsRef, (snapshot) => {
      if (snapshot.exists()) {
        useAppStore.getState().setFbSections(snapshot.val());
      } else {
        useAppStore.getState().setFbSections({});
      }
    }, (error) => {
      console.error('Firebase sections onValue error:', error);
    });

    // Wallet services listener (stored under walletServices/)
    const walletServicesRef = ref(database, 'walletServices');
    const wsUnsubscribe = onValue(walletServicesRef, (snapshot) => {
      if (snapshot.exists()) {
        useAppStore.getState().setFbWalletServices(snapshot.val());
      } else {
        useAppStore.getState().setFbWalletServices({});
      }
    }, (error) => {
      console.error('Firebase walletServices onValue error:', error);
    });

    // API providers listener (stored under adminSettings/apiProviders/)
    const apiProvidersRef = ref(database, 'adminSettings/apiProviders');
    const apUnsubscribe = onValue(apiProvidersRef, (snapshot) => {
      if (snapshot.exists()) {
        useAppStore.getState().setFbApiProviders(snapshot.val());
      } else {
        useAppStore.getState().setFbApiProviders({});
      }
    }, (error) => {
      console.error('Firebase apiProviders onValue error:', error);
    });

    // Visibility settings listener (stored under adminSettings/visibility/)
    const visibilityRef = ref(database, 'adminSettings/visibility');
    const visUnsubscribe = onValue(visibilityRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        useAppStore.getState().setFbVisibility({
          sections: data.sections || {},
          providers: data.providers || {},
          features: data.features || {},
        });
      } else {
        useAppStore.getState().setFbVisibility({ sections: {}, providers: {}, features: {} });
      }
    }, (error) => {
      console.error('Firebase visibility onValue error:', error);
    });

    // Wallet addresses listener (stored under adminSettings/walletAddresses/)
    const walletAddressesRef = ref(database, 'adminSettings/walletAddresses');
    const waUnsubscribe = onValue(walletAddressesRef, (snapshot) => {
      if (snapshot.exists()) {
        useAppStore.getState().setFbWalletAddresses(snapshot.val());
      } else {
        useAppStore.getState().setFbWalletAddresses({});
      }
    }, (error) => {
      console.error('Firebase walletAddresses onValue error:', error);
    });

    // Bottom navigation listener (stored under adminSettings/bottomNav/)
    const bottomNavRef = ref(database, 'adminSettings/bottomNav');
    const bnUnsubscribe = onValue(bottomNavRef, (snapshot) => {
      if (snapshot.exists()) {
        useAppStore.getState().setFbBottomNav(snapshot.val());
      } else {
        useAppStore.getState().setFbBottomNav({});
      }
    }, (error) => {
      console.error('Firebase bottomNav onValue error:', error);
    });

    // Kill switch listener (stored under adminSettings/killSwitch/)
    const killSwitchRef = ref(database, 'adminSettings/killSwitch');
    const ksUnsubscribe = onValue(killSwitchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Auto-deactivate if deactivateAt has passed
        // SECURITY FIX: Don't write to Firebase from the user app!
        // Just ignore the kill switch locally if it's expired.
        if (data.active && data.deactivateAt && new Date(data.deactivateAt) <= new Date()) {
          useAppStore.getState().setKillSwitch(null);
        } else {
          useAppStore.getState().setKillSwitch(data);
        }
      } else {
        useAppStore.getState().setKillSwitch(null);
      }
    }, (error) => {
      console.error('Firebase killSwitch onValue error:', error);
    });

    return () => {
      provUnsubscribe();
      providersUnsubscribeRef.current = null;
      pkgUnsubscribe();
      packagesUnsubscribeRef.current = null;
      catUnsubscribe();
      categoriesUnsubscribeRef.current = null;
      secUnsubscribe();
      wsUnsubscribe();
      apUnsubscribe();
      visUnsubscribe();
      waUnsubscribe();
      bnUnsubscribe();
      ksUnsubscribe();
    };
  }, []); // Run once on mount

  return { refreshUser };
}
