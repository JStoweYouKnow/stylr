"use client";

import { useState, useEffect } from "react";
import type { Ref } from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import { MultiBackend, TouchTransition, MouseTransition } from "react-dnd-multi-backend";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import DraggableItem from "./draggable-item";
import OutfitVisualizer from "@/components/OutfitVisualizer";

// Configure multi-backend for both desktop and mobile support
const HTML5toTouch = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: MouseTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: {
        enableMouseEvents: true,
        delayTouchStart: 200, // 200ms long-press to start dragging on mobile
      },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
  layeringCategory: string | null;
}

interface OutfitSlot {
  category: "base" | "mid" | "outer" | "accessory";
  item: ClothingItem | null;
}

export default function OutfitBoard() {
  const [wardrobeItems, setWardrobeItems] = useState<ClothingItem[]>([]);
  const [outfitSlots, setOutfitSlots] = useState<OutfitSlot[]>([
    { category: "base", item: null },
    { category: "mid", item: null },
    { category: "outer", item: null },
    { category: "accessory", item: null },
  ]);
  const [outfitName, setOutfitName] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<OutfitSlot[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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
    newHistory.push(JSON.parse(JSON.stringify(outfitSlots)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function handleDrop(category: "base" | "mid" | "outer" | "accessory", itemId: number) {
    const item = wardrobeItems.find((i) => i.id === itemId);
    if (!item) return;

    saveToHistory();

    setOutfitSlots((prev) =>
      prev.map((slot) =>
        slot.category === category ? { ...slot, item } : slot
      )
    );
  }

  function removeItem(category: string) {
    saveToHistory();
    setOutfitSlots((prev) =>
      prev.map((slot) =>
        slot.category === category ? { ...slot, item: null } : slot
      )
    );
  }

  function undo() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setOutfitSlots(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setOutfitSlots(JSON.parse(JSON.stringify(history[newIndex])));
    }
  }

  async function saveOutfit() {
    const items = outfitSlots
      .map((slot) => slot.item?.id)
      .filter((id): id is number => id !== undefined);

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

      alert("Outfit saved successfully!");
      setOutfitName("");
      setOutfitSlots([
        { category: "base", item: null },
        { category: "mid", item: null },
        { category: "outer", item: null },
        { category: "accessory", item: null },
      ]);
      setHistory([]);
      setHistoryIndex(-1);
    } catch (error) {
      console.error("Error saving outfit:", error);
      alert("Failed to save outfit. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function clearOutfit() {
    saveToHistory();
    setOutfitSlots([
      { category: "base", item: null },
      { category: "mid", item: null },
      { category: "outer", item: null },
      { category: "accessory", item: null },
    ]);
  }

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wardrobe Sidebar */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Your Wardrobe</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {wardrobeItems.length === 0 ? (
              <p className="text-gray-500 text-sm">No items in wardrobe</p>
            ) : (
              wardrobeItems.map((item) => (
                <DraggableItem key={item.id} item={item} />
              ))
            )}
          </div>
        </div>

        {/* Outfit Board */}
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

            {/* Outfit Slots */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {outfitSlots.map((slot) => (
                <OutfitSlot
                  key={slot.category}
                  slot={slot}
                  onDrop={handleDrop}
                  onRemove={removeItem}
                />
              ))}
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

          {/* Outfit Visualizer */}
          {outfitSlots.some((slot) => slot.item !== null) && (
            <div className="mt-6">
              <OutfitVisualizer
                itemIds={outfitSlots
                  .map((slot) => slot.item?.id)
                  .filter((id): id is number => id !== undefined)}
              />
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}

function OutfitSlot({
  slot,
  onDrop,
  onRemove,
}: {
  slot: OutfitSlot;
  onDrop: (category: OutfitSlot["category"], itemId: number) => void;
  onRemove: (category: string) => void;
}) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "clothing-item",
    drop: (item: { id: number }) => {
      onDrop(slot.category, item.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  const categoryLabels = {
    base: "Base Layer",
    mid: "Mid Layer",
    outer: "Outer Layer",
    accessory: "Accessory",
  };

  const dropRef = drop as unknown as Ref<HTMLDivElement>;

  return (
    <div
      ref={dropRef}
      className={`border-2 border-dashed rounded-lg p-4 min-h-[200px] transition-colors ${
        isOver ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold">{categoryLabels[slot.category]}</h4>
        {slot.item && (
          <button
            onClick={() => onRemove(slot.category)}
            className="text-red-500 hover:text-red-700 text-xs"
          >
            Remove
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {slot.item ? (
          <motion.div
            key={slot.item.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative aspect-square rounded overflow-hidden"
          >
            <Image
              src={slot.item.imageUrl}
              alt={slot.item.type || "Item"}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
              <p className="font-medium">{slot.item.type || "Item"}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center h-full text-gray-400 text-sm"
          >
            Drag item here
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

