/**
 * Avatar generation using Gemini 2.5 Flash Image
 * Transforms user photos into realistic avatars suitable for virtual try-ons
 */

import { generateImageWithGemini, GeminiImageResult } from "./gemini-image";

export interface AvatarGenerationOptions {
  style?: "realistic" | "professional" | "casual";
  background?: "white" | "neutral" | "studio";
}

/**
 * Generate avatar from user photo using Gemini 2.5 Flash Image
 */
export async function generateAvatarFromPhoto(
  userImageUrl: string,
  options: AvatarGenerationOptions = {}
): Promise<GeminiImageResult> {
  const { style = "realistic", background = "white" } = options;

  const prompt = buildAvatarPrompt(style, background);

  console.log("Generating avatar from photo...");
  console.log("Image URL:", userImageUrl);
  console.log("Style:", style);
  console.log("Background:", background);

  try {
    const result = await generateImageWithGemini(prompt, userImageUrl);
    console.log("✓ Avatar generated successfully");
    return result;
  } catch (error) {
    console.error("Avatar generation failed:", error);
    throw new Error(
      `Failed to generate avatar: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Build prompt for avatar generation based on options
 */
function buildAvatarPrompt(
  style: "realistic" | "professional" | "casual",
  background: "white" | "neutral" | "studio"
): string {
  const styleDescriptions = {
    realistic:
      "Transform this photo into a highly realistic, photographic-quality avatar",
    professional:
      "Transform this photo into a professional, polished avatar suitable for business use",
    casual: "Transform this photo into a natural, casual avatar",
  };

  const backgroundDescriptions = {
    white: "with a pure white background",
    neutral: "with a soft neutral gray background",
    studio: "with professional studio lighting and background",
  };

  return `${styleDescriptions[style]} ${backgroundDescriptions[background]}.

Requirements:
- Maintain the person's facial features, skin tone, hair, and body proportions EXACTLY as shown
- Create a neutral, front-facing pose suitable for virtual clothing try-ons
- Full body shot from head to toe
- Natural, even lighting
- Clean, professional appearance
- The person should be in a neutral standing position
- Preserve all unique characteristics of the person
- High quality, sharp details
- Remove any existing clothing patterns or logos if present, replace with neutral clothing

The avatar should look like a professional fashion model photo of this exact person, ready for virtual try-on applications.`;
}

/**
 * Validate that the image is suitable for avatar generation
 */
export async function validateAvatarImage(imageUrl: string): Promise<{
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

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSize = 4 * 1024 * 1024; // 4MB (Vercel limit)
      if (size > maxSize) {
        return {
          valid: false,
          error: "Image is too large (max 4MB)",
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: "Failed to validate image",
    };
  }
}



