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
        purchases: [],
        message: "No purchase emails found in the specified time range",
      });
    }

    let foundCount = 0;
    let newCount = 0;
    let duplicateCount = 0;
    let skippedCount = 0;
    const purchases = [];

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

        // Parse receipt with AI
        const parsed = await parseReceiptWithAI(email.subject, email.body);

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

        // Save each item from the order
        for (const item of parsed.items) {
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
            },
          });

          purchases.push(purchase);
          newCount++;
        }
      } catch (emailError) {
        console.error(`Failed to process email ${message.id}:`, emailError);
        // Continue processing other emails
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
      purchases,
      message: `Scanned ${messages.length} emails, skipped ${skippedCount} non-order emails, found ${foundCount} purchases, added ${newCount} new items`,
    });
  } catch (error) {
    console.error("Purchase scan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan purchases" },
      { status: 500 }
    );
  }
}
