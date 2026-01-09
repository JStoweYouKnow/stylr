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
  const prompt = `You are a STRICT data extraction tool. Your job is to extract ONLY what is explicitly visible in the email text below. You NEVER guess, infer, or make up information. When information is missing, you return null or empty arrays. You prioritize ACCURACY over completeness.

You are extracting clothing purchases from ORDER CONFIRMATION emails ONLY.

Subject: ${emailSubject}

Body:
${emailBody.substring(0, 4000)} // Limit body length

CRITICAL VERIFICATION STEPS (MUST CHECK IN ORDER):

STEP 1: Verify this email contains ACTUAL ORDER DETAILS
- Look for: item lists, product names, prices, quantities, order numbers, order totals
- If this email is ONLY about shipping/tracking (no item list), return {"items": [], "orderNumber": null, "purchaseDate": null, "store": null, "total": null}
- If this email is ONLY a marketing/promotional email (no actual order), return {"items": [], ...}
- If this email is an abandoned cart or wishlist (not a confirmed order), return {"items": [], ...}
- If this email is from a NON-CLOTHING brand (Apple, Anthropic, OpenAI, Google, Microsoft, Netflix, Spotify, etc.), return {"items": [], ...}
- Only proceed if you can find ACTUAL purchased items with names and prices in the email

STEP 2: Verify this is a CONFIRMED ORDER (not a quote, not a saved cart, not a wishlist)
- Must have: "order confirmation", "order placed", "purchase confirmation", "receipt", or "thank you for your order"
- Must have: actual item names and prices (not just "items in your cart")
- If this is NOT a confirmed order, return {"items": [], ...}

STEP 3: Extract ONLY if order details are present
- If you cannot find specific item names AND prices in the email body, return {"items": [], ...}
- DO NOT hallucinate or make up item names, prices, or details
- DO NOT use placeholder values like "Item 1", "Example Product", or generic prices
- If the email mentions items but doesn't list them (e.g., "your order contains 3 items"), return {"items": [], ...}
- CRITICAL: Store name must be the CLOTHING RETAILER, not a restaurant, venue, or delivery location
  * ❌ WRONG: "HiHo Cheeseburger - Mid-Wilshire" (this is a restaurant, not a clothing store)
  * ❌ WRONG: "Starbucks", "AMC Theater", "Madison Square Garden" (these are not clothing stores)
  * ✅ CORRECT: "Levi's", "Nike", "Nordstrom", "Amazon" (these are clothing retailers)
  * If you see a restaurant or venue name in the email, IGNORE IT - it's not the store where clothing was purchased

CRITICAL: Respond with ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks. Return ONLY the raw JSON.

ABSOLUTE RULE: When in doubt, return {"items": []}. It is BETTER to return NO items than to GUESS or MAKE UP items.

DO NOT GUESS:
- DO NOT infer items if you don't see them explicitly listed
- DO NOT create items from brand names alone
- DO NOT make up product names if you only see generic descriptions
- DO NOT estimate prices if they're not shown
- DO NOT assume quantities if they're not specified
- DO NOT extract items from order totals without line items
- DO NOT create items from shipping notifications
- DO NOT extract from promotional content

EXTRACTION RULE: Only extract an item if you can see:
1. A SPECIFIC product name (not just brand, not generic)
2. A SPECIFIC price for that item
3. Both must be visible in the same product block/line item

If ANY of these are missing, DO NOT create an item. Return empty items array instead.

Return a JSON object with this exact structure:
{
  "items": [
    {
      "name": "ACTUAL specific product name from the email (e.g., '501 Original Fit Jeans', 'Air Max 90', 'Classic Crew T-Shirt')",
      "quantity": 1,
      "price": 0.00,
      "type": "shirt/pants/overalls/dress/shoes/jacket/sweater/etc",
      "color": "color from email or null",
      "brand": "brand from email or null"
    }
  ],
  "orderNumber": "actual order number or null",
  "purchaseDate": "YYYY-MM-DD or null",
  "store": "actual store name or null",
  "total": 0.00
}

STORE NAME RULES:
- Extract the RETAILER/BRAND STORE NAME where the clothing was purchased
- Examples: "Levi's", "Nike", "Nordstrom", "Amazon", "Zara", "Target"
- DO NOT extract restaurant names (even if mentioned in email) - restaurants don't sell clothing
- DO NOT extract venue names (theaters, cafes, etc.) - these are not stores that sell clothing
- DO NOT extract shipping addresses or delivery locations as store names
- If email mentions a restaurant or venue name, IGNORE IT - it's not the store
- Store name should be the COMPANY/BRAND that sold the clothing items
- If you cannot find a clear retailer/store name, use null (do not guess)
- Common clothing retailers: Levi's, Nike, Adidas, Gap, Old Navy, Nordstrom, Macy's, Target, Amazon, Zara, H&M, Uniqlo, ASOS, etc.

ITEM NAME REQUIREMENTS:
- Must be a SPECIFIC PRODUCT NAME, not just a brand
- Examples of VALID names: "Men's 501 Original Fit Jeans", "Air Max 90 Sneakers", "Classic Crew Neck T-Shirt"
- Examples of INVALID names: "Levi's", "Nike", "Gap" (these are just brands, not products)
- The name should describe WHAT the item is (jeans, t-shirt, sneakers) not just WHO made it
- If you only see a brand name without a product description, DO NOT create an item

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

EXCLUDE: Emails from non-clothing brands/companies
- These companies NEVER sell clothing: Apple, Anthropic, OpenAI, Google, Microsoft, Netflix, Spotify, Adobe, Salesforce, GitHub, AWS, etc.
- If the email is from one of these companies (check sender, subject, or body), return {"items": [], ...}
- Even if the email mentions "order confirmation", these companies don't sell clothing, so skip them

CRITICAL EXTRACTION RULES:
1. Look for STRUCTURED PRODUCT BLOCKS in the email - these typically contain:
   - Product Name / Item Name / Description
   - Color
   - Size
   - Style / SKU / Product Code
   - Quantity (Qty)
   - Price / Unit Price
   - Total (for that item)

2. Common patterns to look for:
   - "Product Name:" or "Item:" or "Description:" followed by the product name
   - "Color:" followed by color name
   - "Size:" followed by size (S, M, L, XL, etc. or numeric sizes)
   - "Style:" or "SKU:" or "Product Code:" followed by style number
   - "Qty:" or "Quantity:" followed by number
   - "Price:" or "$" followed by price amount
   - Tables or structured lists with product information
   - HTML tables with product rows
   - Line items in order summaries

3. Extract the EXACT product names as written in the email
4. Extract the EXACT prices shown in the email (not examples, not placeholders)
5. If a price is shown as $59.99, use 59.99 (not 49.99 or any other number)
6. If an item name is "Red Tab™ Men's Overalls", use that EXACT name (not "Levi's" or generic name)
7. Look for order details, line items, product descriptions in structured blocks
8. Use null for fields you cannot find - DO NOT make up data or use placeholder values

EXAMPLE OF WHAT TO LOOK FOR:
If you see a structured product block like:
  Product Name: Red Tab™ Men's Overalls
  Color: Crackin Bracken
  Size: M
  Style: 7910700320M
  Qty: 1
  Price: $49.75

Extract it as:
  {
    "name": "Red Tab™ Men's Overalls",
    "quantity": 1,
    "price": 49.75,
    "type": "overalls",
    "color": "Crackin Bracken",
    "brand": "Levi's"
  }

Look for these structured patterns in the email:
- Product blocks with labeled fields (Product Name:, Color:, Size:, etc.)
- HTML tables with product rows
- Receipt-style line items
- Order detail sections with product information
- Itemized lists with multiple fields per item

Each product block should have at minimum:
- A product name/description (not just brand)
- A price
- Optionally: color, size, style, quantity

MANDATORY: Each item MUST have a specific product name, not just a brand.
- ❌ WRONG: {"name": "Levi's", "brand": "Levi's"} - This is just a brand, not an item
- ❌ WRONG: {"name": "Nike", "brand": "Nike"} - This is just a brand, not an item
- ❌ WRONG: {"name": "Levi's Item", "brand": "Levi's"} - Too generic, no product detail
- ❌ WRONG: {"name": "Product from Levi's", "brand": "Levi's"} - Generic placeholder name
- ✅ CORRECT: {"name": "Men's 501 Original Fit Jeans", "brand": "Levi's"} - Specific product
- ✅ CORRECT: {"name": "Air Max 90 Sneakers", "brand": "Nike"} - Specific product
- ✅ CORRECT: {"name": "Red Tab™ Men's Overalls", "brand": "Levi's"} - Specific product with details

CRITICAL: If you cannot see BOTH a specific product name AND a specific price for the same item in the email, DO NOT create that item.
- If product name is missing → DO NOT create item
- If price is missing → DO NOT create item
- If product name is generic/placeholder → DO NOT create item
- If you have to guess or infer → DO NOT create item

If the email only mentions a brand name without specific product names, DO NOT create items.
Only extract items where you can find BOTH:
- A specific product name with product details (e.g., "501 Jeans", "Air Max 90", "Classic T-Shirt", "Red Tab Overalls")
- AND a price for that specific item in the same product block

If you see "Levi's - $59.99" but no product name, DO NOT extract it as an item.
If you see "Order from Levi's" but no line items, DO NOT extract items.
If you see "Your order includes 3 items" but no itemized list, DO NOT extract items.

Look for STRUCTURED PRODUCT BLOCKS with sections like:
- "Items ordered:" or "Order details:" or "Your order includes:" or "Products:"
- Product information blocks with fields like:
  * Product Name / Item Name / Description
  * Color
  * Size
  * Style / SKU / Product Code
  * Quantity (Qty)
  * Price
- HTML tables with product rows
- Line items with product names, sizes, colors, and prices
- Itemized lists with structured data (not just brand names)
- Receipt-style layouts with product details

PRIORITIZE extracting from structured blocks that have:
- Product name + Color + Size + Price (most complete)
- Product name + Price (minimum required)
- Avoid extracting if you only see brand name without product details

Extract as much detail as possible from clothing item descriptions.
Use null for missing fields.

FINAL CHECK BEFORE RETURNING:
1. Review each item in the items array
2. For each item, verify you saw BOTH the name and price in the email
3. If you cannot verify both were present in the email, REMOVE that item
4. If the items array would be empty after removing unverifiable items, return {"items": [], ...}
5. It is ALWAYS better to return NO items than to return GUESSED or MADE-UP items

Remember: When in doubt, return empty items array. Only extract what you can clearly see.`;

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
          temperature: 0, // Set to 0 for maximum determinism, reduce hallucinations - DO NOT INCREASE
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

    // DEBUG: Log the raw AI response
    console.log('=== RAW AI RESPONSE (first 500 chars) ===');
    console.log(content.substring(0, 500));

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonText = content.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }

    // Remove any remaining markdown
    jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");

    console.log('=== CLEANED JSON (first 500 chars) ===');
    console.log(jsonText.substring(0, 500));

    try {
      const parsed = JSON.parse(jsonText) as ParsedPurchase;

      console.log('AI parsed result:', {
        store: parsed.store,
        itemCount: parsed.items?.length || 0,
        items: parsed.items?.map(i => ({ name: i.name, type: i.type })),
        orderNumber: parsed.orderNumber
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

      // Check if item name is just a brand name (not a specific product)
      const isJustBrandName = (itemName: string): boolean => {
        const nameLower = itemName.toLowerCase().trim();
        
        // Common brand names that shouldn't be item names by themselves
        const commonBrands = [
          'levi\'s', 'levis', 'nike', 'adidas', 'puma', 'reebok', 'converse',
          'vans', 'under armour', 'lululemon', 'patagonia', 'the north face',
          'gap', 'old navy', 'banana republic', 'j.crew', 'jcrew', 'madewell',
          'zara', 'h&m', 'hm', 'uniqlo', 'gu', 'nordstrom', 'macy\'s', 'macys',
          'target', 'walmart', 'amazon', 'asos', 'boohoo', 'shein', 'fashion nova'
        ];
        
        // If the name is just a brand name (and nothing else), it's invalid
        return commonBrands.some(brand => {
          // Exact match or name is just the brand
          if (nameLower === brand || nameLower === `${brand} brand`) {
            return true;
          }
          // Check if name starts with brand and has no additional descriptive words
          if (nameLower.startsWith(brand)) {
            const afterBrand = nameLower.substring(brand.length).trim();
            // If only whitespace, numbers, or very short generic words, it's likely just a brand
            if (afterBrand.length === 0 || /^[\s\-_]*$/.test(afterBrand) || afterBrand.length < 3) {
              return true;
            }
          }
          return false;
        });
      };

      const isClothingItem = (item: ParsedItem): boolean => {
        const itemName = item.name?.toLowerCase() || '';
        const itemType = item.type?.toLowerCase() || '';

        // VALIDATION: Item name must be a specific product, not just a brand
        if (isJustBrandName(item.name || '')) {
          console.log(`❌ Blocked item - name is just a brand, not a specific product: "${item.name}"`);
          return false;
        }

        // VALIDATION: Item name must have some descriptive content (not just brand)
        // If name is very short and matches brand exactly, reject it
        if (item.name && item.name.length < 10 && item.brand && 
            item.name.toLowerCase().trim() === item.brand.toLowerCase().trim()) {
          console.log(`❌ Blocked item - name is identical to brand (no product details): "${item.name}"`);
          return false;
        }

        // VALIDATION: Item name must be descriptive enough (at least 5 chars, or contains product descriptors)
        if (!item.name || item.name.trim().length < 5) {
          console.log(`❌ Blocked item - name too short or empty: "${item.name}"`);
          return false;
        }

        // VALIDATION: If name is just brand + generic word like "item" or "product", reject
        const genericWords = ['item', 'product', 'clothing', 'apparel', 'merchandise', 'goods', 'piece', 'article'];
        const nameWords = itemName.split(/\s+/);
        if (nameWords.length <= 2 && genericWords.some(word => nameWords.includes(word))) {
          console.log(`❌ Blocked item - name is too generic (just brand + generic word): "${item.name}"`);
          return false;
        }

        // VALIDATION: Reject items with suspiciously generic or placeholder-like names
        const placeholderPatterns = [
          /^(item|product|product name|item name|description|name)[:\s]*$/i,
          /^(example|sample|placeholder|test|n\/a|na|tbd)/i,
          /^(order|purchase|item)\s*#?\d*$/i,
        ];
        
        if (placeholderPatterns.some(pattern => pattern.test(item.name || ''))) {
          console.log(`❌ Blocked item - name looks like placeholder or generic: "${item.name}"`);
          return false;
        }

        // VALIDATION: Item name should contain product descriptors (not just brand)
        // Must have at least one word that describes the product type (jeans, shirt, shoes, etc.)
        const productDescriptors = [
          'jean', 'pant', 'shirt', 'tee', 't-shirt', 'top', 'dress', 'jacket', 'coat',
          'sweater', 'hoodie', 'sweatshirt', 'shorts', 'skirt', 'overall', 'jumpsuit',
          'shoe', 'sneaker', 'boot', 'sandal', 'heel', 'flat', 'loafer', 'slipper',
          'hat', 'cap', 'beanie', 'scarf', 'belt', 'glove', 'tie', 'sock', 'underwear'
        ];
        
        const hasProductDescriptor = productDescriptors.some(desc => 
          itemName.includes(desc)
        );
        
        // If name is long enough but has no product descriptor, it might be a hallucination
        // Unless it's a known product name pattern
        if (itemName.length > 10 && !hasProductDescriptor && !itemName.includes("'")) {
          console.log(`⚠️  Warning - item name has no clear product descriptor: "${item.name}"`);
          // Don't reject, but log a warning - some product names might be unusual
        }

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

        console.log(`✅ Allowed clothing item: ${item.name} (type: ${item.type}, brand: ${item.brand || 'none'})`);
        return true;
      };

      // Validate store name - reject restaurant/food names, venue names, etc.
      const isValidStoreName = (storeName: string | null | undefined, items: ParsedItem[]): boolean => {
        if (!storeName || !storeName.trim()) {
          return true; // null/undefined/empty is acceptable
        }

        const storeLower = storeName.toLowerCase().trim();

        // BLOCKLIST: Reject restaurant/food-related store names
        const restaurantKeywords = [
          'cheeseburger', 'burger', 'restaurant', 'cafe', 'diner', 'bistro', 'pizza',
          'sandwich', 'grill', 'steakhouse', 'sushi', 'chinese', 'mexican', 'italian',
          'coffee', 'bar', 'pub', 'tavern', 'brewery', 'wings', 'chicken', 'food'
        ];

        if (restaurantKeywords.some(keyword => storeLower.includes(keyword))) {
          console.log(`❌ Blocked invalid store name - contains restaurant/food keyword: "${storeName}"`);
          return false;
        }

        // BLOCKLIST: Reject venue/entertainment names when items are clothing
        const venueKeywords = [
          'theater', 'theatre', 'cinema', 'movie', 'club', 'venue', 'arena',
          'stadium', 'convention', 'conference', 'event'
        ];

        if (venueKeywords.some(keyword => storeLower.includes(keyword))) {
          console.log(`❌ Blocked invalid store name - contains venue/entertainment keyword: "${storeName}"`);
          return false;
        }

        // CROSS-VALIDATION: If items have a brand, store should match known retailers
        const itemsWithBrands = items.filter(item => item.brand);
        if (itemsWithBrands.length > 0) {
          const brands = itemsWithBrands.map(item => item.brand!.toLowerCase());
          
          // Known clothing retailers (common stores that sell clothing)
          const knownRetailers = [
            'levi', "levi's", 'nike', 'adidas', 'gap', 'old navy', 'banana republic',
            'nordstrom', 'macy', "macy's", 'target', 'walmart', 'amazon',
            'zara', 'h&m', 'hm', 'uniqlo', 'j.crew', 'jcrew', 'madewell',
            'asos', 'boohoo', 'shein', 'fashion nova', 'forever 21', 'hollister',
            'abercrombie', 'american eagle', 'urban outfitters', 'anthropologie',
            'revolve', 'shopbop', 'farfetch', 'ssense', 'net-a-porter'
          ];

          // Check if store name contains a brand name (e.g., "Levi's Store" or "Nike.com")
          const storeMatchesBrand = brands.some(brand => 
            storeLower.includes(brand) || brand.includes(storeLower)
          );

          // Check if store name contains a known retailer
          const storeIsKnownRetailer = knownRetailers.some(retailer => 
            storeLower.includes(retailer) || retailer.includes(storeLower)
          );

          // If we have a brand but store doesn't match brand or known retailer, log a warning
          // But don't reject - sometimes items come from third-party sellers or department stores
          if (!storeMatchesBrand && !storeIsKnownRetailer && storeLower.length > 15) {
            console.log(`⚠️  Warning - store name "${storeName}" doesn't match brand(s) [${brands.join(', ')}] or known retailers`);
          }
        }

        return true;
      };

      const filteredItems = parsed.items?.filter(item =>
        item.name &&
        item.name.length > 0 &&
        isClothingItem(item)
      ) || [];

      // Validate store name against filtered items
      let validatedStore = parsed.store;
      if (!isValidStoreName(validatedStore, filteredItems)) {
        console.log(`⚠️  Rejecting invalid store name: "${validatedStore}" - setting to undefined`);
        validatedStore = undefined;
      }

      const result = {
        items: filteredItems,
        orderNumber: parsed.orderNumber || undefined,
        purchaseDate: parsed.purchaseDate || undefined,
        store: validatedStore || undefined,
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
