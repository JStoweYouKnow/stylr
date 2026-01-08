"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Button from "@/components/Button";
import AvatarUpload from "@/components/AvatarUpload";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [purchaseCount, setPurchaseCount] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    checkGmailConnection();
    fetchPurchaseStats();
    fetchSubscriptionStatus();
  }, [session, status, router]);

  const fetchSubscriptionStatus = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch('/api/user/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const handleManageSubscription = async () => {
    setSubscriptionLoading(true);
    const loadingToast = toast.loading("Opening billing portal...");

    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        toast.success("Redirecting...", { id: loadingToast });
        window.location.href = data.url;
      } else {
        toast.error("Failed to open billing portal", { id: loadingToast });
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error("Failed to open billing portal", { id: loadingToast });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const checkGmailConnection = async () => {
    try {
      const response = await fetch("/api/email-connection");
      const data = await response.json();

      if (data.connected) {
        setIsConnected(true);

        // Set last sync date if available
        if (data.connection.lastSyncedAt) {
          setLastSyncDate(new Date(data.connection.lastSyncedAt).toLocaleDateString());
        }

        // Show warning if token is expired
        if (data.connection.isExpired) {
          toast.error("Gmail connection expired. Please reconnect to continue scanning purchases.");
        }
      } else {
        setIsConnected(false);
        setLastSyncDate(null);
      }
    } catch (error) {
      console.error("Failed to check Gmail connection:", error);
      setIsConnected(false);
    }
  };

  const fetchPurchaseStats = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/purchases?userId=${session.user.id}&limit=1`);
      const data = await response.json();
      setPurchaseCount(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch purchase stats:", error);
    }
  };

  const handleConnectGmail = async () => {
    if (!session?.user?.id) {
      toast.error("Please log in first");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Connecting to Gmail...");

    try {
      const response = await fetch("/api/purchases/connect/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await response.json();

      if (data.authUrl) {
        toast.success("Redirecting to Google...", { id: loadingToast });
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to connect Gmail", { id: loadingToast });
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      toast.error("Failed to connect Gmail. Please try again.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanPurchases = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    const loadingToast = toast.loading("Scanning emails for purchases...");

    try {
      const response = await fetch("/api/purchases/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          daysBack: 30,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error, { id: loadingToast });
      } else {
        toast.success(
          `Found ${data.new} new purchase${data.new !== 1 ? 's' : ''}! (${data.scanned} emails scanned)`,
          {
            id: loadingToast,
            duration: 6000,
          }
        );
        setPurchaseCount((prev) => prev + (data.new || 0));
      }
    } catch (error) {
      console.error("Error scanning purchases:", error);
      toast.error("Failed to scan purchases. Please try again.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!session?.user?.id) return;

    // Using toast for confirmation instead of confirm()
    toast((t) => (
      <div>
        <p className="font-medium mb-2">Disconnect Gmail?</p>
        <p className="text-sm text-gray-600 mb-3">
          This will stop scanning your emails for purchases.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDisconnect();
            }}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Disconnect
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3 py-1.5 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 10000,
    });
  };

  const performDisconnect = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading("Disconnecting Gmail...");

    try {
      const response = await fetch("/api/email-connection", {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        setIsConnected(false);
        setLastSyncDate(null);
        toast.success("Gmail disconnected successfully", { id: loadingToast });
      } else {
        toast.error(data.error || "Failed to disconnect Gmail", { id: loadingToast });
      }
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      toast.error("Failed to disconnect Gmail. Please try again.", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      {/* Avatar Section */}
      <div className="mb-6" id="avatar">
        <AvatarUpload userId={session?.user?.id} />
      </div>

      {/* Subscription Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">💳 Subscription</h2>

        {subscription ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold capitalize">{subscription.tier || 'Free'} Plan</p>
                {subscription.status === 'active' && subscription.currentPeriodEnd && (
                  <p className="text-sm text-gray-600 mt-1">
                    Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscription.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {subscription.isActive ? 'Active' : subscription.status}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Your Limits:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Max clothing items: {subscription.limits.maxClothingItems === Infinity ? 'Unlimited' : subscription.limits.maxClothingItems}</li>
                <li>• Daily outfit recommendations: {subscription.limits.maxOutfitsPerDay === Infinity ? 'Unlimited' : subscription.limits.maxOutfitsPerDay}</li>
                <li>• AI recommendations: {subscription.limits.aiRecommendations ? 'Yes' : 'No'}</li>
                <li>• Purchase tracking: {subscription.limits.purchaseTracking ? 'Yes' : 'No'}</li>
                <li>• Capsule wardrobe: {subscription.limits.capsuleWardrobe ? 'Yes' : 'No'}</li>
              </ul>
            </div>

            <div className="flex gap-3">
              {subscription.tier === 'free' ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/pricing')}
                >
                  Upgrade Plan
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleManageSubscription}
                  isLoading={subscriptionLoading}
                >
                  Manage Subscription
                </Button>
              )}
              <Button
                variant="ghost"
                size="md"
                onClick={() => router.push('/pricing')}
              >
                View All Plans
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading subscription...</p>
          </div>
        )}
      </div>

      {/* Gmail Integration Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              📧 Gmail Purchase Tracking
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Automatically scan your Gmail for clothing purchase receipts and
              get smart recommendations based on your shopping patterns.
            </p>
          </div>
          <div className="text-right">
            {isConnected ? (
              <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                ✓ Connected
              </span>
            ) : (
              <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
                Not Connected
              </span>
            )}
          </div>
        </div>

        {/* Purchase Stats */}
        {purchaseCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              <strong>{purchaseCount}</strong> purchase
              {purchaseCount !== 1 ? "s" : ""} tracked
            </p>
            {lastSyncDate && (
              <p className="text-xs text-blue-700 mt-1">
                Last synced: {new Date(lastSyncDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Features List */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Features:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ AI-powered receipt parsing</li>
            <li>✓ Duplicate purchase detection</li>
            <li>✓ Wardrobe gap analysis</li>
            <li>✓ Smart outfit recommendations</li>
            <li>✓ Spending insights</li>
          </ul>
        </div>

        {/* Privacy Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-xs text-gray-600">
            <strong>Privacy:</strong> We only read order confirmation emails.
            Email content is not stored - only purchase data is extracted. You
            can disconnect anytime and all data will be deleted.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isConnected ? (
            <button
              onClick={handleConnectGmail}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isLoading ? "Connecting..." : "Connect Gmail Account"}
            </button>
          ) : (
            <>
              <button
                onClick={handleScanPurchases}
                disabled={isLoading}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {isLoading ? "Scanning..." : "Scan for Purchases (Last 30 Days)"}
              </button>

              <button
                onClick={handleDisconnectGmail}
                disabled={isLoading}
                className="w-full bg-red-50 text-red-600 px-6 py-3 rounded-lg hover:bg-red-100 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium transition-colors border border-red-200"
              >
                Disconnect Gmail
              </button>
            </>
          )}
        </div>

        {/* Setup Instructions */}
        {!isConnected && (
          <details className="mt-6">
            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
              Setup instructions (for developers)
            </summary>
            <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-4 rounded border border-gray-200">
              <p className="font-medium mb-2">Required environment variables:</p>
              <pre className="bg-white p-2 rounded border border-gray-300 overflow-x-auto">
                {`GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:3000/api/purchases/connect/gmail/callback"`}
              </pre>
              <p className="mt-3">
                Get credentials from{" "}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>
          </details>
        )}
      </div>

      {/* Manual Purchase Entry Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2">
          ✍️ Manual Purchase Entry
        </h2>
        <p className="text-gray-600 text-sm mb-4">
          Don't want to connect Gmail? You can manually add purchases.
        </p>
        <button
          onClick={() => {
            toast("Manual purchase entry coming soon!", { icon: "ℹ️" });
          }}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-medium transition-colors"
        >
          Add Purchase Manually
        </button>
      </div>

      {/* Privacy Policy Link */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2">📄 Legal</h2>
        <div className="space-y-2">
          <a
            href="/privacy"
            className="block text-blue-600 hover:text-blue-800 underline"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
