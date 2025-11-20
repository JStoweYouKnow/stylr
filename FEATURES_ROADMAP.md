# Stylr - Feature Implementation Roadmap

## ✅ Implemented Features (Current Session)

### 1. AI Provider Migration
- **Status**: ✅ Complete
- **Location**: `lib/ai/`
- Migrated from Anthropic Claude to free alternatives
- Google Gemini 1.5 Flash (primary, FREE)
- Multi-provider fallback system (Groq, OpenAI)
- Automatic failover for reliability

### 2. Weather-Based Outfit Recommendations
- **Status**: ✅ Complete
- **Location**: `lib/weather.ts`, `app/api/weather/outfit/route.ts`
- Free Open-Meteo API integration (no API key required)
- Suggests layering based on temperature and precipitation
- Filters wardrobe by layering categories (base/mid/outer)
- **API**: `POST /api/weather/outfit` with `{latitude, longitude, userId}`

### 3. Outfit of the Day Generator
- **Status**: ✅ Complete
- **Location**: `lib/outfit-generator.ts`, `app/api/outfits/daily/route.ts`
- Generates random outfit combinations from wardrobe
- Multiple outfit templates (Classic, Layered, Dress, etc.)
- Color harmony scoring
- Saves as OutfitRecommendation in database
- **API**: `GET /api/outfits/daily?userId=X&occasion=casual`

### 4. Multi-Outfit Generator
- **Status**: ✅ Complete
- **Location**: `app/api/outfits/generate/route.ts`
- Generate 3+ outfit suggestions at once
- Ranked by style score
- Occasion-based filtering
- **API**: `POST /api/outfits/generate` with `{userId, occasion, count}`

### 5. Search & Filter by Color/Type/Vibe
- **Status**: ✅ Complete
- **Location**: `app/api/clothing/search/route.ts`
- Filter by: color (primary/secondary), type, vibe, pattern, layering category, tags
- Full-text search with Postgres
- **API**: `GET /api/clothing/search?color=blue&type=shirt&vibe=casual`

### 6. Color Palette Validator
- **Status**: ✅ Complete
- **Location**: `lib/color-validator.ts`, `app/api/outfits/validate-colors/route.ts`
- Validates color harmony (0-10 score)
- Checks for: monochromatic, neutrals, warm/cool balance
- Provides reasoning and suggestions
- Complementary color recommendations
- **API**: `POST /api/outfits/validate-colors` with `{itemIds}` or `{colors}`

### 7. AI Style Chat Assistant
- **Status**: ✅ Complete
- **Location**: `app/api/chat/route.ts`, `components/style-chat.tsx`
- Real-time streaming chat with Gemini
- Context-aware (knows your wardrobe)
- Style advice, outfit suggestions, color coordination
- Floating chat widget component
- **Usage**: Add `<StyleChat userId={userId} />` to any page

---

## 🚀 High Priority Features (Next Sprint)

### 8. Outfit Export & Sharing
**Effort**: 2-3 hours | **Impact**: High

**Description**: Export outfit combinations as shareable images

**Implementation**:
```bash
npm install html2canvas
```

**Files to create**:
- `lib/outfit-export.ts` - Canvas rendering logic
- `app/api/outfits/export/route.ts` - Generate image endpoint
- `components/outfit-card.tsx` - Visual outfit display component

**Features**:
- Render outfit as image (grid of clothing items)
- Add style notes and occasion
- Share to social media
- Download as PNG
- Optional watermark "Created with Stylr"

**API**:
```typescript
POST /api/outfits/export
{
  outfitId: number,
  format: "png" | "jpg",
  includeDetails: boolean
}
```

---

### 9. Wardrobe Analytics Dashboard
**Effort**: 3-4 hours | **Impact**: High

**Description**: Visual insights into wardrobe composition and usage

**Implementation**:
```bash
npm install recharts
```

**Files to create**:
- `lib/analytics.ts` - Data aggregation logic
- `app/api/analytics/wardrobe/route.ts`
- `components/wardrobe-stats.tsx` - Dashboard component

**Metrics**:
- Color distribution (pie chart)
- Items by type (bar chart)
- Items by vibe/style (donut chart)
- Most/least worn items (from WearEvent table)
- Wardrobe diversity score
- Missing basics analysis
- Average outfit score trend

**API**:
```typescript
GET /api/analytics/wardrobe?userId=X
// Returns: { colorDistribution, typeBreakdown, styleMetrics, wearFrequency }
```

---

### 10. PWA (Progressive Web App) Setup
**Effort**: 2 hours | **Impact**: High for mobile users

**Description**: Install Stylr as a mobile app

**Implementation**:
```bash
npm install next-pwa
```

**Files to create**:
- `next.config.js` - Add PWA plugin
- `public/manifest.json` - App manifest
- `public/icons/` - App icons (512x512, 192x192)

**Features**:
- Install prompt on mobile
- Offline access to wardrobe
- Push notifications (future)
- Native app feel
- Camera integration for uploads

**Configuration**:
```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
})

module.exports = withPWA({
  // existing config
})
```

---

### 11. Style Quiz & Personalization
**Effort**: 2-3 hours | **Impact**: Medium-High

