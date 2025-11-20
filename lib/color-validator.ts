/**
 * Color palette validation and harmony checking
 */

export interface ColorHarmony {
  isHarmonious: boolean;
  score: number; // 0-10
  reasoning: string;
  suggestions?: string[];
}

const NEUTRAL_COLORS = [
  "black",
  "white",
  "gray",
  "grey",
  "beige",
  "tan",
  "cream",
  "ivory",
  "navy",
  "brown",
];

const WARM_COLORS = [
  "red",
  "orange",
  "yellow",
  "pink",
  "coral",
  "peach",
  "burgundy",
  "maroon",
];

const COOL_COLORS = [
  "blue",
  "green",
  "purple",
  "teal",
  "turquoise",
  "mint",
  "lavender",
  "violet",
];

export function validateColorPalette(colors: string[]): ColorHarmony {
  if (colors.length === 0) {
    return {
      isHarmonious: true,
      score: 5,
      reasoning: "No colors to validate",
    };
  }

  const normalizedColors = colors.map((c) => c.toLowerCase().trim());

  // Check for monochromatic (all same color)
  const uniqueColors = new Set(normalizedColors);
  if (uniqueColors.size === 1) {
    return {
      isHarmonious: true,
      score: 9,
      reasoning:
        "Monochromatic outfit - very cohesive and elegant. Different shades of the same color work beautifully together.",
    };
  }

  // Check for all neutrals
  const allNeutral = normalizedColors.every((color) =>
    NEUTRAL_COLORS.some((n) => color.includes(n))
  );
  if (allNeutral) {
    return {
      isHarmonious: true,
      score: 10,
      reasoning:
        "All neutral colors - this is a safe, classic palette that works in virtually any situation.",
    };
  }

  // Check for neutrals + one accent color
  const neutralCount = normalizedColors.filter((color) =>
    NEUTRAL_COLORS.some((n) => color.includes(n))
  ).length;
  const hasAccent = normalizedColors.length - neutralCount === 1;
  if (hasAccent && neutralCount >= 1) {
    return {
      isHarmonious: true,
      score: 9,
      reasoning:
        "Neutrals with a pop of color - this creates visual interest while remaining sophisticated.",
    };
  }

  // Check warm/cool temperature clash
  const warmCount = normalizedColors.filter((color) =>
    WARM_COLORS.some((w) => color.includes(w))
  ).length;
  const coolCount = normalizedColors.filter((color) =>
    COOL_COLORS.some((c) => color.includes(c))
  ).length;

  if (warmCount > 0 && coolCount > 0 && neutralCount === 0) {
    return {
      isHarmonious: false,
      score: 4,
      reasoning:
        "Mixing warm and cool colors without neutrals can create visual tension. Consider adding a neutral piece to bridge the palette.",
      suggestions: [
        "Add a neutral piece (black, white, grey, or navy)",
        "Choose either warm OR cool colors, not both",
      ],
    };
  }

  // All warm or all cool
  if ((warmCount > 0 && coolCount === 0) || (coolCount > 0 && warmCount === 0)) {
    return {
      isHarmonious: true,
      score: 8,
      reasoning:
        warmCount > 0
          ? "All warm colors create an energetic, cohesive palette."
          : "All cool colors create a calm, harmonious palette.",
    };
  }

  // Too many competing colors
  if (uniqueColors.size > 3) {
    return {
      isHarmonious: false,
      score: 3,
      reasoning:
        "Too many different colors can look busy. Stick to 2-3 colors maximum for a more polished look.",
      suggestions: [
        "Reduce to 2-3 main colors",
        "Use neutrals to balance bright colors",
      ],
    };
  }

  // Complementary colors with neutral
  if (uniqueColors.size === 3 && neutralCount >= 1) {
    return {
      isHarmonious: true,
      score: 8,
      reasoning:
        "Good balance of colors with a neutral base - this creates visual interest without overwhelming.",
    };
  }

  // Default - probably okay
  return {
    isHarmonious: true,
    score: 6,
    reasoning: `Color palette: ${colors.join(", ")}. Generally harmonious.`,
  };
}

export function suggestComplementaryColors(baseColor: string): string[] {
  const color = baseColor.toLowerCase();

  // Neutral bases - everything goes
  if (NEUTRAL_COLORS.some((n) => color.includes(n))) {
    return ["Any color works with neutrals!", "Bright colors", "Pastels", "Earth tones"];
  }

  // Specific color suggestions
  if (color.includes("blue")) {
    return ["White", "Navy", "Gray", "Camel", "Orange (complementary)", "Yellow"];
  }
  if (color.includes("red")) {
    return ["Black", "White", "Navy", "Gray", "Green (complementary)"];
  }
  if (color.includes("green")) {
    return ["Beige", "Brown", "White", "Navy", "Red (complementary)"];
  }
  if (color.includes("yellow")) {
    return ["Gray", "White", "Navy", "Purple (complementary)", "Blue"];
  }
  if (color.includes("purple")) {
    return ["Gray", "Black", "White", "Yellow (complementary)"];
  }
  if (color.includes("orange")) {
    return ["Navy", "Brown", "Cream", "Blue (complementary)"];
  }
  if (color.includes("pink")) {
    return ["Gray", "White", "Navy", "Beige", "Green (complementary)"];
  }

  return ["Neutral colors (black, white, gray, navy)", "Similar shades"];
}
