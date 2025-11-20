# Stylr - Quick Start Guide

## 🎉 What's New (Just Implemented)

You now have **7 powerful new features** running on **100% free AI models**!

### Latest Addition: Purchase History Tracking 🛍️
- Automatically scan Gmail for purchase receipts
- AI-powered receipt parsing with Gemini
- Get recommendations based on shopping patterns
- Identify wardrobe gaps and duplicate purchases
- **100% FREE** - Uses Gmail API (1 billion quota/day)

---

## ✅ Feature 1: Free AI Vision (No More Claude Costs!)

**What changed**: Migrated from Anthropic Claude to Google Gemini (completely free)

**Setup**:
Your Google AI API key is already configured in `.env`:
```bash
GOOGLE_AI_API_KEY="AIzaSyAPFri2tt551E_Hy6kizZyogm90h0XSLG8"
```

**How it works**:
- Gemini tries first (free)
- Falls back to Groq or OpenAI if needed
- Automatic error handling
- See logs in console to know which provider succeeded

**No code changes needed** - your existing upload endpoints now use free AI! 🎊

---

## ✅ Feature 2: Weather-Based Outfit Recommendations

**API Endpoint**: `POST /api/weather/outfit`

**Example Usage**:
```javascript
// In your frontend:
const response = await fetch('/api/weather/outfit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 40.7128,  // NYC
    longitude: -74.0060,
    userId: 'user-id-here' // optional
  })
});

const data = await response.json();
console.log(data);
/*
{
  weather: {
    temperature: 65,
    precipitation: 0,
    conditions: "Clear",
    layeringRecommendation: ["base", "mid"]
  },
  suggestion: "Perfect weather! A light outfit with a single layer should work great.",
  requiredLayers: ["base", "mid"],
  suitableItems: {
    base: [...],  // Items with layeringCategory='base'
    mid: [...]    // Items with layeringCategory='mid'
  }
}
*/
```

**Try it now**:
```bash
curl -X POST http://localhost:3000/api/weather/outfit \
  -H "Content-Type: application/json" \
  -d '{"latitude":40.7128,"longitude":-74.0060}'
```

---

## ✅ Feature 3: Outfit of the Day Generator

**API Endpoint**: `GET /api/outfits/daily`

**Example Usage**:
```javascript
// Generate a daily outfit
const response = await fetch('/api/outfits/daily?occasion=casual&userId=user-123');
const data = await response.json();

console.log(data.outfit);
/*
{
  items: [
    { id: 1, type: "shirt", primaryColor: "blue", ... },
    { id: 5, type: "pants", primaryColor: "black", ... }
  ],
  score: 8,
  reasoning: "A Classic outfit perfect for casual. The monochromatic color scheme creates a sleek, cohesive look.",
  occasion: "casual",
  recommendationId: 42
}
*/
```

**Occasions**: casual, work, formal, date, summer

**Try it now**:
```bash
curl "http://localhost:3000/api/outfits/daily?occasion=work"
```

---

## ✅ Feature 4: Multi-Outfit Generator

**API Endpoint**: `POST /api/outfits/generate`

**Example Usage**:
```javascript
// Generate 5 outfit suggestions
const response = await fetch('/api/outfits/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    occasion: 'formal',
    count: 5
  })
});

const data = await response.json();
console.log(data.outfits); // Array of 5 outfits, sorted by score
```

**Try it now**:
```bash
curl -X POST http://localhost:3000/api/outfits/generate \
  -H "Content-Type: application/json" \
  -d '{"occasion":"casual","count":3}'
```

---

## ✅ Feature 5: Search & Filter Wardrobe

**API Endpoint**: `GET /api/clothing/search`

**Query Parameters**:
- `color` - Filter by color (searches primary + secondary)
- `type` - Filter by clothing type
- `vibe` - Filter by style vibe
- `pattern` - Filter by pattern
- `layeringCategory` - Filter by layer (base/mid/outer/accessory)
- `tags` - Comma-separated tags
- `userId` - User ID (optional)

**Example Usage**:
```javascript
// Find all blue shirts with a casual vibe
const response = await fetch('/api/clothing/search?color=blue&type=shirt&vibe=casual');
const data = await response.json();

console.log(data);
/*
{
  items: [...],
  count: 5,
  filters: {
    color: "blue",
    type: "shirt",
    vibe: "casual"
  }
}
*/
```

**Try it now**:
```bash
# Find all blue items
curl "http://localhost:3000/api/clothing/search?color=blue"

# Find casual pants
curl "http://localhost:3000/api/clothing/search?type=pants&vibe=casual"

# Find outer layer items
curl "http://localhost:3000/api/clothing/search?layeringCategory=outer"
```

---

## ✅ Feature 6: Color Palette Validator

**API Endpoint**: `POST /api/outfits/validate-colors`

