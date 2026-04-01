import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuempresa.fintrack',
  appName: 'FinTrack',
  webDir: 'dist',
  plugins: {
    Camera: {
      permissions: ['camera', 'photos'],
    },
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
