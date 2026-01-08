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
    // Call Gemini text API directly
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
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
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!resultText) {
      throw new Error("No text in Gemini response");
    }

    // Clean up response - remove markdown code blocks if present
    let jsonText = resultText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

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
