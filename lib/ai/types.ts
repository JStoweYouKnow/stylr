export interface ClothingAnalysis {
  type: string;
  primaryColor: string;
  secondaryColor: string | null;
  pattern: string | null;
  fit: string | null;
  vibe: string;
  notes: string;
  layeringCategory?: string; // top, bottom, jacket, shoes, accessories
  brand?: string | null;
  productName?: string | null;
  features?: string[]; // Key visual features for product matching
}

export type AIProvider = 'gemini' | 'openai' | 'groq';

export interface AIProviderConfig {
  name: AIProvider;
  enabled: boolean;
  apiKey?: string;
}
