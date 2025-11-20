import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateSpendingInsights } from "@/lib/purchase-recommendations";

export const dynamic = "force-dynamic";

/**
 * GET - Retrieve user's purchase history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeStats = searchParams.get("stats") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const purchases = await prisma.purchaseHistory.findMany({
      where: { userId },
      orderBy: { purchaseDate: "desc" },
      take: limit,
    });

    const response: any = {
      purchases,
      count: purchases.length,
    };

    if (includeStats) {
      const allPurchases = await prisma.purchaseHistory.findMany({
        where: { userId },
      });

      response.stats = calculateSpendingInsights(allPurchases);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get purchases error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

/**
 * POST - Manually add a purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      itemName,
      store,
      purchaseDate,
      price,
      brand,
      itemType,
      color,
    } = body;

    if (!userId || !itemName || !store) {
      return NextResponse.json(
        { error: "userId, itemName, and store are required" },
        { status: 400 }
      );
    }

    const purchase = await prisma.purchaseHistory.create({
      data: {
        userId,
        itemName,
        store,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        price: price || null,
        brand: brand || null,
        itemType: itemType || null,
        color: color || null,
      },
    });

    return NextResponse.json({
      purchase,
      message: "Purchase added successfully",
    });
  } catch (error) {
    console.error("Add purchase error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add purchase" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a purchase
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
        { status: 400 }
      );
    }

    await prisma.purchaseHistory.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      message: "Purchase deleted successfully",
    });
  } catch (error) {
    console.error("Delete purchase error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete purchase" },
      { status: 500 }
    );
  }
}
