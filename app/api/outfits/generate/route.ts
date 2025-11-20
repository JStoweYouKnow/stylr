import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateMultipleOutfits } from "@/lib/outfit-generator";

export const dynamic = "force-dynamic"; // Force dynamic rendering

export async function POST(request: NextRequest) {
  try {
    const { userId, occasion, count = 3 } = await request.json();

    // Fetch user's clothing items
    const items = await prisma.clothingItem.findMany({
      where: {
        userId: userId || undefined,
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No clothing items found. Upload some clothes first!" },
        { status: 404 }
      );
    }

    // Generate multiple outfits
    const outfits = generateMultipleOutfits(items, count, occasion || "casual");

    if (outfits.length === 0) {
      return NextResponse.json(
        { error: "Could not generate any outfits with available items" },
        { status: 404 }
      );
    }

    // Save recommendations
    const recommendations = await Promise.all(
      outfits.map((outfit) =>
        prisma.outfitRecommendation.create({
          data: {
            userId: userId || undefined,
            items: outfit.items.map((item) => item.id),
            occasion: occasion || "casual",
            generatedBy: "multi-outfit-generator",
            confidenceScore: outfit.score / 10,
            aiExplanation: outfit.reasoning,
          },
        })
      )
    );

    return NextResponse.json({
      outfits: outfits.map((outfit, index) => ({
        ...outfit,
        recommendationId: recommendations[index].id,
      })),
    });
  } catch (error) {
    console.error("Generate outfits error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate outfits" },
      { status: 500 }
    );
  }
}

