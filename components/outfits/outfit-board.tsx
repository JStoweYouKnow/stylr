"use client";

import { useState, useEffect } from "react";
import { useDragLayer } from "react-dnd";
import { DndProvider } from "react-dnd-multi-backend";
import { HTML5toTouch } from "rdndmb-html5-to-touch";
import DraggableItem from "./draggable-item";
import OutfitVisualizer from "@/components/OutfitVisualizer";
import Mannequin, { OutfitState, ClothingItem } from "./mannequin/Mannequin";
import ItemPickerModal from "./ItemPickerModal";

// Zone configuration for item picker modal
const ZONE_CONFIG: Record<keyof OutfitState, string[]> = {
  head: ["accessories"],
  top: ["top"],
  jacket: ["jacket"],
  bottom: ["bottom"],
  shoes: ["shoes"],
  fullBody: ["full-body"],
};

interface OutfitBoardProps {
  onSaveSuccess?: () => void;
}

// Inner component that uses DnD hooks - must be inside DndProvider
function OutfitBoardContent({ onSaveSuccess }: OutfitBoardProps) {
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [outfit, setOutfit] = useState<OutfitState>({
    head: null,
    top: null,
    jacket: null,
    bottom: null,
    shoes: null,
    fullBody: null,
  });
  const [outfitName, setOutfitName] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<OutfitState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Item picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerZone, setPickerZone] = useState<keyof OutfitState>("top");

  // Category filter for wardrobe sidebar
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchWardrobe();
  }, []);

  async function fetchWardrobe() {
    try {
      const res = await fetch("/api/clothing");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWardrobeItems(data.items || []);
    } catch (error) {
      console.error("Error fetching wardrobe:", error);
    }
  }

  function saveToHistory() {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(outfit)));
    // Limit history to 50 states
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function handleDropItem(zone: keyof OutfitState, itemId: number) {
    // Find the full item from wardrobe
    const item = wardrobeItems.find((i) => i.id === itemId);
    if (!item) return;

    // Haptic feedback
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50);
    }

    saveToHistory();

    setOutfit((prev) => {
      const newOutfit = { ...prev };

      // Full-body logic: if adding full-body, clear top and bottom
      if (zone === "fullBody") {
        newOutfit.top = null;
        newOutfit.bottom = null;
        newOutfit.fullBody = item;
      }
      // If adding top or bottom, clear full-body
      else if (zone === "top" || zone === "bottom") {
        newOutfit.fullBody = null;
        newOutfit[zone] = item;
      }
      // Other zones work normally
      else {
        newOutfit[zone] = item;
      }

      return newOutfit;
    });
  }

  function handleRemoveItem(zone: keyof OutfitState) {
    saveToHistory();
    setOutfit((prev) => ({
      ...prev,
      [zone]: null,
    }));
  }

  function handleZoneClick(zone: keyof OutfitState) {
    setPickerZone(zone);
    setPickerOpen(true);
  }

  function handlePickerSelect(item: ClothingItem) {
    handleDropItem(pickerZone, item.id);
  }

  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setOutfit(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setOutfit(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }

  async function saveOutfit() {
    // Collect all item IDs from the outfit
    const items = Object.values(outfit)
      .filter((item): item is ClothingItem => item !== null)
      .map((item) => item.id);

    if (items.length === 0) {
      alert("Please add at least one item to the outfit");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          name: outfitName || `Outfit ${new Date().toLocaleDateString()}`,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setOutfitName("");
      setOutfit({
        head: null,
        top: null,
        jacket: null,
        bottom: null,
        shoes: null,
        fullBody: null,
      });
      setHistory([]);
      setHistoryIndex(-1);

      if (onSaveSuccess) {
        onSaveSuccess();
      } else {
        alert("Outfit saved successfully!");
      }
    } catch (error) {
      console.error("Error saving outfit:", error);
      alert("Failed to save outfit. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function clearOutfit() {
    saveToHistory();
    setOutfit({
      head: null,
      top: null,
      jacket: null,
      bottom: null,
      shoes: null,
      fullBody: null,
    });
  }

  // Get item IDs for visualizer
  const outfitItemIds = Object.values(outfit)
    .filter((item): item is ClothingItem => item !== null)
    .map((item) => item.id);

  // Filter wardrobe items by category
  const filteredWardrobeItems = categoryFilter
    ? wardrobeItems.filter((item) => {
        const category = item.layeringCategory?.toLowerCase() || "";
        return category === categoryFilter || category.includes(categoryFilter);
      })
    : wardrobeItems;

  const categories = [
    { id: null, label: "All" },
    { id: "top", label: "Tops" },
    { id: "bottom", label: "Bottoms" },
    { id: "jacket", label: "Jackets" },
    { id: "shoes", label: "Shoes" },
    { id: "accessories", label: "Accessories" },
    { id: "full-body", label: "Dresses" },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Outfit Builder</h3>
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
              >
                Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
              >
                Redo
              </button>
              <button
                onClick={clearOutfit}
                className="px-2 py-1 text-xs border rounded"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Mannequin */}
          <div className="mb-4">
            <Mannequin
              outfit={outfit}
              onDropItem={handleDropItem}
              onZoneClick={handleZoneClick}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          {/* Mobile Save */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Outfit name (optional)"
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            />
            <button
              onClick={saveOutfit}
              disabled={saving}
              className="w-full px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Outfit"}
            </button>
          </div>
        </div>
      </div>

      {/* Wardrobe Section */}
      <div>
        <h3 className="text-lg font-semibold mb-3 px-1">
          Your Wardrobe - Drag items to mannequin or tap zones to select
        </h3>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id || "all"}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                categoryFilter === cat.id
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Mobile: Horizontal scroll */}
        <div className="lg:hidden">
          <div
            className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {filteredWardrobeItems.length === 0 ? (
              <p className="text-gray-500 text-sm px-1">
                {categoryFilter ? "No items in this category" : "No items in wardrobe"}
              </p>
            ) : (
              filteredWardrobeItems.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-[200px] snap-center">
                  <DraggableItem item={item} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desktop: Grid layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {/* Desktop Wardrobe */}
          <div className="lg:col-span-1 max-h-[600px] overflow-y-auto">
            <div className="space-y-3 pr-2">
              {filteredWardrobeItems.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  {categoryFilter ? "No items in this category" : "No items in wardrobe"}
                </p>
              ) : (
                filteredWardrobeItems.map((item) => (
                  <DraggableItem key={item.id} item={item} />
                ))
              )}
            </div>
          </div>

          {/* Desktop Outfit Board */}
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Outfit Builder</h3>
                <div className="flex gap-2">
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Undo
                  </button>
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                  >
                    Redo
                  </button>
                  <button
                    onClick={clearOutfit}
                    className="px-3 py-1 text-sm border rounded"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Mannequin */}
              <div className="flex justify-center mb-6">
                <Mannequin
                  outfit={outfit}
                  onDropItem={handleDropItem}
                  onZoneClick={handleZoneClick}
                  onRemoveItem={handleRemoveItem}
                />
              </div>

              {/* Save Outfit */}
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Outfit name (optional)"
                  value={outfitName}
                  onChange={(e) => setOutfitName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md"
                />
                <button
                  onClick={saveOutfit}
                  disabled={saving}
                  className="w-full px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Outfit"}
                </button>
              </div>
            </div>

            {/* Desktop Outfit Visualizer */}
            {outfitItemIds.length > 0 && (
              <div className="mt-6">
                <OutfitVisualizer itemIds={outfitItemIds} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Outfit Visualizer */}
      {outfitItemIds.length > 0 && (
        <div className="lg:hidden">
          <OutfitVisualizer itemIds={outfitItemIds} />
        </div>
      )}

      {/* Item Picker Modal */}
      <ItemPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        zone={pickerZone}
        acceptCategories={ZONE_CONFIG[pickerZone]}
        items={wardrobeItems}
        onSelect={handlePickerSelect}
      />
    </div>
  );
}

// Outer component that provides DndProvider context
export default function OutfitBoard({ onSaveSuccess }: OutfitBoardProps = {}) {
  return (
    <DndProvider options={HTML5toTouch}>
      <OutfitBoardContent onSaveSuccess={onSaveSuccess} />
    </DndProvider>
  );
}
