import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"; // Force dynamic rendering

// GET /api/recommendations - Get outfit recommendations for user
export async function GET(request: NextRequest) {
  try {
    const userId = null; // TODO: Get from auth session

    const recommendations = await prisma.outfitRecommendation.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 20, // Limit to 20 most recent
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

