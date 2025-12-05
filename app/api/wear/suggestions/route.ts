import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Get all items for user
    const allItems = await prisma.clothingItem.findMany({
      where: { userId },
    });

    // Get wear events grouped by item
    const wearEvents = await prisma.wearEvent.groupBy({
      by: ["clothingItemId"],
      where: { userId },
      _count: {
        id: true,
      },
    });

    const wearCountMap = new Map(
      wearEvents.map((e) => [e.clothingItemId, e._count.id])
    );

    // Calculate days since last worn
    const now = new Date();
    const lastWornMap = new Map<number, Date>();

    for (const item of allItems) {
      const lastWorn = await prisma.wearEvent.findFirst({
        where: {
          clothingItemId: item.id,
          userId,
        },
        orderBy: {
          wornOn: "desc",
        },
      });

      if (lastWorn) {
        lastWornMap.set(item.id, lastWorn.wornOn);
      }
    }

    // Score items (lower score = more forgotten)
    const scoredItems = allItems.map((item) => {
      const wearCount = wearCountMap.get(item.id) || 0;
      const lastWorn = lastWornMap.get(item.id);
      const daysSinceWorn = lastWorn
        ? Math.floor((now.getTime() - lastWorn.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;

      return {
        ...item,
        wearCount,
        daysSinceWorn: daysSinceWorn === Infinity ? null : daysSinceWorn,
        score: wearCount * 10 - daysSinceWorn, // Lower score = more forgotten
      };
    });

    // Sort by score (ascending) and get least worn/forgotten
    const suggestions = scoredItems
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map(({ score, ...item }) => item);

    return NextResponse.json({
      suggestions,
      message:
        suggestions.length > 0
          ? `You have ${suggestions.length} items that haven't been worn recently`
          : "All items are being used regularly!",
    });
  } catch (error) {
    console.error("Error fetching wear suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 }
    );
  }
}

