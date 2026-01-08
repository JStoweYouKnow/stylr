import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import {
  generateVirtualTryOn,
  tryOnMultipleItems,
  getGarmentCategory,
  validateImageUrl,
  generateOutfitAnyoneTryOn,
  selectOutermostGarment,
} from '@/lib/ai/virtual-tryon';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const itemIds = JSON.parse(formData.get('itemIds') as string);
    const useAvatar = formData.get('useAvatar') === 'true';
    const personImage = formData.get('personImage') as File | null;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs are required' },
        { status: 400 }
      );
    }

    let personImageUrl: string;

    if (useAvatar) {
      // Use saved avatar
      console.log('Using saved avatar for virtual try-on');

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarImageUrl: true },
      });

      if (!user?.avatarImageUrl) {
        return NextResponse.json(
          { error: 'No avatar found. Please upload an avatar in Settings first.' },
          { status: 400 }
        );
      }

      personImageUrl = user.avatarImageUrl;
      console.log('Using avatar:', personImageUrl);
    } else {
      // Upload person image
      if (!personImage) {
        return NextResponse.json(
          { error: 'Person image is required for virtual try-on' },
          { status: 400 }
        );
      }

      const personImageBuffer = await personImage.arrayBuffer();
      const personBlob = await put(
        `tryon/person-${userId}-${Date.now()}.jpg`,
        personImageBuffer,
        {
          access: 'public',
          contentType: personImage.type,
        }
      );

      personImageUrl = personBlob.url;
      console.log('Person image uploaded:', personImageUrl);
    }

    // Check if Replicate API token is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        error: 'Virtual try-on not configured',
        message: 'REPLICATE_API_TOKEN not set in environment variables',
      }, { status: 503 });
    }

    // Fetch full item details including layeringCategory and productImageUrl
    const fullItems = await prisma.clothingItem.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: {
        id: true,
        type: true,
        imageUrl: true,
        productImageUrl: true,
        layeringCategory: true,
      },
      orderBy: {
        type: 'asc', // Order items appropriately for layering
      },
    });

    if (fullItems.length === 0) {
      return NextResponse.json(
        { error: 'No items found' },
        { status: 404 }
      );
    }

    // Validate all garment images are accessible (use product image if available)
    for (const item of fullItems) {
      const imageUrl = item.productImageUrl || item.imageUrl;
      const isValid = await validateImageUrl(imageUrl);
      if (!isValid) {
        return NextResponse.json(
          { error: `Image for ${item.type} (ID: ${item.id}) is not accessible` },
          { status: 400 }
        );
      }
    }

    // Categorize items and separate try-onable items from accessories
    // Use productImageUrl if available, fallback to imageUrl
    const garments = fullItems.map(item => ({
      id: item.id,
      imageUrl: item.productImageUrl || item.imageUrl, // Prefer product image
      category: getGarmentCategory(item.type || 'shirt', item.layeringCategory),
      type: item.type,
    }));

    // Separate try-onable items from accessories
    const tryOnableItems = garments.filter(g => g.category !== null);
    const accessories = garments.filter(g => g.category === null);

    console.log('Trying on garments:', tryOnableItems.map(g => ({ type: g.type, category: g.category })));
    if (accessories.length > 0) {
      console.log('Skipping accessories (cannot be tried on):', accessories.map(a => a.type));
    }

    // If no try-onable items, return error
    if (tryOnableItems.length === 0) {
      return NextResponse.json({
        error: 'No try-onable items found',
        message: 'Virtual try-on supports tops, bottoms, and dresses. Accessories like shoes, bags, hats, and jewelry cannot be tried on.',
        skippedItems: accessories.map(a => ({ id: a.id, type: a.type })),
      }, { status: 400 });
    }

    // Group garments by category
    const upperBodyItems = tryOnableItems.filter(g => g.category === 'upper_body');
    const lowerBodyItems = tryOnableItems.filter(g => g.category === 'lower_body');
    const dresses = tryOnableItems.filter(g => g.category === 'dresses');

    // Track skipped items due to multiple in same category
    const skippedDuplicates: Array<{ id: number; type: string | null; reason: string }> = [];

    // Select best garment from each category
    let selectedTopUrl: string | null = null;
    let selectedTopItem: typeof tryOnableItems[0] | null = null;

    if (upperBodyItems.length > 0) {
      if (upperBodyItems.length > 1) {
        // Multiple upper body items - select outermost layer
        const outermostUrl = selectOutermostGarment(upperBodyItems.map(item => ({
          type: item.type,
          imageUrl: item.imageUrl,
        })));

        selectedTopItem = upperBodyItems.find(item => item.imageUrl === outermostUrl) || upperBodyItems[0];
        selectedTopUrl = outermostUrl;

        // Mark others as skipped
        for (const item of upperBodyItems) {
          if (item.imageUrl !== outermostUrl) {
            skippedDuplicates.push({
              id: item.id,
              type: item.type,
              reason: `Only the outermost layer (${selectedTopItem.type}) can be shown. Virtual try-on models cannot layer multiple upper body items like jacket + shirt together.`,
            });
          }
        }

        console.log(`Multiple upper body items detected. Selected: ${selectedTopItem.type}, Skipped: ${skippedDuplicates.map(s => s.type).join(', ')}`);
      } else {
        selectedTopItem = upperBodyItems[0];
        selectedTopUrl = upperBodyItems[0].imageUrl;
      }
    }

    let selectedBottomUrl: string | null = null;
    let selectedBottomItem: typeof tryOnableItems[0] | null = null;

    if (lowerBodyItems.length > 0) {
      if (lowerBodyItems.length > 1) {
        // Multiple lower body items - just pick first
        selectedBottomItem = lowerBodyItems[0];
        selectedBottomUrl = lowerBodyItems[0].imageUrl;

        for (let i = 1; i < lowerBodyItems.length; i++) {
          skippedDuplicates.push({
            id: lowerBodyItems[i].id,
            type: lowerBodyItems[i].type,
            reason: `Only one lower body item can be shown at a time. Selected: ${selectedBottomItem.type}`,
          });
        }
      } else {
        selectedBottomItem = lowerBodyItems[0];
        selectedBottomUrl = lowerBodyItems[0].imageUrl;
      }
    }

    // Handle dresses (they replace both top and bottom)
    if (dresses.length > 0) {
      if (upperBodyItems.length > 0 || lowerBodyItems.length > 0) {
        console.log('Dress detected - will replace top and bottom items');

        // Mark top/bottom as skipped if dress is present
        if (selectedTopItem) {
          skippedDuplicates.push({
            id: selectedTopItem.id,
            type: selectedTopItem.type,
            reason: 'Cannot show top with dress. Dress replaces entire outfit.',
          });
        }
        if (selectedBottomItem) {
          skippedDuplicates.push({
            id: selectedBottomItem.id,
            type: selectedBottomItem.type,
            reason: 'Cannot show bottom with dress. Dress replaces entire outfit.',
          });
        }
      }

      // Use first dress, mark others as skipped
      const selectedDress = dresses[0];

      for (let i = 1; i < dresses.length; i++) {
        skippedDuplicates.push({
          id: dresses[i].id,
          type: dresses[i].type,
          reason: 'Only one dress can be shown at a time.',
        });
      }

      // For dresses, use IDM-VTON (OutfitAnyone doesn't handle dresses well)
      try {
        const result = await generateVirtualTryOn(
          personImageUrl,
          selectedDress.imageUrl,
          { category: 'dresses' }
        );

        return NextResponse.json({
          finalImageUrl: result.imageUrl,
          provider: 'idm-vton',
          itemsUsed: [{ id: selectedDress.id, type: selectedDress.type, category: 'dresses' }],
          totalProcessingTime: result.processingTime,
          itemsCount: fullItems.length,
          triedOnCount: 1,
          skippedDuplicates: skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
          skippedAccessories: accessories.length > 0 ? accessories.map(a => ({
            id: a.id,
            type: a.type,
            reason: 'Accessories (shoes, bags, hats, jewelry) cannot be tried on. Only clothing items (tops, bottoms, dresses) are supported.',
          })) : [],
        });
      } catch (error) {
        console.error('Failed to try on dress:', error);
        return NextResponse.json({
          error: `Failed to try on ${selectedDress.type}`,
          details: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // If no items to try on after filtering, return error
    if (!selectedTopUrl && !selectedBottomUrl) {
      return NextResponse.json({
        error: 'No valid outfit combination',
        message: 'Please select at least one top or bottom garment.',
      }, { status: 400 });
    }

    // Use OutfitAnyone for complete outfits (top + bottom)
    try {
      console.log(`Using OutfitAnyone with top: ${selectedTopItem?.type || 'none'}, bottom: ${selectedBottomItem?.type || 'none'}`);

      const result = await generateOutfitAnyoneTryOn(
        personImageUrl,
        selectedTopUrl,
        selectedBottomUrl
      );

      const itemsUsed = [];
      if (selectedTopItem) itemsUsed.push({ id: selectedTopItem.id, type: selectedTopItem.type, category: 'upper_body' });
      if (selectedBottomItem) itemsUsed.push({ id: selectedBottomItem.id, type: selectedBottomItem.type, category: 'lower_body' });

      return NextResponse.json({
        finalImageUrl: result.imageUrl,
        provider: 'outfitanyone',
        itemsUsed,
        totalProcessingTime: result.processingTime,
        itemsCount: fullItems.length,
        triedOnCount: itemsUsed.length,
        skippedDuplicates: skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
        skippedAccessories: accessories.length > 0 ? accessories.map(a => ({
          id: a.id,
          type: a.type,
          reason: 'Accessories (shoes, bags, hats, jewelry) cannot be tried on. Only clothing items (tops, bottoms, dresses) are supported.',
        })) : [],
      });
    } catch (error) {
      console.error('OutfitAnyone failed, falling back to IDM-VTON:', error);

      // Fallback to IDM-VTON sequential try-on
      try {
        let currentPersonImage = personImageUrl;
        const results = [];

        // Try on selected items sequentially
        const itemsToTryOn = [selectedTopItem, selectedBottomItem].filter(Boolean) as typeof tryOnableItems;

        for (const item of itemsToTryOn) {
          const result = await generateVirtualTryOn(
            currentPersonImage,
            item.imageUrl,
            { category: item.category! }
          );

          results.push({
            itemId: item.id,
            itemType: item.type,
            resultUrl: result.imageUrl,
            processingTime: result.processingTime,
          });

          currentPersonImage = result.imageUrl;
        }

        const finalResult = results[results.length - 1];

        return NextResponse.json({
          finalImageUrl: finalResult.resultUrl,
          provider: 'idm-vton',
          stepResults: results,
          totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
          itemsCount: fullItems.length,
          triedOnCount: itemsToTryOn.length,
          skippedDuplicates: skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
          skippedAccessories: accessories.length > 0 ? accessories.map(a => ({
            id: a.id,
            type: a.type,
            reason: 'Accessories (shoes, bags, hats, jewelry) cannot be tried on. Only clothing items (tops, bottoms, dresses) are supported.',
          })) : [],
          fallbackUsed: true,
          fallbackReason: 'OutfitAnyone unavailable, used IDM-VTON instead',
        });
      } catch (fallbackError) {
        console.error('IDM-VTON fallback also failed:', fallbackError);
        return NextResponse.json({
          error: 'Virtual try-on failed',
          details: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Virtual try-on error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate virtual try-on' },
      { status: 500 }
    );
  }
}