**Description**: Onboarding quiz to personalize recommendations

**Files to create**:
- `components/style-quiz.tsx` - Multi-step quiz component
- `app/api/user/style-profile/route.ts` - Save preferences
- Database migration to add `StyleProfile` table

**Quiz Questions**:
1. Body type preferences
2. Favorite styles (minimalist, streetwear, preppy, etc.)
3. Occasion frequency (work: 5 days/week, formal: 1x/month, etc.)
4. Color preferences
5. Climate/location
6. Fashion inspirations

**Database Schema**:
```prisma
model StyleProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])

  preferredStyles   String[] // ["minimalist", "casual"]
  occasionFrequency Json     // {work: 5, formal: 1, casual: 7}
  favoriteColors    String[]
  bodyType          String?
  climate           String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 🔧 Medium Priority Features

### 12. Fashion Trend Scraper
**Effort**: 4-5 hours | **Impact**: Medium

**Description**: Scrape GQ, fashion blogs for current trends

**Implementation**:
```bash
npm install cheerio axios rss-parser @vercel/cron
```

**Files to create**:
- `lib/scrapers/gq.ts` - GQ scraper
- `lib/scrapers/rss.ts` - RSS feed parser
- `app/api/cron/scrape-trends/route.ts` - Scheduled job
- `vercel.json` - Cron configuration

**Features**:
- Daily scraping via Vercel Cron (free tier)
- Store in `StyleRule` table
- Extract: seasonal trends, color palettes, style tips
- Use Gemini to summarize articles
- Match trends against user's wardrobe

**Vercel Cron**:
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-trends",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

### 13. Outfit Similarity Search (Vector DB)
**Effort**: 3-4 hours | **Impact**: Medium

**Description**: "Find outfits similar to this GQ look"

**Implementation**:
```bash
npm install @vercel/postgres
```

**Database**:
- Enable pgvector extension in Neon
- Generate embeddings with Gemini Vision
- Store embeddings in new column

**Schema Update**:
```sql
-- Enable pgvector
CREATE EXTENSION vector;

-- Add embedding column
ALTER TABLE clothing_items ADD COLUMN embedding vector(768);
ALTER TABLE outfit_recommendations ADD COLUMN embedding vector(768);
```

**Files to create**:
- `lib/embeddings.ts` - Generate embeddings with Gemini
- `app/api/outfits/similar/route.ts` - Similarity search
- Migration for pgvector setup

**Features**:
- Upload inspiration image
- Find closest matches in wardrobe
- Suggest similar outfit combinations
- "Shop your closet" for trending looks

---

### 14. Wear Tracking & Smart Recommendations
**Effort**: 2-3 hours | **Impact**: Medium

**Description**: Track when items are worn, suggest underutilized pieces

**Files to create**:
- `app/api/wear/log/route.ts` - Log wear event
- `app/api/wear/suggestions/route.ts` - Suggest unworn items
- `components/wear-tracker.tsx` - UI component

**Features**:
- Log outfit when worn
- Track frequency per item
- Suggest "forgotten" items
- "You haven't worn this in 3 months!"
- Outfit rotation recommendations

**API**:
```typescript
POST /api/wear/log
{
  itemIds: [1, 2, 3],
  date: "2025-11-19",
  context: "Work meeting"
}

