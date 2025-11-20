import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { outfitId, type = "saved" } = await request.json();

    if (!outfitId) {
      return NextResponse.json(
        { error: "outfitId is required" },
        { status: 400 }
      );
    }

    // Get outfit data
    let outfit;
    let items;

    if (type === "saved") {
      outfit = await prisma.savedOutfit.findUnique({
        where: { id: parseInt(outfitId) },
      });
      if (!outfit) {
        return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
      }
      items = await prisma.clothingItem.findMany({
        where: { id: { in: outfit.items } },
      });
    } else {
      outfit = await prisma.outfitRecommendation.findUnique({
        where: { id: parseInt(outfitId) },
      });
      if (!outfit) {
        return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
      }
      items = await prisma.clothingItem.findMany({
        where: { id: { in: outfit.items } },
      });
    }

    // Return outfit data for client-side rendering
    return NextResponse.json({
      outfit: {
        id: outfit.id,
        name: type === "saved" ? (outfit as any).name : null,
        occasion: type === "recommendation" ? (outfit as any).occasion : null,
        items: items.map((item) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          type: item.type,
          primaryColor: item.primaryColor,
        })),
      },
    });
  } catch (error) {
    console.error("Error exporting outfit:", error);
    return NextResponse.json(
      { error: "Failed to export outfit" },
      { status: 500 }
    );
  }
}

