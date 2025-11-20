import { ClothingAnalysis, AIProvider } from "./types";
import { analyzeWithGemini } from "./gemini";
import { analyzeWithOpenAI } from "./openai";
import { analyzeWithGroq } from "./groq";

/**
 * Multi-provider AI vision analysis with automatic fallback
 * Primary: Google Gemini 1.5 Flash (FREE)
 * Fallbacks: OpenAI GPT-4o-mini, Groq Llama Vision
 */
export async function analyzeClothingImage(imageUrl: string): Promise<ClothingAnalysis> {
  const providers: Array<{
    name: AIProvider;
    analyze: (url: string) => Promise<ClothingAnalysis>;
    apiKey?: string;
  }> = [
    {
      name: "gemini",
      analyze: analyzeWithGemini,
      apiKey: process.env.GOOGLE_AI_API_KEY,
    },
    {
      name: "openai",
      analyze: analyzeWithOpenAI,
      apiKey: process.env.OPENAI_API_KEY,
    },
    {
      name: "groq",
      analyze: analyzeWithGroq,
      apiKey: process.env.GROQ_API_KEY,
    },
  ];

  const errors: Array<{ provider: AIProvider; error: string }> = [];

  // Try each provider in order
  for (const provider of providers) {
    // Skip if API key is not configured
    if (!provider.apiKey) {
      console.log(`Skipping ${provider.name}: API key not configured`);
      continue;
    }

    try {
      console.log(`Attempting analysis with ${provider.name}...`);
      const analysis = await provider.analyze(imageUrl);
      console.log(`✓ Successfully analyzed with ${provider.name}`);
      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`✗ ${provider.name} failed:`, errorMessage);
      errors.push({ provider: provider.name, error: errorMessage });
      // Continue to next provider
    }
  }

  // All providers failed
  const errorDetails = errors
    .map((e) => `${e.provider}: ${e.error}`)
    .join("; ");
  throw new Error(
    `All AI providers failed. Errors: ${errorDetails}. Please configure at least one API key in your environment variables.`
  );
}

// Export individual providers for direct use if needed
export { analyzeWithGemini, analyzeWithOpenAI, analyzeWithGroq };
export type { ClothingAnalysis, AIProvider } from "./types";

