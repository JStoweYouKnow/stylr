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

  // Common Gmail labels for shopping/orders
  const shoppingLabels = [
    "Shopping",
    "Orders", 
    "Order Confirmations",
    "Receipts",
    "Purchases",
    "Amazon",
    "E-commerce",
  ];

  // Build query prioritizing labeled emails first
  // Priority 1: Emails with shopping labels (no subject restriction - trust the label)
  // Gmail label search: Use format label:LabelName for single word, label:"Label Name" for multi-word
  const labelQueryParts = shoppingLabels.map(label => {
    // If label has spaces, wrap in quotes; otherwise use as-is
    if (label.includes(" ")) {
      return `label:"${label}"`;
    } else {
      return `label:${label}`;
    }
  });
  
  const labeledQuery = `(${labelQueryParts.join(" OR ")}) after:${afterDate}`.trim().replace(/\s+/g, " ");

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

  // Search for labeled emails first (higher priority)
  console.log('Gmail search query (labeled):', labeledQuery);
  console.log('Searching for labels:', shoppingLabels.join(", "));
  
  const labeledResponse = await gmail.users.messages.list({
    userId: "me",
    q: labeledQuery,
    maxResults: 50,
  });

  const labeledMessages = labeledResponse.data.messages || [];
  const labeledIds = new Set(labeledMessages.map((m) => m.id));
  console.log(`Found ${labeledMessages.length} emails with shopping labels`);

  // Search for subject-based emails (lower priority, exclude already found)
  console.log('Gmail search query (subject):', subjectQuery);
  const subjectResponse = await gmail.users.messages.list({
    userId: "me",
    q: subjectQuery,
    maxResults: 50,
  });

  // Combine results, prioritizing labeled emails
  const subjectMessages = (subjectResponse.data.messages || []).filter(
    (m) => !labeledIds.has(m.id)
  );

  const allMessages = [...labeledMessages, ...subjectMessages];
  console.log(`Found ${allMessages.length} total potential purchase emails (${labeledMessages.length} labeled, ${subjectMessages.length} subject-matched)`);

  // Log label details for first few labeled emails (for debugging)
  if (labeledMessages.length > 0) {
    console.log(`Fetching label details for ${Math.min(3, labeledMessages.length)} labeled emails...`);
    for (let i = 0; i < Math.min(3, labeledMessages.length); i++) {
      try {
        const msg = await gmail.users.messages.get({
          userId: "me",
          id: labeledMessages[i].id!,
          format: "metadata",
          metadataHeaders: ["Subject"],
        });
        const labels = msg.data.labelIds || [];
        const subject = msg.data.payload?.headers?.find(h => h.name?.toLowerCase() === "subject")?.value || "";
        console.log(`  Email ${i + 1}: "${subject.substring(0, 50)}..." - Labels: [${labels.join(", ")}]`);
      } catch (err) {
        console.error(`  Error fetching email ${i + 1}:`, err);
      }
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

  // Extract email body
  let body = "";
  if (message.data.payload?.body?.data) {
    body = Buffer.from(message.data.payload.body.data, "base64").toString("utf-8");
  } else if (message.data.payload?.parts) {
    // Multi-part email
    for (const part of message.data.payload.parts) {
      if (part.mimeType === "text/plain" || part.mimeType === "text/html") {
        if (part.body?.data) {
          body += Buffer.from(part.body.data, "base64").toString("utf-8");
        }
      }
    }
  }

  // Extract label IDs and convert to label names
  const labelIds = message.data.labelIds || [];
  const labelNames = await getLabelNames(gmail, labelIds);

  return {
    id: messageId,
    subject,
    body,
    labels: labelNames, // Now using label names instead of IDs
  };
}

/**
 * Pre-filter emails to skip those that clearly don't contain order details
 * This prevents sending shipping updates, marketing emails, etc. to the AI
 */
export function shouldProcessEmail(subject: string, body: string, labels: string[] = []): {
  shouldProcess: boolean;
  reason?: string;
} {
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.substring(0, 1000).toLowerCase(); // Check first 1000 chars for speed

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
