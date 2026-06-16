import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AdminRole = 'admin' | 'owner';

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  photoURL?: string;
}

interface AdminState {
  // Auth
  adminUser: AdminUser | null;
  isAuthenticated: boolean;
  setAdminUser: (user: AdminUser | null) => void;
  logout: () => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Navigation
  activePanel: string;
  setActivePanel: (panel: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Toast
  toastMessage: string;
  toastType: 'success' | 'error' | 'info';
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Real-time data from Firebase
  depositRequests: any[];
  setDepositRequests: (requests: any[]) => void;

  withdrawRequests: any[];
  setWithdrawRequests: (requests: any[]) => void;

  kycPendingUsers: any[];
  setKycPendingUsers: (users: any[]) => void;

  orders: any[];
  setOrders: (orders: any[]) => void;

  allUsers: any[];
  setAllUsers: (users: any[]) => void;

  // Data loaded flags
  dataLoaded: boolean;
  setDataLoaded: (loaded: boolean) => void;

  // Supabase data
  supabaseSections: any[];
  setSupabaseSections: (sections: any[]) => void;

  supabaseTickets: any[];
  setSupabaseTickets: (tickets: any[]) => void;

  supabaseEscrowChats: any[];
  setSupabaseEscrowChats: (chats: any[]) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      // Auth
      adminUser: null,
      isAuthenticated: false,
      setAdminUser: (user) =>
        set({
          adminUser: user,
          isAuthenticated: !!user,
        }),
      logout: () =>
        set({
          adminUser: null,
          isAuthenticated: false,
          activePanel: 'dashboard',
          depositRequests: [],
          withdrawRequests: [],
          kycPendingUsers: [],
          orders: [],
          allUsers: [],
          dataLoaded: false,
          supabaseSections: [],
          supabaseTickets: [],
          supabaseEscrowChats: [],
        }),

      // Theme
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      // Navigation
      activePanel: 'dashboard',
      setActivePanel: (panel) => set({ activePanel: panel, sidebarOpen: false }),
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Loading
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),

      // Toast
      toastMessage: '',
      toastType: 'info',
      showToast: (message, type = 'info') =>
        set({ toastMessage: message, toastType: type }),
      clearToast: () => set({ toastMessage: '' }),

      // Real-time data from Firebase
      depositRequests: [],
      setDepositRequests: (requests) => set({ depositRequests: requests }),

      withdrawRequests: [],
      setWithdrawRequests: (requests) => set({ withdrawRequests: requests }),

      kycPendingUsers: [],
      setKycPendingUsers: (users) => set({ kycPendingUsers: users }),

      orders: [],
      setOrders: (orders) => set({ orders: orders }),

      allUsers: [],
      setAllUsers: (users) => set({ allUsers: users }),

      // Data loaded flags
      dataLoaded: false,
      setDataLoaded: (loaded) => set({ dataLoaded: loaded }),

      // Supabase data
      supabaseSections: [],
      setSupabaseSections: (sections) => set({ supabaseSections: sections }),

      supabaseTickets: [],
      setSupabaseTickets: (tickets) => set({ supabaseTickets: tickets }),

      supabaseEscrowChats: [],
      setSupabaseEscrowChats: (chats) => set({ supabaseEscrowChats: chats }),
    }),
    {
      name: 'south-admin-store',
      partialize: (state) => ({
        theme: state.theme,
        activePanel: state.activePanel,
      }),
    }
  )
);
