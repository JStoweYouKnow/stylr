import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic"; // Force dynamic rendering

// GET /api/outfits - Get all saved outfits for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const savedOutfits = await prisma.savedOutfit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // Populate each outfit with full clothing item details
    const outfits = await Promise.all(
      savedOutfits.map(async (outfit) => {
        const items = await prisma.clothingItem.findMany({
          where: {
            id: { in: outfit.items },
            userId, // Ensure items belong to the user
          },
          select: {
            id: true,
            imageUrl: true,
            type: true,
            primaryColor: true,
          },
        });

        return {
          id: outfit.id,
          name: outfit.name,
          createdAt: outfit.createdAt,
          items,
        };
      })
    );

    return NextResponse.json({ outfits });
  } catch (error) {
    console.error("Error fetching outfits:", error);
    return NextResponse.json(
      { error: "Failed to fetch outfits" },
      { status: 500 }
    );
  }
}

// POST /api/outfits - Create a new saved outfit
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { items, name } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    const outfit = await prisma.savedOutfit.create({
      data: {
        userId,
        items,
        name: name || null,
      },
    });

    return NextResponse.json({ outfit });
  } catch (error) {
    console.error("Error creating outfit:", error);
    return NextResponse.json(
      { error: "Failed to create outfit" },
      { status: 500 }
    );
  }
}

// DELETE /api/outfits - Delete a saved outfit
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Outfit ID is required" },
        { status: 400 }
      );
    }

    // Verify the outfit belongs to the user before deleting
    const outfit = await prisma.savedOutfit.findFirst({
      where: {
        id: parseInt(id),
        userId,
      },
    });

    if (!outfit) {
      return NextResponse.json(
        { error: "Outfit not found" },
        { status: 404 }
      );
    }

    await prisma.savedOutfit.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      message: "Outfit deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting outfit:", error);
    return NextResponse.json(
      { error: "Failed to delete outfit" },
      { status: 500 }
    );
  }
}

