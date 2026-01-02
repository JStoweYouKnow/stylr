import { ClothingAnalysis } from "./types";

export async function analyzeWithOpenAI(imageUrl: string): Promise<ClothingAnalysis> {
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
