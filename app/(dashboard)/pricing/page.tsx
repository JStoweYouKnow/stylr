"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { toast } from "react-hot-toast";

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started with your digital wardrobe',
    features: [
      'Up to 25 clothing items',
      'Basic outfit recommendations',
      'Manual clothing upload',
      'Simple wear tracking',
    ],
    cta: 'Current Plan',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$4.99',
    description: 'Great for building a smart wardrobe',
    features: [
      'Up to 100 clothing items',
      'AI-powered outfit recommendations',
      'Weather-based suggestions',
      'Wear tracking & analytics',
      'Purchase history tracking',
    ],
    cta: 'Upgrade to Basic',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9.99',
    description: 'For serious style enthusiasts',
    features: [
      'Unlimited clothing items',
      'Advanced AI outfit generation',
      'Capsule wardrobe builder',
      'Gmail purchase auto-import',
      'Style profile & recommendations',
      'Advanced analytics',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$19.99',
    description: 'Ultimate wardrobe management',
    features: [
      'Everything in Pro',
      'Priority AI processing',
      'Custom style rules',
      'Export to calendar',
      'Early access to new features',
      'Priority support',
    ],
    cta: 'Upgrade to Premium',
    popular: false,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tierId: string) => {
    if (tierId === 'free') {
      toast.error('You are already on the free plan');
      return;
    }

    setLoading(tierId);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600">
          Upgrade your wardrobe management with AI-powered features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`rounded-lg border-2 p-6 flex flex-col ${
              tier.popular
                ? 'border-black shadow-lg scale-105'
                : 'border-gray-200'
            }`}
          >
            {tier.popular && (
              <div className="text-xs font-semibold text-white bg-black px-3 py-1 rounded-full self-start mb-4">
                MOST POPULAR
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold">{tier.price}</span>
                {tier.id !== 'free' && (
                  <span className="text-gray-500 ml-2">/month</span>
                )}
              </div>
              <p className="text-sm text-gray-600">{tier.description}</p>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start text-sm">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={tier.popular ? 'primary' : 'secondary'}
              size="md"
              fullWidth
              onClick={() => handleSubscribe(tier.id)}
              isLoading={loading === tier.id}
              disabled={tier.id === 'free' || loading !== null}
            >
              {tier.cta}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-gray-600">
        <p>
          All plans include a 7-day money-back guarantee. Cancel anytime.
        </p>
        <p className="mt-2">
          Questions? <a href="/help" className="text-black underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
