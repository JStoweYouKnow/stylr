import * as cheerio from 'cheerio';

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
  imageUrl?: string; // Product image URL from email
}

/**
 * Extract product images from HTML using Cheerio
 * Returns structured image data for AI processing
 */
function extractProductImages(html: string): Array<{url: string, alt: string, context: string}> {
  try {
    const $ = cheerio.load(html);
    const productImages: Array<{url: string, alt: string, context: string}> = [];
    const allImages: Array<{url: string, alt: string}> = [];

    $('img').each((_, el) => {
      const $img = $(el);
      const src = $img.attr('src') || '';
      const alt = $img.attr('alt') || '';

      // Track all images with valid URLs for debugging
      if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
        allImages.push({url: src, alt: alt});

        // More lenient filtering - exclude only obvious non-product images
        const altLower = alt.toLowerCase();
        const srcLower = src.toLowerCase();

        // EXCLUDE images that are clearly not products
        const isLogo = altLower.includes('logo') || srcLower.includes('logo');
        const isIcon = altLower.includes('icon') || srcLower.includes('icon') || altLower.includes('social');
        const isBanner = altLower.includes('banner') || altLower.includes('header');
        const isTracking = srcLower.includes('tracking') || srcLower.includes('pixel') || srcLower.includes('beacon');
        const isButton = altLower.includes('button') || srcLower.includes('button');
        const isTooSmall = srcLower.match(/\d+x\d+/) && parseInt(srcLower.match(/(\d+)x\d+/)?.[1] || '1000') < 50;

        if (!isLogo && !isIcon && !isBanner && !isTracking && !isButton && !isTooSmall) {
          // Get context from parent elements
          const parent = $img.parent();
          const parentText = parent.text().substring(0, 100).trim();
          productImages.push({url: src, alt: alt, context: parentText});
        }
      }
    });

    console.log(`📷 Image extraction: Found ${allImages.length} total images, ${productImages.length} likely product images`);
    if (productImages.length > 0) {
      console.log(`   First 3 product images: ${productImages.slice(0, 3).map(img => `\n      - ${img.url.substring(0, 80)}... (alt: "${img.alt}")`).join('')}`);
    }

    return productImages;
  } catch (error) {
    console.warn('Image extraction failed:', error);
    return [];
  }
}

/**
 * Extract order details sections from HTML email using Cheerio
 * This reduces token usage by focusing on relevant sections
 */
function extractOrderDetailsFromHTML(html: string, maxLength: number = 30000): string {
  try {
    const $ = cheerio.load(html);
    let extractedText = '';

    // 1. Extract JSON-LD structured data (most reliable)
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const jsonData = JSON.parse($(el).html() || '{}');
        if (jsonData['@type'] === 'Order' || jsonData['@type'] === 'Product' || jsonData.orderedItem) {
          extractedText += JSON.stringify(jsonData, null, 2) + '\n\n';
        }
      } catch {
        // Ignore invalid JSON
      }
    });

    // 2. Find order details sections by class/id patterns
    const orderSelectors = [
      '[class*="order"]',
      '[class*="item"]',
      '[class*="product"]',
      '[class*="receipt"]',
      '[id*="order"]',
      '[id*="item"]',
      '[id*="product"]',
      '[id*="receipt"]',
      'table[class*="order"]',
      'table[class*="item"]',
      'table[class*="product"]',
    ];

    const foundSections = new Set<any>();

    orderSelectors.forEach(selector => {
      $(selector).each((_, el) => {
        const $el = $(el);
        // Check if this element contains product/order related text
        const text = $el.text().toLowerCase();
        if (text.includes('product') || text.includes('item') || text.includes('price') || 
            text.includes('quantity') || text.includes('qty') || text.includes('total') ||
            text.includes('order') || text.includes('purchase')) {
          foundSections.add($el);
        }
      });
    });

    // 3. Extract text from found sections
    foundSections.forEach($section => {
      // Get text content, preserving some structure
      const sectionText = $section.text().trim();
      if (sectionText.length > 50) { // Only include substantial sections
        extractedText += sectionText + '\n\n';
      }
    });

    // 4. Extract from table rows that look like product rows
    $('table tr').each((_, row) => {
      const $row = $(row);
      const rowText = $row.text().toLowerCase();
      // Check if row contains product-like data (has price, quantity, or product name)
      if ((rowText.includes('$') || rowText.match(/\d+\.\d{2}/)) && 
          (rowText.includes('qty') || rowText.includes('quantity') || rowText.length > 20)) {
        extractedText += $row.text().trim() + '\n';
      }
    });

    // 5. Extract from common HTML attributes (alt, title, data-*)
    $('[alt], [title], [data-product-name], [data-item-name], [data-name]').each((_, el) => {
      const $el = $(el);
      const alt = $el.attr('alt') || '';
      const title = $el.attr('title') || '';
      const dataName = $el.attr('data-product-name') || $el.attr('data-item-name') || $el.attr('data-name') || '';
      if (alt || title || dataName) {
        extractedText += [alt, title, dataName].filter(Boolean).join(' ') + '\n';
      }
    });

    // 6. Extract product image URLs using shared function
    // Note: Images are extracted separately and appended later
    // This keeps the text extraction logic clean

    // If we found substantial extracted content, use it
    if (extractedText.trim().length > 500) {
      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // Truncate if needed, but try to keep complete sentences
      if (extractedText.length > maxLength) {
        const truncated = extractedText.substring(0, maxLength);
        const lastSentence = truncated.lastIndexOf('.');
        if (lastSentence > maxLength * 0.8) {
          return truncated.substring(0, lastSentence + 1);
        }
        return truncated;
      }
      return extractedText;
    }

    // Fallback: return cleaned full HTML if no sections found
    const fullText = $.text()
      .replace(/\s+/g, ' ')
      .trim();
    
    return fullText.length > maxLength ? fullText.substring(0, maxLength) : fullText;
  } catch (error) {
    // If Cheerio parsing fails, fall back to basic HTML stripping
    console.warn('Cheerio parsing failed, using fallback:', error);
    const basicText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return basicText.length > maxLength ? basicText.substring(0, maxLength) : basicText;
  }
}

