import { ClothingAnalysis } from "./types";

export async function analyzeWithGemini(imageUrl: string): Promise<ClothingAnalysis> {
  const prompt = `You are a professional fashion stylist analyzing a clothing item. Study the image carefully and provide detailed analysis.

CLOTHING TYPES (choose the most specific):
Tops: t-shirt, shirt, blouse, tank top, crop top, sweater, hoodie, sweatshirt, cardigan, vest
Bottoms: jeans, pants, trousers, shorts, skirt, leggings, joggers, chinos
Outerwear: jacket, coat, blazer, parka, windbreaker, bomber, denim jacket, leather jacket
Full-body: dress, maxi dress, midi dress, mini dress, sundress, cocktail dress, jumpsuit, romper, overalls
Footwear: sneakers, boots, sandals, heels, flats, loafers, athletic shoes
Accessories: hat, baseball cap, beanie, bucket hat, fedora, snapback, trucker hat, beret, sun hat, winter hat, scarf, belt, bag, sunglasses, jewelry, watch
Other: swimwear, activewear, underwear, socks

IMPORTANT: If you see ANY type of hat (baseball cap, beanie, bucket hat, fedora, snapback, etc.), you MUST classify it as "hat" with layeringCategory "accessory". Do not confuse hats with other items.

COLORS (be specific):
Instead of "blue" say "navy blue", "sky blue", "royal blue", etc.
Instead of "red" say "burgundy", "crimson", "coral", etc.

PATTERNS:
solid, striped, plaid, checkered, floral, polka dot, geometric, animal print, tie-dye, camo, abstract, graphic

FIT STYLES:
slim, fitted, regular, relaxed, loose, oversized, tailored, athletic

VIBES:
casual, formal, business casual, sporty, athletic, streetwear, vintage, boho, minimalist, edgy, preppy, elegant

LAYERING CATEGORIES (choose one):
- top: shirts, t-shirts, blouses, sweaters, hoodies, cardigans, tank tops, crop tops
- bottom: pants, jeans, trousers, shorts, skirts, leggings, joggers, chinos
- jacket: jackets, coats, blazers, parkas, windbreakers, bombers, outerwear
- shoes: sneakers, boots, sandals, heels, flats, loafers, athletic shoes, all footwear
- accessories: hats, bags, belts, scarves, sunglasses, jewelry, watches
- full-body: dresses, jumpsuits, rompers, overalls (items that cover both torso and legs)

BRAND DETECTION:
- Look for brand names, logos, tags, labels visible in the image
- Common brands: Nike, Adidas, Zara, H&M, Uniqlo, Gap, Levi's, etc.
- If brand is visible, include it. If not, return null.

PRODUCT IDENTIFICATION:
- Identify key visual features: distinctive patterns, logos, design elements, color combinations
- Note any product names, model numbers, or SKUs if visible
- These features will help match the product online

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "type": "specific clothing type from the list above",
  "primaryColor": "specific color name",
  "secondaryColor": "secondary color if present, or null",
  "pattern": "pattern type or null if solid",
  "fit": "fit style or null if unclear",
  "vibe": "primary style vibe",
  "notes": "brief description including material if visible (cotton, denim, leather, etc.)",
  "layeringCategory": "top, bottom, jacket, shoes, accessories, or full-body",
  "brand": "brand name if visible, or null",
  "productName": "product name or model if visible, or null",
  "features": ["array of key visual features for product matching, e.g., 'distinctive logo', 'unique pattern', 'color combination']"
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

  // Use configurable model name, default to gemini-1.5-flash (use v1 API, not v1beta)
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  console.log(`Using Gemini model: ${model}`);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
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
