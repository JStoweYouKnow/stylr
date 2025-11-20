import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET - Retrieve user's saved capsule wardrobes
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const period = searchParams.get("period"); // "weekly" or "monthly"

    const whereClause: any = {
      userId: userId || undefined,
    };

    if (period) {
      whereClause.period = period;
    }

    const capsules = await prisma.capsuleWardrobe.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Last 10 capsules
    });

    // Fetch the actual clothing items for each capsule
    const capsulesWithItems = await Promise.all(
      capsules.map(async (capsule) => {
        const items = await prisma.clothingItem.findMany({
          where: {
            id: { in: capsule.itemIds },
          },
        });

        return {
          ...capsule,
          items,
        };
      })
    );

    return NextResponse.json({
      capsules: capsulesWithItems,
      count: capsules.length,
    });
  } catch (error) {
    console.error("Get capsules error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch capsules" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a capsule wardrobe
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Capsule ID required" }, { status: 400 });
    }

    await prisma.capsuleWardrobe.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Capsule deleted successfully" });
  } catch (error) {
    console.error("Delete capsule error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete capsule" },
      { status: 500 }
    );
  }
}
