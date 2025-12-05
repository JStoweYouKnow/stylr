import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic"; // Force dynamic rendering

// POST /api/wear - Log a wear event
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { clothingItemId, wornOn, context } = await request.json();

    if (!clothingItemId) {
      return NextResponse.json(
        { error: "clothingItemId is required" },
        { status: 400 }
      );
    }

    const wearEvent = await prisma.wearEvent.create({
      data: {
        userId,
        clothingItemId: parseInt(clothingItemId),
        wornOn: new Date(wornOn || Date.now()),
        context: context || null,
      },
    });

    return NextResponse.json({ wearEvent });
  } catch (error) {
    console.error("Error creating wear event:", error);
    return NextResponse.json(
      { error: "Failed to create wear event" },
      { status: 500 }
    );
  }
}

// GET /api/wear - Get wear events for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const wearEvents = await prisma.wearEvent.findMany({
      where: { userId },
      include: {
        clothingItem: true,
      },
      orderBy: { wornOn: "desc" },
      take: 50,
    });

    return NextResponse.json({ wearEvents });
  } catch (error) {
    console.error("Error fetching wear events:", error);
    return NextResponse.json(
      { error: "Failed to fetch wear events" },
      { status: 500 }
    );
  }
}

