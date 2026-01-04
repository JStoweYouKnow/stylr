/**
 * Product Search Service
 * Uses Google Custom Search API to find products online based on brand/product info
 * Similar to dupe.com's product identification logic
 */

export interface ProductSearchResult {
  storefrontUrl: string;
  title: string;
  imageUrl?: string;
  price?: string;
  confidence: number; // 0-1, how confident we are this is the right product
}

export interface ProductSearchOptions {
  brand?: string | null;
  productName?: string | null;
  type?: string;
  color?: string;
  features?: string[];
}

/**
 * Search for product using Google Custom Search API
 * Falls back to Serper API if Google Custom Search not configured
 */
export async function searchProduct(
  options: ProductSearchOptions
): Promise<ProductSearchResult | null> {
  const { brand, productName, type, color, features = [] } = options;

  // Build search query
  const searchQuery = buildSearchQuery({ brand, productName, type, color, features });

  console.log(`Searching for product: "${searchQuery}"`);

  // Try Google Custom Search first
  if (process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    try {
      const result = await searchWithGoogleCustomSearch(searchQuery);
      if (result) return result;
    } catch (error) {
      console.error("Google Custom Search failed:", error);
    }
  }

  // Fallback to Serper API if available
  if (process.env.SERPER_API_KEY) {
    try {
      const result = await searchWithSerper(searchQuery);
      if (result) return result;
    } catch (error) {
      console.error("Serper API failed:", error);
    }
  }

  // If no search API configured, return null
  console.warn("No product search API configured. Set GOOGLE_CUSTOM_SEARCH_API_KEY or SERPER_API_KEY");
  return null;
}

/**
 * Build search query from product information
 */
function buildSearchQuery(options: ProductSearchOptions): string {
  const { brand, productName, type, color, features = [] } = options;
  const parts: string[] = [];

  // Prioritize brand + product name if available
  if (brand && productName) {
    return `${brand} ${productName}`;
  }

  // Brand + type + color
  if (brand) {
    parts.push(brand);
  }

  if (type) {
    parts.push(type);
  }

  if (color) {
    parts.push(color);
  }

  // Add distinctive features
  if (features.length > 0) {
    parts.push(...features.slice(0, 2)); // Limit to 2 features
  }

  return parts.join(" ");
}

/**
 * Search using Google Custom Search API
 */
async function searchWithGoogleCustomSearch(
  query: string
): Promise<ProductSearchResult | null> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY!;
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID!;

  const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${engineId}&q=${encodeURIComponent(query)}&searchType=image`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google Custom Search API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    return null;
  }

  // Get the first result (most relevant)
  const item = data.items[0];

  // Try to find a shopping result (product page) rather than just an image
  // For now, we'll use the image link and try to extract the source URL
  const storefrontUrl = item.image?.contextLink || item.link || item.displayLink;

  return {
    storefrontUrl,
    title: item.title,
    imageUrl: item.link,
    confidence: 0.7, // Moderate confidence for image search
  };
}

/**
 * Search using Serper API (alternative to Google Custom Search)
 */
async function searchWithSerper(query: string): Promise<ProductSearchResult | null> {
  const apiKey = process.env.SERPER_API_KEY!;

  const response = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      num: 5, // Get top 5 results
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.shopping || data.shopping.length === 0) {
    return null;
  }

  // Get the first shopping result
  const product = data.shopping[0];

  return {
    storefrontUrl: product.link,
    title: product.title,
    imageUrl: product.imageUrl,
    price: product.price,
    confidence: 0.8, // Higher confidence for shopping-specific results
  };
}

/**
 * Search for exact product match first, then similar products
 */
export async function searchProductWithFallback(
  options: ProductSearchOptions
): Promise<ProductSearchResult | null> {
  // First try: exact match (brand + product name)
  if (options.brand && options.productName) {
    const exactMatch = await searchProduct({
      brand: options.brand,
      productName: options.productName,
    });
    if (exactMatch && exactMatch.confidence > 0.7) {
      return exactMatch;
    }
  }

  // Second try: brand + type + color
  if (options.brand) {
    const brandMatch = await searchProduct({
      brand: options.brand,
      type: options.type,
      color: options.color,
      features: options.features,
    });
    if (brandMatch && brandMatch.confidence > 0.6) {
      return brandMatch;
    }
  }

  // Third try: type + color + features (similar product)
  const similarMatch = await searchProduct({
    type: options.type,
    color: options.color,
    features: options.features,
  });

  return similarMatch;
}

