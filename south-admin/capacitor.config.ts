import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qtbm.south.admin',
  appName: 'محفظة الجنوب - الإدارة',
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
  },
  ios: {
    backgroundColor: '#1A0A0E',
    contentInset: 'automatic',
    scrollEnabled: false,
  },
};

export default config;
