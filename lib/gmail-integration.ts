import { google } from "googleapis";
import { prisma } from "./db";

/**
 * Create a new OAuth2 client with current environment variables
 * This ensures we always use fresh credentials, avoiding serverless caching issues
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "https://stylr.projcomfort.com/api/purchases/connect/gmail/callback"
  );
}

/**
 * Generate Gmail OAuth URL for user to authorize
 */
export function getGmailAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly", // Read emails only
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    state: userId, // Pass userId to identify user after redirect
  });
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(code: string, userId: string) {
  // Log credentials being used (masked for security)
  console.log('OAuth credentials check:', {
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 15) + '...',
    clientSecretPrefix: process.env.GOOGLE_CLIENT_SECRET?.substring(0, 10) + '...',
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });

  const oauth2Client = createOAuth2Client();

  let tokens;
  try {
    const result = await oauth2Client.getToken(code);
    tokens = result.tokens;
  } catch (error: any) {
    // Log detailed error from Google
    console.error('Google OAuth token exchange failed:', {
      error: error.message,
      code: error.code,
      response: error.response?.data,
    });
    throw error;
  }

  // Save tokens to database
  await prisma.emailConnection.upsert({
    where: { userId },
    create: {
      userId,
      provider: "gmail",
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
    },
    update: {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token || null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
    },
  });

  return tokens;
}

/**
 * Get Gmail client for a user
 */
