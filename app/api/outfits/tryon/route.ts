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

    // Fetch clothing items
    const items = await prisma.clothingItem.findMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      select: {
        id: true,
        type: true,
        imageUrl: true,
      },
      orderBy: {
        type: 'asc', // Order items appropriately for layering
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No items found' },
        { status: 404 }
      );
    }

    // Validate all garment images are accessible
    for (const item of items) {
      const isValid = await validateImageUrl(item.imageUrl);
      if (!isValid) {
        return NextResponse.json(
          { error: `Image for ${item.type} (ID: ${item.id}) is not accessible` },
          { status: 400 }
        );
      }
    }

    // Check if Replicate API token is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        error: 'Virtual try-on not configured',
        message: 'REPLICATE_API_TOKEN not set in environment variables',
      }, { status: 503 });
    }

    // Categorize items and try them on
    const garments = items.map(item => ({
      id: item.id,
      imageUrl: item.imageUrl,
      category: getGarmentCategory(item.type || 'shirt'),
      type: item.type,
    }));

    console.log('Trying on garments:', garments.map(g => ({ type: g.type, category: g.category })));

    // Try on items sequentially (each result becomes input for next)
    let currentPersonImage = personImageUrl;
    const results = [];

    for (const garment of garments) {
      try {
        const result = await generateVirtualTryOn(
          currentPersonImage,
          garment.imageUrl,
          { category: garment.category }
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
      itemsCount: items.length,
    });
  } catch (error) {
    console.error('Virtual try-on error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate virtual try-on' },
      { status: 500 }
    );
  }
}
