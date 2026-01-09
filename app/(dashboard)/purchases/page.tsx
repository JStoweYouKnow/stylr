"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { PurchasesSkeleton } from "@/components/LoadingSkeleton";
import ManualPurchaseForm from "@/components/purchases/ManualPurchaseForm";

interface Purchase {
  id: number;
  itemName: string;
  store: string;
  purchaseDate: string;
  price?: number;
  itemType?: string;
  color?: string;
  brand?: string;
  addedToWardrobe: boolean;
}

interface Recommendation {
  type: string;
  message: string;
  basedOn?: string;
  suggestedAction?: string;
  suggestions?: string[];
  advice?: string;
  matchingItems?: any[];
  existingItems?: any[];
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"purchases" | "recommendations">("purchases");
  const [showManualForm, setShowManualForm] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }
    
    // Check for Gmail connection success/error messages in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      toast.success("Gmail connected successfully! You can now scan for purchases.");
      // Clean up URL
      window.history.replaceState({}, "", "/purchases");
    } else if (params.get("error") === "gmail_auth_denied") {
      toast.error("Gmail connection was denied. Please try again.");
      window.history.replaceState({}, "", "/purchases");
    } else if (params.get("error") === "gmail_connection_failed") {
      toast.error("Failed to connect Gmail. Please try again.");
      window.history.replaceState({}, "", "/purchases");
    }
    
    fetchPurchases();
    fetchRecommendations();
  }, [session, status, router]);

  const fetchPurchases = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/purchases?userId=${session.user.id}&limit=50&stats=true`);
      const data = await response.json();

      setPurchases(data.purchases || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error("Failed to fetch purchases:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch("/api/recommendations/from-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    }
  };

  const handleDeletePurchase = async (id: number) => {
    // Use toast for confirmation
    toast((t) => (
      <div>
        <p className="font-medium mb-2">Delete this purchase?</p>
        <p className="text-sm text-gray-600 mb-3">
          This action cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              performDelete(id);
            }}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Delete
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

  const performDelete = async (id: number) => {
    const loadingToast = toast.loading("Deleting purchase...");

    try {
      await fetch(`/api/purchases?id=${id}`, { method: "DELETE" });
      setPurchases((prev) => prev.filter((p) => p.id !== id));
      toast.success("Purchase deleted", { id: loadingToast });
    } catch (error) {
      console.error("Failed to delete purchase:", error);
      toast.error("Failed to delete purchase", { id: loadingToast });
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "wardrobe_gap":
        return "⚠️";
      case "duplicate_check":
        return "🔄";
      case "outfit_ready":
        return "✨";
      case "shopping_insight":
        return "📊";
      default:
        return "💡";
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case "wardrobe_gap":
        return "border-yellow-300 bg-yellow-50";
      case "duplicate_check":
        return "border-orange-300 bg-orange-50";
      case "outfit_ready":
        return "border-green-300 bg-green-50";
      case "shopping_insight":
        return "border-blue-300 bg-blue-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <PurchasesSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Purchase History</h1>
          <p className="text-gray-600">
            Track your clothing purchases and get smart recommendations
          </p>
        </div>
        <button
          onClick={() => setShowManualForm(true)}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Manually
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Purchases</p>
            <p className="text-2xl font-bold">{purchases.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Spent</p>
            <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Average Price</p>
            <p className="text-2xl font-bold">${stats.averagePrice.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Style Trend</p>
            <p className="text-2xl font-bold capitalize">{stats.recentTrend}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("purchases")}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === "purchases"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Purchases ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === "recommendations"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Recommendations ({recommendations.length})
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "purchases" ? (
        purchases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No purchases tracked yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Connect your Gmail account or add purchases manually in Settings
            </p>
            <a
              href="/settings"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Go to Settings
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">
                      {purchase.itemName}
                    </h3>
                    <p className="text-sm text-gray-600">{purchase.store}</p>
                  </div>
                  <button
                    onClick={() => handleDeletePurchase(purchase.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete purchase"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  {purchase.itemType && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Type:</span>
                      <span className="capitalize font-medium">
                        {purchase.itemType}
                      </span>
                    </div>
                  )}
                  {purchase.color && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Color:</span>
                      <span className="capitalize font-medium">
                        {purchase.color}
                      </span>
                    </div>
                  )}
                  {purchase.brand && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Brand:</span>
                      <span className="font-medium">{purchase.brand}</span>
                    </div>
                  )}
                  {purchase.price && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Price:</span>
                      <span className="font-bold text-green-600">
                        ${purchase.price.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {purchase.addedToWardrobe && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✓ In Wardrobe
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-600">No recommendations yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Add some purchases to get personalized recommendations
              </p>
            </div>
          ) : (
            recommendations.map((rec, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-5 ${getRecommendationColor(
                  rec.type
                )}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getRecommendationIcon(rec.type)}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{rec.message}</h3>

                    {rec.basedOn && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Based on:</strong> {rec.basedOn}
                      </p>
                    )}

                    {rec.suggestedAction && (
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Suggestion:</strong> {rec.suggestedAction}
                      </p>
                    )}

                    {rec.suggestions && rec.suggestions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Consider adding:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {rec.suggestions.map((suggestion, i) => (
                            <span
                              key={i}
                              className="bg-white px-3 py-1 rounded-full text-sm border border-gray-300"
                            >
                              {suggestion}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.advice && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {rec.advice}
                      </p>
                    )}

                    {rec.matchingItems && rec.matchingItems.length > 0 && (
                      <p className="text-sm text-green-700 mt-2">
                        ✓ {rec.matchingItems.length} matching item(s) in your wardrobe
                      </p>
                    )}

                    {rec.existingItems && rec.existingItems.length > 0 && (
                      <p className="text-sm text-orange-700 mt-2">
                        ⚠️ {rec.existingItems.length} similar item(s) already owned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showManualForm && (
        <ManualPurchaseForm
          onSuccess={() => {
            fetchPurchases();
            fetchRecommendations();
          }}
          onClose={() => setShowManualForm(false)}
        />
      )}
    </div>
  );
}
