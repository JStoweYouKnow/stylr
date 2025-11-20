# Purchase History Tracking & Recommendations

## Overview

Stylr can scan your email for purchase receipts and use your shopping patterns to:
- Identify clothing gaps in your wardrobe
- Suggest items that complement recent purchases
- Track spending patterns and favorite brands
- Recommend similar items you already own instead of new purchases

## Free Integration Options

### Option 1: Gmail API (Recommended) ✅ FREE
**Cost**: Completely FREE (1 billion quota units/day)
**Setup Time**: 15-20 minutes
**Privacy**: Secure OAuth 2.0, only reads emails you authorize

### Option 2: IMAP Email Scanning ✅ FREE
**Cost**: FREE (works with any email provider)
**Setup Time**: 10 minutes
**Privacy**: Direct connection, credentials stored securely

### Option 3: Manual Upload 📧 FREE
**Cost**: FREE (no API needed)
**Setup Time**: Immediate
**Privacy**: Complete control

---

## Implementation: Gmail API (Best Option)

### Architecture

```
User → OAuth Consent → Gmail API → Extract Receipts → Parse Items → Match with Wardrobe → Recommendations
```

### What Gets Scanned

The app looks for emails from:
- **Retailers**: Zara, H&M, ASOS, Nordstrom, Uniqlo, etc.
- **Marketplaces**: Amazon, eBay, Poshmark, Depop
- **Delivery Confirmations**: Tracking emails with order details
- **Keywords**: "order confirmation", "receipt", "shipment", "order #"

### What Data Is Extracted

From each email:
- **Item descriptions** (e.g., "Navy Blazer", "White T-Shirt")
- **Purchase date**
- **Store/brand**
- **Price** (optional, for budget tracking)
- **Order number** (to avoid duplicates)

### Privacy & Security

- ✅ **OAuth 2.0** - Google's secure authorization
- ✅ **Scoped permissions** - Only reads emails (no send/delete)
- ✅ **User control** - Can revoke access anytime
- ✅ **No storage of emails** - Only extracts purchase data
- ✅ **Optional feature** - Users opt-in

---

## Free Gmail API Setup (For Developers)

### Step 1: Enable Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable "Gmail API"
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`

### Step 2: Environment Variables

```bash
# .env
GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

### Step 3: Install Dependencies (FREE)

```bash
npm install googleapis
```

**Cost**: $0 (open source library)

---

## Database Schema

```prisma
model PurchaseHistory {
  id          Int      @id @default(autoincrement())
  user        User     @relation(fields: [userId], references: [id])
  userId      String

  // Purchase details
  itemName        String
  brand           String?
  store           String
  purchaseDate    DateTime
  price           Float?
  orderNumber     String?  @unique

  // Extracted metadata (from AI)
  itemType        String?  // "shirt", "pants", etc.
  color           String?
  pattern         String?
  estimatedVibe   String?

  // Email reference
  emailId         String?  // Gmail message ID
  emailSubject    String?

  // Status
  addedToWardrobe Boolean  @default(false)
  clothingItemId  Int?     // If added to wardrobe

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([purchaseDate])
  @@map("purchase_history")
}

model EmailConnection {
  id          Int      @id @default(autoincrement())
  user        User     @relation(fields: [userId], references: [id])
  userId      String   @unique

  provider    String   // "gmail"
  accessToken String   // Encrypted
  refreshToken String? // Encrypted
  expiresAt   DateTime?

  lastSyncedAt DateTime?
  isActive     Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("email_connections")
}
```

---

## API Endpoints

### Connect Email Account

```typescript
POST /api/purchases/connect/gmail

Response:
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}

// User visits authUrl, grants permission, redirects back
```

### Scan for Purchases

```typescript
POST /api/purchases/scan

Body: {
  userId: "user-123",
  daysBack: 30  // Scan last 30 days
}

Response: {
  "scanned": 45,     // Emails scanned
  "found": 8,        // Purchases found
  "new": 5,          // New purchases added
  "duplicates": 3,   // Already tracked
  "purchases": [
    {
      "id": 1,
      "itemName": "Slim Fit Chinos",
      "store": "J.Crew",
      "purchaseDate": "2025-11-15",
      "price": 89.50,
      "addedToWardrobe": false
    },
    ...
  ]
}
```

