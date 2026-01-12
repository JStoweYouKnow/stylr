"use client";

import Image from "next/image";
import { ClothingItem } from "./Mannequin";

interface ClothingLayerProps {
  item: ClothingItem | null;
  zone: string;
  style: React.CSSProperties;
}

export default function ClothingLayer({ item, zone, style }: ClothingLayerProps) {
  if (!item) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        ...style,
        zIndex: style.zIndex || 10,
      }}
    >
      <div className="relative w-full h-full">
        <Image
          src={item.imageUrl}
          alt={item.type || "Clothing item"}
          fill
          className="object-contain drop-shadow-md"
          sizes="(max-width: 280px) 100vw, 280px"
        />
      </div>
    </div>
  );
}
