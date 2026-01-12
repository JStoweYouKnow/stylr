"use client";

import { useDrop } from "react-dnd";
import { ClothingItem } from "./Mannequin";

// Drag item type (only contains essential info for drag)
interface DragItem {
  id: number;
  layeringCategory: string | null;
}

// Collected props type
interface CollectedProps {
  isOver: boolean;
  canDrop: boolean;
}

interface MannequinZoneProps {
  zone: string;
  label: string;
  acceptCategories: string[];
  item: ClothingItem | null;
  disabled?: boolean;
  style: React.CSSProperties;
  onDrop: (itemId: number) => void;
  onClick: () => void;
  onRemove: () => void;
  isOverlay?: boolean;
  isFullBody?: boolean;
  hasFullBody?: boolean;
  hasTopOrBottom?: boolean;
}

export default function MannequinZone({
  zone,
  label,
  acceptCategories,
  item,
  disabled = false,
  style,
  onDrop,
  onClick,
  onRemove,
  isOverlay = false,
  isFullBody = false,
  hasFullBody = false,
  hasTopOrBottom = false,
}: MannequinZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, CollectedProps>(
    () => ({
      accept: "clothing-item",
      canDrop: (dragItem: DragItem) => {
        if (disabled) return false;
        const category = dragItem.layeringCategory?.toLowerCase() || "";
        let matchesCategory = acceptCategories.some((ac) => category === ac || category.includes(ac));
        
        // Fallback: If category doesn't match, we need the full item to check type
        // This will be handled by the onDrop handler which has access to the full item
        return matchesCategory;
      },
      drop: (dragItem: DragItem) => {
        onDrop(dragItem.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [disabled, acceptCategories, onDrop]
  );

  // For full-body zone, only show when no top/bottom OR when dragging a full-body item
  const shouldShowFullBodyZone = isFullBody && !hasFullBody;

  // Check if this zone will replace full-body (top/bottom zones when full-body exists)
  const willReplaceFullBody = hasFullBody && (zone === "top" || zone === "bottom");

  // Don't render full-body zone when there's already a full-body item OR when top/bottom exist (except for hover)
  if (isFullBody && (hasFullBody || hasTopOrBottom) && !isOver) {
    return null;
  }

  // Don't render overlay zones (jacket) background when empty
  const isEmpty = item === null;

  const handleClick = () => {
    if (disabled) return;
    onClick();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  // Ensure top/bottom zones are always visible and on top when full-body exists
  const zIndex = willReplaceFullBody ? 50 : isOverlay ? 40 : isFullBody ? 10 : 30;

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      style={{ ...style, zIndex }}
      onClick={handleClick}
      className={`
        rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
        flex items-center justify-center relative
        touch-manipulation
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
        ${isOver && canDrop ? "border-blue-500 bg-blue-50/70 scale-[1.02]" : ""}
        ${!isOver && canDrop ? "border-blue-300" : ""}
        ${!canDrop && !disabled ? "border-gray-300 active:border-gray-500 active:bg-gray-100/60 hover:border-gray-400 hover:bg-gray-50/50" : ""}
        ${item ? "border-solid border-green-400 bg-green-50/30" : ""}
        ${isOverlay && isEmpty ? "border-transparent bg-transparent active:border-gray-400 active:bg-gray-50/40 hover:border-gray-300 hover:bg-gray-50/30" : ""}
        ${isFullBody && isEmpty ? "border-purple-300 bg-purple-50/20" : ""}
        ${willReplaceFullBody && isEmpty ? "border-orange-500 bg-orange-100/80 border-2 shadow-lg active:bg-orange-200/90 active:scale-[1.02]" : ""}
        ${isEmpty && !isOverlay ? "min-h-[50px] min-w-[60px]" : ""}
      `}
      data-drop-zone={zone}
    >
      {/* Zone Label */}
      {isEmpty && !isOverlay && (
        <div className="text-center p-2">
          <span className={`text-xs font-medium ${willReplaceFullBody ? "text-orange-600" : "text-gray-400"}`}>
            {isFullBody ? "Dress/Jumpsuit" : label}
          </span>
          {willReplaceFullBody && (
            <p className="text-[10px] text-orange-600 mt-1 font-semibold">
              Tap to replace dress/jumpsuit
            </p>
          )}
        </div>
      )}

      {/* Overlay zone label (only on hover) */}
      {isOverlay && isEmpty && (
        <div className="opacity-0 hover:opacity-100 transition-opacity text-center">
          <span className="text-xs text-gray-400 font-medium">{label}</span>
        </div>
      )}

      {/* Item indicator with remove button */}
      {item && (
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors z-40"
          title={`Remove ${item.type || "item"}`}
        >
          &times;
        </button>
      )}

      {/* Drop indicator */}
      {isOver && canDrop && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-100/50 rounded-lg">
          <span className="text-blue-600 text-sm font-medium">Drop here</span>
        </div>
      )}
    </div>
  );
}
