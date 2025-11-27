import type { CapacitorConfig } from '@capacitor/cli';

// Get server URL from environment or use default
// Set NEXT_PUBLIC_CAPACITOR_SERVER_URL in .env to point to your deployed Vercel app
// For local development, set it to 'http://localhost:3000'
const serverUrl = process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL || 'https://stylr.vercel.app';
const isDevelopment = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.stylr.app',
  appName: 'Stylr',
  webDir: 'out',
  server: isDevelopment && process.env.CAPACITOR_USE_LOCAL === 'true'
    ? {
        url: 'http://localhost:3000',
        cleartext: true,
      }
    : {
        // In production, load from deployed server for exact copy experience
        // Uncomment the line below to use the deployed server
        // url: serverUrl,
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
