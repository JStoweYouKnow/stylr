import { NextRequest, NextResponse } from "next/server";
import { validateColorPalette, suggestComplementaryColors } from "@/lib/color-validator";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic"; // Force dynamic rendering

export async function POST(request: NextRequest) {
  try {
    const { itemIds, colors } = await request.json();

    let colorsToValidate: string[] = [];

    // If itemIds provided, fetch items and extract colors
    if (itemIds && Array.isArray(itemIds)) {
      const items = await prisma.clothingItem.findMany({
        where: {
          id: { in: itemIds },
        },
        select: {
          primaryColor: true,
          secondaryColor: true,
        },
      });

      colorsToValidate = items
        .flatMap((item) => [item.primaryColor, item.secondaryColor])
        .filter((c): c is string => c !== null && c !== undefined);
    } else if (colors && Array.isArray(colors)) {
      // Direct colors provided
      colorsToValidate = colors;
    } else {
      return NextResponse.json(
        { error: "Either itemIds or colors must be provided" },
        { status: 400 }
      );
    }

    const validation = validateColorPalette(colorsToValidate);

    // Get suggestions for the dominant color
    const dominantColor = colorsToValidate[0];
    const suggestions = dominantColor
      ? suggestComplementaryColors(dominantColor)
      : [];

    return NextResponse.json({
      validation,
      complementarySuggestions: suggestions,
      analyzedColors: colorsToValidate,
    });
  } catch (error) {
    console.error("Color validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
