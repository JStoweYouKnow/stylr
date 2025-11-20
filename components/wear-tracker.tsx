"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface WearSuggestion {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
  wearCount: number;
  daysSinceWorn: number | null;
}

export default function WearTracker() {
  const [suggestions, setSuggestions] = useState<WearSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  async function fetchSuggestions() {
    try {
      setLoading(true);
      const res = await fetch("/api/wear/suggestions?limit=6");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function logWear(itemIds: number[]) {
    if (itemIds.length === 0) return;

    setLogging(true);
    try {
      const res = await fetch("/api/wear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds,
          wornOn: new Date().toISOString(),
          context: "Logged manually",
        }),
      });

      if (!res.ok) throw new Error("Failed to log");
      
      alert(`Logged ${itemIds.length} item(s) as worn today!`);
      setSelectedItems([]);
      fetchSuggestions();
    } catch (error) {
      console.error("Error logging wear:", error);
      alert("Failed to log wear. Please try again.");
    } finally {
      setLogging(false);
    }
  }

  function toggleItem(itemId: number) {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading wear tracking...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Log Section */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Quick Log - What did you wear today?</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select items from your closet to log them as worn today
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const allItemIds = suggestions.map((s) => s.id);
              setSelectedItems(allItemIds);
            }}
            className="px-4 py-2 text-sm border rounded-md hover:bg-blue-100"
          >
            Select All Shown
          </button>
          <button
            onClick={() => setSelectedItems([])}
            className="px-4 py-2 text-sm border rounded-md hover:bg-blue-100"
          >
            Clear
          </button>
          <button
            onClick={() => logWear(selectedItems)}
            disabled={selectedItems.length === 0 || logging}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            {logging ? "Logging..." : `Log ${selectedItems.length} Item(s)`}
          </button>
        </div>
      </div>

      {/* Suggestions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Items You Haven't Worn Recently</h3>
        {suggestions.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p>All your items are being used regularly! 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {suggestions.map((item) => (
              <div
                key={item.id}
                className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                  selectedItems.includes(item.id)
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => toggleItem(item.id)}
              >
                <div className="aspect-square relative bg-gray-100">
                  <img
                    src={item.imageUrl}
                    alt={item.type || "Item"}
                    className="w-full h-full object-cover"
                  />
                  {selectedItems.includes(item.id) && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>
                <div className="p-2 bg-white">
                  <p className="text-xs font-medium truncate">
                    {item.type || "Item"}
                  </p>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.daysSinceWorn !== null ? (
                      <span>
                        {item.daysSinceWorn === 0
                          ? "Worn today"
                          : `${item.daysSinceWorn} days ago`}
                      </span>
                    ) : (
                      <span className="text-orange-600">Never logged</span>
                    )}
                  </div>
                  {item.wearCount > 0 && (
                    <p className="text-xs text-gray-400">
                      {item.wearCount}x total
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

