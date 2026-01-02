/**
 * Item normalization using Gemini 2.5 Flash Image
 * Removes backgrounds from clothing items to create clean catalog-style images
 */

import { generateImageWithGemini, GeminiImageResult } from "./gemini-image";

export interface NormalizationOptions {
  background?: "transparent" | "white" | "clean";
  enhanceDetails?: boolean;
}

/**
 * Normalize clothing item by removing background
 */
export async function normalizeClothingItem(
  imageUrl: string,
  options: NormalizationOptions = {}
): Promise<GeminiImageResult> {
  const { background = "white", enhanceDetails = true } = options;

  const prompt = buildNormalizationPrompt(background, enhanceDetails);

  console.log("Normalizing clothing item...");
  console.log("Image URL:", imageUrl);
  console.log("Background:", background);

  try {
    const result = await generateImageWithGemini(prompt, imageUrl);
    console.log("✓ Item normalized successfully");
    return result;
  } catch (error) {
    console.error("Item normalization failed:", error);
    throw new Error(
      `Failed to normalize item: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build prompt for item normalization
 */
function buildNormalizationPrompt(
  background: "transparent" | "white" | "clean",
  enhanceDetails: boolean
): string {
  const backgroundDescriptions = {
    transparent: "a completely transparent background",
    white: "a pure white (#FFFFFF) background",
    clean: "a clean, minimal white background",
  };

  let prompt = `Remove the background from this clothing item image completely. Keep ONLY the garment visible on ${backgroundDescriptions[background]}.

Requirements:
- Remove ALL background elements (people, hangers, walls, floors, etc.)
- Keep ONLY the clothing item itself
- Preserve all clothing details, textures, colors, and patterns EXACTLY as shown
- Maintain the original shape and proportions of the garment
- Clean, precise edges with no artifacts or remnants of the original background
- The garment should appear as if photographed on a professional catalog background
- No shadows from the original photo
- High quality, sharp details`;

  if (enhanceDetails) {
    prompt += `\n- Enhance fabric texture and color vibrancy slightly for a professional catalog look`;
  }

  return prompt;
}

/**
 * Batch normalize multiple items
 */
export async function normalizeMultipleItems(
  imageUrls: string[],
  options: NormalizationOptions = {}
): Promise<Array<{ url: string; result: GeminiImageResult | null; error?: string }>> {
  const results = [];

  for (const url of imageUrls) {
    try {
      const result = await normalizeClothingItem(url, options);
      results.push({ url, result });
    } catch (error) {
      console.error(`Failed to normalize ${url}:`, error);
      results.push({
        url,
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Check if an image needs normalization (has complex background)
 */
export async function needsNormalization(imageUrl: string): Promise<boolean> {
  // This is a simple heuristic - in production, you might want to use
  // an AI model to detect if background removal is needed
  // For now, we'll assume all uploaded items need normalization
  return true;
}

/**
 * Validate clothing item image
 */
export async function validateClothingImage(imageUrl: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    
    if (!response.ok) {
      return {
        valid: false,
        error: "Unable to access image URL",
      };
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      return {
        valid: false,
        error: "URL does not point to a valid image",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: "Failed to validate image",
    };
  }
}



