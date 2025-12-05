import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generate outfit visualization prompt using Gemini
 * This creates a detailed text prompt for image generation models
 */
export async function generateOutfitVisualizationPrompt(
  outfitItems: Array<{
    type: string;
    primaryColor: string;
    pattern?: string;
    fit?: string;
    vibe?: string;
  }>,
  userPreferences?: {
    bodyType?: string;
    skinTone?: string;
    style?: string;
  }
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const outfitDescription = outfitItems
    .map(item => {
      const parts = [item.type];
      if (item.primaryColor) parts.push(`in ${item.primaryColor}`);
      if (item.pattern && item.pattern !== 'solid') parts.push(`with ${item.pattern} pattern`);
      if (item.fit) parts.push(`${item.fit} fit`);
      return parts.join(' ');
    })
    .join(', ');

  const prompt = `
You are a fashion visualization expert. Generate a detailed, realistic image generation prompt for an AI image model.

Outfit Details:
${outfitDescription}

${userPreferences ? `
User Preferences:
- Body Type: ${userPreferences.bodyType || 'average'}
- Skin Tone: ${userPreferences.skinTone || 'medium'}
- Style: ${userPreferences.style || 'modern casual'}
` : ''}

Create a detailed prompt for Stable Diffusion that describes:
1. A realistic fashion model wearing this exact outfit
2. Professional fashion photography style
3. Clean white or minimal background
4. Full body shot showing the complete outfit
5. Natural lighting and realistic fabric textures

Output only the image generation prompt, nothing else.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  return response.text().trim();
}

/**
 * Analyze if outfit items work well together
 */
export async function analyzeOutfitCompatibility(
  outfitItems: Array<{
    type: string;
    primaryColor: string;
    secondaryColor?: string;
    pattern?: string;
    vibe?: string;
  }>
): Promise<{
  compatible: boolean;
  score: number;
  suggestions: string[];
  warnings: string[];
}> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const outfitDescription = JSON.stringify(outfitItems, null, 2);

  const prompt = `
You are a professional fashion stylist. Analyze this outfit combination:

${outfitDescription}

Provide a JSON response with:
{
  "compatible": true/false,
  "score": 0-100 (overall style score),
  "suggestions": ["improvement suggestions"],
  "warnings": ["potential issues like clashing colors or patterns"]
}

Consider:
- Color harmony and contrast
- Pattern mixing rules
- Style coherence (vibes should align)
- Seasonal appropriateness
- Proportion and layering

Output only valid JSON, no other text.
`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse outfit analysis');
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate outfit description for image search/composite
 */
export function generateOutfitCompositeDescription(
  outfitItems: Array<{
    imageUrl: string;
    type: string;
    primaryColor: string;
  }>
): {
  items: typeof outfitItems;
  layerOrder: string[];
  compositeInstructions: string;
} {
  // Define layering order for composite
  const layerPriority: Record<string, number> = {
    shoes: 1,
    pants: 2,
    skirt: 2,
    shorts: 2,
    dress: 3,
    shirt: 4,
    't-shirt': 4,
    blouse: 4,
    sweater: 5,
    jacket: 6,
    coat: 7,
    accessories: 8,
  };

  const sortedItems = [...outfitItems].sort((a, b) => {
    const aPriority = layerPriority[a.type.toLowerCase()] || 5;
    const bPriority = layerPriority[b.type.toLowerCase()] || 5;
    return aPriority - bPriority;
  });

  const layerOrder = sortedItems.map(item => item.type);

  const compositeInstructions = `
Layer the following clothing items in order (bottom to top):
${layerOrder.map((type, idx) => `${idx + 1}. ${type}`).join('\n')}

Create a realistic flat-lay composition or mannequin-style display.
Maintain proper proportions and realistic fabric draping.
`;

  return {
    items: sortedItems,
    layerOrder,
    compositeInstructions,
  };
}
