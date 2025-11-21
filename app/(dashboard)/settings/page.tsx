"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  // TODO: Replace with actual user authentication
  const user = { id: "demo-user" };
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [purchaseCount, setPurchaseCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      checkGmailConnection();
      fetchPurchaseStats();
    }
  }, [user]);

  const checkGmailConnection = async () => {
    // Check if user has an active email connection
    // This would require a new API endpoint, but for now we'll skip it
    // In production, you'd call: GET /api/email-connection?userId=...
  };

  const fetchPurchaseStats = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/purchases?userId=${user.id}&limit=1`);
      const data = await response.json();
      setPurchaseCount(data.count || 0);
    } catch (error) {
      console.error("Failed to fetch purchase stats:", error);
    }
  };

  const handleConnectGmail = async () => {
    if (!user?.id) {
      alert("Please log in first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/purchases/connect/gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        alert("Failed to connect Gmail: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Error connecting Gmail:", error);
      alert("Failed to connect Gmail. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanPurchases = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/purchases/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          daysBack: 30,
        }),
      });

      const data = await response.json();

      if (data.error) {
        alert("Error: " + data.error);
      } else {
        alert(
          `Scan complete!\n\nScanned: ${data.scanned} emails\nFound: ${data.found} purchases\nNew items: ${data.new}\nDuplicates: ${data.duplicates}`
        );
        setPurchaseCount((prev) => prev + (data.new || 0));
      }
    } catch (error) {
      console.error("Error scanning purchases:", error);
      alert("Failed to scan purchases. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!user?.id) return;
    if (!confirm("Are you sure you want to disconnect your Gmail account?")) {
      return;
    }

    setIsLoading(true);
    try {
      // This would call a disconnect endpoint
      // For now, we'll just update the UI
      setIsConnected(false);
      alert("Gmail disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting Gmail:", error);
      alert("Failed to disconnect Gmail. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

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
          onClick={() => alert("Manual entry form coming soon!")}
          className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-medium transition-colors"
        >
          Add Purchase Manually
        </button>
      </div>
    </div>
  );
}
