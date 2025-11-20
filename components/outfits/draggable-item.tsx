"use client";

import { useDrag } from "react-dnd";
import type { Ref } from "react";
import Image from "next/image";

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
    >
      <div className="aspect-square relative bg-gray-100">
        <Image
          src={item.imageUrl}
          alt={item.type || "Item"}
          fill
          className="object-cover"
          unoptimized
        />
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

