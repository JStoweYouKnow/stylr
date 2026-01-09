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
  // Priority 1: Emails with shopping labels AND order confirmation subject
  const labeledQuery = `
    (
      label:(${shoppingLabels.join(" OR ")}) AND
      subject:("order confirmation" OR "order receipt" OR "order placed" OR "purchase confirmation" OR "thank you for your order" OR "your order #" OR "order number" OR "receipt")
    )
    after:${afterDate}
  `.trim().replace(/\s+/g, " ");

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
  const labeledResponse = await gmail.users.messages.list({
    userId: "me",
    q: labeledQuery,
    maxResults: 50,
  });

  const labeledMessages = labeledResponse.data.messages || [];
  const labeledIds = new Set(labeledMessages.map((m) => m.id));

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
  console.log(`Found ${allMessages.length} potential purchase emails (${labeledMessages.length} labeled, ${subjectMessages.length} subject-matched)`);

  return allMessages;
}

/**
 * Get full email content including labels
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

  // Extract labels
  const labels = message.data.labelIds || [];

  return {
    id: messageId,
    subject,
    body,
    labels,
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

  // INCLUDE: Emails with shopping labels (likely important)
  const shoppingLabels = ["shopping", "orders", "receipts", "purchases", "amazon"];
  const hasShoppingLabel = labels.some(label => 
    shoppingLabels.some(shoppingLabel => label.toLowerCase().includes(shoppingLabel))
  );
  
  if (hasShoppingLabel) {
    return { shouldProcess: true, reason: "Email has shopping label" };
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
