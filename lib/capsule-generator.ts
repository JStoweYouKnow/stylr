import { ClothingItem } from "@prisma/client";
import { generateMultipleOutfits } from "./outfit-generator";

export interface CapsuleWardrobe {
  items: ClothingItem[];
  outfits: Array<{
    day: string;
    occasion: string;
    items: ClothingItem[];
    reasoning: string;
  }>;
  stats: {
    totalItems: number;
    outfitsPerItem: Record<number, number>; // itemId -> count
    versatilityScore: number;
  };
}

/**
 * Generate a capsule wardrobe for a time period (week or month)
 */
export function generateCapsuleWardrobe(
  allItems: ClothingItem[],
  days: number = 7,
  occasionMix: Record<string, number> = { casual: 5, work: 2 }
): CapsuleWardrobe {
  if (allItems.length === 0) {
    throw new Error("No items available for capsule wardrobe");
  }

  // Step 1: Select versatile core items (10-15 for week, 20-30 for month)
  const capsuleSize = days === 7 ? 12 : 25;
  const coreItems = selectCoreItems(allItems, capsuleSize);

  // Step 2: Generate outfits for each day
  const outfits: CapsuleWardrobe["outfits"] = [];
  const occasionList = expandOccasions(occasionMix);
  const itemUsage = new Map<number, number>();

  for (let i = 0; i < days; i++) {
    const dayName = getDayName(i);
    const occasion = occasionList[i % occasionList.length];

    // Generate outfit from core items
    const dayOutfits = generateMultipleOutfits(coreItems, 3, occasion);

    if (dayOutfits.length > 0) {
      const bestOutfit = dayOutfits[0];

      // Track item usage
      bestOutfit.items.forEach((item) => {
        itemUsage.set(item.id, (itemUsage.get(item.id) || 0) + 1);
      });

      outfits.push({
        day: dayName,
        occasion,
        items: bestOutfit.items,
        reasoning: bestOutfit.reasoning,
      });
    }
  }

  // Step 3: Calculate stats
  const versatilityScore = calculateVersatilityScore(itemUsage, coreItems.length, days);

  return {
    items: coreItems,
    outfits,
    stats: {
      totalItems: coreItems.length,
      outfitsPerItem: Object.fromEntries(itemUsage),
      versatilityScore,
    },
  };
}

/**
 * Select the most versatile core items for capsule
 */
function selectCoreItems(items: ClothingItem[], targetSize: number): ClothingItem[] {
  // Group by type and color
  const neutralColors = ["black", "white", "gray", "grey", "navy", "beige", "brown"];

  const categorized = {
    tops: items.filter((i) =>
      i.type?.toLowerCase().includes("shirt") ||
      i.type?.toLowerCase().includes("top") ||
      i.type?.toLowerCase().includes("blouse")
    ),
    bottoms: items.filter((i) =>
      i.type?.toLowerCase().includes("pants") ||
      i.type?.toLowerCase().includes("jeans") ||
      i.type?.toLowerCase().includes("skirt") ||
      i.type?.toLowerCase().includes("shorts")
    ),
    layers: items.filter((i) =>
      i.type?.toLowerCase().includes("jacket") ||
      i.type?.toLowerCase().includes("sweater") ||
      i.type?.toLowerCase().includes("cardigan") ||
      i.layeringCategory === "outer" ||
      i.layeringCategory === "mid"
    ),
    dresses: items.filter((i) => i.type?.toLowerCase().includes("dress")),
    accessories: items.filter((i) =>
      i.type?.toLowerCase().includes("shoe") ||
      i.type?.toLowerCase().includes("bag") ||
      i.layeringCategory === "accessory"
    ),
  };

  const selected: ClothingItem[] = [];

  // Prioritize neutrals and versatile pieces
  const addItems = (arr: ClothingItem[], count: number, preferNeutral = true) => {
    const sorted = [...arr].sort((a, b) => {
      const aNeutral = neutralColors.some((c) =>
        a.primaryColor?.toLowerCase().includes(c)
      );
      const bNeutral = neutralColors.some((c) =>
        b.primaryColor?.toLowerCase().includes(c)
      );

      if (preferNeutral) {
        if (aNeutral && !bNeutral) return -1;
        if (!aNeutral && bNeutral) return 1;
      }

      return 0;
    });

    selected.push(...sorted.slice(0, count));
  };

  // Balanced capsule composition
  const topsCount = Math.floor(targetSize * 0.35);
  const bottomsCount = Math.floor(targetSize * 0.25);
  const layersCount = Math.floor(targetSize * 0.20);
  const dressCount = Math.floor(targetSize * 0.10);
  const accessoryCount = Math.floor(targetSize * 0.10);

  addItems(categorized.tops, topsCount);
  addItems(categorized.bottoms, bottomsCount);
  addItems(categorized.layers, layersCount);
  addItems(categorized.dresses, dressCount);
  addItems(categorized.accessories, accessoryCount);

  // Fill remaining slots with most versatile items
  const remaining = targetSize - selected.length;
  if (remaining > 0) {
    const unused = items.filter((item) => !selected.includes(item));
    addItems(unused, remaining);
  }

  return selected.slice(0, targetSize);
}

/**
 * Expand occasion mix into daily list
 */
function expandOccasions(mix: Record<string, number>): string[] {
  const list: string[] = [];
  Object.entries(mix).forEach(([occasion, count]) => {
    for (let i = 0; i < count; i++) {
      list.push(occasion);
    }
  });
  return list;
}

/**
 * Get day name (Day 1, Day 2, etc. or Mon, Tue for weekly)
 */
function getDayName(index: number): string {
  const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return index < 7 ? weekDays[index] : `Day ${index + 1}`;
}

/**
 * Calculate how versatile the capsule is (0-100)
 */
function calculateVersatilityScore(
  usage: Map<number, number>,
  totalItems: number,
  totalDays: number
): number {
  if (totalItems === 0) return 0;

  // Score based on:
  // 1. How evenly items are used (better if all items used)
  // 2. Reuse rate (items worn multiple times)

  const usageArray = Array.from(usage.values());
  const usedItems = usage.size;
  const avgUsagePerItem = usageArray.reduce((a, b) => a + b, 0) / usedItems;
  const idealUsage = totalDays / totalItems;

  // Penalty for unused items
  const utilizationScore = (usedItems / totalItems) * 50;

  // Reward for balanced reuse
  const reuseScore = Math.min(50, (avgUsagePerItem / idealUsage) * 50);

  return Math.round(utilizationScore + reuseScore);
}

/**
 * Generate weekly capsule (7 days)
 */
export function generateWeeklyCapsule(
  items: ClothingItem[],
  occasionMix?: Record<string, number>
): CapsuleWardrobe {
  return generateCapsuleWardrobe(
    items,
    7,
    occasionMix || { casual: 3, work: 4 }
  );
}

/**
 * Generate monthly capsule (30 days)
 */
export function generateMonthlyCapsule(
  items: ClothingItem[],
  occasionMix?: Record<string, number>
): CapsuleWardrobe {
  return generateCapsuleWardrobe(
    items,
    30,
    occasionMix || { casual: 12, work: 16, formal: 2 }
  );
}
