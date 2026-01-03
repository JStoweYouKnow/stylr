import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob/upload";
import { generateAvatarFromPhoto, validateAvatarImage } from "@/lib/ai/avatar-generation";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for avatar generation

/**
 * POST /api/user/avatar - Upload photo (optionally generate avatar with AI)
 *
 * By default, saves the photo directly without AI processing (free, instant)
 * Set enhance=true to use AI generation (requires billing)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const enhance = formData.get("enhance") === "true"; // Optional AI enhancement
    const style = (formData.get("style") as string) || "realistic";
    const background = (formData.get("background") as string) || "white";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Validate file size (max 4MB to stay within Vercel's limits)
    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be less than 4MB" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    let avatarBlob;

    if (enhance) {
      // AI Enhancement Mode: Generate avatar using Gemini
      console.log("Uploading user photo for AI avatar generation...");

      // Upload original photo to blob storage temporarily
      const filename = `${timestamp}-${file.name}`;
      const tempBlobPath = `avatars/temp/${filename}`;
      const tempBlob = await uploadToBlob(file, tempBlobPath);

      console.log("Photo uploaded, generating avatar with AI...");

      // Validate image is suitable for avatar generation
      const validation = await validateAvatarImage(tempBlob.url);
      if (!validation.valid) {
        // Clean up temp file
        try {
          await del(tempBlob.url);
        } catch (delError) {
          console.error("Failed to delete temp file:", delError);
        }
        return NextResponse.json(
          { error: validation.error || "Invalid image" },
          { status: 400 }
        );
      }

      // Generate avatar using Gemini 2.5 Flash Image
      let avatarResult;
      try {
        avatarResult = await generateAvatarFromPhoto(tempBlob.url, {
          style: style as "realistic" | "professional" | "casual",
          background: background as "white" | "neutral" | "studio",
        });
      } catch (error) {
        console.error("Avatar generation error:", error);
        // Clean up temp file
        try {
          await del(tempBlob.url);
        } catch (delError) {
          console.error("Failed to delete temp file:", delError);
        }
        return NextResponse.json(
          {
            error: "Failed to generate avatar",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }

      // Sanitize filename for blob storage
      const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, "-") : "avatar.png";
      const avatarFilename = `avatar-${userId}-${timestamp}-${safeName.replace(/\.[^/.]+$/, ".png")}`;
      const avatarBlobData = new Blob([new Uint8Array(avatarResult.imageData)], { type: avatarResult.mimeType });
      const avatarFile = new File([avatarBlobData], avatarFilename, {
        type: avatarResult.mimeType,
      });

      // Upload avatar to blob storage
      const avatarBlobPath = `avatars/${userId}/${avatarFilename}`;
      avatarBlob = await uploadToBlob(avatarFile, avatarBlobPath);

      // Clean up temp file
      try {
        await del(tempBlob.url);
      } catch (delError) {
        console.error("Failed to delete temp file:", delError);
      }

      console.log("AI-enhanced avatar uploaded to blob storage");
    } else {
      // Direct Upload Mode: Save photo as-is (no AI processing)
      console.log("Uploading user photo directly (no AI enhancement)...");

      // Sanitize filename for blob storage
      const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9._-]/g, "-") : "avatar.jpg";
      const avatarFilename = `avatar-${userId}-${timestamp}-${safeName}`;

      // Upload directly to permanent location
      const avatarBlobPath = `avatars/${userId}/${avatarFilename}`;
      avatarBlob = await uploadToBlob(file, avatarBlobPath);

      console.log("Avatar photo uploaded directly to blob storage");
    }

    // Delete old avatar if exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarImageUrl: true },
    });

    if (user?.avatarImageUrl) {
      try {
        await del(user.avatarImageUrl);
        console.log("Old avatar deleted");
      } catch (delError) {
        console.error("Failed to delete old avatar:", delError);
      }
    }

    // Update user record with avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarImageUrl: avatarBlob.url,
        avatarBlobPath: avatarBlob.pathname,
        avatarGeneratedAt: new Date(),
      },
      select: {
        id: true,
        avatarImageUrl: true,
        avatarGeneratedAt: true,
      },
    });

    console.log(`✓ Avatar ${enhance ? 'generation' : 'upload'} complete`);

    return NextResponse.json({
      success: true,
      enhanced: enhance,
      avatar: {
        url: updatedUser.avatarImageUrl,
        generatedAt: updatedUser.avatarGeneratedAt,
      },
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process avatar",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/avatar - Get current user's avatar
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarImageUrl: true,
        avatarGeneratedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      avatar: user.avatarImageUrl
        ? {
            url: user.avatarImageUrl,
            generatedAt: user.avatarGeneratedAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching avatar:", error);
    return NextResponse.json(
      { error: "Failed to fetch avatar" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/avatar - Delete user's avatar
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarImageUrl: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete from blob storage if exists
    if (user.avatarImageUrl) {
      try {
        await del(user.avatarImageUrl);
        console.log("Avatar deleted from blob storage");
      } catch (delError) {
        console.error("Failed to delete avatar from blob:", delError);
        // Continue anyway to clear database
      }
    }

    // Clear avatar fields in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        avatarImageUrl: null,
        avatarBlobPath: null,
        avatarGeneratedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Avatar deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return NextResponse.json(
      { error: "Failed to delete avatar" },
      { status: 500 }
    );
  }
}

