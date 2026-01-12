"use client";

import { useState } from "react";
import { useDrop } from "react-dnd";
import MannequinZone from "./MannequinZone";
import ClothingLayer from "./ClothingLayer";

export interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
  layeringCategory: string | null;
}

export interface OutfitState {
  head: ClothingItem | null;
  top: ClothingItem | null;
  jacket: ClothingItem | null;
  bottom: ClothingItem | null;
  shoes: ClothingItem | null;
  fullBody: ClothingItem | null;
}

interface MannequinProps {
  outfit: OutfitState;
  onDropItem: (zone: keyof OutfitState, itemId: number) => void;
  onZoneClick: (zone: keyof OutfitState) => void;
  onRemoveItem: (zone: keyof OutfitState) => void;
}

export default function Mannequin({
  outfit,
  onDropItem,
  onZoneClick,
  onRemoveItem,
}: MannequinProps) {
  const hasFullBody = outfit.fullBody !== null;
  const hasTopOrBottom = outfit.top !== null || outfit.bottom !== null;

  // Zone configuration with position percentages
  const zones = [
    {
      id: "head" as const,
      label: "Head",
      acceptCategories: ["accessories"],
      top: "0%",
      height: "15%",
      disabled: false,
    },
    {
      id: "top" as const,
      label: "Top",
      acceptCategories: ["top"],
      top: "15%",
      height: "25%",
      disabled: false, // Allow dropping to replace full-body
    },
    {
      id: "jacket" as const,
      label: "Jacket",
      acceptCategories: ["jacket"],
      top: "15%",
      height: "30%",
      disabled: false,
      isOverlay: true,
    },
    {
      id: "bottom" as const,
      label: "Bottom",
      acceptCategories: ["bottom"],
      top: "40%",
      height: "35%",
      disabled: false, // Allow dropping to replace full-body
    },
    {
      id: "fullBody" as const,
      label: "Full Body",
      acceptCategories: ["full-body"],
      top: "15%",
      height: "60%",
      disabled: hasTopOrBottom, // Disable when top/bottom exist (but allow dropping to replace)
      isFullBody: true,
    },
    {
      id: "shoes" as const,
      label: "Shoes",
      acceptCategories: ["shoes"],
      top: "75%",
      height: "25%",
      disabled: false,
    },
  ];

  return (
    <div className="relative w-full max-w-[280px] mx-auto aspect-[1/2.2]">
      {/* SVG Mannequin Silhouette */}
      <svg
        viewBox="0 0 100 220"
        className="absolute inset-0 w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head */}
        <ellipse
          cx="50"
          cy="18"
          rx="14"
          ry="16"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Neck */}
        <rect
          x="45"
          y="32"
          width="10"
          height="8"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Torso */}
        <path
          d="M30 40 L70 40 L75 100 L25 100 Z"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Left Arm */}
        <path
          d="M30 40 L20 45 L15 80 L20 82 L25 55 L30 50"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Right Arm */}
        <path
          d="M70 40 L80 45 L85 80 L80 82 L75 55 L70 50"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Hips/Waist */}
        <path
          d="M25 100 L75 100 L72 115 L28 115 Z"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Left Leg */}
        <path
          d="M28 115 L40 115 L42 190 L28 190 Z"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Right Leg */}
        <path
          d="M60 115 L72 115 L72 190 L58 190 Z"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Left Foot */}
        <path
          d="M28 190 L42 190 L45 195 L45 205 L20 205 L20 195 Z"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
        {/* Right Foot */}
        <path
          d="M58 190 L72 190 L80 195 L80 205 L55 205 L55 195 Z"
          className="fill-gray-100 stroke-gray-300"
          strokeWidth="1"
        />
      </svg>

      {/* Clothing Layers - rendered behind zones */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        {/* Base layer: full-body OR top+bottom */}
        {outfit.fullBody ? (
          <ClothingLayer
            item={outfit.fullBody}
            zone="fullBody"
            style={{ top: "15%", height: "60%", left: "10%", right: "10%" }}
          />
        ) : (
          <>
            <ClothingLayer
              item={outfit.top}
              zone="top"
              style={{ top: "15%", height: "25%", left: "15%", right: "15%" }}
            />
            <ClothingLayer
              item={outfit.bottom}
              zone="bottom"
              style={{ top: "40%", height: "35%", left: "18%", right: "18%" }}
            />
          </>
        )}

        {/* Jacket layer */}
        <ClothingLayer
          item={outfit.jacket}
          zone="jacket"
          style={{ top: "15%", height: "30%", left: "8%", right: "8%", zIndex: 20 }}
        />

        {/* Head accessories */}
        <ClothingLayer
          item={outfit.head}
          zone="head"
          style={{ top: "0%", height: "15%", left: "20%", right: "20%", zIndex: 30 }}
        />

        {/* Shoes */}
        <ClothingLayer
          item={outfit.shoes}
          zone="shoes"
          style={{ top: "85%", height: "15%", left: "10%", right: "10%" }}
        />
      </div>

      {/* Interactive Zones */}
      <div className="absolute inset-0" style={{ zIndex: 100 }}>
        {zones.map((zone) => (
          <MannequinZone
            key={zone.id}
            zone={zone.id}
            label={zone.label}
            acceptCategories={zone.acceptCategories}
            item={outfit[zone.id]}
            disabled={zone.disabled}
            style={{
              position: "absolute",
              top: zone.top,
              height: zone.height,
              left: zone.isFullBody ? "5%" : zone.isOverlay ? "5%" : "15%",
              right: zone.isFullBody ? "5%" : zone.isOverlay ? "5%" : "15%",
            }}
            onDrop={(itemId) => onDropItem(zone.id, itemId)}
            onClick={() => onZoneClick(zone.id)}
            onRemove={() => onRemoveItem(zone.id)}
            isOverlay={zone.isOverlay}
            isFullBody={zone.isFullBody}
            hasFullBody={hasFullBody}
            hasTopOrBottom={hasTopOrBottom}
          />
        ))}
      </div>
    </div>
  );
}
