import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { searchGmailForPurchases } from "@/lib/gmail-integration";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Debug endpoint to test Gmail scanning without saving to database
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`=== DEBUG SCAN TEST for user ${userId} ===`);

    // Search Gmail for purchase emails
    const messages = await searchGmailForPurchases(userId, 30);

    console.log(`Found ${messages.length} potential purchase emails`);

    const results = {
      totalEmailsFound: messages.length,
      emailSubjects: messages.slice(0, 10).map(msg => ({
        id: msg.id,
        snippet: msg.snippet,
      })),
      message: `Found ${messages.length} emails. Check Vercel logs for details.`,
      instructions: "Go to Vercel dashboard → Your Project → Logs to see full output"
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("Debug scan error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to debug scan",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
