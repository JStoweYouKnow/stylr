/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.blob.vercel-storage.com',
      },
    ],
  },
  // Use webpack instead of Turbopack for now (since we have webpack config)
  // Can migrate to Turbopack later if needed
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  // Add empty turbopack config to silence the warning
  // We're using webpack for now
  turbopack: {},
}

// Temporarily disable PWA on Vercel to fix build errors
// We can re-enable it later once the build issue is resolved
if (process.env.VERCEL !== '1' && process.env.NODE_ENV === 'production') {
  const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: process.env.NODE_ENV === 'development',
    workboxOptions: {
      disableDevLogs: true,
    },
  });
  module.exports = withPWA(nextConfig);
} else {
  module.exports = nextConfig;
}

