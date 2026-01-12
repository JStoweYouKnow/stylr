"use client";

import { useDrag } from "react-dnd";
import type { Ref } from "react";
import Image from "next/image";

// Placeholder component for items without images
function ImagePlaceholder({ type }: { type: string | null }) {
  return (
    <div className="absolute inset-0 bg-gray-100 flex flex-col items-center justify-center">
      <svg
        className="w-10 h-10 text-gray-400"
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
      <span className="text-xs text-gray-500 mt-1 px-2 text-center">
        {type || "No image"}
      </span>
    </div>
  );
}

interface DraggableItemProps {
  item: {
    id: number;
    imageUrl: string;
    type: string | null;
    primaryColor: string | null;
    layeringCategory: string | null;
  };
}

export default function DraggableItem({ item }: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "clothing-item",
    item: { id: item.id, layeringCategory: item.layeringCategory },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));
  const dragRef = drag as unknown as Ref<HTMLDivElement>;

  return (
    <div
      ref={dragRef}
      className={`cursor-move border rounded-lg overflow-hidden bg-white transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div className="aspect-square relative bg-gray-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.type || "Item"}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <ImagePlaceholder type={item.type} />
        )}
      </div>
      <div className="p-2 text-xs">
        <p className="font-medium truncate">{item.type || "Item"}</p>
        {item.primaryColor && (
          <p className="text-gray-500">{item.primaryColor}</p>
        )}
      </div>
    </div>
  );
}

