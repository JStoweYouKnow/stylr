# Deployment Guide - Stylr

## ✅ Pre-Deployment Checklist

Your app is **ready to deploy**! Here's what's configured:

- ✅ Prisma client generation in build script
- ✅ All dependencies properly configured
- ✅ PWA manifest and service worker
- ✅ Edge runtime for chat API
- ✅ Free AI providers (Gemini, Groq)
- ✅ Environment variables documented

---

## 🚀 Deploy to Vercel (Recommended)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In Vercel dashboard, add these environment variables:

#### Required
```
DATABASE_URL=postgresql://neondb_owner:...@ep-flat-bird-ahaemz8p-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_iHeAfUe7yzJMZUVA_bGC5WdqZ1SEnQQzPqEKk8oMibQqisq
GOOGLE_AI_API_KEY=AIzaSyAPFri2tt551E_Hy6kizZyogm90h0XSLG8
```

#### Optional (for scheduled jobs)
```
CRON_SECRET=your_random_secret_string
```

#### Optional (fallback AI providers)
```
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
```

### Step 4: Deploy

Click "Deploy" and Vercel will:
1. Install dependencies
2. Run `prisma generate` (via postinstall hook)
3. Build your Next.js app
4. Deploy to production

### Step 5: Set Up Cron Jobs (Optional)

If you want daily trend scraping:

1. Create `vercel.json` in project root:
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

2. Redeploy

---

## 🔒 Security Notes

### Database Connection

Your Neon database connection string is already configured for:
- ✅ SSL mode required
- ✅ Channel binding required
- ✅ Connection pooling (via `-pooler` endpoint)

### API Keys

Make sure all API keys are:
- ✅ Added as Vercel environment variables (not in code)
- ✅ Never committed to git
- ✅ `.env` is in `.gitignore`

### Cron Endpoint

The trend scraper endpoint checks for `CRON_SECRET`:
```typescript
// In /api/cron/scrape-trends
if (process.env.CRON_SECRET) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

---

## 🧪 Test Production Build Locally

Before deploying, test the production build:

```bash
# Build
npm run build

# Start production server
npm run start

# Open http://localhost:3000
```

Test these endpoints:
- ✅ Upload clothing item
- ✅ Generate outfit
- ✅ Weather-based suggestions
- ✅ AI chat assistant
- ✅ Analytics dashboard
- ✅ Search/filter

---

## 📊 Monitoring

### Vercel Dashboard

Monitor:
- Build logs
- Runtime logs
- API usage
- Error tracking

### Database (Neon)

Monitor:
- Connection count
- Query performance
- Storage usage

### AI APIs

Monitor:
- Gemini API usage (15 req/min free limit)
- Groq API usage (if used)
- Response times

---

## 🐛 Troubleshooting

### Build Fails with Prisma Error

**Error**: "Prisma Client is not generated"

**Fix**: Already fixed! The `package.json` includes:
```json
"build": "prisma generate && next build",
"postinstall": "prisma generate"
```

### Runtime Error: Cannot Find Module '@prisma/client'

**Fix**: `@prisma/client` is now in `dependencies` (not devDependencies)

### Edge Runtime Issues

**Error**: "Dynamic Code Evaluation not allowed in Edge Runtime"

**Fix**: Chat endpoint already uses Edge-compatible code. If adding new Edge functions, avoid:
- `eval()`
- `Function()`
- `vm` module

### Image Upload Fails

**Check**:
1. `BLOB_READ_WRITE_TOKEN` is set in Vercel
2. Token has write permissions
3. Blob store is created in Vercel dashboard

### AI Analysis Fails

**Check**:
1. `GOOGLE_AI_API_KEY` is set
2. API key is valid
3. Check Vercel logs for specific error
4. Rate limits (15 req/min for free tier)

---

## 🔄 Continuous Deployment

After initial setup, every push to `main` will:
1. Trigger automatic deployment
2. Run build process
3. Deploy new version
4. Keep previous deployment as fallback

### Branch Previews

Every pull request gets:
- Preview URL
- Isolated environment
- Same environment variables

---

## 📈 Scaling

### Current Setup (FREE)

- Vercel Hobby: FREE
- Neon Database: FREE (512MB)
- Vercel Blob: FREE (1GB)
- Gemini API: FREE (15 req/min)

### When to Upgrade

**Vercel Pro** ($20/month) when you need:
- More bandwidth
- More build minutes
- Team collaboration

**Neon Pro** ($19/month) when you need:
- More storage (>512MB)
- More compute
- Branch database for testing

**Alternative AI** if you need:
- Higher rate limits
- More requests/min
- OpenAI: $0.15/1M tokens

---

## 🎯 Post-Deployment Checklist

After successful deployment:

- [ ] Test all API endpoints
- [ ] Upload a test clothing item
- [ ] Generate outfit suggestions
- [ ] Test weather integration
- [ ] Try AI chat assistant
- [ ] Check analytics dashboard
- [ ] Test PWA installation on mobile
- [ ] Verify trend scraper (if enabled)
- [ ] Set up error monitoring
- [ ] Add custom domain (optional)

---

## 🌐 Custom Domain (Optional)

1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain
4. Configure DNS records
5. SSL automatically provisioned

---

## 📱 PWA Installation

After deployment, users can install Stylr as an app:

**iOS**:
1. Open in Safari
2. Tap Share button
3. "Add to Home Screen"

**Android**:
1. Chrome shows "Install" prompt
2. Or Menu → "Install App"

**Desktop**:
1. Chrome shows install icon in address bar
2. Or Menu → "Install Stylr"

---

## 🎉 You're Ready!

Your Stylr app is production-ready with:
- ✅ 20 API endpoints
- ✅ 11 pages
- ✅ Free AI providers
- ✅ Analytics & tracking
- ✅ PWA support
- ✅ Trend scraping
- ✅ Style chat assistant

**Deploy now**: `git push origin main` → Import to Vercel → Deploy! 🚀

---

## 📞 Support

If you encounter issues:

1. Check Vercel build logs
2. Check Vercel runtime logs
3. Verify environment variables
4. Test locally with `npm run build && npm start`
5. Check [Next.js docs](https://nextjs.org/docs)
6. Check [Vercel docs](https://vercel.com/docs)

**Common Issues**:
- [Prisma on Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