**Example Usage**:
```javascript
// Option 1: Validate by item IDs
const response = await fetch('/api/outfits/validate-colors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemIds: [1, 2, 3]  // IDs of clothing items
  })
});

// Option 2: Validate by color names
const response = await fetch('/api/outfits/validate-colors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    colors: ["navy", "white", "beige"]
  })
});

const data = await response.json();
console.log(data);
/*
{
  validation: {
    isHarmonious: true,
    score: 10,
    reasoning: "All neutral colors - this is a safe, classic palette that works in virtually any situation.",
    suggestions: []
  },
  complementarySuggestions: [
    "Any color works with neutrals!",
    "Bright colors",
    "Pastels"
  ],
  analyzedColors: ["navy", "white", "beige"]
}
*/
```

**Try it now**:
```bash
# Test color harmony
curl -X POST http://localhost:3000/api/outfits/validate-colors \
  -H "Content-Type: application/json" \
  -d '{"colors":["red","orange","purple"]}'
```

---

## ✅ Feature 7: Purchase History Tracking 🆕

**Overview**: Automatically track purchases from your email and get smart wardrobe recommendations.

### Step 1: Connect Gmail Account

**API Endpoint**: `POST /api/purchases/connect/gmail`

```javascript
// Initiate OAuth flow
const response = await fetch('/api/purchases/connect/gmail', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-123' })
});

const { authUrl } = await response.json();

// Redirect user to Google OAuth
window.location.href = authUrl;

// After user authorizes, they'll be redirected back to:
// /?gmail_connected=true
```

**Environment Variables** (add to `.env`):
```bash
GOOGLE_CLIENT_ID="your_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_client_secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/purchases/connect/gmail/callback"
```

**Setup Google OAuth**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URI: `http://localhost:3000/api/purchases/connect/gmail/callback`

---

### Step 2: Scan for Purchases

**API Endpoint**: `POST /api/purchases/scan`

```javascript
// Scan last 30 days of emails
const response = await fetch('/api/purchases/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    daysBack: 30
  })
});

const data = await response.json();
console.log(data);
/*
{
  scanned: 45,        // Emails scanned
  found: 8,           // Purchases found
  new: 5,             // New items added
  duplicates: 3,      // Already tracked
  purchases: [
    {
      id: 1,
      itemName: "Slim Fit Chinos",
      store: "J.Crew",
      purchaseDate: "2025-11-15T00:00:00.000Z",
      price: 89.50,
      itemType: "pants",
      color: "navy",
      brand: "J.Crew",
      addedToWardrobe: false
    }
  ],
  message: "Scanned 45 emails, found 8 purchases, added 5 new items"
}
*/
```

**What gets scanned**:
- Order confirmations from 100+ retailers (Amazon, Nordstrom, Zara, H&M, ASOS, Uniqlo, etc.)
- Shipment notifications with order details
- Emails with keywords: "order confirmation", "receipt", "tracking"

---

### Step 3: Get Purchase-Based Recommendations

**API Endpoint**: `POST /api/recommendations/from-purchases`

```javascript
const response = await fetch('/api/recommendations/from-purchases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'user-123' })
});

const data = await response.json();
console.log(data.recommendations);
/*
[
  {
    type: "wardrobe_gap",
    message: "Your new \"Navy Chinos\" needs matching pieces",
    basedOn: "Recent purchase from J.Crew",
    suggestedAction: "Add dress shirt or casual top or blazer to complete outfits",
    suggestions: ["dress shirt", "casual top", "blazer"]
  },
  {
    type: "duplicate_check",
    message: "You recently bought \"Blue T-Shirt\" but already own 2 similar shirt(s)",
    existingItems: [...],
    advice: "Great for variety!"
  },
  {
    type: "outfit_ready",
    message: "Create 3 outfits with your new \"Navy Blazer\"",
    matchingItems: [...]
  },
  {
    type: "shopping_insight",
    message: "You've been buying mostly shirt items lately",
    suggestedAction: "Consider adding bottoms (pants or skirts) for a balanced wardrobe"
  }
]
*/
```

**Recommendation Types**:
- `wardrobe_gap`: Missing pieces to complete outfits with new purchases
- `duplicate_check`: Similar items already in your wardrobe
- `outfit_ready`: Existing items that match new purchases
- `shopping_insight`: Spending patterns and shopping trends

---

### Step 4: View Purchase History

**API Endpoint**: `GET /api/purchases`

```javascript
// Get purchases with spending statistics
const response = await fetch('/api/purchases?userId=user-123&limit=20&stats=true');

const data = await response.json();
console.log(data);
/*
{
  purchases: [...],
  count: 12,
  stats: {
    totalSpent: 1250.00,
    averagePrice: 62.50,
    favoriteBrands: ["J.Crew", "Uniqlo"],
    topStores: ["Amazon", "Nordstrom"],
    recentTrend: "casual"
  }
}
*/
```

---

### Optional: Manual Purchase Entry

**API Endpoint**: `POST /api/purchases`

