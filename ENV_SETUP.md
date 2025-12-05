# Environment Variables Setup

## Production Environment Variables

For production deployment (Vercel, etc.), make sure to set these environment variables:

### Required Variables

```env
# NextAuth Configuration
NEXTAUTH_SECRET="XhyYWmC+D+UTFCVDA5O5J690Wbgo7yl16K94B7wyG7k="
NEXTAUTH_URL="https://stylr.vercel.app"  # Your production URL

# Database
DATABASE_URL="your-production-database-url"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"

# AI Services
GOOGLE_GENERATIVE_AI_API_KEY="your-google-ai-key"

# Google OAuth (if using Gmail integration)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="https://stylr.vercel.app/api/purchases/connect/gmail/callback"

# Capacitor (for iOS app)
NEXT_PUBLIC_CAPACITOR_SERVER_URL="https://stylr.vercel.app"
CAPACITOR_USE_LOCAL="false"

# Stripe (for subscriptions)
STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_BASIC="price_..."
STRIPE_PRICE_PRO="price_..."
STRIPE_PRICE_PREMIUM="price_..."
```

## Security Notes

⚠️ **Important**: 
- Never commit `.env` file to git (it's already in `.gitignore`)
- Use different `NEXTAUTH_SECRET` for each environment (dev, staging, production)
- Generate a new secret for production: `openssl rand -base64 32`
- Keep secrets secure and rotate them periodically

## Vercel Setup

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable above
4. Make sure to set them for "Production", "Preview", and "Development" as needed

## Local Development

Your local `.env` file should have:
- `NEXTAUTH_URL="http://localhost:3001"` (or your local port)
- `CAPACITOR_USE_LOCAL="true"` (if testing iOS app locally)


