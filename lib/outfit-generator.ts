import { ClothingItem } from "@prisma/client";

export interface OutfitSuggestion {
  items: ClothingItem[];
  score: number;
  reasoning: string;
  occasion: string;
}

/**
 * Generate a random "Outfit of the Day" from available clothing items
 */
export function generateOutfitOfTheDay(
  items: ClothingItem[],
  occasion: string = "casual"
): OutfitSuggestion | null {
  if (items.length === 0) return null;

  // Group items by type
  const itemsByType = items.reduce((acc, item) => {
    const type = item.type?.toLowerCase() || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {} as Record<string, ClothingItem[]>);

  // Define basic outfit templates
  const templates = [
    {
      types: ["shirt", "pants"],
      name: "Classic",
      occasions: ["casual", "work", "formal"],
    },
    {
      types: ["shirt", "pants", "jacket"],
      name: "Layered",
      occasions: ["casual", "work", "formal"],
    },
    {
      types: ["dress", "shoes"],
      name: "Dress",
      occasions: ["casual", "formal", "date"],
    },
    {
      types: ["top", "skirt"],
      name: "Top & Skirt",
      occasions: ["casual", "date"],
    },
    {
      types: ["shirt", "shorts"],
      name: "Casual",
      occasions: ["casual", "summer"],
    },
  ];

  // Find templates that match available items
  const viableTemplates = templates.filter((template) =>
    template.types.every((type) => itemsByType[type]?.length > 0)
  );

  if (viableTemplates.length === 0) {
    // Fallback: just pick random items
    const randomItems = getRandomItems(items, Math.min(3, items.length));
    return {
      items: randomItems,
      score: 5,
      reasoning: "A mix of items from your wardrobe.",
      occasion: "casual",
    };
  }

  // Pick a random template
  const template =
    viableTemplates[Math.floor(Math.random() * viableTemplates.length)];

  // Pick one random item of each required type
  const outfitItems = template.types.map((type) => {
    const availableItems = itemsByType[type];
    return availableItems[Math.floor(Math.random() * availableItems.length)];
  });

  // Calculate a basic score based on color harmony
  const score = calculateOutfitScore(outfitItems);

  return {
    items: outfitItems,
    score,
    reasoning: `A ${template.name} outfit perfect for ${occasion}. ${getColorHarmonyNote(outfitItems)}`,
    occasion,
  };
}

/**
 * Generate multiple outfit suggestions
 */
export function generateMultipleOutfits(
  items: ClothingItem[],
  count: number = 3,
  occasion: string = "casual"
): OutfitSuggestion[] {
  const outfits: OutfitSuggestion[] = [];
  const attempts = count * 3; // Try more times to get unique outfits

  for (let i = 0; i < attempts && outfits.length < count; i++) {
    const outfit = generateOutfitOfTheDay(items, occasion);
    if (outfit && !isDuplicateOutfit(outfit, outfits)) {
      outfits.push(outfit);
    }
  }

  // Sort by score
  return outfits.sort((a, b) => b.score - a.score);
}

function getRandomItems<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function calculateOutfitScore(items: ClothingItem[]): number {
  let score = 7; // Base score

  // Check color harmony
  const colors = items
    .map((item) => item.primaryColor?.toLowerCase())
    .filter(Boolean);

  // Monochromatic bonus
  const uniqueColors = new Set(colors);
  if (uniqueColors.size === 1) score += 2;

  // Neutral colors bonus
  const neutrals = ["black", "white", "gray", "grey", "beige", "navy", "brown"];
  const hasNeutral = colors.some((c) => neutrals.some((n) => c?.includes(n)));
  if (hasNeutral) score += 1;

  // Check vibe consistency
  const vibes = items.map((item) => item.vibe?.toLowerCase()).filter(Boolean);
  const uniqueVibes = new Set(vibes);
  if (uniqueVibes.size === 1) score += 2;

  return Math.min(10, score);
}

function getColorHarmonyNote(items: ClothingItem[]): string {
  const colors = items
    .map((item) => item.primaryColor)
    .filter(Boolean)
    .join(", ");

  const uniqueColors = new Set(
    items.map((item) => item.primaryColor?.toLowerCase()).filter(Boolean)
  );

  if (uniqueColors.size === 1) {
    return "The monochromatic color scheme creates a sleek, cohesive look.";
  }

  return `Colors: ${colors}.`;
}

function isDuplicateOutfit(
  outfit: OutfitSuggestion,
  existing: OutfitSuggestion[]
): boolean {
  return existing.some((e) => {
    const eIds = e.items.map((i) => i.id).sort();
    const oIds = outfit.items.map((i) => i.id).sort();
    return JSON.stringify(eIds) === JSON.stringify(oIds);
  });
}
