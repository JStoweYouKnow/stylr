import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/trends - Get recent fashion trends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const season = searchParams.get("season");

    const trends = await prisma.styleRule.findMany({
      where: season ? { season } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}

