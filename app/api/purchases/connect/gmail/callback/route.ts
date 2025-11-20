import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/gmail-integration";

export const dynamic = "force-dynamic";

/**
 * GET - Handle OAuth callback from Google
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/?error=gmail_auth_denied`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing authorization code or user ID" },
        { status: 400 }
      );
    }

    const userId = state;

    // Exchange code for tokens
    await exchangeCodeForTokens(code, userId);

    // Redirect back to app with success message
    return NextResponse.redirect(
      new URL(`/?gmail_connected=true`, request.url)
    );
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/?error=gmail_connection_failed`, request.url)
    );
  }
}