export async function getGmailClient(userId: string) {
  const oauth2Client = createOAuth2Client();

  const connection = await prisma.emailConnection.findUnique({
    where: { userId, isActive: true },
  });

  if (!connection) {
    throw new Error("No Gmail connection found. Please connect your email first.");
  }

  // Check if token is expired
  const now = new Date();
  if (connection.expiresAt && connection.expiresAt < now) {
    // Refresh token
    if (!connection.refreshToken) {
      throw new Error("Refresh token not available. Please reconnect your email.");
    }

    console.log('Access token expired, attempting refresh...');

    try {
      oauth2Client.setCredentials({
        refresh_token: connection.refreshToken,
      });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update tokens in database
      await prisma.emailConnection.update({
        where: { userId },
        data: {
          accessToken: credentials.access_token!,
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      });

      oauth2Client.setCredentials(credentials);
      console.log('Successfully refreshed access token');
    } catch (refreshError: any) {
      console.error('Token refresh failed:', {
        error: refreshError.message,
        code: refreshError.code,
        status: refreshError.status,
      });

      // Mark connection as inactive if refresh fails
      await prisma.emailConnection.update({
        where: { userId },
        data: { isActive: false },
      });

      throw new Error(
        "Gmail connection expired and could not be refreshed. Please reconnect your Gmail account in Settings. " +
        "This usually happens if the app's OAuth consent is in testing mode or if you revoked access."
      );
    }
  } else {
    oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken || undefined,
    });
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Search for purchase-related emails with label support
 */
export async function searchPurchaseEmails(userId: string, daysBack: number = 30) {
  const gmail = await getGmailClient(userId);

  // Clear label cache at start of each scan
  clearLabelCache();

  // Calculate date for query
  const searchDate = new Date();
  searchDate.setDate(searchDate.getDate() - daysBack);
  const afterDate = Math.floor(searchDate.getTime() / 1000);

  // First, get all user labels to find shopping-related labels (including user-created variations)
  // This allows us to find labels even if they don't match our predefined list exactly
  let shoppingLabelNames: string[] = [];
  try {
    const labelsResponse = await gmail.users.labels.list({ userId: "me" });
    const allLabels = labelsResponse.data.labels || [];
    
    // Find labels that match shopping-related keywords (case-insensitive)
    const shoppingKeywords = ["shopping", "order", "receipt", "purchase", "amazon", "e-commerce", "ecommerce"];
    shoppingLabelNames = allLabels
      .filter((label: any) => {
        if (!label.name) return false;
        const labelNameLower = label.name.toLowerCase();
        return shoppingKeywords.some(keyword => labelNameLower.includes(keyword.toLowerCase()));
      })
      .map((label: any) => label.name);
    
    console.log(`Found ${shoppingLabelNames.length} shopping-related labels in user's account: ${shoppingLabelNames.join(", ")}`);
    
    // Log ALL user labels for debugging (to help identify exact label names)
    const allLabelNames = allLabels.map((l: any) => l.name).filter(Boolean).sort();
    console.log(`All user labels in account (${allLabelNames.length} total): ${allLabelNames.join(", ")}`);
    
    // Add common predefined labels if they're not already found
    const commonLabels = ["Shopping", "Orders", "Order Confirmations", "Receipts", "Purchases", "Amazon", "E-commerce"];
    commonLabels.forEach(label => {
      if (!shoppingLabelNames.includes(label)) {
        shoppingLabelNames.push(label);
      }
    });
    
    console.log(`Will search for these labels: ${shoppingLabelNames.join(", ")}`);
  } catch (err) {
    console.error("Error fetching user labels:", err);
    // Fallback to common labels if we can't fetch user labels
    shoppingLabelNames = ["Shopping", "Orders", "Receipts", "Purchases"];
  }

  // Strategy: Search for each shopping label individually, then combine results
  // This is more reliable than complex OR queries in Gmail API
  let allLabeledMessages: any[] = [];
  const labeledIds = new Set<string>();
  
  console.log(`Searching for emails with ${shoppingLabelNames.length} shopping labels...`);
  
  // Search each label individually to avoid Gmail API quirks with OR queries
  for (const labelName of shoppingLabelNames) {
    try {
      // Build query for this specific label
      let labelQuery: string;
      if (labelName.includes(" ")) {
        labelQuery = `label:"${labelName}" after:${afterDate}`;
      } else {
        labelQuery = `label:${labelName} after:${afterDate}`;
      }
      
      console.log(`  Searching for label "${labelName}": ${labelQuery}`);
      
      const response = await gmail.users.messages.list({
        userId: "me",
        q: labelQuery,
        maxResults: 100,
      });
      
      const messages = response.data.messages || [];
      console.log(`    Found ${messages.length} emails with label "${labelName}"`);
      
      // Add unique messages
      messages.forEach((msg: any) => {
        if (msg.id && !labeledIds.has(msg.id)) {
          allLabeledMessages.push(msg);
          labeledIds.add(msg.id);
        }
      });
    } catch (err) {
      console.error(`  Error searching for label "${labelName}":`, err);
      // Continue with other labels
    }
  }

  console.log(`Total found: ${allLabeledMessages.length} unique emails with shopping labels`);
  
  const labeledMessages = allLabeledMessages;

  // Priority 2: Emails with order confirmation subjects (even without labels)
  const subjectQuery = `
    (
      subject:("order confirmation" OR "order receipt" OR "order placed" OR "purchase confirmation" OR "thank you for your order" OR "your order #")
      -subject:("shipping" OR "shipped" OR "tracking" OR "delivery" OR "out for delivery" OR "on the way")
      -subject:("abandoned" OR "cart" OR "wishlist" OR "saved for later")
      -subject:("marketing" OR "promotion" OR "deal" OR "sale" OR "discount" OR "coupon")
    )
    after:${afterDate}
  `.trim().replace(/\s+/g, " ");

  // Search for subject-based emails (lower priority, exclude already found)
  console.log('Gmail search query (subject):', subjectQuery);
  const subjectResponse = await gmail.users.messages.list({
    userId: "me",
    q: subjectQuery,
    maxResults: 50,
  });

  // Combine results, prioritizing labeled emails
  const subjectMessages = (subjectResponse.data.messages || []).filter(
    (m) => m.id && !labeledIds.has(m.id)
  );

  const allMessages = [...labeledMessages, ...subjectMessages];
  console.log(`Found ${allMessages.length} total potential purchase emails (${labeledMessages.length} labeled, ${subjectMessages.length} subject-matched)`);

  // Log label details for first few labeled emails (for debugging)
  if (labeledMessages.length > 0) {
    console.log(`Fetching label details for ${Math.min(5, labeledMessages.length)} labeled emails...`);
    for (let i = 0; i < Math.min(5, labeledMessages.length); i++) {
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: labeledMessages[i].id!,
          format: "metadata",
          metadataHeaders: ["Subject"],
        });
        const labelIds = msg.data.labelIds || [];
        // Get actual label names
        const labelNames = await getLabelNames(gmail, labelIds);
        const subject = msg.data.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
        console.log(`  Email ${i + 1}: "${subject.substring(0, 50)}..." - Label IDs: [${labelIds.join(", ")}] - Label Names: [${labelNames.join(", ")}]`);
      } catch (err) {
        console.error(`  Error fetching email ${i + 1}:`, err);
      }
    }
  } else {
    console.log('⚠️  WARNING: No emails found with direct label search. Trying fallback approach...');
    
    // FALLBACK: Search more broadly, then check labels after fetching
    // This helps catch cases where Gmail's label search might miss emails
    const fallbackQuery = `(
      subject:("order" OR "receipt" OR "purchase" OR "confirmation" OR "thank you for your order" OR "order #" OR "order placed")
      -subject:("shipping" OR "shipped" OR "tracking" OR "delivery" OR "out for delivery")
    ) after:${afterDate}`;
    
    console.log('  Fallback query:', fallbackQuery);
    
    try {
      const fallbackResponse = await gmail.users.messages.list({
        userId: "me",
        q: fallbackQuery,
        maxResults: 100,
      });
      
      const fallbackMessages = fallbackResponse.data.messages || [];
      console.log(`  Found ${fallbackMessages.length} emails in fallback search. Checking labels...`);
      
      // Build label ID set for quick lookup
      const shoppingLabelIds = new Set<string>();
      try {
        const allLabelsResponse = await gmail.users.labels.list({ userId: "me" });
        const allLabels = allLabelsResponse.data.labels || [];
        shoppingLabelNames.forEach(labelName => {
          const label = allLabels.find((l: any) => 
            l.name && l.name.toLowerCase() === labelName.toLowerCase()
          );
          if (label?.id) {
            shoppingLabelIds.add(label.id);
          }
        });
        console.log(`  Shopping label IDs to match: [${Array.from(shoppingLabelIds).join(", ")}]`);
      } catch (err) {
        console.error("  Error building label ID set:", err);
      }
      
      // Check each email's labels
      let labeledFromFallback = 0;
      for (const msg of fallbackMessages) {
        if (!msg.id || labeledIds.has(msg.id)) continue; // Skip if already found
        
        try {
          const msgDetail = await gmail.users.messages.get({
            userId: "me",
            id: msg.id,
            format: "metadata",
            metadataHeaders: ["Subject"],
          });
          
          const msgLabelIds = msgDetail.data.labelIds || [];
          
          // Check if this email has any shopping labels
          const hasShoppingLabel = Array.from(shoppingLabelIds).some(id => 
            msgLabelIds.includes(id)
          );
          
          if (hasShoppingLabel) {
            if (!labeledIds.has(msg.id)) {
              labeledMessages.push(msg);
              labeledIds.add(msg.id);
              labeledFromFallback++;
              
              // Log first few for debugging
              if (labeledFromFallback <= 3) {
                const labelNames = await getLabelNames(gmail, msgLabelIds);
                const subject = msgDetail.data.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
                console.log(`    ✓ Found labeled email: "${subject.substring(0, 50)}..." - Labels: [${labelNames.join(", ")}]`);
              }
            }
          }
        } catch (err) {
          console.error(`  Error checking labels for email ${msg.id}:`, err);
          // Continue with other emails
        }
      }
      
      if (labeledFromFallback > 0) {
        console.log(`  ✅ Found ${labeledFromFallback} additional labeled emails via fallback approach`);
        // Rebuild allMessages with updated labeledMessages
        const updatedLabeledIds = new Set(labeledMessages.map((m) => m.id).filter((id): id is string => !!id));
        const subjectMessages = (subjectResponse.data.messages || []).filter(
          (m) => m.id && !updatedLabeledIds.has(m.id)
        );
        return [...labeledMessages, ...subjectMessages];
      } else {
        console.log('  ⚠️  Fallback approach also found no labeled emails.');
        console.log('  Possible reasons:');
        console.log('    1. The label name doesn\'t match exactly (check case sensitivity)');
        console.log('    2. Emails are outside the date range');
        console.log('    3. The label hasn\'t been applied yet');
        console.log('    4. Label search syntax might need adjustment');
      }
    } catch (err) {
      console.error('  Error in fallback search:', err);
    }
  }

  return allMessages;
}