### Get Purchase History

```typescript
GET /api/purchases?userId=user-123&limit=20

Response: {
  "purchases": [...],
  "stats": {
    "totalSpent": 1250.00,
    "averagePrice": 62.50,
    "favoriteBrands": ["J.Crew", "Uniqlo"],
    "topStores": ["Amazon", "Nordstrom"],
    "recentTrend": "casual"
  }
}
```

### Get Purchase-Based Recommendations

```typescript
POST /api/recommendations/from-purchases

Body: {
  userId: "user-123"
}

Response: {
  "recommendations": [
    {
      "type": "wardrobe_gap",
      "message": "You bought navy pants but don't have matching shoes",
      "suggestedAction": "Add brown or black dress shoes",
      "basedOn": "Recent purchase: Navy Chinos from J.Crew"
    },
    {
      "type": "complement",
      "message": "Your white shirt would pair well with your new blazer",
      "matchingItems": [
        { "id": 5, "type": "shirt", "color": "white" }
      ]
    },
    {
      "type": "duplicate_check",
      "message": "You already own a similar blue shirt",
      "existingItems": [
        { "id": 12, "type": "shirt", "color": "blue" }
      ],
      "advice": "Consider if you need another one"
    }
  ]
}
```

---

## How It Works

### 1. Email Scanning Algorithm

```typescript
// Pseudo-code
async function scanEmails(userId: string, daysBack: number) {
  // 1. Get Gmail access token
  const token = await getGmailToken(userId);

  // 2. Search for purchase-related emails
  const query = `
    from:(order@amazon.com OR order@nordstrom.com OR ...)
    OR subject:(order confirmation receipt shipment)
    after:${daysBack}d
  `;

  const emails = await gmail.users.messages.list({ query });

  // 3. Extract purchase details from each email
  for (const email of emails) {
    const content = await gmail.users.messages.get(email.id);

    // 4. Use AI (Gemini) to parse receipt
    const purchase = await parseReceiptWithAI(content.body);

    // 5. Save to database
    await savePurchase(userId, purchase);
  }
}
```

### 2. AI-Powered Receipt Parsing

```typescript
async function parseReceiptWithAI(emailBody: string) {
  const prompt = `
    Extract purchase information from this email:

    ${emailBody}

    Return JSON:
    {
      "items": [
        {
          "name": "Item name",
          "quantity": 1,
          "price": 49.99,
          "type": "shirt/pants/etc",
          "color": "color if mentioned",
          "brand": "brand name"
        }
      ],
      "orderNumber": "order #",
      "purchaseDate": "YYYY-MM-DD",
      "store": "store name",
      "total": 149.99
    }
  `;

  const result = await gemini.generateContent(prompt);
  return JSON.parse(result.text);
}
```

### 3. Recommendation Engine

```typescript
async function generatePurchaseRecommendations(userId: string) {
  // Get recent purchases
  const purchases = await getRecentPurchases(userId, 30);

  // Get current wardrobe
  const wardrobe = await getWardrobeItems(userId);

  const recommendations = [];

  // Check 1: Duplicate purchases
  for (const purchase of purchases) {
    const similar = wardrobe.filter(item =>
      item.type === purchase.itemType &&
      item.primaryColor === purchase.color
    );

    if (similar.length > 0) {
      recommendations.push({
        type: "duplicate_alert",
        message: `You already own ${similar.length} similar ${purchase.itemType}(s)`,
        items: similar
      });
    }
  }

  // Check 2: Incomplete outfits
  for (const purchase of purchases) {
    const complements = findComplementaryItems(purchase, wardrobe);

    if (complements.length === 0) {
      recommendations.push({
        type: "wardrobe_gap",
        message: `Your new ${purchase.itemName} needs matching pieces`,
        suggestions: getMatchingSuggestions(purchase)
      });
    } else {
      recommendations.push({
        type: "outfit_ready",
        message: `Create outfits with your new ${purchase.itemName}`,
        matchingItems: complements
      });
    }
  }

  // Check 3: Spending patterns
  const trend = analyzePurchaseTrend(purchases);
  recommendations.push({
    type: "shopping_insight",
    message: `You've bought ${trend.topCategory} items lately`,
    suggestion: `Consider adding ${trend.neededCategory} for balance`
  });

  return recommendations;
}
```

---

## Example User Flow

### First-Time Setup

```
1. User clicks "Connect Email" in settings
2. Redirected to Google OAuth
3. Grants "Read Gmail" permission
4. Redirected back to Stylr
5. Click "Scan for Purchases"
6. AI analyzes last 30 days of emails
7. Shows 12 purchases found
8. User reviews and confirms
```

### Daily Usage

```
1. User logs in to Stylr
2. Banner: "5 new purchases detected from emails"
3. User views purchase list
4. For each purchase:
   - "Add to Wardrobe" → Uploads photo or uses AI to guess
   - "Already Own Similar" → Shows matching items
   - "Dismiss" → Ignores this purchase
