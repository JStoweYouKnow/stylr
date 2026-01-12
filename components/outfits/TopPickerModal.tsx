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

interface TopPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ClothingItem[];
  currentTop: ClothingItem | null;
  currentJacket: ClothingItem | null;
  onConfirm: (top: ClothingItem | null, jacket: ClothingItem | null) => void;
}

export default function TopPickerModal({
  isOpen,
  onClose,
  items,
  currentTop,
  currentJacket,
  onConfirm,
}: TopPickerModalProps) {
  const [selectedTop, setSelectedTop] = useState<ClothingItem | null>(currentTop);
  const [selectedJacket, setSelectedJacket] = useState<ClothingItem | null>(currentJacket);
  const [activeTab, setActiveTab] = useState<"top" | "jacket">("top");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter items - combine top and jacket categories into one list
  const tops = useMemo(() => {
    return items.filter((item) => {
      const category = item.layeringCategory?.toLowerCase() || "";
      const itemType = item.type?.toLowerCase() || "";
      
      // Check if it's a top (base layer)
      let isTop = category === "top" || category.includes("top");
      if (!isTop) {
        isTop =
          itemType.includes("shirt") ||
          itemType.includes("t-shirt") ||
          itemType.includes("blouse") ||
          itemType.includes("sweater") ||
          itemType.includes("hoodie") ||
          itemType.includes("cardigan") ||
          itemType.includes("tank") ||
          itemType.includes("top");
      }
      
      return isTop;
    });
  }, [items]);

  const jackets = useMemo(() => {
    return items.filter((item) => {
      const category = item.layeringCategory?.toLowerCase() || "";
      const itemType = item.type?.toLowerCase() || "";
      
      // Check if it's a jacket
      let isJacket = category === "jacket" || category.includes("jacket");
      if (!isJacket) {
        isJacket =
          itemType.includes("jacket") ||
          itemType.includes("coat") ||
          itemType.includes("blazer") ||
          itemType.includes("parka") ||
          itemType.includes("windbreaker") ||
          itemType.includes("bomber");
      }
      
      return isJacket;
    });
  }, [items]);

  // Combined list of all tops (both base layer and jackets)
  const allTops = useMemo(() => {
    const combined = [...tops, ...jackets];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return combined.filter((item) => {
        const itemType = item.type?.toLowerCase() || "";
        return (
          itemType.includes(query) ||
          item.primaryColor?.toLowerCase().includes(query)
        );
      });
    }
    
    return combined;
  }, [tops, jackets, searchQuery]);

  const handleConfirm = () => {
    onConfirm(selectedTop, selectedJacket);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelectItem = (item: ClothingItem) => {
    // Determine if item is a top or jacket
    const category = item.layeringCategory?.toLowerCase() || "";
    const itemType = item.type?.toLowerCase() || "";
    
    const isJacketItem =
      category === "jacket" ||
      category.includes("jacket") ||
      itemType.includes("jacket") ||
      itemType.includes("coat") ||
      itemType.includes("blazer") ||
      itemType.includes("parka") ||
      itemType.includes("windbreaker") ||
      itemType.includes("bomber");

    if (isJacketItem) {
      // Toggle jacket selection
      setSelectedJacket(item.id === selectedJacket?.id ? null : item);
    } else {
      // Toggle top selection
      setSelectedTop(item.id === selectedTop?.id ? null : item);
    }
  };

  const handleClear = (type: "top" | "jacket") => {
    if (type === "top") {
      setSelectedTop(null);
    } else {
      setSelectedJacket(null);
    }
  };

  const isSelectedAsTop = (item: ClothingItem) => item.id === selectedTop?.id;
  const isSelectedAsJacket = (item: ClothingItem) => item.id === selectedJacket?.id;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[100]"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-lg max-h-[85vh] flex flex-col rounded-t-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold">Select Tops</h3>
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

        {/* Selected Items Preview */}
        <div className="p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {/* Selected Top */}
            <div className="bg-white rounded-lg border-2 p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Base Layer</span>
                {selectedTop && (
                  <button
                    onClick={() => handleClear("top")}
                    className="text-red-500 text-xs hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedTop ? (
                <div className="aspect-square relative rounded overflow-hidden border">
                  <Image
                    src={selectedTop.imageUrl}
                    alt={selectedTop.type || "Top"}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1">
                    <p className="text-white text-[10px] truncate">
                      {selectedTop.type || "Top"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-400">None selected</span>
                </div>
              )}
            </div>

            {/* Selected Jacket */}
            <div className="bg-white rounded-lg border-2 p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Jacket</span>
                {selectedJacket && (
                  <button
                    onClick={() => handleClear("jacket")}
                    className="text-red-500 text-xs hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedJacket ? (
                <div className="aspect-square relative rounded overflow-hidden border">
                  <Image
                    src={selectedJacket.imageUrl}
                    alt={selectedJacket.type || "Jacket"}
                    fill
                    className="object-cover"
                    sizes="150px"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1">
                    <p className="text-white text-[10px] truncate">
                      {selectedJacket.type || "Jacket"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="aspect-square border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-400">None selected</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b flex-shrink-0">
          <input
            type="text"
            placeholder="Search tops and jackets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {allTops.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">No items found</p>
              <p className="text-sm">
                {searchQuery
                  ? "Try a different search"
                  : "Add some tops or jackets to your wardrobe"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {allTops.map((item) => {
                const isTop = isSelectedAsTop(item);
                const isJacket = isSelectedAsJacket(item);
                const isSelected = isTop || isJacket;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`aspect-square relative rounded-lg overflow-hidden border-2 transition-all group ${
                      isSelected
                        ? "border-black scale-95 ring-2 ring-black ring-offset-2"
                        : "border-transparent hover:border-black"
                    }`}
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
                    {isSelected && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </div>
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
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex-shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

