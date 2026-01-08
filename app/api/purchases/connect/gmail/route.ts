import { NextRequest, NextResponse } from "next/server";
import { getGmailAuthUrl } from "@/lib/gmail-integration";

export const dynamic = "force-dynamic";

/**
 * POST - Initiate Gmail OAuth flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if Gmail OAuth is configured
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Gmail OAuth not configured:', {
        hasClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      });

      return NextResponse.json(
        {
          error: "Gmail integration not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables."
        },
        { status: 503 }
      );
    }

    console.log('Gmail OAuth configured successfully');

    const authUrl = getGmailAuthUrl(userId);

    return NextResponse.json({
      authUrl,
      message: "Visit this URL to authorize Gmail access",
    });
  } catch (error) {
    console.error("Gmail OAuth initiation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate Gmail connection" },
      { status: 500 }
    );
  }
}
