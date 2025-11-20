# Database Schema Documentation

## Overview

The Stylr database uses PostgreSQL with Prisma ORM. The schema supports a complete wardrobe management system with AI analysis, outfit recommendations, wear tracking, and more.

## Tables

### 1. Users (`users`)
Stores user account information.

- `id` (UUID) - Primary key
- `email` (TEXT) - Unique email address
- `name` (TEXT) - User's name (optional)
- `created_at` (TIMESTAMPTZ) - Account creation timestamp

### 2. Clothing Items (`clothing_items`)
Stores clothing items with AI-generated metadata.

- `id` (SERIAL) - Primary key
- `user_id` (UUID) - Foreign key to users
- `image_url` (TEXT) - URL to the image in Vercel Blob
- `blob_path` (TEXT) - Path in blob storage
- `type` (TEXT) - Item type (shirt, pants, etc.)
- `primary_color` (TEXT) - Main color
- `secondary_color` (TEXT) - Secondary color
- `pattern` (TEXT) - Pattern type
- `fit` (TEXT) - Fit style
- `vibe` (TEXT) - Style vibe
- `notes` (TEXT) - Additional notes
- `layering_category` (TEXT) - base, mid, outer, or accessory
- `tags` (TEXT[]) - Array of tags
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**Indexes:**
- `clothing_items_user_idx` on `user_id`
- `idx_clothing_type` on `type`
- `idx_clothing_color` on `primary_color`
- `idx_tags_gin` (GIN) on `tags`

### 3. Style Rules (`style_rules`)
Stores fashion rules scraped from sources like GQ, Vogue, etc.

- `id` (SERIAL) - Primary key
- `source` (TEXT) - Source name (GQ, Vogue, etc.)
- `title` (TEXT) - Rule title
- `description` (TEXT) - Rule description
- `rule` (JSONB) - Structured rule data
- `season` (TEXT) - Applicable season
- `created_at` (TIMESTAMPTZ) - Creation timestamp

### 4. Outfit Recommendations (`outfit_recommendations`)
Stores AI-generated outfit recommendations.

- `id` (SERIAL) - Primary key
- `user_id` (UUID) - Foreign key to users
- `items` (INTEGER[]) - Array of clothing item IDs
- `occasion` (TEXT) - Occasion type
- `generated_by` (TEXT) - "AI" or "manual"
- `confidence_score` (NUMERIC) - AI confidence score
- `ai_explanation` (TEXT) - Claude's reasoning
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**Indexes:**
- `outfit_recommendations_user_idx` on `user_id`
- `idx_outfits_items` (GIN) on `items`

### 5. Saved Outfits (`saved_outfits`)
Stores user-saved outfit combinations.

- `id` (SERIAL) - Primary key
- `user_id` (UUID) - Foreign key to users
- `items` (INTEGER[]) - Array of clothing item IDs
- `name` (TEXT) - Outfit name
- `created_at` (TIMESTAMPTZ) - Creation timestamp

### 6. Wear Events (`wear_events`)
Tracks when clothing items are worn.

- `id` (SERIAL) - Primary key
- `user_id` (UUID) - Foreign key to users
- `clothing_item_id` (INTEGER) - Foreign key to clothing_items
- `worn_on` (DATE) - Date worn
- `context` (TEXT) - Context/occasion
- `created_at` (TIMESTAMPTZ) - Creation timestamp

**Indexes:**
- `wear_events_user_idx` on `user_id`

### 7. Uploads (`uploads`)
Logs all upload attempts and their status.

- `id` (SERIAL) - Primary key
- `user_id` (UUID) - Foreign key to users
- `image_url` (TEXT) - Image URL
- `status` (TEXT) - "uploaded", "analyzed", or "failed"
- `error_message` (TEXT) - Error details if failed
- `created_at` (TIMESTAMPTZ) - Creation timestamp

## Row Level Security (RLS)

All user-related tables have RLS enabled for multi-user privacy:

- `clothing_items`
- `outfit_recommendations`
- `saved_outfits`
- `wear_events`
- `uploads`

**Note:** RLS policies need to be created after authentication is implemented. The policies will use `auth.uid()` to filter rows by user. See the migration file for the policy SQL (currently commented out).

## Relationships

```
User
├── ClothingItem[] (one-to-many)
├── OutfitRecommendation[] (one-to-many)
├── SavedOutfit[] (one-to-many)
├── WearEvent[] (one-to-many)
└── Upload[] (one-to-many)

ClothingItem
└── WearEvent[] (one-to-many)
```

## Performance Considerations

1. **GIN Indexes**: Used for array columns (`tags`, `items`) to enable fast array queries
2. **User Indexes**: All user-related tables are indexed on `user_id` for fast filtering
3. **Type/Color Indexes**: Clothing items are indexed on `type` and `primary_color` for filtering

## Migration

To apply the schema:

```bash
# Using Prisma
npx prisma migrate dev --name init

# Or using SQL directly
psql $DATABASE_URL -f prisma/migrations/0001_init/migration.sql
```

## Next Steps

1. Implement authentication to enable RLS policies
2. Add indexes for common query patterns
3. Consider partitioning for large tables (wear_events, uploads)
4. Add full-text search indexes for tags and notes

