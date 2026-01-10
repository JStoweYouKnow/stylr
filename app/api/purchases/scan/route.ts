import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchPurchaseEmails, getEmailContent, shouldProcessEmail } from "@/lib/gmail-integration";
import { parseReceiptWithAI, normalizeClothingType, estimateVibe } from "@/lib/purchase-parser";

export const dynamic = "force-dynamic";

/**
 * POST - Scan Gmail for purchase receipts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, daysBack = 30 } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Search for purchase emails
    const messages = await searchPurchaseEmails(userId, daysBack);

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        scanned: 0,
        found: 0,
        new: 0,
        duplicates: 0,
        addedToWardrobe: 0,
        purchases: [],
        message: "No purchase emails found in the specified time range",
      });
    }

    let foundCount = 0;
    let newCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    let addedToWardrobeCount = 0;
    const purchases = [];
    
    // Track item names across emails to detect template reuse
    const seenItemNames = new Map<string, { count: number; emails: string[] }>();

    // Process each email
    for (const message of messages) {
      if (!message.id) continue;

      try {
        // Get email content (includes labels now)
        const email = await getEmailContent(userId, message.id);

        console.log(`Processing email: "${email.subject.substring(0, 100)}"`);
        if (email.from) {
          console.log(`  From: ${email.from}`);
        }
        if (email.labels && email.labels.length > 0) {
          console.log(`  Labels: ${email.labels.join(", ")}`);
        }

        // Pre-filter: Skip emails that clearly don't contain order details
        const filterResult = shouldProcessEmail(email.subject, email.body, email.labels || [], email.from);
        if (!filterResult.shouldProcess) {
          console.log(`  ⏭️  Skipping: ${filterResult.reason}`);
          skippedCount++;
          continue;
        }

        console.log(`  ✅ Processing: ${filterResult.reason || "Matches criteria"}`);

        // Parse receipt with AI (pass email.from to help differentiate emails)
        const parsed = await parseReceiptWithAI(email.subject, email.body, email.from);

        console.log('AI parse result:', {
          itemsCount: parsed.items?.length || 0,
          store: parsed.store,
          orderNumber: parsed.orderNumber,
          items: parsed.items?.map(i => ({ name: i.name, type: i.type })) || []
        });

        if (parsed.items.length === 0) {
          console.log('⚠️  Skipping - no clothing items found in parsed result');
          continue; // No clothing items found
        }

        // Check for duplicate item names across emails (indicates template reuse)
        for (const item of parsed.items) {
          const normalizedName = item.name.toLowerCase().trim();
          if (!seenItemNames.has(normalizedName)) {
            seenItemNames.set(normalizedName, { count: 0, emails: [] });
          }
          const entry = seenItemNames.get(normalizedName)!;
          entry.count++;
          entry.emails.push(email.subject);
        }

        console.log(`Found ${parsed.items.length} clothing items from ${parsed.store || 'unknown store'}`);
        foundCount++;

        // Check if we already have this order (check if ANY item from this order exists)
        // This prevents re-importing the same order on subsequent scans
        if (parsed.orderNumber) {
          const existing = await prisma.purchaseHistory.findFirst({
            where: {
              orderNumber: parsed.orderNumber,
              userId: userId
            },
          });

          if (existing) {
            console.log(`Skipping duplicate order: ${parsed.orderNumber}`);
            duplicateCount++;
            continue; // Skip this entire order - we've already processed it before
          }
        }

        // Save each item from the order and add to wardrobe
        for (const item of parsed.items) {
          // First create the purchase history entry
          const purchase = await prisma.purchaseHistory.create({
            data: {
              userId,
              itemName: item.name,
              brand: item.brand || null,
              store: parsed.store || "Unknown",
              purchaseDate: parsed.purchaseDate
                ? new Date(parsed.purchaseDate)
                : new Date(),
              price: item.price || parsed.total || null,
              orderNumber: parsed.orderNumber || null,
              itemType: item.type ? normalizeClothingType(item.type) : null,
              color: item.color || null,
              estimatedVibe: estimateVibe(item.name),
              emailId: message.id,
              emailSubject: email.subject,
              addedToWardrobe: false, // Will update after creating clothing item
            },
          });

          // Create a clothing item in the wardrobe
          try {
            // Generate a placeholder image URL based on item type
            const itemType = item.type ? normalizeClothingType(item.type) : 'clothing';
            const placeholderImage = `https://via.placeholder.com/400x500/9ca3af/ffffff?text=${encodeURIComponent(itemType || 'Item')}`;

            // Use extracted image URL if available, otherwise use placeholder
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
                notes: `Purchased from ${parsed.store || "Unknown"} on ${parsed.purchaseDate || new Date().toISOString().split('T')[0]}${item.price ? ` for $${item.price}` : ''}`,
                tags: [
                  parsed.store || "Unknown",
                  ...(item.brand ? [item.brand] : []),
                  ...(item.color ? [item.color] : []),
                ].filter(Boolean),
              },
            });

            // Link the purchase to the clothing item
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
          } catch (wardrobeError) {
            console.error(`⚠️  Failed to add "${item.name}" to wardrobe:`, wardrobeError);
            // Continue - purchase is still tracked even if wardrobe addition fails
          }

          purchases.push(purchase);
          newCount++;
        }
      } catch (emailError) {
        console.error(`Failed to process email ${message.id}:`, emailError);
        // Continue processing other emails
      }
    }
    
    // Report on duplicate item names (possible template reuse)
    const suspiciousItems = Array.from(seenItemNames.entries())
      .filter(([name, data]) => data.count > 1 && data.emails.length > 1)
      .sort((a, b) => b[1].count - a[1].count);
    
    if (suspiciousItems.length > 0) {
      console.log('\n⚠️  WARNING: Found items with identical names across multiple emails:');
      for (const [itemName, data] of suspiciousItems) {
        console.log(`   "${itemName}" appears ${data.count} times in ${data.emails.length} different emails:`);
        data.emails.slice(0, 3).forEach(subject => {
          console.log(`     - ${subject.substring(0, 60)}...`);
        });
        if (data.emails.length > 3) {
          console.log(`     ... and ${data.emails.length - 3} more`);
        }
        console.log(`   This might indicate the parser is reusing templates instead of parsing each email independently.`);
      }
    }

    // Update last synced timestamp
    await prisma.emailConnection.update({
      where: { userId },
      data: { lastSyncedAt: new Date() },
    }).catch(err => {
      // If no email connection exists, that's okay - user might be using manual entry
      console.log('Could not update lastSyncedAt:', err.message);
    });

    return NextResponse.json({
      scanned: messages.length,
      skipped: skippedCount,
      found: foundCount,
      new: newCount,
      duplicates: duplicateCount,
      addedToWardrobe: addedToWardrobeCount,
      purchases,
      message: `Scanned ${messages.length} emails, skipped ${skippedCount} non-order emails, found ${foundCount} purchases, added ${newCount} new items${addedToWardrobeCount > 0 ? ` (${addedToWardrobeCount} added to wardrobe)` : ''}`,
    });
  } catch (error) {
    console.error("Purchase scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan purchases" },
      { status: 500 }
    );
  }
}
