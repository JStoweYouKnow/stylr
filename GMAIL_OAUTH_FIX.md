# Gmail OAuth Token Refresh Error Fix

## Problem
Getting `invalid_request` error when scanning Gmail purchases. This means the refresh token is invalid.

## Root Cause
**Your OAuth app is likely in "Testing" mode in Google Cloud Console**, which causes refresh tokens to expire after 7 days.

## Solution: Publish OAuth App to Production

### Step 1: Go to Google Cloud Console
1. Visit https://console.cloud.google.com/
2. Select your project (the one with the OAuth credentials)

### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Check the current status:
   - If it says **"Testing"** → This is the problem!
   - Publishing status shows "Testing" with limited users

### Step 3: Publish to Production
1. Click **"PUBLISH APP"** button
2. You'll see a warning - click **"CONFIRM"**
3. Status should change from "Testing" to **"In Production"**

**Note**: If you see "Verification Required" warning:
- For personal use apps with < 100 users: You can ignore this and still publish
- The app will work fine without verification for your own use
- Only needed if you're serving external users at scale

### Step 4: Verify Redirect URI
While in Google Cloud Console:
1. Go to **APIs & Services** → **Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **"Authorized redirect URIs"**, verify you have:
   ```
   https://stylr.projcomfort.com/api/purchases/connect/gmail/callback
   ```
4. If missing or wrong, add/fix it and click **Save**

### Step 5: Reconnect Gmail in Stylr
After publishing to production:
1. Go to Stylr → **Settings** → **Gmail Purchase Tracking**
2. Click **"Disconnect Gmail"** (if currently connected)
3. Click **"Connect Gmail Account"**
4. Authorize again
5. Try **"Scan for Purchases"**

## Why This Happens

### Testing Mode (Default)
- Refresh tokens expire after **7 days**
- Limited to 100 test users
- App can be revoked by Google at any time
- Meant for development only

### Production Mode
- Refresh tokens **never expire** (unless revoked)
- Unlimited users
- Stable for production use
- Tokens remain valid indefinitely

## Alternative: Use Service Account (Not Recommended for Gmail)
Gmail API doesn't work well with service accounts for personal email access. OAuth with refresh tokens is the correct approach.

## Verification
After fixing, you should see in Vercel logs:
```
Access token expired, attempting refresh...
Successfully refreshed access token
```

Instead of:
```
Token refresh failed: invalid_request
```

## Common Mistakes to Avoid

1. **Wrong Redirect URI**: Must exactly match (including https/http and trailing slashes)
2. **Credentials mismatch**: GOOGLE_CLIENT_ID in Vercel must match the one in Google Cloud Console
3. **Revoked access**: If you revoked access in Google Account settings, you must reconnect
4. **Testing mode**: The #1 cause of this error - always publish to production

## Environment Variables Checklist

Verify these in Vercel (use your actual values from Google Cloud Console):
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
GOOGLE_REDIRECT_URI=https://stylr.projcomfort.com/api/purchases/connect/gmail/callback
```

All three must match your Google Cloud Console OAuth client exactly.
