/**
 * Gemini 2.5 Flash Image utilities
 * Helper functions for working with Google's Gemini 2.5 Flash Image model
 */

import { GoogleGenAI } from "@google/genai";

export interface GeminiImageResult {
  imageData: Buffer;
  mimeType: string;
}

/**
 * Initialize Gemini AI client
 */
function getGeminiClient(): GoogleGenAI {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }

  return new GoogleGenAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
  });
}

/**
 * Fetch image from URL and convert to base64
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<{
  base64: string;
  mimeType: string;
}> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const mimeType = response.headers.get("content-type") || "image/jpeg";

  return { base64, mimeType };
}

/**
 * Generate image using Gemini 2.5 Flash Image model
 */
export async function generateImageWithGemini(
  prompt: string,
  inputImageUrl?: string
): Promise<GeminiImageResult> {
  const ai = getGeminiClient();

  try {
    console.log("Generating image with Gemini 2.5 Flash Image...");

    let contents: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;

    if (inputImageUrl) {
      // Fetch and encode input image
      const { base64, mimeType } = await fetchImageAsBase64(inputImageUrl);
      
      contents = [
        {
          inlineData: {
            mimeType,
            data: base64,
          },
        },
        {
          text: prompt,
        },
      ];
    } else {
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents,
    });

    // Extract image from response
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No candidates returned from Gemini");
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error("No content parts in response");
    }

    // Find the image part
    for (const part of candidate.content.parts) {
      if (part.inlineData && part.inlineData.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        const mimeType = part.inlineData.mimeType || "image/png";
        
        console.log(`✓ Image generated successfully (${buffer.length} bytes)`);
        
        return {
          imageData: buffer,
          mimeType,
        };
      }
    }

    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Gemini image generation error:", error);
    throw new Error(
      `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Convert buffer to File object for blob upload
 */
export function bufferToFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): File {
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Validate image size and format
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Image must be less than 10MB",
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Image must be JPEG, PNG, or WebP format",
    };
  }

  return { valid: true };
}

