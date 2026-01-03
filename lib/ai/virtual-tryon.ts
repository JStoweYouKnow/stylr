/**
 * Virtual Try-On functionality
 * Integrates with various virtual try-on APIs to show users wearing outfits
 */

import Replicate from 'replicate';
import { prisma } from '@/lib/db';

export interface VirtualTryOnResult {
  imageUrl: string;
  provider: 'replicate' | 'fashable' | 'ootd';
  processingTime: number;
}

/**
 * Virtual Try-On using OOTDiffusion (Open-source, via Replicate)
 * This is the recommended approach for MVP
 * 
 * @param personImageUrl - URL to person's photo or avatar
 * @param garmentImageUrl - URL to garment image
 * @param options - Try-on options including category and description
 */
export async function generateVirtualTryOn(
  personImageUrl: string,
  garmentImageUrl: string,
  options?: {
    category?: 'upper_body' | 'lower_body' | 'dresses';
    garmentDescription?: string;
    useAvatar?: boolean;
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
 * Filters out accessories automatically
 */
export async function tryOnMultipleItems(
  personImageUrl: string,
  garments: Array<{
    imageUrl: string;
    category: 'upper_body' | 'lower_body' | 'dresses' | null;
    type?: string;
  }>
): Promise<VirtualTryOnResult[]> {
  const results: VirtualTryOnResult[] = [];

  // Filter out accessories (null category)
  const tryOnableGarments = garments.filter(g => g.category !== null);

  if (tryOnableGarments.length === 0) {
    console.warn('No try-onable items found, all items are accessories');
    return results;
  }

  // Try on items sequentially (could be parallelized for different categories)
  for (const garment of tryOnableGarments) {
    try {
      const result = await generateVirtualTryOn(
        personImageUrl,
        garment.imageUrl,
        { category: garment.category! } // Safe to assert since we filtered
      );
      results.push(result);

      // Use the result as the new base for the next item
      personImageUrl = result.imageUrl;
    } catch (error) {
      console.error(`Failed to try on ${garment.type || garment.category}:`, error);
      // Continue with other items even if one fails
    }
  }

  return results;
}

/**
 * Determine garment category from clothing type
 * Returns null for accessories (hats, bags, etc.) that cannot be tried on
 */
export function getGarmentCategory(clothingType: string | null): 'upper_body' | 'lower_body' | 'dresses' | null {
  if (!clothingType) {
    return 'upper_body'; // Default fallback
  }

  const type = clothingType.toLowerCase();

  // Check for accessories first - these cannot be tried on with OOTDiffusion
  if (
    type.includes('hat') ||
    type.includes('cap') ||
    type.includes('beanie') ||
    type.includes('fedora') ||
    type.includes('snapback') ||
    type.includes('beret') ||
    type.includes('bag') ||
    type.includes('backpack') ||
    type.includes('purse') ||
    type.includes('belt') ||
    type.includes('sunglasses') ||
    type.includes('jewelry') ||
    type.includes('watch') ||
    type.includes('scarf') ||
    type === 'accessory' ||
    type.includes('accessory')
  ) {
    return null; // Accessories cannot be tried on
  }

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
    type.includes('cardigan') ||
    type.includes('vest')
  ) {
    return 'upper_body';
  }

  if (
    type.includes('pants') ||
    type.includes('jeans') ||
    type.includes('shorts') ||
    type.includes('skirt') ||
    type.includes('leggings') ||
    type.includes('trousers') ||
    type.includes('joggers') ||
    type.includes('chinos')
  ) {
    return 'lower_body';
  }

  // Default to upper_body if unsure
  return 'upper_body';
}

/**
 * Get user's avatar URL if available
 */
export async function getUserAvatar(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarImageUrl: true },
    });
    return user?.avatarImageUrl || null;
  } catch (error) {
    console.error('Failed to get user avatar:', error);
    return null;
  }
}

/**
 * Generate virtual try-on with optional avatar fallback
 * If userId is provided and no personImageUrl, will attempt to use saved avatar
 */
export async function generateVirtualTryOnWithAvatar(
  garmentImageUrl: string,
  options: {
    personImageUrl?: string;
    userId?: string;
    category?: 'upper_body' | 'lower_body' | 'dresses';
    garmentDescription?: string;
  }
): Promise<VirtualTryOnResult> {
  let personImageUrl = options.personImageUrl;

  // If no person image provided but userId is available, try to use avatar
  if (!personImageUrl && options.userId) {
    console.log('No person image provided, checking for saved avatar...');
    const avatarUrl = await getUserAvatar(options.userId);
    if (avatarUrl) {
      console.log('✓ Using saved avatar for virtual try-on');
      personImageUrl = avatarUrl;
    } else {
      throw new Error('No person image or saved avatar available. Please upload a photo or create an avatar first.');
    }
  }

  if (!personImageUrl) {
    throw new Error('Person image URL is required for virtual try-on');
  }

  return generateVirtualTryOn(personImageUrl, garmentImageUrl, {
    category: options.category,
    garmentDescription: options.garmentDescription,
    useAvatar: !!options.userId && !options.personImageUrl,
  });
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
