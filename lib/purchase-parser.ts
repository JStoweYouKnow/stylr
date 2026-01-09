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
 * Parse purchase receipt from email content using Claude AI
 */
export async function parseReceiptWithAI(
  emailSubject: string,
  emailBody: string,
  emailFrom?: string
): Promise<ParsedPurchase> {
  const prompt = `You are a STRICT data extraction tool. Your job is to extract ONLY what is explicitly visible in THIS SPECIFIC EMAIL below. You NEVER guess, infer, or make up information. When information is missing, you return null or empty arrays. You prioritize ACCURACY over completeness.

CRITICAL: EACH EMAIL IS DIFFERENT - EXTRACT ONLY FROM THIS EMAIL
- DO NOT reuse data from examples, previous emails, or templates
- DO NOT default to specific product names (like "Red Tab Men's Overalls") unless you see them in THIS email
- Each email contains DIFFERENT items - look carefully at what is ACTUALLY in THIS email
- If this email has a t-shirt, extract the t-shirt. If it has jeans, extract the jeans. Do not extract items that are not in THIS email.

You are extracting clothing purchases from ORDER CONFIRMATION emails ONLY.

EMAIL METADATA:
- From: ${emailFrom || 'Unknown sender'}
- Subject: ${emailSubject}

EMAIL BODY:
${emailBody.substring(0, 12000)} // Increased limit to capture full order details

REMEMBER: 
- This is a UNIQUE email from "${emailFrom || 'unknown sender'}" about "${emailSubject}"
- Extract items ONLY from THIS SPECIFIC email text above
- Do NOT copy from examples, templates, or previous responses
- Each email is different - look carefully at what is ACTUALLY in THIS email

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

3. Extract the EXACT product names as written in THIS SPECIFIC EMAIL (not from examples, not from memory)
4. Extract the EXACT prices shown in THIS SPECIFIC EMAIL (not examples, not placeholders)
5. If a price is shown as $59.99, use 59.99 (not 49.99 or any other number)
6. Look for order details, line items, product descriptions in structured blocks IN THIS EMAIL
7. Use null for fields you cannot find - DO NOT make up data or use placeholder values

CRITICAL: DO NOT REUSE EXAMPLES OR TEMPLATES
- DO NOT copy item names from examples or previous emails
- DO NOT default to "Red Tab Men's Overalls" or any other specific product unless you see it IN THIS EMAIL
- Each email contains DIFFERENT items - extract ONLY what you see in THIS email
- If this email is about a t-shirt, extract the t-shirt. If it's about jeans, extract the jeans.
- If this email is about shoes, extract the shoes. DO NOT extract overalls unless you see overalls in THIS email.

EXAMPLE PATTERN (NOT TO BE COPIED - USE AS TEMPLATE STRUCTURE ONLY):
If you see a structured product block in THIS EMAIL like:
  Product Name: [WHATEVER IS ACTUALLY IN THIS EMAIL]
  Color: [WHATEVER IS ACTUALLY IN THIS EMAIL]
  Size: [WHATEVER IS ACTUALLY IN THIS EMAIL]
  Qty: [WHATEVER IS ACTUALLY IN THIS EMAIL]
  Price: [WHATEVER IS ACTUALLY IN THIS EMAIL]

Extract the ACTUAL values from THIS EMAIL:
  {
    "name": "[ACTUAL PRODUCT NAME FROM THIS EMAIL]",
    "quantity": [ACTUAL QTY FROM THIS EMAIL],
    "price": [ACTUAL PRICE FROM THIS EMAIL],
    "type": "[ACTUAL TYPE FROM THIS EMAIL]",
    "color": "[ACTUAL COLOR FROM THIS EMAIL or null]",
    "brand": "[ACTUAL BRAND FROM THIS EMAIL or null]"
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
- ✅ CORRECT: {"name": "Men's 501 Original Fit Jeans", "brand": "Levi's"} - Specific product (ONLY if you see this in the email)
- ✅ CORRECT: {"name": "Air Max 90 Sneakers", "brand": "Nike"} - Specific product (ONLY if you see this in the email)
- ✅ CORRECT: {"name": "Classic Crew T-Shirt", "brand": "Gap"} - Specific product (ONLY if you see this in the email)

REMEMBER: Extract ONLY items you actually see in THIS EMAIL. Do not copy names from examples.

CRITICAL: If you cannot see BOTH a specific product name AND a specific price for the same item in the email, DO NOT create that item.
- If product name is missing → DO NOT create item
- If price is missing → DO NOT create item
- If product name is generic/placeholder → DO NOT create item
- If you have to guess or infer → DO NOT create item

If the email only mentions a brand name without specific product names, DO NOT create items.
Only extract items where you can find BOTH:
- A specific product name with product details (e.g., "501 Jeans", "Air Max 90", "Classic T-Shirt", "Denim Jacket", "Wool Sweater", etc. - whatever is ACTUALLY in this email)
- AND a price for that specific item in the same product block

DO NOT default to specific product names like "Red Tab Overalls" - extract only what you actually see in THIS email.

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
2. For each item, verify you saw BOTH the name and price in THIS SPECIFIC EMAIL above
3. Verify the item name matches what you see in THIS EMAIL (not from examples or memory)
4. If you cannot verify both were present in THIS EMAIL, REMOVE that item
5. If the items array would be empty after removing unverifiable items, return {"items": [], ...}
6. It is ALWAYS better to return NO items than to return GUESSED, MADE-UP, or COPIED items

CRITICAL FINAL STEP: Before returning, ask yourself:
- "Did I see this exact item name in the email text above?"
- "Did I see this exact price in the email text above?"
- "Am I copying this from an example or template, or is it actually in THIS email?"

If you answer "no" to any of these questions, REMOVE that item from the response.

Remember: When in doubt, return empty items array. Only extract what you can clearly see IN THIS SPECIFIC EMAIL.`;

  try {
    // Use Claude API for receipt parsing (fast and accurate for structured data extraction)
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    console.log('Using Claude Sonnet 4.5 (2025) for receipt parsing - highly accurate for complex extraction');
    console.log(`=== EMAIL BEING PARSED ===`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body preview (first 500 chars): ${emailBody.substring(0, 500)}`);
    console.log(`========================`);

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
          model: "claude-sonnet-4-5-20250929", // Using Claude Sonnet 4.5 (2025) - more accurate for complex extraction
          max_tokens: 4096,
          temperature: 0, // Zero temp for maximum determinism
          system: "You are a strict data extraction tool. Extract ONLY what you see in the email provided. DO NOT reuse examples, templates, or data from previous emails. Each email is completely independent. If you cannot find specific items with names and prices in THIS email, return an empty items array.",
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

      console.log('=== AI PARSED RESULT ===');
      console.log({
        store: parsed.store,
        itemCount: parsed.items?.length || 0,
        items: parsed.items?.map(i => ({ 
          name: i.name, 
          type: i.type, 
          brand: i.brand,
          price: i.price 
        })),
        orderNumber: parsed.orderNumber,
        purchaseDate: parsed.purchaseDate,
        total: parsed.total
      });
      console.log('========================');
      
      // DETECTION: Check if items look like template responses (suspiciously generic or repeated)
      const suspiciousPatterns = [
        /red tab.*men.*overall/i,
        /crackin.*bracken/i,
        /7910700320/i
      ];
      
      parsed.items?.forEach((item, index) => {
        const itemText = `${item.name} ${item.color || ''} ${item.brand || ''}`.toLowerCase();
        if (suspiciousPatterns.some(pattern => pattern.test(itemText))) {
          console.log(`⚠️  WARNING: Item ${index + 1} matches suspicious template pattern: "${item.name}"`);
          console.log(`   This might be a template response. Verify this item is actually in the email above.`);
        }
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
        // But be careful - don't block legitimate product names that happen to start with common words
        const placeholderPatterns = [
          /^(item|product|product name|item name|description|name)[:\s]*$/i, // Only match if it's JUST this word
          /^(example|sample|placeholder|test|n\/a|na|tbd)\s*$/i, // Only match if it's JUST this word
          /^(order|purchase|item)\s*#?\d+\s*$/i, // Match "Item #123" but not "Item Name: Product"
        ];
        
        // Only reject if the ENTIRE name matches a placeholder pattern (not just starts with it)
        const isPlaceholder = placeholderPatterns.some(pattern => {
          const match = item.name?.match(pattern);
          return match && match[0].trim().toLowerCase() === item.name.trim().toLowerCase();
        });
        
        if (isPlaceholder) {
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

      // CRITICAL VALIDATION: Verify parsed items actually exist in the email body
      // This catches hallucinations and template reuse
      // Extract email sender domain for brand matching
      const emailDomain = emailFrom?.match(/@([^.]+\.)?([^.]+)\./)?.[2]?.toLowerCase() || 
                         emailFrom?.match(/@([^.]+)/)?.[1]?.toLowerCase() || 
                         null;
      
      const validatedItems = filteredItems.filter(item => {
        if (!item.name) return false;
        
        // Strip HTML tags and decode HTML entities for better text matching
        // This is critical because most order confirmation emails are HTML
        // Also extract text from alt attributes, data attributes, and other HTML attributes
        let cleanEmailBody = emailBody
          // First, extract text from various HTML attributes before removing tags
          .replace(/alt=["']([^"']+)["']/gi, ' $1 ') // Extract alt text
          .replace(/title=["']([^"']+)["']/gi, ' $1 ') // Extract title text
          .replace(/aria-label=["']([^"']+)["']/gi, ' $1 ') // Extract aria-label text
          .replace(/data-product-name=["']([^"']+)["']/gi, ' $1 ') // Extract data-product-name
          .replace(/data-item-name=["']([^"']+)["']/gi, ' $1 ') // Extract data-item-name
          .replace(/data-name=["']([^"']+)["']/gi, ' $1 ') // Extract data-name
          .replace(/data-[^=]*=["']([^"']+)["']/gi, ' $1 ') // Extract other data attributes
          // Extract JSON-LD structured data if present
          .replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (_, json) => {
            try {
              const data = JSON.parse(json);
              // Extract product names from structured data
              if (data['@type'] === 'Order' || data['@type'] === 'Product') {
                const items = data.orderedItem || data.itemListElement || [];
                return ' ' + items.map((item: any) => 
                  item.name || item.item?.name || item.product?.name || ''
                ).filter(Boolean).join(' ') + ' ';
              }
              return '';
            } catch {
              return '';
            }
          })
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove remaining script tags
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
          // Extract text content from common HTML elements before removing tags
          .replace(/<(span|div|td|th|p|li|h[1-6])[^>]*>([^<]+)<\/\1>/gi, ' $2 ') // Extract text from common elements
          .replace(/<[^>]+>/g, ' ') // Remove all remaining HTML tags, replace with space
          .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
          .replace(/&amp;/g, '&') // Decode &amp;
          .replace(/&lt;/g, '<') // Decode &lt;
          .replace(/&gt;/g, '>') // Decode &gt;
          .replace(/&quot;/g, '"') // Decode &quot;
          .replace(/&#39;/g, "'") // Decode &#39;
          .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10))) // Decode numeric entities
          .replace(/&[a-z]+;/gi, ' ') // Replace other HTML entities with space
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        const emailText = `${emailSubject} ${cleanEmailBody}`.toLowerCase();
        
        // Log cleaned email text length for debugging
        console.log(`   Cleaned email text length: ${cleanEmailBody.length} chars`);
        
        // Known clothing brands - trust AI parsing more for these
        const trustedBrands = [
          "levi's", "levis", "levi", "nike", "adidas", "gap", "old navy", "banana republic",
          "nordstrom", "macy's", "macys", "target", "walmart", "amazon", "zara", "h&m", "hm",
          "uniqlo", "j.crew", "jcrew", "madewell", "asos", "forever 21", "hollister",
          "abercrombie", "american eagle", "urban outfitters", "anthropologie"
        ];
        
        // Known clothing retailer domains - if email is from these domains, trust items from matching brands
        const trustedDomains = [
          "levi", "levis", "nike", "adidas", "gap", "oldnavy", "bananarepublic",
          "nordstrom", "macy", "target", "walmart", "amazon", "zara", "hm",
          "uniqlo", "jcrew", "madewell", "asos", "forever21", "hollister",
          "abercrombie", "ae", "urbn", "anthropologie"
        ];
        
        const isTrustedBrand = item.brand && trustedBrands.some(brand => 
          item.brand!.toLowerCase().replace(/['"]/g, '').includes(brand) || 
          brand.includes(item.brand!.toLowerCase().replace(/['"]/g, ''))
        );
        
        // Check if email sender is from a trusted clothing retailer domain
        const isFromTrustedDomain = emailDomain && trustedDomains.some(domain => 
          emailDomain.includes(domain) || domain.includes(emailDomain)
        );
        const itemNameLower = item.name.toLowerCase();
        
        // Check if significant parts of the item name appear in the email
        // Extract key words from item name (remove common stop words)
        const stopWords = ['mens', 'womens', 'mens', 'womens', 'the', 'and', 'for', 'with'];
        const itemKeywords = itemNameLower
          .split(/[\s\-_]+/) // Split on spaces, hyphens, and underscores (HTML might use different separators)
          .filter(word => word.length > 2) // Include 3+ char words (allows "red", "tab", etc.)
          .filter(word => !stopWords.includes(word))
          .filter(word => !/^\d+$/.test(word) || word.length <= 4); // Keep short numbers like "501" but filter long numbers
        
        // For item names with multiple words, at least 2 keywords should match
        // For shorter names, the whole name or significant portion should match
        let matches = 0;
        for (const keyword of itemKeywords) {
          if (emailText.includes(keyword)) {
            matches++;
          } else if (/^\d+$/.test(keyword)) {
            // Special handling for numeric codes like "501" - they might appear in different formats
            // Check if the number appears anywhere in the email (might be in attributes, alt text, etc.)
            const numPattern = new RegExp(`\\b${keyword}\\b`);
            if (numPattern.test(emailText)) {
              matches++;
            }
          }
        }
        
        // More lenient matching: require at least 40% of keywords for HTML emails
        // HTML emails often have product names split across tags or formatted differently
        // Also, numbers like "501" might appear as "501" or "five zero one" or in attributes
        const requiredMatches = itemKeywords.length >= 5 ? Math.ceil(itemKeywords.length * 0.4) : 
                                itemKeywords.length === 4 ? 1 : 
                                itemKeywords.length === 3 ? 1 : 
                                itemKeywords.length === 2 ? 1 : 
                                itemKeywords.length === 1 ? 1 : 0;
        
        // Special case: if item name contains trademark symbol or specific brand terms, be more lenient
        const hasTrademark = item.name.includes('™') || item.name.includes('®') || item.name.includes('©');
        const isLikelySpecificProduct = hasTrademark || itemKeywords.length >= 4;
        
        // Also check if price appears near item mentions (if price is provided)
        let priceMatches = true;
        let priceMatchDetails = '';
        if (item.price && item.price > 0) {
          const priceStr = item.price.toString();
          const pricePattern = new RegExp(`${priceStr.replace(/\./g, '\\.')}|\\$${priceStr}`);
          // Look for price within 200 chars of item name mention
          const itemNameMatch = emailText.indexOf(itemKeywords[0] || itemNameLower);
          if (itemNameMatch >= 0) {
            const surroundingText = emailText.substring(
              Math.max(0, itemNameMatch - 100), 
              Math.min(emailText.length, itemNameMatch + 300)
            );
            priceMatches = pricePattern.test(surroundingText) || 
                          /\$\d+/.test(surroundingText); // Accept any price nearby
            priceMatchDetails = priceMatches ? 'price verified nearby' : 'price not found nearby';
          } else {
            // If item name not found, check if price appears anywhere in email
            priceMatches = pricePattern.test(emailText);
            priceMatchDetails = priceMatches ? 'price found in email' : 'price not found';
          }
        }
        
        // Also check if the full item name (or a close variant) appears in the email
        // This helps catch cases where all keywords match but in a different order
        const fullNameMatch = emailText.includes(itemNameLower) || 
                             itemNameLower.split(/\s+/).slice(0, 3).filter(word => word.length > 2).every(word => emailText.includes(word));
        
        // FALLBACK: If brand + type + price match, accept even if name doesn't exactly match
        // This helps with cases where product names are formatted differently in HTML emails
        let brandTypePriceMatch = false;
        let brandTypeMatch = false;
        let senderMatchesBrand = false;
        
        if (item.brand && item.type) {
          const brandLower = item.brand.toLowerCase().replace(/['"]/g, ''); // Remove quotes/apostrophes
          const typeLower = item.type.toLowerCase();
          
          // Check if email sender domain matches brand (e.g., @levi.com matches "Levi's")
          if (emailDomain) {
            const brandWithoutApostrophe = brandLower.replace(/'/g, '');
            senderMatchesBrand = emailDomain.includes(brandWithoutApostrophe) || 
                               brandWithoutApostrophe.includes(emailDomain) ||
                               emailDomain === 'levi' && brandLower.includes('levi') ||
                               emailDomain === 'levis' && brandLower.includes('levi');
          }
          
          // Check for brand variations (e.g., "Levi's" vs "Levis" vs "Levi")
          const brandVariations = [
            brandLower,
            brandLower.replace(/'/g, ''), // "levi's" -> "levis"
            brandLower.replace(/s$/, ''), // "levis" -> "levi"
            brandLower.split("'")[0], // "levi's" -> "levi"
            brandLower.replace(/\s+/g, ''), // "levi s" -> "levis"
            brandLower.replace(/'/g, ' '), // "levi's" -> "levi s"
          ];
          
          // Also check if email sender contains brand name
          if (emailFrom) {
            const fromLower = emailFrom.toLowerCase();
            brandVariations.push(...brandVariations.map(b => fromLower.includes(b) ? b : null).filter(Boolean) as string[]);
          }
          
          const brandInEmail = brandVariations.some(brand => emailText.includes(brand)) || senderMatchesBrand;
          
          // Check for type variations (e.g., "pants" vs "jeans", "shirt" vs "t-shirt")
          const typeVariations: string[] = [
            typeLower,
            typeLower.replace(/-/g, ' '), // "t-shirt" -> "t shirt"
            // Pants/jeans/trousers variations
            typeLower === 'pants' ? 'jeans' : '',
            typeLower === 'pants' ? 'trousers' : '',
            typeLower === 'pants' ? 'denim' : '',
            typeLower === 'jeans' ? 'pants' : '',
            typeLower === 'jeans' ? 'trousers' : '',
            typeLower === 'jeans' ? 'denim' : '',
            typeLower === 'trousers' ? 'pants' : '',
            typeLower === 'trousers' ? 'jeans' : '',
            // Shirt variations
            typeLower === 'shirt' ? 't-shirt' : '',
            typeLower === 'shirt' ? 'tee' : '',
            typeLower === 'shirt' ? 'top' : '',
            typeLower === 't-shirt' ? 'shirt' : '',
            typeLower === 't-shirt' ? 'tee' : '',
            typeLower === 't-shirt' ? 'top' : '',
            typeLower === 'tee' ? 'shirt' : '',
            typeLower === 'tee' ? 't-shirt' : '',
            // Jacket variations
            typeLower === 'jacket' ? 'coat' : '',
            typeLower === 'jacket' ? 'outerwear' : '',
            typeLower === 'coat' ? 'jacket' : '',
            typeLower === 'coat' ? 'outerwear' : '',
          ].filter((t): t is string => Boolean(t));
          
          const typeInEmail = typeVariations.some(type => emailText.includes(type));
          
          // Check for price (more lenient - allow nearby prices or any price in email)
          let priceInEmail = true; // Default to true if no price provided
          if (item.price && item.price > 0) {
            const priceStr = item.price.toString();
            const pricePattern = new RegExp(`\\b${priceStr.replace(/\./g, '\\.')}\\b|\\$${priceStr.replace(/\./g, '\\.')}`);
            priceInEmail = pricePattern.test(emailText);
          }
          
          // Accept if brand + type match (price is optional for fallback)
          if (brandInEmail && typeInEmail) {
            brandTypeMatch = true;
            if (priceInEmail) {
              brandTypePriceMatch = true;
              console.log(`   Fallback match: brand "${item.brand}", type "${item.type}", price ${item.price || 'N/A'} all found in email`);
            } else {
              console.log(`   Partial fallback: brand "${item.brand}", type "${item.type}" found in email (price ${item.price || 'N/A'} not verified)`);
            }
          }
        }
        
        // Accept if:
        // 1. Enough keywords match (standard validation)
        // 2. Full name matches and it's a specific product (trademark, etc.)
        // 3. Brand + type + price all match (strong fallback)
        // 4. Brand + type match AND we have at least 1 keyword match (weaker fallback for HTML emails)
        // 5. Trusted brand + type match (even without keyword match for known clothing brands)
        // 6. Trusted brand + any keyword match (very lenient for known brands)
        // 7. SENDER-BASED TRUST: Email sender domain matches brand + valid type (NEW - most lenient for known retailers)
        const isValid = (matches >= requiredMatches && (itemKeywords.length > 0 || itemNameLower.length > 5)) ||
                       (isLikelySpecificProduct && fullNameMatch && matches >= Math.max(1, requiredMatches - 1)) ||
                       brandTypePriceMatch ||
                       (brandTypeMatch && matches >= 1) || // Accept if brand+type match and at least 1 keyword found
                       (isTrustedBrand && brandTypeMatch) || // Trust known brands: if brand+type match, accept
                       (isTrustedBrand && item.brand && matches >= 1) || // Trust known brands: if brand found and 1+ keyword, accept
                       (senderMatchesBrand && brandTypeMatch && item.type); // NEW: Sender domain matches brand + valid type = accept (type already validated by isClothingItem filter)
        
        if (!isValid) {
          console.log(`❌ REJECTED - Item name "${item.name}" not found in email body`);
          console.log(`   Email sender: ${emailFrom || 'unknown'}`);
          console.log(`   Email domain: ${emailDomain || 'unknown'}`);
          console.log(`   Keywords searched: ${itemKeywords.join(', ')}`);
          console.log(`   Matches found: ${matches}, required: ${requiredMatches}`);
          console.log(`   Full name match: ${fullNameMatch}`);
          console.log(`   Trusted brand: ${isTrustedBrand ? 'YES' : 'NO'}`);
          console.log(`   From trusted domain: ${isFromTrustedDomain ? 'YES' : 'NO'}`);
          if (item.brand && item.type) {
            console.log(`   Brand/Type fallback: ${brandTypeMatch ? 'matched' : 'not matched'}`);
            console.log(`   Sender matches brand: ${senderMatchesBrand ? 'YES' : 'NO'}`);
            if (item.brand) {
              const brandLower = item.brand.toLowerCase().replace(/['"]/g, '');
              const brandVariations = [
                brandLower,
                brandLower.replace(/'/g, ''),
                brandLower.replace(/s$/, ''),
                brandLower.split("'")[0],
              ];
              console.log(`   Brand variations checked: ${brandVariations.join(', ')}`);
            }
            if (item.type) {
              const typeLower = item.type.toLowerCase();
              const typeVariations: string[] = [
                typeLower,
                typeLower.replace(/-/g, ' '),
                typeLower === 'pants' ? 'jeans' : '',
                typeLower === 'jeans' ? 'pants' : '',
              ].filter((t): t is string => Boolean(t));
              console.log(`   Type variations checked: ${typeVariations.join(', ')}`);
            }
            if (item.price) {
              console.log(`   Brand/Type/Price fallback: ${brandTypePriceMatch ? 'matched' : 'not matched'}`);
            }
          }
          if (item.price) {
            console.log(`   Price verification: ${priceMatchDetails}`);
          }
          // Debug: show a snippet of the cleaned email text
          const emailSnippet = emailText.substring(0, 1000);
          console.log(`   Email text snippet (first 1000 chars): ${emailSnippet}...`);
        } else if (!priceMatches && item.price) {
          console.log(`⚠️  WARNING - Item "${item.name}" found but ${priceMatchDetails}`);
        } else {
          const matchReason = senderMatchesBrand && brandTypeMatch ? 'sender domain + brand + type match' :
                             isTrustedBrand && brandTypeMatch ? 'trusted brand + type match' :
                             brandTypePriceMatch ? 'brand/type/price match' : 
                             brandTypeMatch && matches >= 1 ? 'brand/type + keyword match' :
                             isTrustedBrand && matches >= 1 ? 'trusted brand + keyword match' :
                             fullNameMatch ? 'full name match' : 
                             `${matches} keyword matches`;
          console.log(`✅ VALIDATED - Item "${item.name}" verified in email (${matchReason})`);
        }
        
        return isValid;
      });
      
      if (validatedItems.length < filteredItems.length) {
        const rejectedCount = filteredItems.length - validatedItems.length;
        console.log(`⚠️  Rejected ${rejectedCount} item(s) that could not be verified in email body`);
      }

      const result = {
        items: validatedItems,
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
