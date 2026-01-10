import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateSpendingInsights } from "@/lib/purchase-recommendations";
import { normalizeClothingType, estimateVibe, ParsedPurchase, ParsedItem } from "@/lib/purchase-parser";

export const dynamic = "force-dynamic";

/**
 * GET - Retrieve user's purchase history
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeStats = searchParams.get("stats") === "true";

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const purchases = await prisma.purchaseHistory.findMany({
      where: { userId },
      orderBy: { purchaseDate: "desc" },
      take: limit,
    });

    const response: any = {
      purchases,
      count: purchases.length,
    };

    if (includeStats) {
      const allPurchases = await prisma.purchaseHistory.findMany({
        where: { userId },
      });

      response.stats = calculateSpendingInsights(allPurchases);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Get purchases error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

/**
 * POST - Manually add a purchase
 * 
 * Accepts two formats:
 * 1. Single item (backward compatible):
 *    { userId, itemName, store, purchaseDate, price, brand, itemType, color, imageUrl }
 * 
 * 2. Parsed purchase structure (for manual email data entry):
 *    { userId, items: [{ name, price, type, color, brand, imageUrl }], store, orderNumber, purchaseDate, total }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, items, store, orderNumber, purchaseDate, total } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Check if this is the new format (ParsedPurchase with items array)
    if (items && Array.isArray(items) && items.length > 0) {
      // New format: multiple items from parsed purchase
      const purchases = [];
      let addedToWardrobeCount = 0;

      for (const item of items) {
        if (!item.name || !store) {
          continue; // Skip invalid items
        }

        // Create purchase history entry
        const purchase = await prisma.purchaseHistory.create({
          data: {
            userId,
            itemName: item.name,
            brand: item.brand || null,
            store: store,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
            price: item.price || total || null,
            orderNumber: orderNumber || null,
            itemType: item.type ? normalizeClothingType(item.type) : null,
            color: item.color || null,
            estimatedVibe: estimateVibe(item.name),
            addedToWardrobe: false,
          },
        });

        // Create clothing item in wardrobe
        try {
          const itemType = item.type ? normalizeClothingType(item.type) : 'clothing';
          const placeholderImage = `https://via.placeholder.com/400x500/9ca3af/ffffff?text=${encodeURIComponent(itemType || 'Item')}`;
          const imageUrl = item.imageUrl || placeholderImage;

          const clothingItem = await prisma.clothingItem.create({
            data: {
              userId,
              imageUrl: imageUrl,
              productImageUrl: item.imageUrl || null,
              type: itemType,
              primaryColor: item.color || null,
              brand: item.brand || null,
              vibe: estimateVibe(item.name),
              notes: `Manually added from ${store}${purchaseDate ? ` on ${new Date(purchaseDate).toISOString().split('T')[0]}` : ''}${item.price ? ` for $${item.price}` : ''}`,
              tags: [
                store,
                ...(item.brand ? [item.brand] : []),
                ...(item.color ? [item.color] : []),
              ].filter(Boolean),
            },
          });

          // Link purchase to clothing item
          await prisma.purchaseHistory.update({
            where: { id: purchase.id },
            data: {
              addedToWardrobe: true,
              clothingItemId: clothingItem.id,
            },
          });

          addedToWardrobeCount++;
          const imageSource = item.imageUrl ? '📸 with product image' : '🖼️  with placeholder';
          console.log(`✅ Added "${item.name}" to wardrobe ${imageSource} (ID: ${clothingItem.id})`);
          if (item.imageUrl) {
            console.log(`   Image URL: ${item.imageUrl.substring(0, 100)}${item.imageUrl.length > 100 ? '...' : ''}`);
          }
        } catch (wardrobeError) {
          console.error(`Failed to add "${item.name}" to wardrobe:`, wardrobeError);
          // Continue - purchase is still tracked even if wardrobe addition fails
        }

        purchases.push(purchase);
      }

      return NextResponse.json({
        purchases,
        addedToWardrobe: addedToWardrobeCount,
        message: `Added ${purchases.length} purchase(s), ${addedToWardrobeCount} added to wardrobe`,
      });
    } else {
      // Old format: single item (backward compatible)
      const {
        itemName,
        price,
        brand,
        itemType,
        color,
        imageUrl,
      } = body;

      if (!itemName || !store) {
        return NextResponse.json(
          { error: "itemName and store are required" },
          { status: 400 }
        );
      }

      const purchase = await prisma.purchaseHistory.create({
        data: {
          userId,
          itemName,
          store,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          price: price || null,
          brand: brand || null,
          itemType: itemType || null,
          color: color || null,
        },
      });

      // Optionally add to wardrobe if imageUrl is provided
      if (imageUrl) {
        try {
          const clothingItem = await prisma.clothingItem.create({
            data: {
              userId,
              imageUrl: imageUrl,
              productImageUrl: imageUrl,
              type: itemType ? normalizeClothingType(itemType) : null,
              primaryColor: color || null,
              brand: brand || null,
              vibe: estimateVibe(itemName),
              notes: `Manually added from ${store}${purchaseDate ? ` on ${new Date(purchaseDate).toISOString().split('T')[0]}` : ''}${price ? ` for $${price}` : ''}`,
              tags: [
                store,
                ...(brand ? [brand] : []),
                ...(color ? [color] : []),
              ].filter(Boolean),
            },
          });

          await prisma.purchaseHistory.update({
            where: { id: purchase.id },
            data: {
              addedToWardrobe: true,
              clothingItemId: clothingItem.id,
            },
          });
        } catch (wardrobeError) {
          console.error(`Failed to add "${itemName}" to wardrobe:`, wardrobeError);
        }
      }

      return NextResponse.json({
        purchase,
        message: "Purchase added successfully",
      });
    }
  } catch (error) {
    console.error("Add purchase error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add purchase" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a purchase
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Purchase ID is required" },
        { status: 400 }
      );
    }

    await prisma.purchaseHistory.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      message: "Purchase deleted successfully",
    });
  } catch (error) {
    console.error("Delete purchase error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete purchase" },
      { status: 500 }
    );
  }
}
