"use client";

import { useState } from "react";
import Image from "next/image";
import { exportOutfitAsImage, downloadImage } from "@/lib/outfit-export";

interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
}

interface OutfitCardProps {
  outfit: {
    id: number;
    name?: string | null;
    occasion?: string | null;
    items: ClothingItem[];
  };
  type?: "saved" | "recommendation";
  onExport?: (dataUrl: string) => void;
}

export default function OutfitCard({ outfit, type = "saved", onExport }: OutfitCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportId] = useState(`outfit-${outfit.id}-${Date.now()}`);

  async function handleExport() {
    setIsExporting(true);
    try {
      const dataUrl = await exportOutfitAsImage(exportId, {
        format: "png",
        quality: 0.95,
        includeDetails: true,
        watermark: true,
      });
      
      const filename = `outfit-${outfit.name || outfit.id}-${Date.now()}.png`;
      downloadImage(dataUrl, filename);
      
      if (onExport) {
        onExport(dataUrl);
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export outfit. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Exportable content */}
      <div id={exportId} className="p-6 bg-gradient-to-br from-gray-50 to-white">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">
            {outfit.name || `Outfit ${outfit.id}`}
          </h3>
          {outfit.occasion && (
            <p className="text-sm text-gray-600">For: {outfit.occasion}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {outfit.items.map((item) => (
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border">
              <Image
                src={item.imageUrl}
                alt={item.type || "Clothing item"}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2">
                <p className="font-medium">{item.type || "Item"}</p>
                {item.primaryColor && (
                  <p className="text-gray-300">{item.primaryColor}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-gray-500 text-center mt-4">
          Created with Stylr
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t bg-gray-50 flex gap-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isExporting ? "Exporting..." : "Export as Image"}
        </button>
        <button
          onClick={() => {
            const text = `Check out my outfit: ${outfit.name || `Outfit ${outfit.id}`}\n${window.location.origin}/outfits/${outfit.id}`;
            navigator.clipboard.writeText(text);
            alert("Outfit link copied to clipboard!");
          }}
          className="px-4 py-2 border rounded-md hover:bg-gray-100 transition text-sm"
        >
          Share
        </button>
      </div>
    </div>
  );
}

