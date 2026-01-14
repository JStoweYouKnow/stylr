import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";
import sharp from "sharp";

export const dynamic = "force-dynamic"; // Force dynamic rendering

async function fetchImageAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Stylr/1.0)',
      },
    });
    if (!response.ok) {
      console.warn(`Failed to fetch image from ${url}: ${response.statusText}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error);
    return null;
  }
}

type LayerSlot = "fullBody" | "top" | "bottom" | "jacket" | "shoes";

function getLayerSlot(item: { type: string | null; layeringCategory?: string | null }): LayerSlot | null {
  const layer = item.layeringCategory?.toLowerCase() || "";
  if (layer === "full-body") return "fullBody";
  if (layer === "top") return "top";
  if (layer === "bottom") return "bottom";
  if (layer === "jacket") return "jacket";
  if (layer === "shoes") return "shoes";

  const type = item.type?.toLowerCase() || "";
  if (/(dress|jumpsuit|romper|overall)/.test(type)) return "fullBody";
  if (/(pants|jeans|trousers|skirt|shorts|leggings|joggers)/.test(type)) return "bottom";
  if (/(jacket|coat|blazer|parka|windbreaker|bomber)/.test(type)) return "jacket";
  if (/(shoe|sneaker|boot|heel|loafer|sandal)/.test(type)) return "shoes";
  if (type) return "top";
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { outfitId, type = "saved", useAvatar = true } = await request.json();

    if (!outfitId) {
      return NextResponse.json(
        { error: "outfitId is required" },
        { status: 400 }
      );
    }

    // Get outfit data
    let outfit;
    let items;

    if (type === "saved") {
      outfit = await prisma.savedOutfit.findFirst({
        where: { 
          id: parseInt(outfitId),
          userId, // Ensure user owns the outfit
        },
      });
      if (!outfit) {
        return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
      }
      items = await prisma.clothingItem.findMany({
        where: { 
          id: { in: outfit.items },
          userId, // Ensure items belong to the user
        },
        select: {
          id: true,
          imageUrl: true,
          productImageUrl: true,
          type: true,
          primaryColor: true,
          layeringCategory: true,
        },
      });
    } else {
      outfit = await prisma.outfitRecommendation.findFirst({
        where: { 
          id: parseInt(outfitId),
          userId, // Ensure user owns the outfit
        },
      });
      if (!outfit) {
        return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
      }
      items = await prisma.clothingItem.findMany({
        where: { 
          id: { in: outfit.items },
          userId, // Ensure items belong to the user
        },
        select: {
          id: true,
          imageUrl: true,
          productImageUrl: true,
          type: true,
          primaryColor: true,
          layeringCategory: true,
        },
      });
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No items found in outfit" },
        { status: 400 }
      );
    }

    // Use productImageUrl if available (for purchase items), otherwise use imageUrl
    const itemsWithImages = items.map((item) => ({
      id: item.id,
      imageUrl: item.productImageUrl || item.imageUrl,
      type: item.type,
      primaryColor: item.primaryColor,
      layeringCategory: item.layeringCategory,
    }));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarImageUrl: true },
    });

    if (useAvatar && user?.avatarImageUrl) {
      const avatarBuffer = await fetchImageAsBuffer(user.avatarImageUrl);
      if (!avatarBuffer) {
        return NextResponse.json(
          { error: "Failed to load avatar image" },
          { status: 500 }
        );
      }

      const avatarWidth = 800;
      const avatarHeight = 1200;

      const avatarBase = await sharp(avatarBuffer)
        .rotate()
        .resize(avatarWidth, avatarHeight, {
          fit: "cover",
          position: "center",
        })
        .png()
        .toBuffer();

      const avatarCanvas = sharp(avatarBase);

      const placements: Record<LayerSlot, { x: number; y: number; w: number; h: number }> = {
        fullBody: { x: 0.2, y: 0.12, w: 0.6, h: 0.72 },
        top: { x: 0.22, y: 0.16, w: 0.56, h: 0.38 },
        jacket: { x: 0.18, y: 0.14, w: 0.64, h: 0.42 },
        bottom: { x: 0.24, y: 0.5, w: 0.52, h: 0.38 },
        shoes: { x: 0.28, y: 0.82, w: 0.44, h: 0.14 },
      };

      const slotItems = itemsWithImages
        .map((item) => ({
          item,
          slot: getLayerSlot(item),
        }))
        .filter((entry): entry is { item: typeof itemsWithImages[number]; slot: LayerSlot } => Boolean(entry.slot));

      const hasFullBody = slotItems.some((entry) => entry.slot === "fullBody");

      const orderedSlots: LayerSlot[] = hasFullBody
        ? ["fullBody", "shoes", "jacket"]
        : ["top", "bottom", "jacket", "shoes"];

      const composites: Array<{ input: Buffer; left: number; top: number }> = [];

      for (const slot of orderedSlots) {
        const slotEntry = slotItems.find((entry) => entry.slot === slot);
        if (!slotEntry) continue;

        const imageBuffer = await fetchImageAsBuffer(slotEntry.item.imageUrl);
        if (!imageBuffer) continue;

        const placement = placements[slot];
        const resized = await sharp(imageBuffer)
          .rotate()
          .resize(
            Math.round(placement.w * avatarWidth),
            Math.round(placement.h * avatarHeight),
            {
              fit: "contain",
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            }
          )
          .png()
          .toBuffer();

        composites.push({
          input: resized,
          left: Math.round(placement.x * avatarWidth),
          top: Math.round(placement.y * avatarHeight),
        });
      }

      if (composites.length === 0) {
        return NextResponse.json(
          { error: "No compatible items to overlay on avatar" },
          { status: 400 }
        );
      }

      const finalImage = await avatarCanvas.composite(composites).png().toBuffer();

      return new NextResponse(finalImage as unknown as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="outfit-${outfitId}-${Date.now()}.png"`,
        },
      });
    }

    // Configuration
    const itemSize = 300; // Size of each item image
    const padding = 20;
    const itemsPerRow = Math.min(4, itemsWithImages.length);
    const numRows = Math.ceil(itemsWithImages.length / itemsPerRow);
    const canvasWidth = itemsPerRow * itemSize + (itemsPerRow + 1) * padding;
    const canvasHeight = numRows * itemSize + (numRows + 1) * padding;

    // Create base canvas
    const canvas = sharp({
      create: {
        width: canvasWidth,
        height: canvasHeight,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

    // Fetch and process all item images
    const itemImages: Array<{ buffer: Buffer; x: number; y: number; type: string | null; color: string | null }> = [];
    
    for (let i = 0; i < itemsWithImages.length; i++) {
      const item = itemsWithImages[i];
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      const x = padding + col * (itemSize + padding);
      const y = padding + row * (itemSize + padding);

      const imageBuffer = await fetchImageAsBuffer(item.imageUrl);
      if (imageBuffer) {
        // Resize and process image
        // Use rotate() without arguments to auto-rotate based on EXIF orientation data
        const processedImage = await sharp(imageBuffer)
          .rotate() // Auto-rotate based on EXIF orientation
          .resize(itemSize, itemSize, {
            fit: 'cover',
            position: 'center',
          })
          .png()
          .toBuffer();

        itemImages.push({
          buffer: processedImage,
          x,
          y,
          type: item.type,
          color: item.primaryColor,
        });
      }
    }

    if (itemImages.length === 0) {
      return NextResponse.json(
        { error: "Failed to load any item images" },
        { status: 500 }
      );
    }

    // Compose images onto canvas (no text overlays to avoid fontconfig issues)
    const composites = itemImages.map((item) => ({
      input: item.buffer,
      left: item.x,
      top: item.y,
    }));

    // Generate final image
    let finalImage: Buffer;
    try {
      finalImage = await canvas
        .composite(composites)
        .png()
        .toBuffer();
      
      if (finalImage.length === 0) {
        throw new Error("Generated image is empty");
      }
    } catch (composeError) {
      console.error("Error composing images:", composeError);
      throw new Error(`Failed to compose images: ${composeError instanceof Error ? composeError.message : "Unknown error"}`);
    }

    // Return image as response
    return new NextResponse(finalImage as unknown as BodyInit, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="outfit-${outfitId}-${Date.now()}.png"`,
      },
    });
  } catch (error) {
    console.error("Error exporting outfit:", error);
    return NextResponse.json(
      { error: "Failed to export outfit", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

