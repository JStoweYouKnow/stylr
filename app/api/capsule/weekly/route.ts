import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWeeklyCapsule } from "@/lib/capsule-generator";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { occasionMix } = body;

    // Fetch user's clothing items
    const items = await prisma.clothingItem.findMany({
      where: {
        userId,
      },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No clothing items found. Upload some clothes first!" },
        { status: 404 }
      );
    }

    // Generate weekly capsule
    const capsule = generateWeeklyCapsule(items, occasionMix);

    // Optionally save capsule to database
    if (userId) {
      await prisma.capsuleWardrobe.create({
        data: {
          userId,
          name: `Weekly Capsule - Week of ${new Date().toLocaleDateString()}`,
          period: "weekly",
          itemIds: capsule.items.map((item) => item.id),
          outfitPlan: capsule.outfits as any, // Store as JSON
          versatilityScore: capsule.stats.versatilityScore,
        },
      });
    }

    return NextResponse.json({
      capsule,
      message: `Created weekly capsule with ${capsule.items.length} items for 7 days`,
    });
  } catch (error) {
    console.error("Weekly capsule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate weekly capsule" },
      { status: 500 }
    );
  }
}
