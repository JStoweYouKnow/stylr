import { PurchaseHistory, ClothingItem } from "@prisma/client";

export interface Recommendation {
  type: "wardrobe_gap" | "complement" | "duplicate_check" | "outfit_ready" | "shopping_insight";
  message: string;
  basedOn?: string;
  suggestedAction?: string;
  matchingItems?: ClothingItem[];
  existingItems?: ClothingItem[];
  advice?: string;
  suggestions?: string[];
}

/**
 * Generate purchase-based recommendations
 */
export function generatePurchaseRecommendations(
  purchases: PurchaseHistory[],
  wardrobe: ClothingItem[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Get recent purchases (last 60 days)
  const recentPurchases = purchases.filter((p) => {
    const daysSince = Math.floor(
      (Date.now() - p.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 60;
  });

  if (recentPurchases.length === 0) {
    return recommendations;
  }

  // Check 1: Duplicate purchases
  for (const purchase of recentPurchases) {
    if (!purchase.itemType || !purchase.color) continue;

    const similar = wardrobe.filter(
      (item) =>
        item.type === purchase.itemType &&
        item.primaryColor?.toLowerCase() === purchase.color?.toLowerCase()
    );

    if (similar.length > 0) {
      recommendations.push({
        type: "duplicate_check",
        message: `You recently bought "${purchase.itemName}" but already own ${similar.length} similar ${purchase.itemType}(s)`,
        basedOn: `Purchase: ${purchase.itemName} from ${purchase.store}`,
        existingItems: similar,
        advice: similar.length > 2 ? "Consider if you really need another one" : "Great for variety!",
      });
    }
  }

  // Check 2: Incomplete outfits / Wardrobe gaps
  for (const purchase of recentPurchases) {
    if (!purchase.itemType) continue;

    const complements = findComplementaryItems(purchase, wardrobe);

    if (complements.length === 0) {
      const suggestions = getMatchingSuggestions(purchase);

      recommendations.push({
        type: "wardrobe_gap",
        message: `Your new "${purchase.itemName}" needs matching pieces`,
        basedOn: `Recent purchase from ${purchase.store}`,
        suggestedAction: `Add ${suggestions.join(" or ")} to complete outfits`,
        suggestions,
      });
    } else {
      recommendations.push({
        type: "outfit_ready",
        message: `Create ${complements.length} outfit${complements.length > 1 ? "s" : ""} with your new "${purchase.itemName}"`,
        matchingItems: complements,
        basedOn: `Purchase: ${purchase.itemName}`,
      });
    }
  }

  // Check 3: Shopping pattern analysis
  const trend = analyzePurchaseTrend(recentPurchases);
  if (trend) {
    recommendations.push({
      type: "shopping_insight",
      message: `You've been buying mostly ${trend.topCategory} items lately`,
      suggestedAction: trend.neededCategory
        ? `Consider adding ${trend.neededCategory} for a balanced wardrobe`
        : undefined,
      advice: trend.advice,
    });
  }

  return recommendations;
}

/**
 * Find items in wardrobe that complement a purchase
 */
function findComplementaryItems(
  purchase: PurchaseHistory,
  wardrobe: ClothingItem[]
): ClothingItem[] {
  if (!purchase.itemType) return [];

  const complementPairs: Record<string, string[]> = {
    shirt: ["pants", "skirt", "shorts", "jacket"],
    pants: ["shirt", "blouse", "sweater", "jacket"],
    dress: ["jacket", "cardigan", "shoes"],
    jacket: ["shirt", "pants", "dress"],
    shoes: ["pants", "dress", "skirt"],
    skirt: ["shirt", "blouse", "sweater"],
  };

  const neededTypes = complementPairs[purchase.itemType] || [];

  return wardrobe.filter((item) => {
    if (!neededTypes.includes(item.type || "")) return false;

    // Check if colors work together
    if (purchase.color && item.primaryColor) {
      return colorsMatch(purchase.color, item.primaryColor);
    }

    return true;
  });
}

/**
 * Get suggestions for items that would complete an outfit
 */
function getMatchingSuggestions(purchase: PurchaseHistory): string[] {
  if (!purchase.itemType) return ["complementary pieces"];

  const suggestions: Record<string, string[]> = {
    shirt: ["pants", "skirt", "blazer"],
    pants: ["dress shirt", "casual top", "blazer"],
    dress: ["jacket", "cardigan"],
    jacket: ["dress shirt", "casual pants"],
    shoes: ["matching outfit pieces"],
    skirt: ["blouse", "sweater"],
  };

  return suggestions[purchase.itemType] || ["complementary items"];
}

/**
 * Simple color matching logic
 */
function colorsMatch(color1: string, color2: string): boolean {
  const c1 = color1.toLowerCase();
  const c2 = color2.toLowerCase();

  // Neutrals match everything
  const neutrals = ["black", "white", "gray", "grey", "beige", "navy", "cream"];
  if (neutrals.includes(c1) || neutrals.includes(c2)) return true;

  // Same color family
  if (c1 === c2) return true;

  // Complementary pairs
  const pairs: Record<string, string[]> = {
    blue: ["white", "beige", "brown"],
    brown: ["blue", "beige", "cream"],
    green: ["brown", "beige"],
    red: ["black", "white", "navy"],
  };

  return pairs[c1]?.includes(c2) || pairs[c2]?.includes(c1) || false;
}

/**
 * Analyze shopping trends
 */
function analyzePurchaseTrend(purchases: PurchaseHistory[]): {
  topCategory: string;
  neededCategory?: string;
  advice: string;
} | null {
  if (purchases.length === 0) return null;

  // Count items by type
  const typeCounts: Record<string, number> = {};
  for (const purchase of purchases) {
    if (purchase.itemType) {
      typeCounts[purchase.itemType] = (typeCounts[purchase.itemType] || 0) + 1;
    }
  }

  // Find most purchased type
  let topCategory = "";
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topCategory = type;
    }
  }

  if (!topCategory) return null;

  // Determine what's missing
  const balance: Record<string, string> = {
    shirt: "bottoms (pants or skirts)",
    pants: "tops (shirts or sweaters)",
    dress: "layers (jackets or cardigans)",
    shoes: "outfits to wear them with",
  };

  return {
    topCategory,
    neededCategory: balance[topCategory],
    advice: `You have ${maxCount} ${topCategory}${maxCount > 1 ? "s" : ""} from recent purchases`,
  };
}

/**
 * Calculate spending insights
 */
export function calculateSpendingInsights(purchases: PurchaseHistory[]): {
  totalSpent: number;
  averagePrice: number;
  favoriteBrands: string[];
  topStores: string[];
  recentTrend: string;
} {
  const totalSpent = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
  const averagePrice = purchases.length > 0 ? totalSpent / purchases.length : 0;

  // Count brands
  const brandCounts: Record<string, number> = {};
  for (const p of purchases) {
    if (p.brand) {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    }
  }

  // Count stores
  const storeCounts: Record<string, number> = {};
  for (const p of purchases) {
    storeCounts[p.store] = (storeCounts[p.store] || 0) + 1;
  }

  const favoriteBrands = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);

  const topStores = Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);

  // Determine trend from estimated vibes
  const vibeCounts: Record<string, number> = {};
  for (const p of purchases) {
    if (p.estimatedVibe) {
      vibeCounts[p.estimatedVibe] = (vibeCounts[p.estimatedVibe] || 0) + 1;
    }
  }

  const recentTrend =
    Object.entries(vibeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "mixed";

  return {
    totalSpent,
    averagePrice,
    favoriteBrands,
    topStores,
    recentTrend,
  };
}
