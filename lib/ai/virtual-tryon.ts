/**
 * Virtual Try-On functionality
 * Integrates with various virtual try-on APIs to show users wearing outfits
 */

import Replicate from 'replicate';

export interface VirtualTryOnResult {
  imageUrl: string;
  provider: 'replicate' | 'fashable' | 'ootd';
  processingTime: number;
}

/**
 * Virtual Try-On using OOTDiffusion (Open-source, via Replicate)
 * This is the recommended approach for MVP
 */
export async function generateVirtualTryOn(
  personImageUrl: string,
  garmentImageUrl: string,
  options?: {
    category?: 'upper_body' | 'lower_body' | 'dresses';
    garmentDescription?: string;
  }
): Promise<VirtualTryOnResult> {
  const startTime = Date.now();

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    console.log('Starting virtual try-on with OOTDiffusion...');

    // Using OOTDiffusion model (open-source virtual try-on)
    const output = await replicate.run(
      "cuuupid/ootd:36b75ab7d2c1e7f3bf42b638091e0d779bbfc7ddf0a4cf82b7ca97a234a4ba2e",
      {
        input: {
          model_image: personImageUrl,
          cloth_image: garmentImageUrl,
          category: options?.category || 'upper_body',
          num_inference_steps: 20,
          guidance_scale: 2.0,
        }
      }
    );

    const processingTime = Date.now() - startTime;

    console.log(`Virtual try-on completed in ${processingTime}ms`);

    // Handle both string and array responses
    const imageUrl = Array.isArray(output) ? output[0] : (output as unknown as string);

    return {
      imageUrl,
      provider: 'replicate',
      processingTime,
    };
  } catch (error) {
    console.error('Virtual try-on error:', error);
    throw new Error(`Failed to generate virtual try-on: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Try on multiple garments in sequence
 */
export async function tryOnMultipleItems(
  personImageUrl: string,
  garments: Array<{
    imageUrl: string;
    category: 'upper_body' | 'lower_body' | 'dresses';
  }>
): Promise<VirtualTryOnResult[]> {
  const results: VirtualTryOnResult[] = [];

  // Try on items sequentially (could be parallelized for different categories)
  for (const garment of garments) {
    try {
      const result = await generateVirtualTryOn(
        personImageUrl,
        garment.imageUrl,
        { category: garment.category }
      );
      results.push(result);

      // Use the result as the new base for the next item
      personImageUrl = result.imageUrl;
    } catch (error) {
      console.error(`Failed to try on ${garment.category}:`, error);
      // Continue with other items even if one fails
    }
  }

  return results;
}

/**
 * Determine garment category from clothing type
 */
export function getGarmentCategory(clothingType: string): 'upper_body' | 'lower_body' | 'dresses' {
  const type = clothingType.toLowerCase();

  if (type.includes('dress') || type.includes('jumpsuit')) {
    return 'dresses';
  }

  if (
    type.includes('shirt') ||
    type.includes('blouse') ||
    type.includes('top') ||
    type.includes('sweater') ||
    type.includes('jacket') ||
    type.includes('coat') ||
    type.includes('hoodie') ||
    type.includes('cardigan')
  ) {
    return 'upper_body';
  }

  if (
    type.includes('pants') ||
    type.includes('jeans') ||
    type.includes('shorts') ||
    type.includes('skirt') ||
    type.includes('leggings') ||
    type.includes('trousers')
  ) {
    return 'lower_body';
  }

  // Default to upper_body if unsure
  return 'upper_body';
}

/**
 * Validate image URL is accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return response.ok && (contentType?.startsWith('image/') ?? false);
  } catch {
    return false;
  }
}
