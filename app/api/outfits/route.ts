import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"; // Force dynamic rendering

// GET /api/outfits - Get all saved outfits for user
export async function GET(request: NextRequest) {
  try {
    const userId = null; // TODO: Get from auth session

    const outfits = await prisma.savedOutfit.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
    });

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
    const userId = null; // TODO: Get from auth session
    const { items, name } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 }
      );
    }

    const outfit = await prisma.savedOutfit.create({
      data: {
        userId: userId || undefined,
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

