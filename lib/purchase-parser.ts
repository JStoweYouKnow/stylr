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
  const prompt = `You are extracting clothing purchases from ORDER CONFIRMATION emails ONLY.

Subject: ${emailSubject}

Body:
${emailBody.substring(0, 4000)} // Limit body length

FIRST: Verify this is a CONFIRMED ORDER email (order confirmation, receipt, or order placed).
- If this is NOT a confirmed order (e.g., abandoned cart, wishlist, marketing email), return {"items": [], ...other fields...}
- Only extract from CONFIRMED purchases that have already been placed/ordered

CRITICAL: Respond with ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Return ONLY the raw JSON.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "Item name (e.g., 'Navy Blazer', 'Men's Red Tab Overalls')",
      "quantity": 1,
      "price": 49.99,
      "type": "clothing type (shirt/pants/overalls/dress/shoes/jacket/sweater/etc)",
      "color": "primary color if mentioned",
      "brand": "brand name if mentioned"
    }
  ],
  "orderNumber": "order number if found",
  "purchaseDate": "YYYY-MM-DD format",
  "store": "store/retailer name",
  "total": 149.99
}

CRITICAL: THIS IS A CLOTHING WARDROBE APP. ONLY EXTRACT WEARABLE CLOTHING FROM CONFIRMED ORDERS.

✅ INCLUDE (things you can WEAR):
- Clothing: shirts, pants, jeans, overalls, dresses, skirts, shorts, jackets, coats, sweaters, hoodies, t-shirts, blouses, suits, blazers, jumpsuits, rompers
- Footwear: shoes, boots, sneakers, sandals, heels, flats, loafers
- Accessories that you WEAR: hats, caps, beanies, fashion scarves, fashion belts, gloves, ties
- Intimates: socks, underwear, bras, lingerie, pajamas, robes
- Active/Swim: activewear, swimwear, athletic clothing, sportswear

❌ ABSOLUTELY EXCLUDE (NOT wearable clothing):
- Home goods: bath caddies, towels, bedding, pillows, rugs, curtains, storage containers
- Kitchen items: cookware, dishes, utensils, appliances
- Furniture: chairs, tables, shelves, organizers
- Food & Beverages: restaurant meals, groceries, snacks, drinks (CHEESEBURGERS ARE FOOD, NOT CLOTHING!)
- Electronics: phones, chargers, cables, headphones, speakers
- Beauty/Personal care: makeup, skincare, shampoo, soap, lotions
- Books, toys, games, gift cards
- Tech accessories: phone cases, laptop bags, mouse pads

VERIFICATION STEP:
Before adding ANY item to the items array, ask yourself: "Can I wear this item on my body as clothing or fashion?"
- Bath caddy? NO - it's a bathroom storage item
- Cheeseburger? NO - it's food
- T-shirt? YES - it's wearable clothing
- Jeans? YES - they're wearable clothing

If the answer is NO, DO NOT include it in the items array.

If this email contains ONLY non-clothing items, return {"items": [], ...other fields...}
If mixed items, extract ONLY the wearable clothing items.

Extract as much detail as possible from clothing item descriptions.
Use null for missing fields.`;

  try {
    // Use Claude API for receipt parsing (fast and accurate for structured data extraction)
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    console.log('Using Claude Haiku for receipt parsing');

    const response = await fetch(
      'https://api.anthropic.com/v1/messages',
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 2048,
          temperature: 0.2,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API request failed:`, {
        status: response.status,
        error: errorText.substring(0, 500),
      });
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error("Invalid response structure from Claude API");
    }

    const content = data.content[0].text;

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
      // CODE-LEVEL FILTER: Only allow items with valid clothing types (WHITELIST approach)
      const allowedClothingTypes = [
        // Tops
        'shirt', 't-shirt', 'tshirt', 'tee', 'blouse', 'top', 'tank', 'tank top', 'crop top',
        'sweater', 'hoodie', 'sweatshirt', 'cardigan', 'pullover', 'vest', 'tunic',
        // Bottoms
        'pants', 'jeans', 'trousers', 'shorts', 'skirt', 'leggings', 'joggers', 'chinos', 'slacks',
        'overalls', 'coveralls', 'dungarees', 'romper', 'jumpsuit',
        // Outerwear
        'jacket', 'coat', 'blazer', 'parka', 'windbreaker', 'bomber', 'raincoat', 'peacoat',
        'trench', 'anorak', 'fleece', 'poncho',
        // Dresses
        'dress', 'gown', 'sundress', 'maxi', 'midi', 'mini', 'cocktail dress',
        // Footwear
        'shoes', 'sneakers', 'boots', 'sandals', 'heels', 'flats', 'loafers', 'slippers',
        'athletic shoes', 'running shoes', 'tennis shoes', 'cleats', 'mules', 'espadrilles',
        'oxfords', 'brogues', 'ankle boots', 'knee boots', 'rain boots',
        // Intimates & Basics
        'socks', 'underwear', 'bra', 'lingerie', 'boxers', 'briefs', 'panties', 'undershirt',
        'camisole', 'slip', 'nightgown', 'pajamas', 'robe', 'bathrobe',
        // Accessories (wearable only)
        'hat', 'cap', 'beanie', 'scarf', 'belt', 'gloves', 'mittens', 'tie', 'bow tie',
        'suspenders', 'headband', 'bandana',
        // Active/Swim
        'activewear', 'swimwear', 'swimsuit', 'bikini', 'trunks', 'athletic wear',
        'yoga pants', 'sports bra', 'compression', 'tracksuit', 'sweatpants', 'gym shorts'
      ];

      const blockedKeywords = [
        // Home goods
        'caddy', 'organizer', 'storage', 'container', 'basket', 'holder', 'rack', 'shelf',
        'towel', 'mat', 'rug', 'curtain', 'pillow', 'blanket', 'sheet',
        // Food
        'burger', 'pizza', 'sandwich', 'fries', 'meal', 'food',
        // Drinks
        'coffee', 'tea', 'drink', 'beverage', 'water', 'juice', 'soda',
        // Beauty/Personal care
        'shampoo', 'conditioner', 'lotion', 'soap', 'cream', 'serum', 'oil',
        'makeup', 'cosmetic', 'skincare', 'facial', 'cleanser',
        // Electronics/Tech
        'charger', 'cable', 'phone', 'electronic', 'device', 'gadget',
        'screen protector', 'earbuds', 'headphones',
        // Other non-clothing
        'book', 'notebook', 'pen', 'pencil', 'toy', 'game',
        'gift card', 'card', 'voucher', 'certificate'
      ];

      const isClothingItem = (item: ParsedItem): boolean => {
        const itemName = item.name?.toLowerCase() || '';
        const itemType = item.type?.toLowerCase() || '';

        // WHITELIST: Type must match an allowed clothing type
        const hasValidType = allowedClothingTypes.some(validType =>
          itemType.includes(validType)
        );

        if (!hasValidType) {
          console.log(`❌ Blocked item - not a valid clothing type: ${item.name} (type: "${item.type}")`);
          return false;
        }

        // BLOCKLIST: Name must NOT contain blocked keywords
        const hasBlockedKeyword = blockedKeywords.some(keyword =>
          itemName.includes(keyword)
        );

        if (hasBlockedKeyword) {
          console.log(`❌ Blocked item - contains blocked keyword: ${item.name}`);
          return false;
        }

        console.log(`✅ Allowed clothing item: ${item.name} (type: ${item.type})`);
        return true;
      };

      const result = {
        items: parsed.items?.filter(item =>
          item.name &&
          item.name.length > 0 &&
          isClothingItem(item)
        ) || [],
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
      console.error("Failed to parse Claude response:", jsonText);
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
