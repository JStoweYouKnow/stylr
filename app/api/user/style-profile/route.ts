import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic"; // Force dynamic rendering

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.styleProfile.findUnique({
      where: { userId },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Error fetching style profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch style profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      preferredStyles,
      occasionFrequency,
      favoriteColors,
      bodyType,
      climate,
    } = await request.json();

    const profile = await prisma.styleProfile.upsert({
      where: { userId },
      update: {
        preferredStyles: preferredStyles || [],
        occasionFrequency: occasionFrequency || {},
        favoriteColors: favoriteColors || [],
        bodyType: bodyType || null,
        climate: climate || null,
      },
      create: {
        userId,
        preferredStyles: preferredStyles || [],
        occasionFrequency: occasionFrequency || {},
        favoriteColors: favoriteColors || [],
        bodyType: bodyType || null,
        climate: climate || null,
      },
    });

    return NextResponse.json({ profile, success: true });
  } catch (error) {
    console.error("Error saving style profile:", error);
    console.error("Error details:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { 
        error: "Failed to save style profile",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

