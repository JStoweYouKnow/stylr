"use client";

import { useState, useEffect } from "react";
import ItemCard from "./ItemCard";
import EmptyState, { ShirtIcon } from "@/components/EmptyState";
import { GridSkeleton } from "@/components/LoadingSkeleton";

interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  vibe: string | null;
  notes: string | null;
  tags?: string[];
}

export default function ClothingGrid() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type?: string;
    color?: string;
    vibe?: string;
  }>({});

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/clothing");
      if (!res.ok) throw new Error("Failed to fetch items");
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  function handleDelete(id: number) {
    setItems(items.filter((item) => item.id !== id));
  }

  // Get unique values for filters
  const types = Array.from(
    new Set(items.map((i) => i.type).filter(Boolean))
  ) as string[];
  const colors = Array.from(
    new Set(items.map((i) => i.primaryColor).filter(Boolean))
  ) as string[];
  const vibes = Array.from(
    new Set(items.map((i) => i.vibe).filter(Boolean))
  ) as string[];

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filter.type && item.type !== filter.type) return false;
    if (filter.color && item.primaryColor !== filter.color) return false;
    if (filter.vibe && item.vibe !== filter.vibe) return false;
    return true;
  });

  if (loading) {
    return <GridSkeleton count={8} />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      {(types.length > 0 || colors.length > 0 || vibes.length > 0) && (
        <div className="mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg space-y-3">
          <h3 className="text-sm font-semibold">Filters</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {types.length > 0 && (
              <select
                value={filter.type || ""}
                onChange={(e) =>
                  setFilter({ ...filter, type: e.target.value || undefined })
                }
                className="px-3 py-2 border rounded-md text-sm touch-manipulation min-h-[44px]"
              >
                <option value="">All Types</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
            {colors.length > 0 && (
              <select
                value={filter.color || ""}
                onChange={(e) =>
                  setFilter({ ...filter, color: e.target.value || undefined })
                }
                className="px-3 py-2 border rounded-md text-sm touch-manipulation min-h-[44px]"
              >
                <option value="">All Colors</option>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            )}
            {vibes.length > 0 && (
              <select
                value={filter.vibe || ""}
                onChange={(e) =>
                  setFilter({ ...filter, vibe: e.target.value || undefined })
                }
                className="px-3 py-2 border rounded-md text-sm touch-manipulation min-h-[44px]"
              >
                <option value="">All Styles</option>
                {vibes.map((vibe) => (
                  <option key={vibe} value={vibe}>
                    {vibe}
                  </option>
                ))}
              </select>
            )}
            {(filter.type || filter.color || filter.vibe) && (
              <button
                onClick={() => setFilter({})}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {filteredItems.length === 0 ? (
        items.length === 0 ? (
          <EmptyState
            icon={<ShirtIcon />}
            title="Your closet is empty"
            description="Start building your digital wardrobe by uploading photos of your clothes. Get AI-powered outfit recommendations and style insights!"
            primaryAction={{
              label: "Upload Your First Item",
              href: "/upload",
            }}
            secondaryAction={{
              label: "Learn How It Works",
              href: "#",
              onClick: () => alert("Tutorial coming soon!"),
            }}
          />
        ) : (
          <EmptyState
            icon={<ShirtIcon />}
            title="No items match your filters"
            description="Try adjusting your filters or clearing them to see more items."
            primaryAction={{
              label: "Clear Filters",
              onClick: () => setFilter({}),
            }}
          />
        )
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