// Cache for label ID to name mapping (scoped per request)
let labelCache: Map<string, string> | null = null;

/**
 * Get label names from label IDs (with caching)
 */
async function getLabelNames(gmail: any, labelIds: string[]): Promise<string[]> {
  try {
    // Fetch labels list once and cache it
    if (!labelCache) {
      const labelsResponse = await gmail.users.labels.list({ userId: "me" });
      const allLabels = labelsResponse.data.labels || [];
      
      // Create a map of label ID to name
      labelCache = new Map<string, string>();
      allLabels.forEach((label: any) => {
        if (label.id && label.name) {
          labelCache!.set(label.id, label.name);
        }
      });
    }

    // Map label IDs to names
    return labelIds.map(id => labelCache!.get(id) || id).filter(Boolean) as string[];
  } catch (error) {
    console.error("Error fetching label names:", error);
    // Fallback: return label IDs as-is if we can't fetch names
    return labelIds;
  }
}

/**
 * Clear label cache (call at start of each scan to get fresh data)
 */
function clearLabelCache() {
  labelCache = null;
}

/**
 * Get full email content including labels (with label names, not just IDs)
 */
export async function getEmailContent(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);

  const message = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  // Extract email subject
  const subject =
    message.data.payload?.headers?.find((h) => h.name?.toLowerCase() === "subject")
      ?.value || "";

  // Extract email sender (From field)
  const from =
    message.data.payload?.headers?.find((h) => h.name?.toLowerCase() === "from")
      ?.value || "";

  // Extract email body (recursively handle nested MIME parts)
  let body = "";

  // Recursive function to extract text from all MIME parts
  function extractTextFromPart(part: any) {
    if ((part.mimeType === "text/html" || part.mimeType === "text/plain") && part.body?.data) {
      body += Buffer.from(part.body.data, "base64").toString("utf-8");
    }

    // Recursively process nested parts (for multipart/alternative, multipart/mixed, etc.)
    if (part.parts && Array.isArray(part.parts)) {
      for (const nestedPart of part.parts) {
        extractTextFromPart(nestedPart);
      }
    }
  }

  // Handle single-part email (body data directly in payload)
  if (message.data.payload?.body?.data) {
    body = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
  }

  // Handle multi-part email (recursively extract from all parts)
  if (message.data.payload?.parts) {
    for (const part of message.data.payload.parts) {
      extractTextFromPart(part);
    }
  }

  // Extract label IDs and convert to label names
  const labelIds = message.data.labelIds || [];
  const labelNames = await getLabelNames(gmail, labelIds);

  return {
    id: messageId,
    subject,
    from,
    body,
    labels: labelNames, // Now using label names instead of IDs
  };
}

