import { NextRequest, NextResponse } from "next/server";
import { getWardrobeAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = null; // TODO: Get from auth session

    const analytics = await getWardrobeAnalytics(userId || undefined);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching wardrobe analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

