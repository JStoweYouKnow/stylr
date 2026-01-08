/**
 * Product Image Extractor
 * Extracts clean product images from storefront URLs
 * Uses multiple strategies: Open Graph tags, Schema.org markup, common selectors
 */

import { uploadToBlob } from "@/lib/blob/upload";
import * as cheerio from "cheerio";

export interface ExtractedProductImage {
  imageUrl: string;
  blobUrl?: string; // If uploaded to blob storage
  source: "og" | "schema" | "selector" | "fallback";
}

/**
 * Extract product image from storefront URL
 */
export async function extractProductImage(
  storefrontUrl: string,
  uploadToBlobStorage: boolean = true
): Promise<ExtractedProductImage | null> {
  try {
    console.log(`Extracting product image from: ${storefrontUrl}`);

    // Fetch the HTML
    const response = await fetch(storefrontUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch storefront: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Strategy 1: Open Graph image
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) {
      console.log("Found Open Graph image");
      const imageUrl = resolveUrl(ogImage, storefrontUrl);
      if (await validateImageUrl(imageUrl)) {
        const result: ExtractedProductImage = {
          imageUrl,
          source: "og",
        };

        if (uploadToBlobStorage) {
          result.blobUrl = await uploadImageToBlob(imageUrl);
        }

        return result;
      }
    }

    // Strategy 2: Schema.org Product image
    const schemaImage = $('script[type="application/ld+json"]')
      .toArray()
      .map((el) => {
        try {
          const json = JSON.parse($(el).html() || "{}");
          if (json["@type"] === "Product" && json.image) {
            return Array.isArray(json.image) ? json.image[0] : json.image;
          }
          return null;
        } catch {
          return null;
        }
      })
      .find((img) => img !== null);

    if (schemaImage) {
      console.log("Found Schema.org product image");
      const imageUrl = resolveUrl(schemaImage, storefrontUrl);
      if (await validateImageUrl(imageUrl)) {
        const result: ExtractedProductImage = {
          imageUrl,
          source: "schema",
        };

        if (uploadToBlobStorage) {
          result.blobUrl = await uploadImageToBlob(imageUrl);
        }

        return result;
      }
    }

    // Strategy 3: Common product image selectors
    const selectors = [
      'img[class*="product"]',
      'img[class*="main"]',
      'img[id*="product"]',
      'img[id*="main"]',
      ".product-image img",
      ".main-image img",
      "#product-image img",
      "#main-image img",
    ];

    for (const selector of selectors) {
      const img = $(selector).first();
      const src = img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src");
      if (src) {
        const imageUrl = resolveUrl(src, storefrontUrl);
        if (await validateImageUrl(imageUrl)) {
          console.log(`Found image using selector: ${selector}`);
          const result: ExtractedProductImage = {
            imageUrl,
            source: "selector",
          };

          if (uploadToBlobStorage) {
            result.blobUrl = await uploadImageToBlob(imageUrl);
          }

          return result;
        }
      }
    }

    // Strategy 4: First large image on page (fallback)
    const images = $("img")
      .toArray()
      .map((img) => {
        const $img = $(img);
        const src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-lazy-src");
        const width = parseInt($img.attr("width") || "0");
        const height = parseInt($img.attr("height") || "0");
        return { src, width, height, area: width * height };
      })
      .filter((img) => img.src && img.area > 200 * 200) // At least 200x200
      .sort((a, b) => b.area - a.area);

    if (images.length > 0) {
      const imageUrl = resolveUrl(images[0].src!, storefrontUrl);
      if (await validateImageUrl(imageUrl)) {
        console.log("Using fallback: largest image on page");
        const result: ExtractedProductImage = {
          imageUrl,
          source: "fallback",
        };

        if (uploadToBlobStorage) {
          result.blobUrl = await uploadImageToBlob(imageUrl);
        }

        return result;
      }
    }

    console.warn("No product image found on storefront");
    return null;
  } catch (error) {
    console.error("Error extracting product image:", error);
    return null;
  }
}

/**
 * Resolve relative URL to absolute URL
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("//")) {
    return `https:${url}`;
  }

  if (url.startsWith("/")) {
    const base = new URL(baseUrl);
    return `${base.origin}${url}`;
  }

  // Relative URL
  const base = new URL(baseUrl);
  return new URL(url, base).href;
}

/**
 * Validate that URL points to a valid image
 */
async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentType = response.headers.get("content-type");
    return (
      response.ok &&
      contentType !== null &&
      (contentType.startsWith("image/") || contentType.includes("image"))
    );
  } catch {
    return false;
  }
}

/**
 * Upload image to Vercel Blob storage
 */
async function uploadImageToBlob(imageUrl: string): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const extension = contentType.split("/")[1] || "jpg";
    const filename = `product-images/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // Create File object
    const blob = new Blob([arrayBuffer], { type: contentType });
    const file = new File([blob], filename, { type: contentType });

    // Upload to blob storage
    const result = await uploadToBlob(file, filename);
    console.log(`Product image uploaded to blob: ${result.url}`);

    return result.url;
  } catch (error) {
    console.error("Failed to upload product image to blob:", error);
    throw error;
  }
}


