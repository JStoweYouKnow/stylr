export interface ParsedPurchase {
  items: ParsedItem[];
  orderNumber?: string;
  purchaseDate?: string;
  store?: string;
  total?: number;
}

export interface ParsedItem {
  name: string;
  quantity?: number;
  price?: number;
  type?: string; // "shirt", "pants", "shoes", etc.
  color?: string;
  brand?: string;
}

/**
 * Parse purchase receipt from email content using Gemini AI
 */
export async function parseReceiptWithAI(
  emailSubject: string,
  emailBody: string
): Promise<ParsedPurchase> {
  const prompt = `Extract purchase information from this email receipt.

Subject: ${emailSubject}

Body:
${emailBody.substring(0, 4000)} // Limit body length

Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "Item name (e.g., 'Navy Blazer', 'White Cotton T-Shirt')",
      "quantity": 1,
      "price": 49.99,
      "type": "clothing type (shirt/pants/dress/shoes/jacket/sweater/etc)",
      "color": "primary color if mentioned",
      "brand": "brand name if mentioned"
    }
  ],
  "orderNumber": "order number if found",
  "purchaseDate": "YYYY-MM-DD format",
  "store": "store/retailer name",
  "total": 149.99
}

Important:
- Only extract CLOTHING items (ignore accessories, electronics, etc. unless they're fashion items)
- If no clothing items found, return empty items array
- Use null for missing fields
- Extract as much detail as possible from item descriptions
- Infer clothing type from item name if not explicit`;

  try {
    // Use Replicate API with meta/llama model (Gemini text-only not available)
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN not configured");
    }

    console.log('Using Replicate LLaMA for receipt parsing');

    // Start the prediction
    const predictionResponse = await fetch(
      'https://api.replicate.com/v1/predictions',
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          version: "dd09b18b0e9ba185eadbef42a9c84edc5b44cbc5", // meta/meta-llama-3-70b-instruct
          input: {
            prompt: prompt,
            max_tokens: 2048,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!predictionResponse.ok) {
      const errorText = await predictionResponse.text();
      console.error(`Replicate prediction start failed:`, {
        status: predictionResponse.status,
        error: errorText.substring(0, 500),
      });
      throw new Error(`Replicate API error: ${predictionResponse.status}`);
    }

    const prediction = await predictionResponse.json();

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    while (result.status !== "succeeded" && result.status !== "failed" && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      );
      result = await statusResponse.json();
      attempts++;
    }

    if (result.status !== "succeeded" || !result.output) {
      throw new Error(`Replicate prediction failed or timed out`);
    }

    const content = Array.isArray(result.output) ? result.output.join('') : result.output;

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = content.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }

    // Remove any remaining markdown
    jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");

    try {
      const parsed = JSON.parse(jsonText) as ParsedPurchase;

      console.log('AI parsed result:', {
        store: parsed.store,
        itemCount: parsed.items?.length || 0,
        items: parsed.items?.map(i => ({ name: i.name, type: i.type })),
      });

      // Validate and clean up the parsed data
      const result = {
        items: parsed.items?.filter(item => item.name && item.name.length > 0) || [],
        orderNumber: parsed.orderNumber || undefined,
        purchaseDate: parsed.purchaseDate || undefined,
        store: parsed.store || undefined,
        total: parsed.total || undefined,
      };

      if (result.items.length === 0) {
        console.log('No clothing items found in email');
      }

      return result;
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", jsonText);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }
  } catch (error) {
    console.error("Failed to parse receipt with AI:", error);

    // Fallback: Try basic regex extraction
    return fallbackParser(emailSubject, emailBody);
  }
}

/**
 * Fallback parser using regex patterns (less accurate but always works)
 */
function fallbackParser(subject: string, body: string): ParsedPurchase {
  const combinedText = `${subject} ${body}`;

  // Extract store name from common patterns
  const storePatterns = [
    /from ([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/,
    /order from ([A-Z][a-z]+)/i,
    /(Amazon|Nordstrom|Zara|H&M|ASOS|Uniqlo|J\.Crew|Gap|Old Navy)/i,
  ];

  let store: string | undefined;
  for (const pattern of storePatterns) {
    const match = combinedText.match(pattern);
    if (match) {
      store = match[1];
      break;
    }
  }

  // Extract order number
  const orderMatch = combinedText.match(/order\s*#?\s*:?\s*([A-Z0-9-]{6,})/i);
  const orderNumber = orderMatch ? orderMatch[1] : undefined;

  // Extract date
  const dateMatch = combinedText.match(/\d{4}-\d{2}-\d{2}/);
  const purchaseDate = dateMatch ? dateMatch[0] : undefined;

  // Extract total
  const totalMatch = combinedText.match(/total:?\s*\$?([\d,]+\.?\d*)/i);
  const total = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : undefined;

  return {
    items: [], // Can't reliably extract items with regex
    orderNumber,
    purchaseDate,
    store,
    total,
  };
}

/**
 * Normalize clothing type to standard categories
 */
export function normalizeClothingType(type: string): string {
  const normalized = type.toLowerCase().trim();

  const typeMap: Record<string, string> = {
    tshirt: "shirt",
    "t-shirt": "shirt",
    blouse: "shirt",
    top: "shirt",
    tee: "shirt",
    jeans: "pants",
    trousers: "pants",
    chinos: "pants",
    slacks: "pants",
    sneakers: "shoes",
    boots: "shoes",
    sandals: "shoes",
    heels: "shoes",
    coat: "jacket",
    blazer: "jacket",
    cardigan: "sweater",
    pullover: "sweater",
    hoodie: "sweater",
  };

  return typeMap[normalized] || normalized;
}

/**
 * Estimate vibe/style from item description
 */
export function estimateVibe(itemName: string): string {
  const nameLower = itemName.toLowerCase();

  if (nameLower.includes("casual") || nameLower.includes("relaxed")) {
    return "casual";
  }
  if (nameLower.includes("formal") || nameLower.includes("dress")) {
    return "professional";
  }
  if (nameLower.includes("athletic") || nameLower.includes("sport")) {
    return "athletic";
  }
  if (nameLower.includes("elegant") || nameLower.includes("chic")) {
    return "elegant";
  }

  return "casual"; // Default
}
