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
}: MannequinZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, CollectedProps>(
    () => ({
      accept: "clothing-item",
      canDrop: (dragItem: DragItem) => {
        if (disabled) return false;
        const category = dragItem.layeringCategory?.toLowerCase() || "";
        return acceptCategories.some((ac) => category === ac || category.includes(ac));
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

  // For top/bottom zones when full-body is present, show as disabled overlay
  const isDisabledByFullBody = disabled && hasFullBody;

  // Don't render full-body zone when there's already a full-body item (except for hover)
  if (isFullBody && hasFullBody && !isOver) {
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

  return (
    <div
      ref={drop as unknown as React.RefObject<HTMLDivElement>}
      style={style}
      onClick={handleClick}
      className={`
        rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
        flex items-center justify-center relative
        ${disabled ? "opacity-30 cursor-not-allowed" : ""}
        ${isOver && canDrop ? "border-blue-500 bg-blue-50/50 scale-[1.02]" : ""}
        ${!isOver && canDrop ? "border-blue-300" : ""}
        ${!canDrop && !disabled ? "border-gray-300 hover:border-gray-400 hover:bg-gray-50/30" : ""}
        ${item ? "border-solid border-green-400 bg-green-50/20" : ""}
        ${isOverlay && isEmpty ? "border-transparent bg-transparent hover:border-gray-300 hover:bg-gray-50/20" : ""}
        ${isFullBody && isEmpty ? "border-purple-300 bg-purple-50/10" : ""}
      `}
      data-drop-zone={zone}
    >
      {/* Zone Label */}
      {isEmpty && !isOverlay && (
        <div className="text-center p-2">
          <span className="text-xs text-gray-400 font-medium">
            {isFullBody ? "Dress/Jumpsuit" : label}
          </span>
          {isDisabledByFullBody && (
            <p className="text-[10px] text-gray-400 mt-1">
              Remove full-body item first
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
