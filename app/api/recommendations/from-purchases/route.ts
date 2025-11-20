import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generatePurchaseRecommendations } from "@/lib/purchase-recommendations";

export const dynamic = "force-dynamic";

/**
 * POST - Generate recommendations based on purchase history
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Fetch purchases (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const purchases = await prisma.purchaseHistory.findMany({
      where: {
        userId,
        purchaseDate: {
          gte: ninetyDaysAgo,
        },
      },
      orderBy: { purchaseDate: "desc" },
    });

    if (purchases.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: "No recent purchases found. Connect your email or add purchases manually.",
      });
    }

    // Fetch wardrobe
    const wardrobe = await prisma.clothingItem.findMany({
      where: { userId },
    });

    // Generate recommendations
    const recommendations = generatePurchaseRecommendations(purchases, wardrobe);

    return NextResponse.json({
      recommendations,
      purchaseCount: purchases.length,
      wardrobeCount: wardrobe.length,
      message: `Generated ${recommendations.length} recommendation${recommendations.length !== 1 ? "s" : ""} based on your purchase history`,
    });
  } catch (error) {
    console.error("Purchase recommendations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
