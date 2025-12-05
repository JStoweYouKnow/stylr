import { NextRequest, NextResponse } from "next/server";
import { getWardrobeAnalytics } from "@/lib/analytics";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const analytics = await getWardrobeAnalytics(userId);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Error fetching wardrobe analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

