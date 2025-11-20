import { NextRequest, NextResponse } from "next/server";
import { uploadToBlob } from "@/lib/blob/upload";
import { analyzeClothingImage } from "@/lib/ai/vision";
import { generateClothingEmbedding } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    // Get user ID from session (will be null until auth is implemented)
    const userId = null; // TODO: Get from auth session

    // Create upload log entry
    const uploadLog = await prisma.upload.create({
      data: {
        userId: userId || undefined,
        imageUrl: "pending",
        status: "uploaded",
      },
    });

    try {
      // Upload to Vercel Blob
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const blobPath = `clothing/${filename}`;
      const blob = await uploadToBlob(file, blobPath);

      // Update upload log with image URL
      await prisma.upload.update({
        where: { id: uploadLog.id },
        data: { imageUrl: blob.url, status: "analyzed" },
      });

      // Analyze with Claude Vision
      let analysis;
      try {
        analysis = await analyzeClothingImage(blob.url);
      } catch (error) {
        console.error("Claude analysis error:", error);
        // Update upload log with error
        await prisma.upload.update({
          where: { id: uploadLog.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Analysis failed",
          },
        });
        // Continue even if analysis fails - we still have the image
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

      // Save to database
      const embedding = generateClothingEmbedding(analysis);

      const clothingItem = await prisma.clothingItem.create({
        data: {
          userId: userId || undefined,
          imageUrl: blob.url,
          blobPath: blob.pathname,
          type: analysis.type || null,
          primaryColor: analysis.primaryColor || null,
          secondaryColor: analysis.secondaryColor || null,
          pattern: analysis.pattern || null,
          fit: analysis.fit || null,
          vibe: analysis.vibe || null,
          notes: analysis.notes || null,
          layeringCategory: analysis.layeringCategory || null,
          embedding,
          tags: [], // Tags can be added later
        },
      });

      // Update upload log to success
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
      // Update upload log with error
      try {
        await prisma.upload.update({
          where: { id: uploadLog.id },
          data: {
            status: "failed",
            errorMessage: error instanceof Error ? error.message : "Upload failed",
          },
        });
      } catch (updateError) {
        console.error("Failed to update upload log:", updateError);
      }
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 500 }
      );
    }
  }

