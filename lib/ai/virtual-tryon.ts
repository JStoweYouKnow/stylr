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
    // Note: This model only supports upper body garments
    const output = await replicate.run(
      "viktorfa/oot_diffusion:9f8fa4956970dde99689af7488157a30aa152e23953526a605df1d77598343d7",
      {
        input: {
          model_image: personImageUrl,
          garment_image: garmentImageUrl,
          steps: 20,
          guidance_scale: 2.0,
          seed: 0,
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
 * Determine garment category from clothing type or layering category
 * Returns null for items that cannot be tried on
 *
 * IMPORTANT: Current OOTDiffusion model ONLY supports upper body garments (tops, jackets)
 * Lower body garments and dresses are NOT supported and will return null
 */
export function getGarmentCategory(
  clothingType: string | null,
  layeringCategory?: string | null
): 'upper_body' | 'lower_body' | 'dresses' | null {
  // First check layering category (new system)
  if (layeringCategory) {
    const layer = layeringCategory.toLowerCase();
    if (layer === 'top' || layer === 'jacket') {
      return 'upper_body';
    }
    // OOTDiffusion does NOT support lower body or accessories
    if (layer === 'bottom' || layer === 'shoes' || layer === 'accessories') {
      return null; // Cannot be tried on
    }
  }

  // Fallback to type-based detection
  if (!clothingType) {
    return 'upper_body'; // Default fallback
  }

  const type = clothingType.toLowerCase();

  // Check for items that CANNOT be tried on with OOTDiffusion:
  // 1. Accessories (hats, bags, shoes, jewelry, etc.)
  // 2. Lower body garments (pants, skirts, etc.) - NOT SUPPORTED by current model
  // 3. Dresses - NOT SUPPORTED by current model
  if (
    // Accessories
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
    type.includes('shoes') ||
    type.includes('sneakers') ||
    type.includes('boots') ||
    type.includes('sandals') ||
    type.includes('heels') ||
    type.includes('flats') ||
    type === 'accessory' ||
    type === 'accessories' ||
    type.includes('accessory') ||
    // Lower body (NOT SUPPORTED)
    type.includes('pants') ||
    type.includes('jeans') ||
    type.includes('shorts') ||
    type.includes('skirt') ||
    type.includes('leggings') ||
    type.includes('trousers') ||
    type.includes('joggers') ||
    type.includes('chinos') ||
    // Dresses (NOT SUPPORTED)
    type.includes('dress') ||
    type.includes('jumpsuit')
  ) {
    return null; // Cannot be tried on with current model
  }

  // Only upper body garments are supported
  if (
    type.includes('shirt') ||
    type.includes('blouse') ||
    type.includes('top') ||
    type.includes('sweater') ||
    type.includes('jacket') ||
    type.includes('coat') ||
    type.includes('hoodie') ||
    type.includes('cardigan') ||
    type.includes('vest') ||
    type.includes('tee') ||
    type.includes('polo')
  ) {
    return 'upper_body';
  }

  // Default to null if unsure (safer than trying unsupported garments)
  return null;
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
