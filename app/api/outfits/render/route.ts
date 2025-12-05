import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateOutfitVisualizationPrompt } from '@/lib/ai/outfit-visualization';
import { getCurrentUserId } from '@/lib/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
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
        userId, // Ensure user owns these items
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

    // Generate visualization prompt using Gemini
    const visualizationPrompt = await generateOutfitVisualizationPrompt(
      items.map(item => ({
        type: item.type || 'clothing item',
        primaryColor: item.primaryColor || 'neutral',
        pattern: item.pattern || undefined,
        fit: item.fit || undefined,
        vibe: item.vibe || undefined,
      })),
      userPreferences
    );

    // Check if Replicate API token is configured
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({
        prompt: visualizationPrompt,
        message: 'REPLICATE_API_TOKEN not configured. Add it to .env to generate images.',
        items: items.map(i => ({ id: i.id, type: i.type, imageUrl: i.imageUrl })),
      });
    }

    // Generate image using Stable Diffusion XL
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('Generating outfit image with prompt:', visualizationPrompt);

    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: visualizationPrompt,
          negative_prompt: "ugly, distorted, deformed, unrealistic, low quality, blurry, grainy, out of focus, bad anatomy, duplicate, mutated hands, poorly drawn hands, poorly drawn face, mutation, extra limbs, gross proportions, malformed limbs",
          width: 768,
          height: 1024,
          num_inference_steps: 50,
          guidance_scale: 7.5,
          scheduler: "DPMSolverMultistep",
        }
      }
    ) as string[];

    const imageUrl = output[0];

    console.log('Generated image:', imageUrl);

    return NextResponse.json({
      imageUrl,
      prompt: visualizationPrompt,
      items: items.map(i => ({ id: i.id, type: i.type, imageUrl: i.imageUrl })),
    });
  } catch (error) {
    console.error('Outfit rendering error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate outfit visualization' },
      { status: 500 }
    );
  }
}