```javascript
// Add purchase manually (no email scanning needed)
const response = await fetch('/api/purchases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    itemName: 'Blue Denim Jacket',
    store: "Levi's",
    purchaseDate: '2025-11-15',
    price: 89.99,
    brand: "Levi's",
    itemType: 'jacket',
    color: 'blue'
  })
});
```

---

**Cost**: **100% FREE**
- Gmail API: 1 billion quota units/day (FREE)
- Gemini AI parsing: 15 requests/min (FREE)
- No additional infrastructure needed

**Privacy**:
- ✅ OAuth 2.0 secure authorization
- ✅ Only reads emails (no send/delete permissions)
- ✅ User can revoke access anytime
- ✅ Email content not stored (only purchase data)

---

## ✅ Feature 8: AI Style Chat Assistant

**API Endpoint**: `POST /api/chat` (streaming)

**Frontend Component**: `<StyleChat userId={userId} />`

**Add to any page**:
```tsx
// app/page.tsx or any component
import { StyleChat } from "@/components/style-chat";

export default function Page() {
  return (
    <div>
      {/* Your existing content */}

      {/* Add floating chat widget */}
      <StyleChat userId="user-123" />
    </div>
  );
}
```

**Features**:
- Real-time streaming responses
- Context-aware (knows your wardrobe)
- Style advice, outfit suggestions, color coordination
- Beautiful floating chat UI

**Ask it anything**:
- "What should I wear to a summer wedding?"
- "How can I style my blue jacket?"
- "What colors go with navy?"
- "Give me outfit ideas for work"

---

## 🧪 Testing the Features

### Test 1: Upload a clothing item
```bash
# Upload will now use FREE Gemini instead of paid Claude
# Check console logs - you'll see "Attempting analysis with gemini..."
```

### Test 2: Get weather-based outfit
```bash
curl -X POST http://localhost:3000/api/weather/outfit \
  -H "Content-Type: application/json" \
  -d '{"latitude":34.0522,"longitude":-118.2437}'
# Los Angeles weather
```

### Test 3: Generate daily outfit
```bash
curl "http://localhost:3000/api/outfits/daily?occasion=casual"
```

### Test 4: Search wardrobe
```bash
curl "http://localhost:3000/api/clothing/search?color=blue"
```

### Test 5: Validate colors
```bash
curl -X POST http://localhost:3000/api/outfits/validate-colors \
  -H "Content-Type: application/json" \
  -d '{"colors":["black","white","navy"]}'
```

### Test 6: Chat with AI
```tsx
// Add to your page component and start chatting!
<StyleChat userId="test-user" />
```

---

## 📱 Mobile Usage

All features work on mobile! The chat assistant is especially great on mobile:
- Floating button in bottom-right
- Tap to open chat
- Full mobile-responsive UI
- Works with touch gestures

---

## 🎯 What to Build Next

See `FEATURES_ROADMAP.md` for 15+ additional features you can implement, including:

**High Priority** (~2-4 hours each):
1. Outfit Export & Sharing (html2canvas)
2. Wardrobe Analytics Dashboard (recharts)
3. PWA Setup (next-pwa)
4. Style Quiz (personalization)

**Medium Priority**:
5. Fashion Trend Scraper
6. Wear Tracking
7. Virtual Outfit Board

All documented with step-by-step implementation guides!

---

## 🐛 Troubleshooting

**Issue**: "All AI providers failed"
**Fix**: Make sure `GOOGLE_AI_API_KEY` is set in `.env`

**Issue**: "No clothing items found"
**Fix**: Upload some clothes first via `/api/clothing/upload`

**Issue**: Weather endpoint fails
**Fix**: Check latitude/longitude are valid numbers

**Issue**: Chat not working
**Fix**: Make sure `ai` package is installed: `npm install ai @ai-sdk/google`

---

## 💡 Pro Tips

1. **Weather + Outfit**: Chain weather check with outfit generator
2. **Color Search + Validator**: Search for items, then validate color harmony
3. **Chat Assistant**: Ask it to analyze specific outfit combinations
4. **Daily Outfit**: Set up a cron job to email daily outfit suggestions
5. **Occasion Tags**: Use consistent occasion names across features

---

## 🎨 Example Workflow

```javascript
// 1. Get weather
const weather = await fetch('/api/weather/outfit', {
  method: 'POST',
  body: JSON.stringify({ latitude: 40.7, longitude: -74 })
}).then(r => r.json());

// 2. Generate outfits for the weather
const outfits = await fetch('/api/outfits/generate', {
  method: 'POST',
  body: JSON.stringify({
    occasion: 'work',
    count: 3
  })
}).then(r => r.json());

// 3. Validate color harmony of best outfit
const validation = await fetch('/api/outfits/validate-colors', {
  method: 'POST',
  body: JSON.stringify({
    itemIds: outfits.outfits[0].items.map(i => i.id)
  })
}).then(r => r.json());

// 4. If not harmonious, ask AI for advice
if (!validation.validation.isHarmonious) {
  // Chat with AI for alternative suggestions
}
```

---

**You're all set!** 🚀 Start using these features or build more from the roadmap!
