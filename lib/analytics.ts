import { prisma } from "@/lib/db";

export interface WardrobeAnalytics {
  colorDistribution: { color: string; count: number }[];
  typeBreakdown: { type: string; count: number }[];
  styleMetrics: { vibe: string; count: number }[];
  wearFrequency: { itemId: number; itemType: string | null; wearCount: number }[];
  wardrobeDiversity: number;
  missingBasics: string[];
}

export async function getWardrobeAnalytics(userId?: string): Promise<WardrobeAnalytics> {
  const whereClause = userId ? { userId } : {};

  // Get all clothing items
  const items = await prisma.clothingItem.findMany({
    where: whereClause,
  });

  // Color distribution
  const colorMap = new Map<string, number>();
  items.forEach((item) => {
    if (item.primaryColor) {
      colorMap.set(
        item.primaryColor,
        (colorMap.get(item.primaryColor) || 0) + 1
      );
    }
  });
  const colorDistribution = Array.from(colorMap.entries())
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);

  // Type breakdown
  const typeMap = new Map<string, number>();
  items.forEach((item) => {
    if (item.type) {
      typeMap.set(item.type, (typeMap.get(item.type) || 0) + 1);
    }
  });
  const typeBreakdown = Array.from(typeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Style metrics (vibe)
  const vibeMap = new Map<string, number>();
  items.forEach((item) => {
    if (item.vibe) {
      vibeMap.set(item.vibe, (vibeMap.get(item.vibe) || 0) + 1);
    }
  });
  const styleMetrics = Array.from(vibeMap.entries())
    .map(([vibe, count]) => ({ vibe, count }))
    .sort((a, b) => b.count - a.count);

  // Wear frequency
  const wearEvents = await prisma.wearEvent.findMany({
    where: whereClause,
    include: {
      clothingItem: true,
    },
  });

  const wearCountMap = new Map<number, number>();
  const itemTypeMap = new Map<number, string | null>();

  wearEvents.forEach((event) => {
    const itemId = event.clothingItemId;
    wearCountMap.set(itemId, (wearCountMap.get(itemId) || 0) + 1);
    if (!itemTypeMap.has(itemId)) {
      itemTypeMap.set(itemId, event.clothingItem.type);
    }
  });

  const wearFrequency = Array.from(wearCountMap.entries())
    .map(([itemId, wearCount]) => ({
      itemId,
      itemType: itemTypeMap.get(itemId) || null,
      wearCount,
    }))
    .sort((a, b) => b.wearCount - a.wearCount);

  // Wardrobe diversity score (0-100)
  const uniqueTypes = new Set(items.map((i) => i.type).filter(Boolean)).size;
  const uniqueColors = new Set(items.map((i) => i.primaryColor).filter(Boolean)).size;
  const totalItems = items.length;
  const diversityScore = totalItems > 0
    ? Math.min(100, Math.round((uniqueTypes * 10 + uniqueColors * 5) / totalItems * 10))
    : 0;

  // Missing basics analysis
  const basics = ["white shirt", "black pants", "jeans", "jacket", "dress"];
  const existingTypes = new Set(
    items.map((i) => i.type?.toLowerCase()).filter(Boolean)
  );
  const missingBasics = basics.filter(
    (basic) => !Array.from(existingTypes).some((type) => type?.includes(basic))
  );

  return {
    colorDistribution,
    typeBreakdown,
    styleMetrics,
    wearFrequency,
    wardrobeDiversity: diversityScore,
    missingBasics,
  };
}

