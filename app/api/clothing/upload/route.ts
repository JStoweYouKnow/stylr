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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    const userId = null; // TODO: replace with authenticated user

    const uploadLog = await prisma.upload.create({
      data: {
        userId: userId || undefined,
        imageUrl: "pending",
        status: "uploaded",
      },
    });

    try {
      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name}`;
      const blobPath = `clothing/${filename}`;
      const blob = await uploadToBlob(file, blobPath);

      await prisma.upload.update({
        where: { id: uploadLog.id },
        data: { imageUrl: blob.url, status: "analyzed" },
      });

      let analysis;
      try {
        analysis = await analyzeClothingImage(blob.url);
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
  } catch (error) {
    console.error("Unexpected upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

