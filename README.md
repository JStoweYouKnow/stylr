# Stylr - AI-Powered Personal Style Assistant

**Helping you discover amazing outfits in your existing wardrobe.**

> "See your closet differently with AI-powered style recommendations"

A Next.js application that uses free AI vision to analyze clothing items and help you create stylish outfit combinations.

## ✨ Features

### 🤖 AI-Powered (100% Free!)
- **Smart Image Analysis** - Upload clothes, AI identifies type, color, style, pattern
- **Automatic Background Removal** - Clean catalog look using on-device processing
- **Vector Embeddings** - Every item gets an embedding for similarity search
- **Multi-Provider System** - Google Gemini (free) with automatic fallback to Groq/OpenAI
- **Style Chat Assistant** - Real-time chat with AI fashion advisor
- **Context-Aware** - AI knows your wardrobe and gives personalized advice

### 👕 Wardrobe Management
- **Advanced Search** - Filter by color, type, vibe, pattern, layering category, tags
- **Smart Cataloging** - Beautiful visual wardrobe with auto-generated metadata
- **Color Harmony Validator** - Check if outfit colors work together (0-10 score)
- **Layering Categories** - Organize by base/mid/outer/accessory layers

### 🎨 Outfit Features
- **Outfit of the Day** - Daily random outfit suggestions from your closet
- **Multi-Outfit Generator** - Generate 3+ outfits at once, ranked by style score
- **Capsule Wardrobes** - Weekly (12-15 items) or Monthly (20-30 items) capsule planning
- **Versatility Scoring** - See how well your capsule items work together
- **Virtual Outfit Board** - Drag & drop wardrobe builder with undo/redo
- **Outfit Export** - Shareable outfit cards with watermark
- **Weather Integration** - Outfit suggestions based on temperature & precipitation
- **Occasion-Based** - Filter outfits by casual, work, formal, date, etc.
- **Color Suggestions** - Get complementary color recommendations

### 📈 Insights & Trends
- **Wear Tracking Dashboard** - See most worn / forgotten items
- **Wardrobe Analytics** - Color/type/style distribution charts
- **Daily Trend Scraper** - GQ, Vogue, Elle, Harper’s Bazaar, Glamour feeds
- **AI Summaries** - Gemini summarizes articles into actionable style rules
- **Vector Similarity Search** - “Find outfits similar to this inspiration”

### 📱 PWA & Experience
- **Installable PWA** - Icons, manifest, offline caching
- **App Icons** - `scripts/generate-icons.js` to regenerate gradients
- **Responsive UI** - Works beautifully on mobile & desktop

### 💬 Intelligence
- **AI Chat Widget** - Floating chat assistant on any page
- **Style Advice** - "What should I wear to a wedding?"
- **Outfit Ideas** - "How can I style my blue jacket?"
- **Fashion Knowledge** - Learn color theory, layering, trends

## 🔧 Tech Stack

### Frontend
- **Next.js 14** - App Router, React 18, TypeScript
- **Tailwind CSS** - Styling
- **Vercel AI SDK** - Streaming chat

### Backend
- **Prisma** - Database ORM
- **PostgreSQL (Neon)** - Serverless database
- **Vercel Blob** - Image storage
- **Vercel Edge Runtime** - Chat API

### AI & APIs
- **Google Gemini 1.5 Flash** - Primary AI (FREE)
- **Groq Llama Vision** - Fallback (FREE)
- **OpenAI GPT-4o-mini** - Optional fallback
- **Open-Meteo** - Weather data (FREE, no key)

**Monthly Cost**: $0 for moderate usage 🎉

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database - Neon PostgreSQL (FREE)
# Get from: https://neon.tech
DATABASE_URL="postgresql://..."

# Vercel Blob Storage (FREE tier: 1GB)
# Get from: https://vercel.com/dashboard/stores
BLOB_READ_WRITE_TOKEN="your_vercel_blob_token"

# Google AI - Gemini (FREE - Required)
# Get from: https://makersuite.google.com/app/apikey
GOOGLE_AI_API_KEY="your_google_ai_api_key"

# Optional: secure scheduled jobs
# Used by /api/cron/scrape-trends when triggered by Vercel Cron
# CRON_SECRET="super_secret_token"

