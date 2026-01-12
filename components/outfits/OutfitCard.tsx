"use client";

import { useState } from "react";
import Image from "next/image";
import { exportOutfitAsImage, downloadImage } from "@/lib/outfit-export";
import OutfitVisualizer from "@/components/OutfitVisualizer";

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
  onDelete?: (id: number) => void;
}

export default function OutfitCard({ outfit, type = "saved", onExport, onDelete }: OutfitCardProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportId] = useState(`outfit-${outfit.id}-${Date.now()}`);

  async function handleExport() {
    setIsExporting(true);
    try {
      // Try server-side export first (works with external images)
      try {
        const response = await fetch("/api/outfits/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outfitId: outfit.id,
            type: type,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `outfit-${outfit.name || outfit.id}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          if (onExport) {
            // Convert blob to data URL for callback
            const reader = new FileReader();
            reader.onloadend = () => {
              if (onExport && typeof reader.result === 'string') {
                onExport(reader.result);
              }
            };
            reader.readAsDataURL(blob);
          }
          return;
        } else {
          const error = await response.json();
          throw new Error(error.error || "Server export failed");
        }
      } catch (serverError) {
        console.warn("Server-side export failed, trying client-side:", serverError);
        // Fallback to client-side export
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
      }
    } catch (error) {
      console.error("Export failed:", error);
      alert(`Failed to export outfit: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${outfit.name || `Outfit ${outfit.id}`}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/outfits?id=${outfit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete outfit");
      }

      if (onDelete) {
        onDelete(outfit.id);
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error instanceof Error ? error.message : "Failed to delete outfit. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white relative group">
      {/* Delete button - only show for saved outfits */}
      {type === "saved" && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-2 right-2 z-10 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete outfit"
          aria-label="Delete outfit"
        >
          {isDeleting ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
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
          )}
        </button>
      )}

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
            <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden border bg-gray-100">
              {/* Use img instead of Next/Image for html2canvas CORS compatibility */}
              <img
                src={item.imageUrl}
                alt={item.type || "Clothing item"}
                className="w-full h-full object-cover"
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
      <div className="p-4 border-t bg-gray-50 flex gap-2 flex-wrap">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm min-w-[120px]"
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
        {type === "saved" && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      {/* Outfit Visualizer */}
      <div className="p-4 border-t">
        <OutfitVisualizer itemIds={outfit.items.map((item) => item.id)} />
      </div>
    </div>
  );
}

