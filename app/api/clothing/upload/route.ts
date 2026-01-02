import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob/upload";
import { analyzeClothingImage } from "@/lib/ai/vision";
import { generateClothingEmbedding } from "@/lib/ai/embeddings";
import { normalizeClothingItem } from "@/lib/ai/item-normalization";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { checkItemLimit } from "@/lib/stripe/subscription";
import { del } from "@vercel/blob";

export const dynamic = "force-dynamic"; // Force dynamic rendering

export async function POST(request: NextRequest) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is not set in environment variables");
      return NextResponse.json(
        { 
          error: "Database configuration error",
          message: "The database connection is not configured. Please contact support."
        },
        { status: 500 }
      );
    }

    // Validate DATABASE_URL format
    if (!process.env.DATABASE_URL.startsWith("postgresql://") && 
        !process.env.DATABASE_URL.startsWith("postgres://")) {
      console.error("Invalid DATABASE_URL format:", process.env.DATABASE_URL.substring(0, 20));
      return NextResponse.json(
        { 
          error: "Database configuration error",
          message: "The database connection URL is invalid. Please contact support."
        },
        { status: 500 }
      );
    }

    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription limits
    const itemCheck = await checkItemLimit(userId);
    if (!itemCheck.canAdd) {
      return NextResponse.json({
        error: "Item limit reached",
        message: `You've reached your limit of ${itemCheck.limit} items. Upgrade your plan to add more.`,
        limit: itemCheck.limit,
        current: itemCheck.currentCount,
      }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const uploadLog = await prisma.upload.create({
      data: {
        userId,
        imageUrl: "pending",
        status: "uploaded",
      },
    });

    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      // Use simple alphanumeric filename only - no temp paths, no special chars
      const safeFilename = `${timestamp}${randomId}.png`;
      const blobPath = `clothing/${safeFilename}`;
      
      console.log(`[UPLOAD] Attempting upload to: ${blobPath}`);
      
      let blob;
      try {
        blob = await uploadToBlob(file, blobPath);
        console.log(`[UPLOAD] ✓ Success: ${blob.url}`);
      } catch (uploadError) {
        console.error("[UPLOAD] Blob upload failed:", uploadError);
        const errorMsg = uploadError instanceof Error ? uploadError.message : String(uploadError);
        return NextResponse.json(
          { 
            error: "Upload failed",
            message: errorMsg,
            details: "Failed to upload image to blob storage",
            path: blobPath
          },
          { status: 500 }
        );
      }

      // Skip normalization temporarily to isolate upload issue
      const finalBlob = blob;

      await prisma.upload.update({
        where: { id: uploadLog.id },
        data: { imageUrl: finalBlob.url, status: "analyzed" },
      });

      let analysis;
      try {
        analysis = await analyzeClothingImage(finalBlob.url);
      } catch (error) {
        console.error("Vision analysis error:", error);
        await prisma.upload.update({
          where: { id: uploadLog.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Analysis failed",
          },
        });
        analysis = {
          type: null,
          primaryColor: null,
          secondaryColor: null,
          pattern: null,
          fit: null,
          vibe: null,
          notes: "Analysis failed",
          layeringCategory: null,
        };
      }

      const embedding = generateClothingEmbedding(analysis);

      const clothingItem = await prisma.clothingItem.create({
        data: {
          userId,
          imageUrl: finalBlob.url,
          blobPath: finalBlob.pathname,
          type: analysis.type || null,
          primaryColor: analysis.primaryColor || null,
          secondaryColor: analysis.secondaryColor || null,
          pattern: analysis.pattern || null,
          fit: analysis.fit || null,
          vibe: analysis.vibe || null,
          notes: analysis.notes || null,
          layeringCategory: analysis.layeringCategory || null,
          embedding,
          tags: [],
        },
      });

      await prisma.upload.update({
        where: { id: uploadLog.id },
        data: { status: "analyzed" },
      });

      return NextResponse.json({
        success: true,
        item: clothingItem,
        analysis,
      });
    } catch (error) {
      console.error("Upload error:", error);
      
      // Check if it's a database connection error
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      const isDbError = errorMessage.includes("datasource") || 
                       errorMessage.includes("DATABASE_URL") || 
                       errorMessage.includes("postgresql://") ||
                       errorMessage.includes("postgres://");
      
      try {
        await prisma.upload.update({
          where: { id: uploadLog.id },
          data: {
            status: "failed",
            errorMessage: errorMessage,
          },
        });
      } catch (updateError) {
        console.error("Failed to update upload log:", updateError);
      }
      
      if (isDbError) {
        return NextResponse.json(
          { 
            error: "Database connection error",
            message: "Unable to connect to the database. Please try again later or contact support if the problem persists."
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected upload error:", error);
    
    // Check if it's a database connection error
    const errorMessage = error instanceof Error ? error.message : "Upload failed";
    const isDbError = errorMessage.includes("datasource") || 
                     errorMessage.includes("DATABASE_URL") || 
                     errorMessage.includes("postgresql://") ||
                     errorMessage.includes("postgres://");
    
    if (isDbError) {
      return NextResponse.json(
        { 
          error: "Database connection error",
          message: "Unable to connect to the database. Please try again later or contact support if the problem persists."
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

