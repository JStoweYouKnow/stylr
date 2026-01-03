"use client";

import { useState, useEffect, useRef } from "react";
import type { Ref } from "react";
import { useDrop, useDragLayer } from "react-dnd";
import { DndProvider } from "react-dnd-multi-backend";
import { HTML5toTouch } from "rdndmb-html5-to-touch";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import DraggableItem from "./draggable-item";
import OutfitVisualizer from "@/components/OutfitVisualizer";

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

// Global state for tracking which drop zone is being hovered (for iOS)
let globalHoveredSlot: string | null = null;
let globalTouchPosition: { x: number; y: number } | null = null;

interface OutfitBoardProps {
  onSaveSuccess?: () => void;
}

// Inner component that uses DnD hooks - must be inside DndProvider
function OutfitBoardContent({ onSaveSuccess }: OutfitBoardProps) {
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
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Track global touch position when dragging - now inside DndProvider context
  const isDragging = useDragLayer((monitor) => monitor.isDragging());

  useEffect(() => {
    if (!isDragging) {
      setHoveredSlot(null);
      globalHoveredSlot = null;
      return;
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        globalTouchPosition = { x: touch.clientX, y: touch.clientY };
        
        // Find which drop zone contains this touch point
        const dropZones = document.querySelectorAll('[data-drop-zone]');
        let foundSlot: string | null = null;
        
        dropZones.forEach((zone) => {
          const rect = zone.getBoundingClientRect();
          if (
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom
          ) {
            foundSlot = zone.getAttribute('data-drop-zone');
          }
        });
        
        globalHoveredSlot = foundSlot;
        setHoveredSlot(foundSlot);
      }
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isDragging]);

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

    // Haptic feedback on successful drop (if available)
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(50); // Short vibration on drop
    }

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

      setOutfitName("");
      setOutfitSlots([
        { category: "base", item: null },
        { category: "mid", item: null },
        { category: "outer", item: null },
        { category: "accessory", item: null },
      ]);
      setHistory([]);
      setHistoryIndex(-1);
      
      // Call success callback if provided
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
    setOutfitSlots([
      { category: "base", item: null },
      { category: "mid", item: null },
      { category: "outer", item: null },
      { category: "accessory", item: null },
    ]);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
      {/* Wardrobe Sidebar */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-white z-20 py-2">Your Wardrobe</h3>
        <div className="space-y-3">
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
      <div className="lg:col-span-2 order-1 lg:order-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4 mb-6">
              {outfitSlots.map((slot) => (
                <OutfitSlot
                  key={slot.category}
                  slot={slot}
                  onDrop={handleDrop}
                  onRemove={removeItem}
                  isGloballyHovered={hoveredSlot === slot.category}
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

function OutfitSlot({
  slot,
  onDrop,
  onRemove,
  isGloballyHovered = false,
}: {
  slot: OutfitSlot;
  onDrop: (category: OutfitSlot["category"], itemId: number) => void;
  onRemove: (category: string) => void;
  isGloballyHovered?: boolean;
}) {
  const dropElementRef = useRef<HTMLDivElement | null>(null);

  const [{ isOver, canDrop, isDraggingOver }, drop] = useDrop(
    () => ({
      accept: "clothing-item",
      drop: (item: { id: number }, monitor) => {
        // Check if this is the globally hovered slot (iOS fallback)
        const isOverByMonitor = monitor.isOver({ shallow: true });
        const isOverByGlobal = globalHoveredSlot === slot.category || isGloballyHovered;
        
        // Accept drop if monitor says over OR if global state says this slot is hovered
        if (isOverByMonitor || isOverByGlobal) {
          console.log(`Dropping item ${item.id} into ${slot.category}`, { isOverByMonitor, isOverByGlobal });
          onDrop(slot.category, item.id);
          globalHoveredSlot = null;
          return { dropped: true, category: slot.category };
        }
        return undefined;
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
        canDrop: monitor.canDrop(),
        isDraggingOver: monitor.isOver(),
      }),
    }),
    [slot.category, onDrop, isGloballyHovered]
  );

  // Combine both drop refs
  const combinedRef = (node: HTMLDivElement | null) => {
    dropElementRef.current = node;
    (drop as any)(node);
  };

  const categoryLabels = {
    base: "Base Layer",
    mid: "Mid Layer",
    outer: "Outer Layer",
    accessory: "Accessory",
  };

  // Combine monitor state with global hover state for iOS
  const isActuallyOver = isOver || isDraggingOver || isGloballyHovered;

  return (
    <div
      ref={combinedRef}
      data-drop-zone={slot.category}
      className={`border-2 border-dashed rounded-lg p-4 sm:p-6 min-h-[200px] sm:min-h-[220px] transition-all duration-200 ${
        isActuallyOver
          ? "border-blue-500 bg-blue-100 scale-[1.02] shadow-lg ring-2 ring-blue-300" 
          : "border-gray-300 bg-white"
      }`}
      style={{ 
        touchAction: 'none',
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitTapHighlightColor: 'transparent', // Remove tap highlight
        pointerEvents: 'auto', // Ensure drop zones are always interactive
        position: 'relative', // Ensure proper z-index stacking
        zIndex: isActuallyOver ? 10 : 1, // Bring active drop zone to front
      }}
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