# Optional Fallback Providers (all have free tiers)
# GROQ_API_KEY="your_groq_key"          # https://console.groq.com/keys
# OPENAI_API_KEY="your_openai_key"      # https://platform.openai.com/api-keys
```

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Or if you prefer to use the SQL migration directly:
# psql $DATABASE_URL -f prisma/migrations/0001_init/migration.sql
```

**Note:** The migration includes Row Level Security (RLS) setup. RLS policies need to be enabled after authentication is implemented. See the migration file for details.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
stylr/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Dashboard pages
│   └── api/             # API routes
├── components/           # React components
├── lib/                  # Utilities and helpers
│   ├── ai/              # AI integration
│   ├── blob/            # Blob storage
│   └── db/              # Database client
└── prisma/              # Database schema
```

## 📡 API Routes

### AI & Chat
- `POST /api/chat` - AI style assistant (streaming chat)

### Clothing Management
- `POST /api/clothing/upload` - Upload & analyze clothing with AI
- `POST /api/clothing/analyze` - Analyze existing image URL
- `GET /api/clothing/search` - Search & filter wardrobe
- `POST /api/outfits/similar` - Vector similarity search for outfits

### Outfit Generation
- `GET /api/outfits/daily` - Daily outfit of the day
- `POST /api/outfits/generate` - Generate multiple outfits
- `POST /api/outfits/validate-colors` - Check color harmony
- `GET /api/outfits` - List user saved outfits
- `POST /api/outfits` - Save custom outfit combinations

### Capsule Wardrobes
- `POST /api/capsule/weekly` - Generate 7-day capsule (12-15 items)
- `POST /api/capsule/monthly` - Generate 30-day capsule (20-30 items)
- `GET /api/capsule` - Get saved capsules
- `DELETE /api/capsule` - Delete a capsule

### Weather
- `POST /api/weather/outfit` - Weather-based outfit suggestions

### Trends & Cron
- `GET /api/trends` - Fetch latest AI-processed fashion trends
- `GET/POST /api/cron/scrape-trends` - Trigger daily trend scraper (secured with `CRON_SECRET`)

### Wear Tracking
- `GET /api/wear` - Wear history (last 50 entries)
- `POST /api/wear` - Log items as worn today
- `GET /api/wear/suggestions` - Smart reminders for forgotten items

**See [QUICK_START.md](QUICK_START.md) for detailed API examples!**

## Usage

1. Navigate to `/upload` to upload a clothing item
2. Optional: enable background removal for clean catalog photos
3. The image is uploaded to Vercel Blob
4. Gemini/Claude analyzes the image, extracts metadata, and creates embeddings
5. The item is saved to the database and available for vector search
6. Explore `/closet`, `/analytics`, `/wear-tracking`, `/outfits/create`, `/style-quiz`, `/recommendations`

## Database Schema

The database includes the following tables:

- **users** - User accounts
- **clothing_items** - Clothing items with AI metadata
- **style_rules** - Fashion rules from sources (GQ, Vogue, etc.)
- **outfit_recommendations** - AI-generated outfit suggestions
- **saved_outfits** - User-saved outfit combinations
- **wear_events** - Tracking when items are worn
- **uploads** - Upload logs and status

All tables support Row Level Security (RLS) for multi-user privacy. See the migration file for RLS policy setup.

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide for Vercel
- **[QUICK_START.md](QUICK_START.md)** - Complete API usage guide with examples
- **[FEATURES_ROADMAP.md](FEATURES_ROADMAP.md)** - 15+ features ready to implement
- **[SESSION_SUMMARY.md](SESSION_SUMMARY.md)** - What was just built
- **[API_REFERENCE.md](API_REFERENCE.md)** - Quick API reference
- **[lib/ai/README.md](lib/ai/README.md)** - AI provider setup guide

## 🚀 Coming Soon

See **[FEATURES_ROADMAP.md](FEATURES_ROADMAP.md)** for detailed implementation guides:

**Next Sprint** (2-4 hours each):
- ✅ Outfit Export & Sharing (html2canvas)
- ✅ Wardrobe Analytics Dashboard (recharts)
- ✅ PWA Setup for mobile app experience
- ✅ Style Quiz & Personalization

**Medium-Term**:
- Fashion Trend Scraper (GQ, Vogue)
- Wear Tracking & Smart Recommendations
- Virtual Outfit Board (drag & drop)
- Vector Similarity Search

**15+ features** documented with step-by-step guides!

## License

MIT

