import { ClothingAnalysis } from "./types";

export async function analyzeWithOpenAI(imageUrl: string): Promise<ClothingAnalysis> {
  const prompt = `You are a professional fashion stylist analyzing a clothing item. Study the image carefully and provide detailed analysis.

CLOTHING TYPES (choose the most specific):
Tops: t-shirt, shirt, blouse, tank top, crop top, sweater, hoodie, sweatshirt, cardigan, vest
Bottoms: jeans, pants, trousers, shorts, skirt, leggings, joggers, chinos
Outerwear: jacket, coat, blazer, parka, windbreaker, bomber, denim jacket, leather jacket
Dresses: dress, maxi dress, midi dress, mini dress, sundress, cocktail dress
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
  "layeringCategory": "top, bottom, jacket, shoes, or accessories",
  "brand": "brand name if visible, or null",
  "productName": "product name or model if visible, or null",
  "features": ["array of key visual features for product matching, e.g., 'distinctive logo', 'unique pattern', 'color combination']"
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();

  // Validate response structure
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error("Invalid response structure from OpenAI API");
  }

  const content = data.choices[0].message.content;

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
    console.error("Failed to parse OpenAI response:", jsonText);
    throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
  }
}