```

### Smart Recommendations

```
User just bought: "Navy Blazer from J.Crew"

Stylr checks wardrobe:
✅ Has: White dress shirt, Gray slacks
❌ Missing: Brown dress shoes

Recommendation:
"Complete your professional look!
Your new navy blazer pairs with:
- White Dress Shirt (already owned)
- Gray Slacks (already owned)
Consider: Brown or black dress shoes to complete the outfit"
```

---

## Cost Analysis (100% FREE!)

### Gmail API Costs
- **Quota**: 1 billion units/day (FREE)
- **Typical usage**: 1 email read = 5 units
- **Your limit**: ~200 million emails/day
- **Realistic usage**: 50-100 emails/month per user = FREE

### AI Parsing Costs
- **Gemini 1.5 Flash**: FREE (15 req/min)
- **Per receipt**: 1 API call
- **Monthly**: ~50 receipts = 50 calls = FREE

### Storage Costs
- **Postgres**: Already using Neon (FREE tier)
- **Additional data**: ~1KB per purchase
- **Impact**: Negligible

**Total Monthly Cost**: $0 🎉

---

## Privacy & Compliance

### What We Store
- ✅ Purchase metadata (item, date, store)
- ❌ Email content (deleted after parsing)
- ❌ Personal info (only what's in receipts)

### User Controls
- View all scanned purchases
- Delete individual purchases
- Disconnect email account anytime
- Clear all purchase history

### GDPR Compliance
- Right to access data
- Right to delete data
- Right to revoke access
- Transparent data usage

---

## Alternative: Manual Upload

If users don't want email scanning:

```typescript
POST /api/purchases/manual

Body: {
  itemName: "Blue Denim Jacket",
  store: "Levi's",
  purchaseDate: "2025-11-15",
  price: 89.99
}
```

Users can:
- Forward receipts to special email
- Upload receipt screenshots
- Manually type in purchases

---

## Implementation Priority

### Phase 1 (Core - 2 hours)
1. Gmail OAuth integration
2. Email scanning endpoint
3. Basic purchase extraction (regex/keywords)
4. Purchase history database

### Phase 2 (AI Enhancement - 2 hours)
5. AI-powered receipt parsing with Gemini
6. Automatic wardrobe matching
7. Duplicate detection

### Phase 3 (Recommendations - 2 hours)
8. Purchase-based recommendation engine
9. Outfit completion suggestions
10. Spending insights dashboard

**Total**: 6 hours for complete feature

---

## Technical Implementation Files

Would need to create:
1. `lib/gmail-integration.ts` - Gmail API wrapper
2. `lib/purchase-parser.ts` - Receipt parsing with AI
3. `lib/purchase-recommendations.ts` - Recommendation logic
4. `app/api/purchases/connect/gmail/route.ts` - OAuth flow
5. `app/api/purchases/scan/route.ts` - Email scanner
6. `app/api/purchases/route.ts` - CRUD for purchases
7. `app/api/recommendations/from-purchases/route.ts` - Recommendations
8. Update Prisma schema with new models

---

## Ready to Implement?

This feature is **100% free** to build and run using:
- Gmail API (free quota)
- Google Gemini AI (free tier)
- Existing Neon database (free tier)

Would you like me to implement this? I can start with Phase 1 (core functionality) right now!
