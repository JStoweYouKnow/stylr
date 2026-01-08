import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET - Check if user has an active email connection
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const connection = await prisma.emailConnection.findUnique({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        isActive: true,
        lastSyncedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        connection: null,
      });
    }

    // Check if token is expired
    const isExpired = connection.expiresAt && connection.expiresAt < new Date();

    return NextResponse.json({
      connected: true,
      connection: {
        ...connection,
        isExpired,
      },
    });
  } catch (error) {
    console.error("Email connection check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check email connection" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Disconnect email integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await prisma.emailConnection.update({
      where: { userId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: "Email connection disconnected successfully",
    });
  } catch (error) {
    console.error("Email disconnection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect email" },
      { status: 500 }
    );
  }
}
