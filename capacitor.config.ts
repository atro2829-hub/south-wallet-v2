import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qtbm.south',
  appName: 'محفظة الجنوب',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#1A0A0E',
      showSpinner: false,
      fadeOutDuration: 300,
    }
  },
  android: {
    backgroundColor: '#1A0A0E',
    allowMixedContent: true,
  }
};

export default config;
