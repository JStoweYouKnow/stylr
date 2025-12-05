import type { CapacitorConfig } from '@capacitor/cli';

// Load environment variables from .env file
import { config as loadEnv } from 'dotenv';
loadEnv();

// Get server URL from environment or use default
// Set NEXT_PUBLIC_CAPACITOR_SERVER_URL in .env to point to your deployed Vercel app
// For local development, set CAPACITOR_USE_LOCAL=true in .env
const serverUrl = process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL || 'https://stylr.vercel.app';

// Check if we should use localhost (works in both dev and production builds)
const useLocalServer = process.env.CAPACITOR_USE_LOCAL === 'true';

const config: CapacitorConfig = {
  appId: 'com.stylr.app',
  appName: 'Stylr',
  webDir: 'out',
  server: useLocalServer
    ? {
        url: 'http://localhost:3002',
        cleartext: true,
      }
    : {
        // Always load from deployed server for a 1:1 copy of the web app
        url: serverUrl,
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
