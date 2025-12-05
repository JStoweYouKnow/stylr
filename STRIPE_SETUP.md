# Stripe Integration Setup Guide

This guide will help you set up Stripe for subscription payments in Stylr.

---

## Prerequisites

1. A Stripe account (sign up at [stripe.com](https://stripe.com))
2. Access to your Stripe Dashboard

---

## Step 1: Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Click on **Developers** in the left sidebar
3. Click on **API keys**
4. Copy your:
   - **Publishable key** (starts with `pk_test_...` or `pk_live_...`)
   - **Secret key** (starts with `sk_test_...` or `sk_live_...`)

---

## Step 2: Create Subscription Products

### Create Products in Stripe Dashboard:

1. Go to **Products** in the Stripe Dashboard
2. Click **+ Add product**
3. Create three products:

#### Basic Plan
- **Name**: Stylr Basic
- **Description**: AI-powered wardrobe assistant - Basic
- **Pricing**: $4.99/month (recurring)
- **Copy the Price ID** (starts with `price_...`)

#### Pro Plan
- **Name**: Stylr Pro
- **Description**: AI-powered wardrobe assistant - Pro
- **Pricing**: $9.99/month (recurring)
- **Copy the Price ID**

#### Premium Plan
- **Name**: Stylr Premium
- **Description**: AI-powered wardrobe assistant - Premium
- **Pricing**: $19.99/month (recurring)
- **Copy the Price ID**

---

## Step 3: Set Up Webhook

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
   - For local development: `http://localhost:3002/api/stripe/webhook`
   - Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for local testing
4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. **Copy the Webhook signing secret** (starts with `whsec_...`)

---

## Step 4: Add Environment Variables

Add these variables to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_..." # Your secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." # Your publishable key
STRIPE_WEBHOOK_SECRET="whsec_..." # Your webhook secret

# Stripe Price IDs
STRIPE_PRICE_BASIC="price_..." # Basic plan price ID
STRIPE_PRICE_PRO="price_..." # Pro plan price ID
STRIPE_PRICE_PREMIUM="price_..." # Premium plan price ID
```

---

## Step 5: Update Database Schema

Run the Prisma migration to add subscription fields to the User model:

```bash
npx prisma db push
```

This will add these fields to the `users` table:
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `subscription_status`
- `subscription_tier`
- `current_period_end`

---

## Step 6: Test the Integration

### Local Testing with Stripe CLI:

1. **Install Stripe CLI**: https://stripe.com/docs/stripe-cli
2. **Login to Stripe**:
   ```bash
   stripe login
   ```
3. **Forward webhooks to your local server**:
   ```bash
   stripe listen --forward-to localhost:3002/api/stripe/webhook
   ```
4. **Use test card numbers**:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any 3-digit CVC

### Test Flow:

1. Start your dev server: `npm run dev`
2. Navigate to `/pricing`
3. Click "Upgrade to Pro"
4. Use test card: `4242 4242 4242 4242`
5. Check that:
   - Payment succeeds
   - Webhook is received
   - User's subscription is updated in database
   - User can access Pro features

---

## Step 7: Configure Stripe Customer Portal

1. Go to **Settings → Billing** in Stripe Dashboard
2. Click on **Customer portal**
3. Enable the portal
4. Configure allowed actions:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Allow customers to switch plans
5. Set your **Business information**
6. Set **Return URL**: `https://yourdomain.com/settings`

---

## Subscription Tiers & Features

### Free Tier
- **Price**: $0/month
- **Limits**:
  - 25 clothing items max
  - 3 outfit recommendations per day
  - No AI recommendations
  - No purchase tracking

### Basic Tier
- **Price**: $4.99/month
- **Limits**:
  - 100 clothing items max
  - 10 outfit recommendations per day
  - AI recommendations enabled
  - Purchase tracking enabled
  - Weather integration enabled

### Pro Tier
- **Price**: $9.99/month
- **Limits**:
  - Unlimited clothing items
  - 50 outfit recommendations per day
  - All Basic features
  - Capsule wardrobe builder
  - Gmail auto-import
  - Advanced analytics

### Premium Tier
- **Price**: $19.99/month
- **Limits**:
  - Everything in Pro
  - Unlimited outfit recommendations
  - Priority AI processing
  - Custom style rules
  - Calendar export
  - Priority support

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use test keys** in development
3. **Use live keys** only in production
4. **Verify webhook signatures** (already implemented in `webhook/route.ts`)
5. **Use HTTPS** in production
6. **Enable SCA** (Strong Customer Authentication) in Stripe Dashboard

---

## Troubleshooting

### Webhook not receiving events:
- Check webhook URL is correct
- Verify webhook secret matches `.env`
- Check Stripe CLI is running for local testing
- Check server logs for errors

### Subscription not updating:
- Check webhook events in Stripe Dashboard
- Verify database connection
- Check Prisma schema is up to date
- Look for errors in server logs

### Payment failing:
- Check Stripe API keys are correct
- Verify test mode vs live mode
- Check product and price IDs exist
- Test with different cards

---

## Going Live

Before going to production:

1. **Switch to live API keys**:
   - Replace all `sk_test_...` with `sk_live_...`
   - Replace all `pk_test_...` with `pk_live_...`
   - Update webhook with live endpoint URL

2. **Activate your Stripe account**:
   - Complete business verification
   - Add banking details for payouts

3. **Test thoroughly**:
   - Test subscriptions end-to-end
   - Test webhook delivery
   - Test cancellations and upgrades

4. **Monitor**:
   - Set up Stripe email notifications
   - Monitor failed payments
   - Track subscription metrics

---

## Useful Links

- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Testing Cards](https://stripe.com/docs/testing)
- [Webhook Testing](https://stripe.com/docs/webhooks/test)

---

## Support

If you encounter issues:
1. Check Stripe Dashboard logs
2. Check application server logs
3. Verify environment variables
4. Test webhooks with Stripe CLI
5. Contact Stripe support if needed

---

**Last Updated**: November 2025
