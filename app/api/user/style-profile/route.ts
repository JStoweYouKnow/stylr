import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const userId = null; // TODO: Get from auth session

    // For now, allow without auth - will be enforced when auth is added
    if (!userId) {
      return NextResponse.json({ profile: null });
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
    const userId = null; // TODO: Get from auth session
    const {
      preferredStyles,
      occasionFrequency,
      favoriteColors,
      bodyType,
      climate,
    } = await request.json();

    // For development: use a temporary user ID if auth not set up
    // In production, this will require authentication
    const tempUserId = userId || "temp-user-dev";

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { id: tempUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: tempUserId,
          email: `temp-${Date.now()}@example.com`,
        },
      });
    }

    const profile = await prisma.styleProfile.upsert({
      where: { userId: tempUserId },
      update: {
        preferredStyles: preferredStyles || [],
        occasionFrequency: occasionFrequency || {},
        favoriteColors: favoriteColors || [],
        bodyType: bodyType || null,
        climate: climate || null,
      },
      create: {
        userId: tempUserId,
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

