import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  generateOutfitVisualizationPrompt,
  analyzeOutfitCompatibility,
} from '@/lib/ai/outfit-visualization';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemIds, userPreferences } = await req.json();

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Item IDs are required' },
        { status: 400 }
      );
    }

    // Fetch clothing items
    const items = await prisma.clothingItem.findMany({
      where: {
        id: { in: itemIds },
      },
      select: {
        id: true,
        type: true,
        primaryColor: true,
        secondaryColor: true,
        pattern: true,
        fit: true,
        vibe: true,
        imageUrl: true,
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No items found' },
        { status: 404 }
      );
    }

    // Analyze outfit compatibility
    const compatibility = await analyzeOutfitCompatibility(
      items.map(item => ({
        type: item.type || 'unknown',
        primaryColor: item.primaryColor || 'unknown',
        secondaryColor: item.secondaryColor || undefined,
        pattern: item.pattern || undefined,
        vibe: item.vibe || undefined,
      }))
    );

    // Generate visualization prompt for image generation
    const visualizationPrompt = await generateOutfitVisualizationPrompt(
      items.map(item => ({
        type: item.type || 'unknown',
        primaryColor: item.primaryColor || 'unknown',
        pattern: item.pattern || undefined,
        fit: item.fit || undefined,
        vibe: item.vibe || undefined,
      })),
      userPreferences
    );

    return NextResponse.json({
      compatibility,
      visualizationPrompt,
      items: items.map(item => ({
        id: item.id,
        type: item.type,
        imageUrl: item.imageUrl,
      })),
      // For now, we return the prompt. In production, you'd:
      // 1. Send this to Stable Diffusion API
      // 2. Or use a virtual try-on service
      // 3. Or create a composite image from individual items
      message: 'Use the visualizationPrompt with an image generation API like Stable Diffusion or DALL-E',
    });
  } catch (error) {
    console.error('Outfit visualization error:', error);
    return NextResponse.json(
      { error: 'Failed to generate visualization' },
      { status: 500 }
    );
  }
}
