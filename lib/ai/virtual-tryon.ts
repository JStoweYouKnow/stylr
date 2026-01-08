/**
 * Virtual Try-On functionality
 * Integrates with various virtual try-on APIs to show users wearing outfits
 */

import Replicate from 'replicate';
import { prisma } from '@/lib/db';
import { Client } from '@gradio/client';

export interface VirtualTryOnResult {
  imageUrl: string;
  provider: 'replicate' | 'fashable' | 'ootd' | 'outfitanyone';
  processingTime: number;
}

/**
 * Virtual Try-On using IDM-VTON (ECCV 2024, via Replicate)
 * Supports upper body, lower body, and dresses
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
    // Validate inputs before making API call
    if (!personImageUrl || typeof personImageUrl !== 'string') {
      throw new Error(`Invalid person image URL: ${personImageUrl}`);
    }
    if (!garmentImageUrl || typeof garmentImageUrl !== 'string') {
      throw new Error(`Invalid garment image URL: ${garmentImageUrl}`);
    }

    console.log('Starting virtual try-on with IDM-VTON...');
    console.log('Person image:', personImageUrl);
    console.log('Garment image:', garmentImageUrl);
    console.log('Category:', options?.category || 'upper_body');

    // Using IDM-VTON model (ECCV 2024 - supports upper, lower, and dresses)
    const output = await replicate.run(
      "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985",
      {
        input: {
          human_img: personImageUrl,
          garm_img: garmentImageUrl,
          category: options?.category || 'upper_body',
          garment_des: `A ${options?.category?.replace('_', ' ')} garment`,
          steps: 30,
          seed: 42,
        }
      }
    );

    const processingTime = Date.now() - startTime;

    console.log(`Virtual try-on completed in ${processingTime}ms`);
    console.log('Raw output type:', typeof output);
    console.log('Raw output:', JSON.stringify(output).substring(0, 200));

    // Handle different output formats from Replicate
    let imageUrl: string;

    if (Array.isArray(output)) {
      // If array, get first element which should be a string URL
      imageUrl = String(output[0]);
    } else if (typeof output === 'string') {
      // If already a string
      imageUrl = output;
    } else {
      // If it's an object or anything else, convert to string
      // IDM-VTON returns a simple string URL, not an object
      imageUrl = String(output);
    }

    // Validate the extracted URL is actually a URL string
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.error('Invalid URL extracted:', imageUrl);
      throw new Error(`Invalid image URL format: ${imageUrl.substring(0, 100)}`);
    }

    console.log('Extracted image URL:', imageUrl);

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
 * Returns null for accessories that cannot be tried on
 *
 * IDM-VTON supports: upper_body, lower_body, and dresses
 * Does NOT support: shoes, bags, hats, jewelry, and other accessories
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
    if (layer === 'bottom') {
      return 'lower_body';
    }
    // Accessories and shoes cannot be tried on
    if (layer === 'shoes' || layer === 'accessories') {
      return null;
    }
  }

  // Fallback to type-based detection
  if (!clothingType) {
    return 'upper_body'; // Default fallback
  }

  const type = clothingType.toLowerCase();

  // Accessories that CANNOT be tried on with IDM-VTON
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
    type.includes('shoes') ||
    type.includes('sneakers') ||
    type.includes('boots') ||
    type.includes('sandals') ||
    type.includes('heels') ||
    type.includes('flats') ||
    type === 'accessory' ||
    type === 'accessories' ||
    type.includes('accessory')
  ) {
    return null; // Accessories cannot be tried on
  }

  // Dresses and jumpsuits
  if (type.includes('dress') || type.includes('jumpsuit')) {
    return 'dresses';
  }

  // Upper body garments
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

  // Lower body garments
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

/**
 * Virtual Try-On using OutfitAnyone (Hugging Face)
 * Supports complete outfits with top + bottom garments
 *
 * @param personImageUrl - URL to person's photo or avatar
 * @param topGarmentUrl - URL to top garment image (jacket, shirt, etc.)
 * @param bottomGarmentUrl - URL to bottom garment image (pants, skirt, etc.) - optional
 */
