import { NextRequest, NextResponse } from "next/server";
import { scrapeAndStoreTrends } from "@/lib/scrapers/trends";

export const dynamic = "force-dynamic"; // Force dynamic rendering

// Vercel Cron will call this endpoint
export async function GET(request: NextRequest) {
  try {
    // Verify it's a cron request (optional security check)
    const authHeader = request.headers.get("authorization");
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await scrapeAndStoreTrends();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      message: `Processed ${result.processed} articles`,
    });
  } catch (error) {
    console.error("Error in scrape-trends cron:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape trends",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also allow manual triggering via POST
export async function POST(request: NextRequest) {
  try {
    const result = await scrapeAndStoreTrends();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      message: `Processed ${result.processed} articles`,
    });
  } catch (error) {
    console.error("Error in manual scrape:", error);
    return NextResponse.json(
      {
        error: "Failed to scrape trends",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

