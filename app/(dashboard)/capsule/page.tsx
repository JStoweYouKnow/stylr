"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import { GridSkeleton } from "@/components/LoadingSkeleton";

interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  vibe: string | null;
  layeringCategory: string | null;
}

interface CapsuleWardrobe {
  items: ClothingItem[];
  outfits: Array<{
    day: string;
    occasion: string;
    items: ClothingItem[];
    reasoning: string;
  }>;
  stats: {
    totalItems: number;
    outfitsPerItem: Record<number, number>;
    versatilityScore: number;
  };
}

export default function CapsuleBuilderPage() {
  const [allItems, setAllItems] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [capsule, setCapsule] = useState<CapsuleWardrobe | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [showGuidelines, setShowGuidelines] = useState(true);
  const [occasionMix, setOccasionMix] = useState({
    casual: period === "weekly" ? 3 : 12,
    work: period === "weekly" ? 4 : 16,
    formal: period === "weekly" ? 0 : 2,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (period === "weekly") {
      setOccasionMix({ casual: 3, work: 4, formal: 0 });
    } else {
      setOccasionMix({ casual: 12, work: 16, formal: 2 });
    }
  }, [period]);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/clothing");
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setAllItems(data.items || []);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleItemSelection(itemId: number) {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  }

  async function generateAICapsule() {
    try {
      setGenerating(true);
      const endpoint = period === "weekly" ? "/api/capsule/weekly" : "/api/capsule/monthly";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasionMix,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate capsule");
      const data = await res.json();
      setCapsule(data.capsule);
      setSelectedItems(data.capsule.items.map((item: ClothingItem) => item.id));
    } catch (err) {
      console.error("Error generating capsule:", err);
      alert("Failed to generate capsule. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function generateFromSelected() {
    if (selectedItems.length === 0) {
      alert("Please select at least one item for your capsule");
      return;
    }

    try {
      setGenerating(true);
      const selectedItemsData = allItems.filter((item) =>
        selectedItems.includes(item.id)
      );

      // Calculate versatility score
      const versatilityScore = calculateVersatility(selectedItemsData);

      // Generate sample outfits
      const outfits = generateSampleOutfits(selectedItemsData, period);

      setCapsule({
        items: selectedItemsData,
        outfits,
        stats: {
          totalItems: selectedItemsData.length,
          outfitsPerItem: {},
          versatilityScore,
        },
      });
    } catch (err) {
      console.error("Error creating capsule:", err);
    } finally {
      setGenerating(false);
    }
  }

  function calculateVersatility(items: ClothingItem[]): number {
    // Score based on:
    // - Neutral colors (higher score)
    // - Mix of types
    // - Layering categories
    const neutralColors = ["black", "white", "gray", "grey", "navy", "beige", "brown", "cream", "taupe"];
    let score = 0;

    const hasNeutral = items.some((item) =>
      neutralColors.some((color) =>
        item.primaryColor?.toLowerCase().includes(color)
      )
    );
    if (hasNeutral) score += 30;

    const types = new Set(items.map((i) => i.type).filter(Boolean));
    score += Math.min(types.size * 10, 30);

    const layers = new Set(items.map((i) => i.layeringCategory).filter(Boolean));
    score += Math.min(layers.size * 10, 20);

    const colors = new Set(items.map((i) => i.primaryColor).filter(Boolean));
    score += Math.min(colors.size * 5, 20);

    return Math.min(score, 100);
  }

  function generateSampleOutfits(
    items: ClothingItem[],
    period: "weekly" | "monthly"
  ): CapsuleWardrobe["outfits"] {
    const days = period === "weekly" ? 7 : 30;
    const outfits: CapsuleWardrobe["outfits"] = [];
    const occasions = ["casual", "work", "casual", "work", "casual", "work", "casual"];

    for (let i = 0; i < Math.min(days, items.length); i++) {
      const dayName =
        period === "weekly"
          ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i]
          : `Day ${i + 1}`;

      // Simple outfit: pick 2-4 items
      const outfitItems = items.slice(i, Math.min(i + 3, items.length));
      if (outfitItems.length > 0) {
        outfits.push({
          day: dayName,
          occasion: occasions[i % occasions.length],
          items: outfitItems,
          reasoning: `Versatile combination using ${outfitItems.length} core pieces`,
        });
      }
    }

    return outfits;
  }

  const selectedItemsData = allItems.filter((item) =>
    selectedItems.includes(item.id)
  );
  const neutralColors = ["black", "white", "gray", "grey", "navy", "beige", "brown", "cream", "taupe"];
  const neutralCount = selectedItemsData.filter((item) =>
    neutralColors.some((color) =>
      item.primaryColor?.toLowerCase().includes(color)
    )
  ).length;

  if (loading) {
    return <GridSkeleton count={8} />;
  }

  if (allItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-4">Build Your Capsule Wardrobe</h2>
        <p className="text-gray-600 mb-6">
          Upload some clothing items first to start building your capsule wardrobe.
        </p>
        <Link href="/upload">
          <Button variant="primary">Upload Your First Item</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Capsule Wardrobe Builder</h1>
        <p className="text-gray-600">
          Create a curated collection of versatile, mix-and-match pieces
        </p>
      </div>

      {/* Guidelines Card */}
      {showGuidelines && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-blue-900">Capsule Wardrobe Guidelines</h2>
            <button
              onClick={() => setShowGuidelines(false)}
              className="text-blue-600 hover:text-blue-800"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3 text-blue-800 text-sm">
            <div>
              <h3 className="font-semibold mb-1">🎨 Color Palette</h3>
              <p>
                Keep a primarily neutral color palette (black, navy, gray, brown, beige, white).
                Add 1-2 accent colors that complement your neutrals.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">✨ Timeless & Versatile</h3>
              <p>
                Choose pieces that are classic, functional, and can be styled multiple ways.
                Think: white button-down, blazer, straight-leg jeans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">📏 Size Guidelines</h3>
              <p>
                Weekly capsule: 12-15 items | Monthly capsule: 20-30 items. Don't get hung up on
                exact numbers - focus on versatility and pieces you love.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">🔄 Mix & Match</h3>
              <p>
                Every piece should pair easily with others. Test combinations before finalizing
                your capsule.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
          <div className="flex gap-3">
            <button
              onClick={() => setPeriod("weekly")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                period === "weekly"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Weekly (12-15 items)
            </button>
            <button
              onClick={() => setPeriod("monthly")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                period === "monthly"
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Monthly (20-30 items)
            </button>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={generateAICapsule}
              disabled={generating}
            >
              {generating ? "Generating..." : "AI Generate"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={generateFromSelected}
              disabled={selectedItems.length === 0 || generating}
            >
              Build from Selected ({selectedItems.length})
            </Button>
          </div>
        </div>

        {/* Stats */}
        {selectedItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <div className="text-2xl font-bold">{selectedItems.length}</div>
              <div className="text-sm text-gray-600">Items Selected</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{neutralCount}</div>
              <div className="text-sm text-gray-600">Neutral Colors</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Set(selectedItemsData.map((i) => i.type).filter(Boolean)).size}
              </div>
              <div className="text-sm text-gray-600">Item Types</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {capsule?.stats.versatilityScore || calculateVersatility(selectedItemsData)}
              </div>
              <div className="text-sm text-gray-600">Versatility Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Capsule Preview */}
      {capsule && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Your Capsule Wardrobe</h2>
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Versatility Score: <span className="font-semibold">{capsule.stats.versatilityScore}/100</span>
            </div>
            <div className="text-sm text-gray-600">
              {capsule.outfits.length} outfit combinations planned
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {capsule.items.map((item) => (
              <div key={item.id} className="border rounded-lg overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.type || "Item"}
                  className="w-full h-48 object-cover"
                />
                <div className="p-3">
                  <h3 className="font-semibold text-sm mb-1">
                    {item.type || "Unknown Item"}
                  </h3>
                  {item.primaryColor && (
                    <p className="text-xs text-gray-600">Color: {item.primaryColor}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outfit Plan */}
      {capsule && capsule.outfits.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Outfit Plan</h2>
          <div className="space-y-4">
            {capsule.outfits.slice(0, period === "weekly" ? 7 : 14).map((outfit, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{outfit.day}</h3>
                    <span className="text-sm text-gray-600 capitalize">{outfit.occasion}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{outfit.reasoning}</p>
                <div className="flex gap-2 flex-wrap">
                  {outfit.items.map((item) => (
                    <div
                      key={item.id}
                      className="w-16 h-16 rounded border overflow-hidden"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.type || "Item"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Selection Grid */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">
          Select Items for Your Capsule ({selectedItems.length} selected)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {allItems.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            const isNeutral = neutralColors.some((color) =>
              item.primaryColor?.toLowerCase().includes(color)
            );
            return (
              <div
                key={item.id}
                className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition ${
                  isSelected
                    ? "border-black ring-2 ring-black"
                    : "border-gray-200 hover:border-gray-400"
                }`}
                onClick={() => toggleItemSelection(item.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    ✓
                  </div>
                )}
                {isNeutral && (
                  <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Neutral
                  </div>
                )}
                <div className="relative">
                  <img
                    src={item.imageUrl}
                    alt={item.type || "Item"}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-3">
                    <h3 className="font-semibold text-sm mb-1">
                      {item.type || "Unknown Item"}
                    </h3>
                    {item.primaryColor && (
                      <p className="text-xs text-gray-600">Color: {item.primaryColor}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

