"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

// Placeholder component for items without images
function ImagePlaceholder({ type }: { type: string | null }) {
  return (
    <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center">
      <svg
        className="w-8 h-8 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span className="text-xs text-gray-500 mt-1 px-1 text-center truncate max-w-full">
        {type || "No image"}
      </span>
    </div>
  );
}

interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
  layeringCategory: string | null;
}

interface ItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: string;
  acceptCategories: string[];
  items: ClothingItem[];
  onSelect: (item: ClothingItem) => void;
}

const ZONE_LABELS: Record<string, string> = {
  head: "Hats & Headwear",
  top: "Tops",
  jacket: "Jackets & Outerwear",
  bottom: "Bottoms",
  shoes: "Shoes",
  fullBody: "Dresses & Jumpsuits",
};

export default function ItemPickerModal({
  isOpen,
  onClose,
  zone,
  acceptCategories,
  items,
  onSelect,
}: ItemPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      const category = item.layeringCategory?.toLowerCase() || "";
      const itemType = item.type?.toLowerCase() || "";
      
      let matchesCategory = acceptCategories.some(
        (ac) => category === ac || category.includes(ac)
      );

      // Fallback: Check type field if layeringCategory doesn't match
      if (!matchesCategory) {
        // For bottom zone, check if type is pants-related
        if (zone === "bottom") {
          const isBottomType =
            itemType.includes("pants") ||
            itemType.includes("jeans") ||
            itemType.includes("trousers") ||
            itemType.includes("shorts") ||
            itemType.includes("skirt") ||
            itemType.includes("leggings") ||
            itemType.includes("joggers") ||
            itemType.includes("chinos");
          if (isBottomType) matchesCategory = true;
        }
        // For top zone, check if type is top-related
        else if (zone === "top") {
          const isTopType =
            itemType.includes("shirt") ||
            itemType.includes("t-shirt") ||
            itemType.includes("blouse") ||
            itemType.includes("sweater") ||
            itemType.includes("hoodie") ||
            itemType.includes("cardigan") ||
            itemType.includes("tank") ||
            itemType.includes("top");
          if (isTopType) matchesCategory = true;
        }
        // For jacket zone, check if type is jacket-related
        else if (zone === "jacket") {
          const isJacketType =
            itemType.includes("jacket") ||
            itemType.includes("coat") ||
            itemType.includes("blazer") ||
            itemType.includes("parka") ||
            itemType.includes("windbreaker") ||
            itemType.includes("bomber");
          if (isJacketType) matchesCategory = true;
        }
        // For shoes zone, check if type is shoe-related
        else if (zone === "shoes") {
          const isShoeType =
            itemType.includes("shoe") ||
            itemType.includes("boot") ||
            itemType.includes("sandal") ||
            itemType.includes("heel") ||
            itemType.includes("sneaker") ||
            itemType.includes("loafer");
          if (isShoeType) matchesCategory = true;
        }
        // For full-body zone, check if type is dress/jumpsuit-related
        else if (zone === "fullBody") {
          const isFullBodyType =
            itemType.includes("dress") ||
            itemType.includes("jumpsuit") ||
            itemType.includes("romper") ||
            itemType.includes("overalls");
          if (isFullBodyType) matchesCategory = true;
        }
      }

      // Special case for head zone - only show hats
      if (zone === "head") {
        const isHat =
          itemType.includes("hat") ||
          itemType.includes("cap") ||
          itemType.includes("beanie") ||
          itemType.includes("fedora") ||
          itemType.includes("beret");
        if (!isHat) return false;
      }

      if (!matchesCategory) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          item.type?.toLowerCase().includes(query) ||
          item.primaryColor?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [items, acceptCategories, searchQuery, zone]);

  if (!isOpen) return null;

  const handleSelect = (item: ClothingItem) => {
    onSelect(item);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[80vh] flex flex-col rounded-t-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">
            {ZONE_LABELS[zone] || "Select Item"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No items found</p>
              <p className="text-sm">
                {searchQuery
                  ? "Try a different search"
                  : `Add some ${ZONE_LABELS[zone]?.toLowerCase() || "items"} to your wardrobe`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="aspect-square relative rounded-lg overflow-hidden border-2 border-transparent hover:border-black transition-colors group"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.type || "Clothing item"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 33vw, 25vw"
                    />
                  ) : (
                    <ImagePlaceholder type={item.type} />
                  )}
                  {/* Item info overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">
                      {item.type || "Item"}
                    </p>
                    {item.primaryColor && (
                      <p className="text-white/80 text-[10px] truncate">
                        {item.primaryColor}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    </div>
  );
}
