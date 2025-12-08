import { ClothingAnalysis } from "./types";

export async function analyzeWithGemini(imageUrl: string): Promise<ClothingAnalysis> {
  const prompt = `You are a professional fashion stylist analyzing a clothing item. Study the image carefully and provide detailed analysis.

CLOTHING TYPES (choose the most specific):
Tops: t-shirt, shirt, blouse, tank top, crop top, sweater, hoodie, sweatshirt, cardigan, vest
Bottoms: jeans, pants, trousers, shorts, skirt, leggings, joggers, chinos
Outerwear: jacket, coat, blazer, parka, windbreaker, bomber, denim jacket, leather jacket
Dresses: dress, maxi dress, midi dress, mini dress, sundress, cocktail dress
Footwear: sneakers, boots, sandals, heels, flats, loafers, athletic shoes
Accessories: hat, scarf, belt, bag, sunglasses, jewelry, watch
Other: swimwear, activewear, underwear, socks

COLORS (be specific):
Instead of "blue" say "navy blue", "sky blue", "royal blue", etc.
Instead of "red" say "burgundy", "crimson", "coral", etc.

PATTERNS:
solid, striped, plaid, checkered, floral, polka dot, geometric, animal print, tie-dye, camo, abstract, graphic

FIT STYLES:
slim, fitted, regular, relaxed, loose, oversized, tailored, athletic

VIBES:
casual, formal, business casual, sporty, athletic, streetwear, vintage, boho, minimalist, edgy, preppy, elegant

LAYERING CATEGORIES:
- base: underwear, t-shirts, tank tops, thin layers worn closest to skin
- mid: shirts, sweaters, hoodies, most everyday tops and bottoms
- outer: jackets, coats, outerwear
- accessory: shoes, bags, hats, jewelry, belts

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "type": "specific clothing type from the list above",
  "primaryColor": "specific color name",
  "secondaryColor": "secondary color if present, or null",
  "pattern": "pattern type or null if solid",
  "fit": "fit style or null if unclear",
  "vibe": "primary style vibe",
  "notes": "brief description including material if visible (cotton, denim, leather, etc.)",
  "layeringCategory": "base, mid, outer, or accessory"
}`;

  // Fetch the image and convert to base64
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // Determine mime type from URL or response
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

  // Use configurable model name, default to gemini-1.5-pro-latest (stable for v1beta)
  // Alternative: gemini-1.5-flash (without -latest suffix)
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  console.log(`Using Gemini model: ${model}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();

  // Validate response structure
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error("Invalid response structure from Gemini API");
  }

  const content = data.candidates[0].content.parts[0].text;

  // Extract JSON from response (handle markdown code blocks if present)
  let jsonText = content.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  }

  // Remove any remaining markdown
  jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");

  try {
    const analysis = JSON.parse(jsonText) as ClothingAnalysis;

    // Validate required fields
    if (!analysis.type || !analysis.primaryColor || !analysis.vibe) {
      throw new Error("Missing required fields in analysis");
    }

    return analysis;
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", jsonText);
    throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
}
