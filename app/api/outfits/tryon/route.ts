import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import {
  generateVirtualTryOn,
  tryOnMultipleItems,
  getGarmentCategory,
  validateImageUrl,
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
        message: 'Virtual try-on currently only supports upper body garments (shirts, jackets, sweaters, etc.). Pants, dresses, shoes, and accessories are not supported.',
        skippedItems: accessories.map(a => ({ id: a.id, type: a.type })),
      }, { status: 400 });
    }

    // Try on items sequentially (each result becomes input for next)
    let currentPersonImage = personImageUrl;
    const results = [];

    for (const garment of tryOnableItems) {
      try {
        const result = await generateVirtualTryOn(
          currentPersonImage,
          garment.imageUrl,
          { category: garment.category! } // Safe to assert non-null since we filtered
        );

        results.push({
          itemId: garment.id,
          itemType: garment.type,
          resultUrl: result.imageUrl,
          processingTime: result.processingTime,
        });

        // Use this result as the base for the next item
        currentPersonImage = result.imageUrl;
      } catch (error) {
        console.error(`Failed to try on ${garment.type}:`, error);
        return NextResponse.json({
          error: `Failed to try on ${garment.type}`,
          details: error instanceof Error ? error.message : 'Unknown error',
          partialResults: results,
        }, { status: 500 });
      }
    }

    // The final result shows the complete outfit
    const finalResult = results[results.length - 1];

    return NextResponse.json({
      finalImageUrl: finalResult.resultUrl,
      stepResults: results,
      totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      itemsCount: fullItems.length,
      triedOnCount: tryOnableItems.length,
      skippedAccessories: accessories.length > 0 ? accessories.map(a => ({
        id: a.id,
        type: a.type,
        reason: 'Only upper body garments (tops, jackets) are supported. Lower body items, dresses, and accessories cannot be tried on.',
      })) : [],
    });
  } catch (error) {
    console.error('Virtual try-on error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate virtual try-on' },
      { status: 500 }
    );
  }
}
