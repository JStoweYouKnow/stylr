# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Key commands

### Install & local development

- `npm install` – Install all JavaScript/TypeScript and Capacitor dependencies.
- `npx prisma generate` – Generate the Prisma client (also runs automatically via `postinstall`).
- `npx prisma migrate dev --name <migration_name>` – Apply local schema changes to the Postgres database.
- `npm run dev` – Start the Next.js dev server (port is configured in `package.json`, currently 3002).

Useful local dev flow:

1. Ensure `.env` is present (see `README.md` and `ENV_SETUP.md` for required variables such as `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `GOOGLE_AI_API_KEY`, optional Gmail/Stripe/Capacitor keys).
2. Initialize/refresh the database:
   - `npx prisma generate`
   - `npx prisma migrate dev --name init` (or another appropriate name).
3. Run the app: `npm run dev` and open the configured localhost port in a browser.

### Linting & production build

- `npm run lint` – Run Next.js/ESLint over the project.
- `npm run build` – Production build; runs `prisma generate` first, then `next build`.
- `npm run start` – Start the production server after `npm run build`.

Typical production sanity check locally:

```bash
npm run build
npm run start
# Then hit key routes and APIs (see QUICK_START.md and API_REFERENCE.md)
```

### Prisma & database utilities

- Schema and migrations live in `prisma/`.
- Common commands (from `README.md` and `DATABASE.md`):
  - `npx prisma generate`
  - `npx prisma migrate dev --name <name>`
  - (Advanced) `psql $DATABASE_URL -f prisma/migrations/0001_init/migration.sql`

### iOS / Capacitor commands

The repo includes a full Capacitor iOS shell that wraps the deployed web app.

From the project root:

- `npm run build:ios` – Build web assets and sync them to the iOS project (via `scripts/build-ios.js`).
- `npm run ios:dev` – Open the iOS Xcode workspace for development.
- `npm run ios:sync` – Re-sync web assets to the iOS project.
- `npm run ios:copy` – Copy web assets only (shorthand for `npx cap copy ios`).

See `IOS_SETUP.md` and `MOBILE_APP_SUMMARY.md` for end-to-end iOS build and App Store deployment instructions.

### Testing & smoke checks

There is currently **no dedicated automated test runner script** (no `npm test` and no `*.test.*` files). To validate behavior, use the documented HTTP endpoints:

- `QUICK_START.md` – Contains curl examples for core flows like:
  - Weather-based outfits: `POST /api/weather/outfit`
  - Outfit of the day: `GET /api/outfits/daily`
  - Clothing search: `GET /api/clothing/search`
  - Color validator: `POST /api/outfits/validate-colors`
  - Purchase tracking flows under `/api/purchases/*` and `/api/recommendations/from-purchases`.
- `API_REFERENCE.md` – Complete reference with request/response shapes for all major endpoints.

When adding a formal test runner (e.g., Jest/Vitest/Playwright), prefer wiring it via `package.json` scripts so future agents can discover it here.

## High-level architecture

### Overall stack

- **Frontend & backend**: Next.js App Router project (TypeScript + React), with the `app/` directory hosting both UI routes and API routes.
- **Persistence**: PostgreSQL via Prisma (`prisma/schema.prisma`, migrations in `prisma/migrations/`).
- **AI & embeddings**: Centralized under `lib/ai/`, using Google Gemini as the primary provider with fallback to Groq/OpenAI.
- **Storage**: Vercel Blob for clothing images.
- **Mobile**: Capacitor-based iOS wrapper living under `ios/` and configured via `capacitor.config.ts`.

The system is essentially a wardrobe and style intelligence service: API routes implement domain operations (upload/analyze clothing, generate outfits, capsules, analytics, purchase tracking, chat), while dashboard pages in `app/(dashboard)` compose these capabilities into UX flows.

### App Router structure (`app/`)

- `app/page.tsx` – Marketing/landing or entry experience.
- `app/layout.tsx`, `app/providers.tsx` – Global React layout and providers.
- `app/(auth)/` – Authentication-related pages (login/signup, etc.).
- `app/(dashboard)/` – Main logged-in UX, with subroutes roughly by feature:
  - `analytics/` – Wardrobe analytics dashboards.
  - `capsule/` – Capsule wardrobe planning views.
  - `closet/` – Wardrobe browser.
  - `help/` – Help/support surfaces.
  - `outfits/` – Outfit creation and browsing.
  - `page.tsx` – Dashboard home.
  - `pricing/` – Subscription/pricing UI.
  - `privacy/` – Privacy policy page.
  - `purchases/` – Purchase history and Gmail-backed purchase tracking.
  - `recommendations/` – AI-driven style and purchase-based recommendations.
  - `settings/` – User/account settings.
  - `style-quiz/` – Style quiz and personalization.
  - `upload/` – Clothing upload flow (hooks into AI vision + Blob storage).
  - `wear-tracking/` – Wear tracking and forgotten-item reminders.

These routes mostly orchestrate domain logic implemented under `lib/` and data served by `app/api/*` routes.

### API routes (`app/api/`)

`app/api/` hosts the HTTP surface area, organized by domain. Each directory typically contains a `route.ts` implementing a Next.js App Router handler:

- `clothing/` – Upload and analysis (`upload`, `analyze`) plus wardrobe search.
- `outfits/` – Outfit-of-the-day, multi-outfit generation, color validation, vector similarity search.
- `capsule/` – Weekly/monthly capsule generators and capsule persistence.
- `weather/` – Weather-aware outfit suggestions using Open-Meteo.
- `chat/` – Streaming AI style chat.
- `trends/` & `cron/` – Fashion trend scraping endpoints and scheduled cron entrypoint.
- `wear/` – Wear events and forgotten-item suggestions.
- `analytics/` – Wardrobe analytics endpoints consumed by dashboard charts.
- `purchases/` & `recommendations/` – Gmail-based purchase ingestion plus purchase-driven recommendations.
- `stripe/` – Billing/subscription endpoints.
- `user/` and `auth/` – User profile and authentication-related APIs (some still wired to demo users).

From `DEPLOYMENT.md`: API routes are configured with `export const dynamic = "force-dynamic"` so they always run at request time (necessary for Prisma/DB access and external APIs).

### Domain libraries (`lib/`)

The `lib/` directory is where most non-trivial logic lives. Important groupings:

- **AI & chat (`lib/ai/`)**
  - Encapsulates AI provider configuration and routing.
  - `lib/ai/README.md` documents provider priority and environment variables.
  - Public surface typically exposes functions like `analyzeClothingImage` and provider-specific helpers; app/API code calls into this layer rather than vendor SDKs directly.

- **Database access (`lib/db/`)**
  - Prisma client wrapper; everything that hits Postgres should import the client from here.
  - Schema and relationships are documented in `DATABASE.md` and `prisma/schema.prisma`.

- **Wardrobe & outfit logic**
  - `lib/outfit-generator.ts` – Core outfit generation and scoring logic used by `/api/outfits/*`.
  - `lib/capsule-generator.ts` – Capsule wardrobe construction, outfit plans, and versatility scoring.
  - `lib/color-validator.ts` – Color harmony rules and scoring (0–10) consumed by `/api/outfits/validate-colors`.
  - `lib/analytics.ts` – Wardrobe analytics aggregations for dashboard charts.

- **Weather & context**
  - `lib/weather.ts` – Wraps Open-Meteo and derives layering recommendations that drive `POST /api/weather/outfit`.

- **Purchases & Gmail integration**
  - `lib/gmail-integration.ts` – Gmail API access and message retrieval.
  - `lib/purchase-parser.ts` – Vendor-agnostic email parsing into normalized purchase records.
  - `lib/purchase-recommendations.ts` – Turns purchase + wardrobe data into insights (gaps, duplicates, shopping patterns).

- **Storage & media**
  - `lib/blob/` – Vercel Blob helpers for uploading and retrieving clothing images.
  - `lib/outfit-export.ts` – Logic for generating shareable outfit cards (e.g., via `html2canvas`).

- **Payments & subscriptions**
  - `lib/stripe/` – Stripe client and subscription/billing helpers referenced by the `app/api/stripe/*` routes and pricing UI.

- **Scraping & trends**
  - `lib/scrapers/` – Scrapers for GQ, Vogue, etc., feeding style rules and trends into the database.

- **Auth & helpers**
  - `lib/auth.ts`, `lib/auth-helpers.ts` – Authentication/session helpers (auth is still partially stubbed; see notes below).
  - `lib/api-client.ts`, `lib/utils/` – Frontend-facing API helpers and shared utilities.

### Database & data model

- Prisma schema and migrations are in `prisma/`.
- `DATABASE.md` documents the main tables (`users`, `clothing_items`, `style_rules`, `outfit_recommendations`, `saved_outfits`, `wear_events`, `uploads`, and newer purchase-related tables), indexes, and relationships.
- Row Level Security (RLS) is planned/enabled at the database level, but full auth integration (tying `user_id` to real authenticated users) still needs completing.

When modifying data access logic:

- Prefer updating the Prisma schema and regenerating the client (`npx prisma generate`).
- Keep `DATABASE.md` in sync when you add or significantly change tables/relationships.

### Authentication status

From `APP_STORE_READINESS.md` and TODO comments:

- Many API routes currently assume a placeholder or demo `userId` instead of deriving it from a real auth session.
- Frontend dashboard pages (e.g., purchases and settings) also hardcode demo users.

Future work that depends on per-user data should:

- Thread `userId` explicitly from a real auth mechanism (e.g., NextAuth.js) before being treated as production-ready.
- Avoid introducing additional hardcoded user IDs.

### Mobile/iOS shell

The iOS app is a Capacitor wrapper around the same Next.js app:

- `capacitor.config.ts` controls app ID, app name, and the web server URL.
- `NEXT_PUBLIC_CAPACITOR_SERVER_URL` and `CAPACITOR_USE_LOCAL` in `.env` decide whether the app loads from a deployed Vercel URL or `http://localhost:3000` for local dev.
- The native project lives under `ios/` and is managed with CocoaPods; see `IOS_SETUP.md` and `MOBILE_APP_SUMMARY.md` for full instructions.

This means most feature work should continue to target the web app (React/Next.js); the iOS project is primarily a distribution shell.

## Important project docs

These markdown files contain detailed operational knowledge and are worth consulting before large changes:

- `README.md` – High-level feature overview, tech stack, setup steps, and API route index.
- `QUICK_START.md` – Hands-on guide and curl examples for exercising the main APIs.
- `API_REFERENCE.md` – Canonical request/response definitions for public API routes.
- `DATABASE.md` – Database schema and relationship documentation.
- `DEPLOYMENT.md` – Vercel deployment steps, environment variables, and production checks.
- `ENV_SETUP.md` – Environment variables for local and production, including Gmail/Stripe/Capacitor settings.
- `IOS_SETUP.md` & `MOBILE_APP_SUMMARY.md` – iOS/Capacitor build, run, and App Store guidance.
- `APP_STORE_READINESS.md` – Checklist of remaining work for a polished App Store submission (notably authentication and privacy policy).
- `FEATURES_ROADMAP.md`, `NEXT_STEPS.md`, and related docs – Roadmap and implementation guides for future features.
