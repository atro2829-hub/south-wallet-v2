import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qtbm.south',
  appName: 'محفظة الجنوب',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#1A0A0E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      spinnerStyle: 'small',
      spinnerColor: '#C9963A',
      fadeOutDuration: 400,
      useDialog: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1A0A0E',
    },
  },
  android: {
    backgroundColor: '#1A0A0E',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Icon and splash are managed via resources/ directory using @capacitor/assets
    // resources/icon.png (1024×1024) → all launcher icon densities
    // resources/splash.png (2732×2732) → all splash screen densities
  },
  ios: {
    backgroundColor: '#1A0A0E',
    contentInset: 'automatic',
    scrollEnabled: false,
  },
};

export default config;