/**
 * Pre-filter emails to skip those that clearly don't contain order details
 * This prevents sending shipping updates, marketing emails, etc. to the AI
 */
export function shouldProcessEmail(subject: string, body: string, labels: string[] = [], from?: string): {
  shouldProcess: boolean;
  reason?: string;
} {
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.substring(0, 1000).toLowerCase(); // Check first 1000 chars for speed
  const fromLower = (from || "").toLowerCase();

  // EXCLUDE: Known non-clothing brands/companies (they never sell clothing)
  const nonClothingBrands = [
    'apple', 'anthropic', 'anthropic pbc', 'openai', 'google', 'microsoft', 
    'amazon web services', 'aws', 'netflix', 'spotify', 'adobe', 'salesforce',
    'github', 'gitlab', 'replicate', 'vercel', 'stripe', 'paypal', 'square',
    'uber', 'lyft', 'doordash', 'ubereats', 'grubhub', 'instacart',
    'best buy', 'gamestop', 'ebay', 'facebook', 'meta', 'twitter', 'x.com',
    'linkedin', 'snapchat', 'tiktok', 'youtube', 'twitch', 'discord',
    'slack', 'zoom', 'dropbox', 'box', 'onedrive', 'icloud',
    'intel', 'amd', 'nvidia', 'samsung', 'sony', 'lg', 'panasonic',
    'home depot', 'lowes', 'ikea', 'wayfair', 'overstock', 'bed bath beyond'
  ];

  // Check if email is from a known non-clothing brand
  const isFromNonClothingBrand = nonClothingBrands.some(brand => {
    const brandLower = brand.toLowerCase();
    return fromLower.includes(brandLower) || 
           subjectLower.includes(brandLower) ||
           bodyLower.includes(`from ${brandLower}`) ||
           bodyLower.includes(`by ${brandLower}`);
  });

  if (isFromNonClothingBrand) {
    return { shouldProcess: false, reason: `Email from non-clothing brand: ${from || 'unknown sender'}` };
  }

  // EXCLUDE: Shipping/tracking emails (no order details, just shipping status)
  const shippingKeywords = [
    "has shipped",
    "is on the way",
    "out for delivery",
    "delivered",
    "tracking",
    "track your package",
    "shipment",
    "shipping confirmation",
    "on the way",
    "en route",
    "arrived",
    "delivery update",
  ];
  
  if (shippingKeywords.some(keyword => subjectLower.includes(keyword))) {
    // BUT allow if email also contains order details (item list, prices)
    const hasOrderDetails = 
      bodyLower.includes("item") && bodyLower.includes("$") ||
      bodyLower.includes("product") && bodyLower.includes("price") ||
      bodyLower.includes("qty") || bodyLower.includes("quantity");
    
    if (!hasOrderDetails) {
      return { shouldProcess: false, reason: "Shipping/tracking email without order details" };
    }
  }

  // EXCLUDE: Marketing/promotional emails
  const marketingKeywords = [
    "abandoned cart",
    "items left in your cart",
    "forgot something",
    "complete your order",
    "wishlist",
    "saved for later",
    "promotion",
    "deal",
    "discount",
    "sale",
    "coupon",
    "free shipping",
    "special offer",
    "newsletter",
    "catalog",
  ];
  
  if (marketingKeywords.some(keyword => subjectLower.includes(keyword))) {
    return { shouldProcess: false, reason: "Marketing/promotional email" };
  }

  // EXCLUDE: Non-order emails (confirmations for subscriptions, services, etc.)
  const nonOrderKeywords = [
    "subscription",
    "membership",
    "renewal",
    "payment receipt", // Usually for services, not products
    "invoice", // Generic invoices might not be product orders
  ];
  
  // But allow invoices/receipts if they contain product/item information
  if (nonOrderKeywords.some(keyword => subjectLower.includes(keyword))) {
    const hasProductInfo = 
      bodyLower.includes("item") || 
      bodyLower.includes("product") || 
      bodyLower.includes("qty") ||
      bodyLower.includes("quantity");
    
    if (!hasProductInfo) {
      return { shouldProcess: false, reason: "Non-product order email (subscription/service)" };
    }
  }

  // INCLUDE: Emails with shopping labels (highest priority - trust user's labeling)
  // Gmail labels are case-sensitive, so check both exact match and case-insensitive
  const shoppingLabels = ["shopping", "orders", "order confirmations", "receipts", "purchases", "amazon", "e-commerce"];
  const hasShoppingLabel = labels.some(label => {
    const labelLower = label.toLowerCase();
    return shoppingLabels.some(shoppingLabel => 
      labelLower === shoppingLabel.toLowerCase() || 
      labelLower.includes(shoppingLabel.toLowerCase()) ||
      shoppingLabel.toLowerCase().includes(labelLower)
    );
  });
  
  if (hasShoppingLabel) {
    return { shouldProcess: true, reason: `Email has shopping label: ${labels.find(l => shoppingLabels.some(sl => l.toLowerCase().includes(sl.toLowerCase())))}` };
  }

  // INCLUDE: Order confirmation keywords in subject
  const orderKeywords = [
    "order confirmation",
    "order receipt",
    "order placed",
    "purchase confirmation",
    "thank you for your order",
    "your order #",
    "order number",
  ];
  
  if (orderKeywords.some(keyword => subjectLower.includes(keyword))) {
    return { shouldProcess: true, reason: "Order confirmation email" };
  }

  // Default: Process if it made it through the search query
  return { shouldProcess: true, reason: "Matches search criteria" };
}

/**
 * Disconnect Gmail integration
 */
export async function disconnectGmail(userId: string) {
  await prisma.emailConnection.update({
    where: { userId },
    data: { isActive: false },
  });
}
