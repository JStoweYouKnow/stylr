import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateClothingEmbedding,
  cosineSimilarity,
} from "@/lib/ai/embeddings";

export async function POST(request: NextRequest) {
  try {
    const { itemId, metadata } = await request.json();

    let targetEmbedding: number[] | null = null;

    if (itemId) {
      const item = await prisma.clothingItem.findUnique({
        where: { id: parseInt(itemId) },
      });
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
      if (item.embedding && item.embedding.length) {
        targetEmbedding = item.embedding;
      } else {
        targetEmbedding = generateClothingEmbedding({
          type: item.type,
          primaryColor: item.primaryColor,
          secondaryColor: item.secondaryColor,
          pattern: item.pattern,
          vibe: item.vibe,
          notes: item.notes,
        });
        await prisma.clothingItem.update({
          where: { id: item.id },
          data: { embedding: targetEmbedding },
        });
      }
    } else if (metadata) {
      targetEmbedding = generateClothingEmbedding(metadata);
    } else {
      return NextResponse.json(
        { error: "Provide either itemId or metadata" },
        { status: 400 }
      );
    }

    if (!targetEmbedding) {
      return NextResponse.json(
        { error: "Failed to generate embedding" },
        { status: 500 }
      );
    }

    const items = await prisma.clothingItem.findMany({
      take: 100,
    });

    const scored = items
      .filter((item) => item.embedding && item.embedding.length)
      .map((item) => ({
        item,
        score: cosineSimilarity(targetEmbedding!, item.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      matches: scored.map(({ item, score }) => ({
        id: item.id,
        imageUrl: item.imageUrl,
        type: item.type,
        primaryColor: item.primaryColor,
        vibe: item.vibe,
        score,
      })),
    });
  } catch (error) {
    console.error("Error finding similar outfits:", error);
    return NextResponse.json(
      {
        error: "Failed to find similar outfits",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

