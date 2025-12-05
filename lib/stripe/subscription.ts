import { prisma } from '@/lib/db';
import { getTierLimits, canAccessFeature } from './config';

export async function getUserSubscription(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  if (!user) {
    return null;
  }

  const tier = user.subscriptionTier || 'free';
  const isActive = user.subscriptionStatus === 'active' || tier === 'free';

  return {
    tier,
    status: user.subscriptionStatus || 'free',
    isActive,
    currentPeriodEnd: user.currentPeriodEnd,
    hasStripeSubscription: !!user.stripeSubscriptionId,
    limits: getTierLimits(tier),
  };
}

export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });

  if (!user) return false;

  const tier = user.subscriptionTier || 'free';
  const isActive = user.subscriptionStatus === 'active' || tier === 'free';

  if (!isActive) return false;

  return canAccessFeature(tier, feature as any);
}

export async function checkItemLimit(userId: string): Promise<{
  canAdd: boolean;
  currentCount: number;
  limit: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  const tier = user?.subscriptionTier || 'free';
  const limits = getTierLimits(tier);
  const maxItems = limits.maxClothingItems;

  const currentCount = await prisma.clothingItem.count({
    where: { userId },
  });

  return {
    canAdd: currentCount < maxItems,
    currentCount,
    limit: maxItems === Infinity ? Infinity : maxItems,
  };
}