export async function generateOutfitAnyoneTryOn(
  personImageUrl: string,
  topGarmentUrl: string | null,
  bottomGarmentUrl: string | null
): Promise<VirtualTryOnResult> {
  const startTime = Date.now();

  try {
    // Validate inputs
    if (!personImageUrl || typeof personImageUrl !== 'string') {
      throw new Error(`Invalid person image URL: ${personImageUrl}`);
    }

    console.log('Starting virtual try-on with OutfitAnyone...');
    console.log('Person image:', personImageUrl);
    console.log('Top garment:', topGarmentUrl || 'none');
    console.log('Bottom garment:', bottomGarmentUrl || 'none');

    // Fetch images as blobs
    const personBlob = await fetch(personImageUrl).then(r => r.blob());

    // OutfitAnyone requires both garment1 and garment2
    // If we don't have both, use a transparent/dummy image or the same image
    const topBlob = topGarmentUrl
      ? await fetch(topGarmentUrl).then(r => r.blob())
      : personBlob; // Use person image as fallback if no top provided

    const bottomBlob = bottomGarmentUrl
      ? await fetch(bottomGarmentUrl).then(r => r.blob())
      : personBlob; // Use person image as fallback if no bottom provided

    console.log('Connecting to OutfitAnyone API...');
    const client = await Client.connect("HumanAIGC/OutfitAnyone");

    console.log('Sending request to OutfitAnyone...');
    const result = await client.predict("/get_tryon_result", {
      model_name: personBlob,  // Person image
      garment1: topBlob,       // Top garment
      garment2: bottomBlob,    // Bottom garment
    });

    const processingTime = Date.now() - startTime;

    console.log(`OutfitAnyone completed in ${processingTime}ms`);
    console.log('Result:', result);

    // Extract image URL from result
    // The result.data should contain the output image URL or path
    let imageUrl: string;

    if (typeof result.data === 'string') {
      imageUrl = result.data;
    } else if (Array.isArray(result.data) && result.data.length > 0) {
      imageUrl = result.data[0];
    } else if (result.data && typeof result.data === 'object' && 'url' in result.data) {
      imageUrl = (result.data as any).url;
    } else {
      throw new Error(`Unexpected result format: ${JSON.stringify(result.data)}`);
    }

    // If the URL is a Hugging Face file path, construct the full URL
    if (imageUrl.startsWith('/file=')) {
      imageUrl = `https://humanaigc-outfitanyone.hf.space${imageUrl}`;
    } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      // If it's a relative path, construct full URL
      imageUrl = `https://humanaigc-outfitanyone.hf.space/file=${imageUrl}`;
    }

    console.log('Extracted image URL:', imageUrl);

    return {
      imageUrl,
      provider: 'outfitanyone',
      processingTime,
    };
  } catch (error) {
    console.error('OutfitAnyone error:', error);
    throw new Error(`Failed to generate OutfitAnyone try-on: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper function to select the best garment when multiple items in same category
 * Priority: jacket > cardigan > hoodie > sweater > shirt > t-shirt
 */
export function selectOutermostGarment(garments: Array<{ type: string | null; imageUrl: string }>): string {
  const priorityMap: Record<string, number> = {
    jacket: 100,
    coat: 95,
    blazer: 90,
    cardigan: 80,
    hoodie: 70,
    sweater: 60,
    sweatshirt: 55,
    vest: 50,
    shirt: 40,
    blouse: 35,
    top: 30,
    tee: 20,
    't-shirt': 15,
  };

  // Find garment with highest priority
  let bestGarment = garments[0];
  let bestPriority = 0;

  for (const garment of garments) {
    if (!garment.type) continue;

    const type = garment.type.toLowerCase();

    // Check if type contains any priority keyword
    for (const [keyword, priority] of Object.entries(priorityMap)) {
      if (type.includes(keyword) && priority > bestPriority) {
        bestPriority = priority;
        bestGarment = garment;
      }
    }
  }

  return bestGarment.imageUrl;
}
