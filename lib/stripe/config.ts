import Stripe from 'stripe';

// Allow build to succeed without Stripe keys (they'll be needed at runtime)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia' as any,
  typescript: true,
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};

// Subscription tiers and pricing
export const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'Up to 25 clothing items',
      'Basic outfit recommendations',
      'Manual clothing upload',
      'Simple wear tracking',
    ],
    limits: {
      maxClothingItems: 25,
      maxOutfitsPerDay: 3,
      aiRecommendations: false,
      purchaseTracking: false,
      capsuleWardrobe: false,
      weatherIntegration: false,
      exportData: false,
    },
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 4.99,
    priceId: process.env.STRIPE_PRICE_BASIC || '',
    features: [
      'Up to 100 clothing items',
      'AI-powered outfit recommendations',
      'Weather-based suggestions',
      'Wear tracking & analytics',
      'Purchase history tracking',
    ],
    limits: {
      maxClothingItems: 100,
      maxOutfitsPerDay: 10,
      aiRecommendations: true,
      purchaseTracking: true,
      capsuleWardrobe: false,
      weatherIntegration: true,
      exportData: false,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    features: [
      'Unlimited clothing items',
      'Advanced AI outfit generation',
      'Capsule wardrobe builder',
      'Gmail purchase auto-import',
      'Style profile & recommendations',
      'Advanced analytics',
    ],
    limits: {
      maxClothingItems: Infinity,
      maxOutfitsPerDay: 50,
      aiRecommendations: true,
      purchaseTracking: true,
      capsuleWardrobe: true,
      weatherIntegration: true,
      exportData: true,
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_PREMIUM || '',
    features: [
      'Everything in Pro',
      'Priority AI processing',
      'Custom style rules',
      'Export to calendar',
      'Early access to new features',
      'Priority support',
    ],
    limits: {
      maxClothingItems: Infinity,
      maxOutfitsPerDay: Infinity,
      aiRecommendations: true,
      purchaseTracking: true,
      capsuleWardrobe: true,
      weatherIntegration: true,
      exportData: true,
      prioritySupport: true,
      customStyleRules: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;

export function getTierLimits(tier: string) {
  const tierKey = tier.toUpperCase() as SubscriptionTier;
  return SUBSCRIPTION_TIERS[tierKey]?.limits || SUBSCRIPTION_TIERS.FREE.limits;
}

export function canAccessFeature(tier: string, feature: keyof typeof SUBSCRIPTION_TIERS.FREE.limits): boolean {
  const limits = getTierLimits(tier);
  return limits[feature] === true;
}
