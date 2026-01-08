import { google } from "googleapis";
import { prisma } from "./db";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "https://stylr.projcomfort.com/api/purchases/connect/gmail/callback"
);

/**
 * Generate Gmail OAuth URL for user to authorize
 */
export function getGmailAuthUrl(userId: string): string {
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

  const { tokens } = await oauth2Client.getToken(code);

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

  // Build search query for common retailers and order confirmations
  const query = `
    (from:(amazon.com OR nordstrom.com OR jcrew.com OR uniqlo.com OR hm.com OR zara.com OR gap.com OR oldnavy.com OR bananarepublic.com OR macys.com OR bloomingdales.com OR shopify.com OR etsy.com)
    OR subject:(order confirmation OR order receipt OR shipment OR tracking OR "your order"))
    after:${afterDate}
  `.trim().replace(/\s+/g, " ");

  const response = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 100, // Limit to avoid rate limits
  });

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