GET /api/wear/suggestions?userId=X
// Returns least worn items
```

---

### 15. Virtual Outfit Board (Drag & Drop)
**Effort**: 4-5 hours | **Impact**: Medium

**Description**: Pinterest-style outfit builder with drag & drop

**Implementation**:
```bash
npm install react-dnd react-dnd-html5-backend framer-motion
```

**Files to create**:
- `components/outfit-board.tsx` - Main board component
- `components/draggable-item.tsx` - Draggable clothing item
- `app/outfits/create/page.tsx` - Full-page editor
- `app/api/outfits/save/route.ts` - Save custom outfits

**Features**:
- Drag items from wardrobe
- Drop onto mannequin/canvas
- Layer items (base → mid → outer)
- Save custom combinations
- Export as image
- Undo/redo functionality

---

### 16. Background Removal for Clean Catalog
**Effort**: 2 hours | **Impact**: Low-Medium

**Description**: Remove backgrounds from clothing photos

**Implementation**:
```bash
npm install @imgly/background-removal
```

**Files to create**:
- `lib/image-processing.ts` - Client-side bg removal
- Update upload flow to process images

**Features**:
- Automatic background removal on upload
- Clean, catalog-style wardrobe view
- Better outfit visualizations
- Optional: runs in browser (no server cost)

---

## 💡 Nice-to-Have Features

### 17. Social Features
**Effort**: 6-8 hours | **Impact**: Low (MVP)

- Share outfits with friends
- Follow other users
- Like/save community outfits
- Public vs private wardrobe

### 18. Shopping Gap Analysis
**Effort**: 2 hours | **Impact**: Low

- Analyze wardrobe composition
- Suggest versatile pieces to fill gaps
- No affiliate links - educational only
- "You need more layering pieces"

### 19. Seasonal Wardrobe Rotation
**Effort**: 3 hours | **Impact**: Low

- Tag items as seasonal
- Archive summer clothes in winter
- Rotation reminders
- Storage tips

### 20. Multi-User Household Mode
**Effort**: 4 hours | **Impact**: Low

- Shared wardrobe for families
- Individual + shared items
- Permission system

---

## 📦 Free Dependencies & Tools

### Already Installed
- ✅ `ai` - Vercel AI SDK
- ✅ `@ai-sdk/google` - Gemini integration
- ✅ `sharp` - Image processing
- ✅ `@vercel/blob` - File storage

### Recommended Additions

**Analytics & Charts**:
```bash
npm install recharts  # Free, lightweight charts
```

**UI Components**:
```bash
npm install @radix-ui/react-dialog @radix-ui/react-tabs
npm install vaul  # Bottom sheets for mobile
npm install cmdk  # Command palette
```

**Image Processing**:
```bash
npm install html2canvas  # Export outfits as images
npm install plaiceholder  # Blur placeholders
npm install @imgly/background-removal  # Remove bg client-side
```

**Utilities**:
```bash
npm install date-fns  # Date utilities
npm install zod  # Schema validation
npm install react-hook-form  # Form handling
```

**Mobile/PWA**:
```bash
npm install next-pwa  # Progressive web app
npm install @use-gesture/react  # Touch gestures
```

**Scraping**:
```bash
npm install cheerio  # HTML parsing
npm install rss-parser  # RSS feeds
npm install axios  # HTTP client
```

---

## 🎯 Suggested Implementation Order

### Sprint 1 (This Session - DONE ✅)
1. ✅ AI Provider Migration
2. ✅ Weather Recommendations
3. ✅ Outfit Generator
4. ✅ Color Search/Filter
5. ✅ Color Validator
6. ✅ Style Chat Assistant

### Sprint 2 (Next 4-6 hours)
7. Outfit Export & Sharing
8. Wardrobe Analytics Dashboard
9. PWA Setup
10. Style Quiz

### Sprint 3 (Following 4-6 hours)
11. Fashion Trend Scraper
12. Wear Tracking
13. Virtual Outfit Board

### Sprint 4 (Polish & Advanced)
14. Vector Search
15. Background Removal
16. Additional features as needed

---

## 📊 Current Architecture

### API Routes
```
/api/chat                      - AI style assistant (streaming)
/api/clothing/upload           - Upload & analyze clothing
/api/clothing/analyze          - Analyze existing image
/api/clothing/search           - Search/filter wardrobe
/api/outfits/daily             - Daily outfit suggestion
/api/outfits/generate          - Generate multiple outfits
/api/outfits/validate-colors   - Color harmony check
/api/weather/outfit            - Weather-based suggestions
```

### Libraries
```
/lib/ai/                       - AI providers (Gemini, OpenAI, Groq)
/lib/weather.ts                - Weather API integration
/lib/outfit-generator.ts       - Outfit creation logic
/lib/color-validator.ts        - Color harmony validation
/lib/blob/                     - Vercel Blob storage
/lib/db.ts                     - Prisma client
```

### Components
```
/components/style-chat.tsx     - Floating chat widget
```

---

## 🔑 Environment Variables Needed

### Current
```bash
DATABASE_URL                   # Neon Postgres
BLOB_READ_WRITE_TOKEN          # Vercel Blob
GOOGLE_AI_API_KEY              # Gemini (FREE)
OPENAI_API_KEY                 # Optional fallback
GROQ_API_KEY                   # Optional fallback (FREE)
```

### Future (Optional)
```bash
UPSTASH_REDIS_URL              # For caching (free tier)
NEXT_PUBLIC_VERCEL_URL         # For PWA
```

---

## 💰 Cost Analysis

### Current Setup (100% FREE)
- ✅ Google Gemini: FREE (15 req/min)
- ✅ Groq: FREE (generous limits)
- ✅ Open-Meteo Weather: FREE (no key)
- ✅ Vercel Hosting: FREE (hobby tier)
- ✅ Neon Postgres: FREE tier (512MB)
- ✅ Vercel Blob: FREE tier (1GB)

### If Scaling Needed (Still Very Cheap)
- OpenAI GPT-4o-mini: $0.15/1M tokens
- Vercel Pro: $20/month (more bandwidth)
- Neon Pro: $19/month (more DB)
- Upstash Redis: FREE tier → $0.20/100K commands

**Estimated Monthly Cost for 1000 Users**: ~$0-20

---

## 🚀 Quick Start for Next Session

To continue building features, start with:

1. **Outfit Export** - High impact, moderate effort
   ```bash
   npm install html2canvas
   # Create lib/outfit-export.ts and app/api/outfits/export/route.ts
   ```

2. **Wardrobe Analytics** - Visual appeal, user engagement
   ```bash
   npm install recharts
   # Create components/wardrobe-stats.tsx
   ```

3. **PWA Setup** - Better mobile experience
   ```bash
   npm install next-pwa
   # Update next.config.js and add manifest.json
   ```

Each feature is documented above with exact implementation steps!

---

**Questions? Ask the Style Chat Assistant!** 💬
