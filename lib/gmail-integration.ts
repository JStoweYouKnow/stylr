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
 * Search for purchase-related emails
 */
export async function searchPurchaseEmails(userId: string, daysBack: number = 30) {
  const gmail = await getGmailClient(userId);

  // Calculate date for query
  const searchDate = new Date();
  searchDate.setDate(searchDate.getDate() - daysBack);
  const afterDate = Math.floor(searchDate.getTime() / 1000);

  // Build comprehensive search query for purchase confirmations
  // Focus on clothing-related keywords and common fashion retailers
  const query = `
    (
      subject:(
        "order confirmation" OR
        "order receipt" OR
        "order placed" OR
        "purchase confirmation" OR
        "thank you for your order" OR
        "your order" OR
        "shipment" OR
        "shipping confirmation" OR
        "has shipped"
      )
      (
        clothing OR apparel OR fashion OR style OR wear OR
        shirt OR pants OR jeans OR dress OR shoes OR jacket OR coat OR
        sweater OR hoodie OR shorts OR skirt OR boots OR sneakers OR
        "Nordstrom" OR "Banana Republic" OR "Gap" OR "Old Navy" OR
        "H&M" OR "Zara" OR "Uniqlo" OR "GU" OR "J.Crew" OR "Madewell" OR
        "Levi's" OR "Nike" OR "Adidas" OR "ASOS" OR "Everlane" OR
        "Urban Outfitters" OR "Anthropologie" OR "Free People" OR
        "Macy's" OR "Bloomingdale's" OR "Saks" OR "Neiman Marcus"
      )
    )
    after:${afterDate}
  `.trim().replace(/\s+/g, " ");

  console.log('Gmail search query:', query);

  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100, // Limit to avoid rate limits
  });

  console.log(`Found ${response.data.messages?.length || 0} potential purchase emails`);

  return response.data.messages || [];
}

/**
 * Get full email content
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

  return {
    id: messageId,
    subject,
    body,
  };
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
