import type { CapacitorConfig } from '@capacitor/cli';

// PRODUCTION: Always use the deployed server URL for TestFlight/App Store builds
// For local development testing only: manually change to http://localhost:3002
const config: CapacitorConfig = {
  appId: 'com.stylr.app',
  appName: 'Stylr',
  webDir: 'out',
  server: {
    // PRODUCTION: Always use deployed server for TestFlight/App Store
    url: 'https://stylr.projcomfort.com',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#000000',
    allowsLinkPreview: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