/**
 * Call Claude API with retry logic and rate limit handling
 */
async function callClaudeAPI(
  prompt: string,
  model: string,
  systemMessage: string,
  retries: number = 3
): Promise<{ content: string; modelUsed: string }> {
  const delays = [2000, 4000, 8000]; // Exponential backoff delays in ms
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(
        'https://api.anthropic.com/v1/messages',
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            temperature: 0,
            system: systemMessage,
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
        
        // Handle rate limit (429)
        if (response.status === 429) {
          if (attempt < retries - 1) {
            const delay = delays[attempt] || 8000;
            console.log(`⚠️  Rate limit hit (429), retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            // Last retry failed, fallback to Haiku if we were using Sonnet
            if (model === "claude-sonnet-4-5-20250929") {
              console.log(`⚠️  Rate limit persists after ${retries} retries, falling back to Claude Haiku`);
              return callClaudeAPI(prompt, "claude-3-haiku-20240307", systemMessage, 1);
            }
            throw new Error(`Claude API error: ${response.status} - Rate limit exceeded`);
          }
        }
        
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

      return {
        content: data.content[0].text,
        modelUsed: model,
      };
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }
      const delay = delays[attempt] || 8000;
      console.log(`⚠️  API call failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Failed to call Claude API after all retries");
}

/**
 * Parse purchase receipt from email content using Claude AI
 */
export async function parseReceiptWithAI(
  emailSubject: string,
  emailBody: string,
  emailFrom?: string
): Promise<ParsedPurchase> {
  // Smart HTML extraction to reduce token usage
  const MAX_LENGTH = 30000;
  const isHTML = emailBody.trim().startsWith('<') || emailBody.includes('<!DOCTYPE') || emailBody.includes('<html');

  let extractedBody: string;
  let extractionMethod: string;

  if (isHTML) {
    const smartExtracted = extractOrderDetailsFromHTML(emailBody, MAX_LENGTH);

    // Fallback: If smart extraction is too aggressive (< 15% of original or < 8000 chars),
    // use basic HTML stripping to preserve more content
    const reductionRatio = smartExtracted.length / emailBody.length;
    if (reductionRatio < 0.15 || smartExtracted.length < 8000) {
      console.log(`⚠️  Smart HTML extraction too aggressive (${smartExtracted.length} chars from ${emailBody.length}), falling back to full HTML stripping`);
      // Basic HTML stripping that preserves all text
      const fullTextExtracted = emailBody
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      extractedBody = fullTextExtracted.length > MAX_LENGTH
        ? fullTextExtracted.substring(0, MAX_LENGTH)
        : fullTextExtracted;
      extractionMethod = 'full HTML stripping (smart extraction fallback)';
    } else {
      extractedBody = smartExtracted;
      extractionMethod = 'smart HTML extraction';
    }
  } else {
    extractedBody = emailBody.length > MAX_LENGTH
      ? emailBody.substring(0, MAX_LENGTH)
      : emailBody;
    extractionMethod = 'full text';
  }

  // Extract product images separately (works for all extraction methods)
  let productImages: Array<{url: string, alt: string, context: string}> = [];
  if (isHTML) {
    productImages = extractProductImages(emailBody);

    // Append product images to extracted body so AI can match them to products
    if (productImages.length > 0) {
      extractedBody += '\n\nPRODUCT IMAGES:\n';
      productImages.forEach(img => {
        extractedBody += `<img src="${img.url}" alt="${img.alt}" context="${img.context}">\n`;
      });
    }
  }

  const bodyLength = extractedBody.length;
  const originalLength = emailBody.length;
  const reduction = originalLength > bodyLength ? ` (reduced from ${originalLength} chars)` : '';

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
${extractedBody}

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
      "brand": "brand from email or null",
      "imageUrl": "full URL to product image from email or null (look for <img src=...> tags near product name)"
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
8. Extract product image URLs when available:
   - Look for <img src="..."> tags in the "PRODUCT IMAGES:" section at the end of the email
   - Match images to products by:
     * Checking if the image's "alt" attribute contains the product name, brand, or color
     * Checking if the image's "context" field contains text near the product in the email
     * Using image position/order (first image likely matches first product, etc.)
   - Extract the FULL URL from the src attribute (must start with http:// or https://)
   - For each product item, try to find a matching image and include its URL in imageUrl field
   - If multiple images match a product, use the first/best match
   - If no clear image match for a product, use null (do not make up URLs or reuse images)
   - Priority matching order:
     1. Alt text contains exact product name
     2. Alt text contains brand + product type (e.g., "Nike shoes")
     3. Context text contains product name
     4. Sequential matching (1st image → 1st product)

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
    "brand": "[ACTUAL BRAND FROM THIS EMAIL or null]",
    "imageUrl": "[ACTUAL IMAGE URL FROM THIS EMAIL or null]"
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

    // Determine model: use Haiku by default, Sonnet as fallback
    const preferredModel = process.env.CLAUDE_MODEL === 'sonnet' 
      ? "claude-sonnet-4-5-20250929"
      : "claude-3-haiku-20240307";
    
    console.log(`Using Claude ${preferredModel.includes('haiku') ? 'Haiku' : 'Sonnet 4.5'} for receipt parsing`);
    console.log(`=== EMAIL BEING PARSED ===`);
    console.log(`From: ${emailFrom || 'Unknown sender'}`);
    console.log(`Subject: ${emailSubject}`);
    console.log(`Body: ${extractionMethod}${reduction}, sending ${bodyLength} chars to AI`);
    console.log(`Body preview (first 800 chars):`);
    console.log(extractedBody.substring(0, 800));
    if (bodyLength > 800) {
      console.log(`... (truncated) ...`);
    }
    console.log(`========================`);

    const systemMessage = "You are a strict data extraction tool. Extract ONLY what you see in the email provided. DO NOT reuse examples, templates, or data from previous emails. Each email is completely independent. If you cannot find specific items with names and prices in THIS email, return an empty items array.";

    // Call API with retry logic
    let result = await callClaudeAPI(prompt, preferredModel, systemMessage);
    let content = result.content;
    let modelUsed = result.modelUsed;

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
      let parsed = JSON.parse(jsonText) as ParsedPurchase;

      // CRITICAL: Check for cross-contamination - order number mismatch indicates AI is mixing emails
      // Extract order number from email subject/body to verify
      // More precise regex: look for order #, order number, or # followed by alphanumeric order ID
      // Avoid matching CSS/HTML words like "CONFIRMATION", "OUTLOOK", etc.
      const orderNumberPatterns = [
        /(?:order\s*#|order\s*number|#)\s*([A-Z0-9\-]{4,})/i,
        /order[:\s]+([A-Z0-9]{6,})/i, // Order: 12345678 (at least 6 chars)
        /#([A-Z0-9]{4,})/i, // #1234 (standalone #)
      ];
      
      let emailOrderNumber: string | undefined;
      for (const pattern of orderNumberPatterns) {
        const match = (emailSubject + ' ' + extractedBody.substring(0, 1000)).match(pattern);
        if (match && match[1]) {
          const candidate = match[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
          // Reject common HTML/CSS words that might be matched
          const invalidWords = ['CONFIRMATION', 'OUTLOOK', 'BROWSER', 'VIEW', 'CLICK', 'EMAIL', 'SUBJECT', 'BODY', 'STYLE', 'SCRIPT'];
          if (candidate.length >= 4 && !invalidWords.includes(candidate) && !candidate.match(/^[A-Z]{10,}$/)) {
            emailOrderNumber = candidate;
            break;
          }
        }
      }
      
      if (parsed.orderNumber && emailOrderNumber) {
        const parsedOrderNumberClean = parsed.orderNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (parsedOrderNumberClean !== emailOrderNumber && parsedOrderNumberClean.length > 3 && emailOrderNumber.length > 3) {
          console.log(`⚠️  WARNING: Order number mismatch! Email has "${emailOrderNumber}" but AI extracted "${parsed.orderNumber}"`);
          console.log(`   This indicates AI cross-contamination - clearing items to prevent wrong data`);
          parsed.items = [];
        }
      }

      // Fallback to Sonnet if Haiku returned empty items but there's an order confirmation
      if (modelUsed.includes('haiku') && 
          (!parsed.items || parsed.items.length === 0) && 
          (parsed.orderNumber || parsed.store)) {
        console.log(`⚠️  Haiku returned no items but found order confirmation, trying Sonnet 4.5 for better extraction...`);
        try {
          const sonnetResult = await callClaudeAPI(prompt, "claude-sonnet-4-5-20250929", systemMessage, 1);
          const sonnetContent = sonnetResult.content;
          let sonnetJsonText = sonnetContent.trim();
          if (sonnetJsonText.startsWith("```")) {
            sonnetJsonText = sonnetJsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
          }
          sonnetJsonText = sonnetJsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
          const sonnetParsed = JSON.parse(sonnetJsonText) as ParsedPurchase;
          
          // Check order number match for Sonnet result too
          if (sonnetParsed.orderNumber && emailOrderNumber) {
            const sonnetOrderNumberClean = sonnetParsed.orderNumber.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (sonnetOrderNumberClean !== emailOrderNumber && sonnetOrderNumberClean.length > 3 && emailOrderNumber.length > 3) {
              console.log(`⚠️  Sonnet also has order number mismatch, rejecting`);
              sonnetParsed.items = [];
            }
          }
          
          // Only use Sonnet result if it found items
          if (sonnetParsed.items && sonnetParsed.items.length > 0) {
            console.log(`✅ Sonnet found ${sonnetParsed.items.length} item(s), using Sonnet result`);
            parsed = sonnetParsed;
            modelUsed = "claude-sonnet-4-5-20250929";
            content = sonnetContent;
          } else {
            console.log(`⚠️  Sonnet also returned no items, using Haiku result`);
          }
        } catch (fallbackError) {
          console.log(`⚠️  Sonnet fallback failed, using Haiku result:`, fallbackError);
        }
      }

      console.log(`=== AI PARSED RESULT (using ${modelUsed.includes('haiku') ? 'Haiku' : 'Sonnet 4.5'}) ===`);
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
        // Exception: "Banana Republic" is a clothing store, not a restaurant
        if (storeLower === 'banana republic') {
          return true; // Allow Banana Republic (it's a clothing store)
        }

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

        // CRITICAL: Brand-Sender Mismatch Detection
        // If email is from a specific brand, reject items from obviously different brands
        // This prevents AI from extracting Nordstrom items from a Grace Eleyae email
        if (emailFrom && item.brand) {
          // Extract domain more intelligently - get the actual brand domain, not subdomain
          // e.g., info@info.levi.com -> "levi", not "info"
          const domainMatch = emailFrom.match(/@([^.]+\.)*([^.]+)\.([^.]+)/);
          const emailDomainForBrandCheck = domainMatch 
            ? (domainMatch[2]?.toLowerCase() || domainMatch[1]?.replace(/\.$/, '').toLowerCase() || emailFrom.match(/@([^.]+)/)?.[1]?.toLowerCase())
            : emailFrom.match(/@([^.]+)/)?.[1]?.toLowerCase();
          
          const itemBrandLower = item.brand.toLowerCase().replace(/['\s]/g, ''); // "Lands' End" -> "landsend"
          const storeLower = parsed.store?.toLowerCase().replace(/['\s]/g, '') || '';

          // If email is from a specific clothing brand, items should match that brand or be from a marketplace
          // Marketplaces (Amazon, Nordstrom, etc.) can have items from any brand
          const marketplaces = ['amazon', 'nordstrom', 'macys', 'macy', 'target', 'walmart', 'asos', 'zappos', 'shopify'];
          const isMarketplaceEmail = marketplaces.some(m => emailDomainForBrandCheck?.includes(m) || storeLower.includes(m));

          // Check if email sender is a specific brand (not a marketplace)
          if (emailDomainForBrandCheck && !isMarketplaceEmail) {
            // Check if domain matches brand (handle subdomains like info.levi.com -> levi)
            // Also check all parts of the domain (e.g., "info.levi.com" contains "levi")
            const domainParts = emailFrom.match(/@([^>]+)/)?.[1]?.toLowerCase().split('.') || [];
            const domainContainsBrand = domainParts.some(part => 
              itemBrandLower.includes(part) || part.includes(itemBrandLower) ||
              storeLower.includes(part) || part.includes(storeLower)
            );
            
            // Email sender brand should roughly match item brand OR store name
            const senderBrandMatches = itemBrandLower.includes(emailDomainForBrandCheck) ||
                                      emailDomainForBrandCheck.includes(itemBrandLower) ||
                                      storeLower.includes(emailDomainForBrandCheck) ||
                                      emailDomainForBrandCheck.includes(storeLower) ||
                                      domainContainsBrand;

            // Special case: "levi.com" or "info.levi.com" should match "Levi's"
            const normalizedDomain = emailDomainForBrandCheck.replace(/s$/, '');
            const normalizedBrand = itemBrandLower.replace(/s$/, '');
            const normalizedStore = storeLower.replace(/s$/, '');
            const normalizedMatches = normalizedBrand.includes(normalizedDomain) ||
                                     normalizedDomain.includes(normalizedBrand) ||
                                     normalizedStore.includes(normalizedDomain) ||
                                     normalizedDomain.includes(normalizedStore) ||
                                     domainParts.some(part => {
                                       const normalizedPart = part.replace(/s$/, '');
                                       return normalizedBrand.includes(normalizedPart) || normalizedPart.includes(normalizedBrand) ||
                                              normalizedStore.includes(normalizedPart) || normalizedPart.includes(normalizedStore);
                                     });

            if (!senderBrandMatches && !normalizedMatches) {
              console.log(`❌ REJECTED - Brand mismatch: Email from "${emailFrom}" but item brand is "${item.brand}"`);
              console.log(`   This indicates AI cross-contamination (extracting items from wrong email)`);
              console.log(`   Email domain: ${emailDomainForBrandCheck}, Domain parts: ${domainParts.join(', ')}, Item brand: ${itemBrandLower}, Store: ${storeLower}`);
              return false;
            }
          }
        }

        // Strip HTML tags and decode HTML entities for better text matching
        // This is critical because most order confirmation emails are HTML
        // Also extract text from alt attributes, data attributes, and other HTML attributes
        // IMPORTANT: Use extractedBody (what AI saw) instead of emailBody for consistency
        let cleanEmailBody = extractedBody
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
          
          // Check if email sender domain matches brand (e.g., @levi.com or @info.levi.com matches "Levi's")
          if (emailDomain) {
            const brandWithoutApostrophe = brandLower.replace(/'/g, '');
            // Extract all domain parts to check subdomains (e.g., "info.levi.com" -> ["info", "levi", "com"])
            const domainParts = emailFrom?.match(/@([^>]+)/)?.[1]?.toLowerCase().split('.') || [];
            
            senderMatchesBrand = emailDomain.includes(brandWithoutApostrophe) || 
                               brandWithoutApostrophe.includes(emailDomain) ||
                               // Check if any domain part matches brand (handles subdomains)
                               domainParts.some(part => 
                                 part.includes(brandWithoutApostrophe) || brandWithoutApostrophe.includes(part) ||
                                 (part === 'levi' || part === 'levis') && brandLower.includes('levi')
                               );
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
        if (result.orderNumber || result.store) {
          console.log('⚠️  WARNING: AI found order confirmation (order number or store) but NO ITEMS');
          console.log('   This could mean:');
          console.log(`   1. Item details are beyond the ${MAX_LENGTH.toLocaleString()} character limit (or not in extracted section)`);
          console.log('   2. Email is a shipping/tracking notification (no itemized list)');
          console.log('   3. Email says "click to view order" without showing items');
          console.log('   4. HTML structure is too complex for AI to parse');
          console.log(`   Order: ${result.orderNumber || 'N/A'}, Store: ${result.store || 'N/A'}`);
          console.log(`   Extraction method: ${extractionMethod}, Model used: ${modelUsed.includes('haiku') ? 'Haiku' : 'Sonnet 4.5'}`);
        } else {
          console.log('No clothing items found in email (not an order confirmation)');
        }
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
