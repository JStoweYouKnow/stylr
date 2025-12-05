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
      // Extract base URL from request
      const baseUrl = new URL(request.url).origin;
      return NextResponse.redirect(
        `${baseUrl}/purchases?error=gmail_auth_denied`
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

    // Redirect back to purchases page with success message
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/purchases?gmail_connected=true`
    );
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(
      `${baseUrl}/purchases?error=gmail_connection_failed`
    );
  }
}
