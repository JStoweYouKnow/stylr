import { NextRequest, NextResponse } from "next/server";
import { analyzeClothingImage } from "@/lib/ai/vision";

export const dynamic = "force-dynamic"; // Force dynamic rendering

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    const analysis = await analyzeClothingImage(imageUrl);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

