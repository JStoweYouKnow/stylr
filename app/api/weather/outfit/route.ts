import { NextRequest, NextResponse } from "next/server";
import { getWeatherBasedOutfitSuggestion } from "@/lib/weather";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude, userId } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "Latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Get weather-based suggestion
    const weatherSuggestion = await getWeatherBasedOutfitSuggestion(
      latitude,
      longitude
    );

    // Get clothing items that match the required layers
    const suitableItems = await prisma.clothingItem.findMany({
      where: {
        userId: userId || undefined,
        layeringCategory: {
          in: weatherSuggestion.requiredLayers,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Group by layer
    const itemsByLayer = weatherSuggestion.requiredLayers.reduce(
      (acc, layer) => {
        acc[layer] = suitableItems.filter(
          (item) => item.layeringCategory === layer
        );
        return acc;
      },
      {} as Record<string, typeof suitableItems>
    );

    return NextResponse.json({
      weather: weatherSuggestion.weather,
      suggestion: weatherSuggestion.suggestion,
      requiredLayers: weatherSuggestion.requiredLayers,
      suitableItems: itemsByLayer,
    });
  } catch (error) {
    console.error("Weather outfit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get weather outfit" },
      { status: 500 }
    );
  }
}
