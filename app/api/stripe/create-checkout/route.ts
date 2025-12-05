import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { stripe, SUBSCRIPTION_TIERS } from '@/lib/stripe/config';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await req.json();

    if (!tier || !['BASIC', 'PRO', 'PREMIUM'].includes(tier.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const tierKey = tier.toUpperCase() as keyof typeof SUBSCRIPTION_TIERS;
    const selectedTier = SUBSCRIPTION_TIERS[tierKey];

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId as string,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedTier.priceId as string,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/settings?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      metadata: {
        userId: user.id,
        tier: tierKey,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
