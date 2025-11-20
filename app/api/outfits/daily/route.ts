import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOutfitOfTheDay } from "@/lib/outfit-generator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const occasion = searchParams.get("occasion") || "casual";

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

    // Generate outfit
    const outfit = generateOutfitOfTheDay(items, occasion);

    if (!outfit) {
      return NextResponse.json(
        { error: "Could not generate outfit with available items" },
        { status: 404 }
      );
    }

    // Optionally save as recommendation
    const recommendation = await prisma.outfitRecommendation.create({
      data: {
        userId: userId || undefined,
        items: outfit.items.map((item) => item.id),
        occasion,
        generatedBy: "outfit-of-the-day",
        confidenceScore: outfit.score / 10,
        aiExplanation: outfit.reasoning,
      },
    });

    return NextResponse.json({
      outfit: {
        ...outfit,
        recommendationId: recommendation.id,
      },
    });
  } catch (error) {
    console.error("Daily outfit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate outfit" },
      { status: 500 }
    );
  }
}
