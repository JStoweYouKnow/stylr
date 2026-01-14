"use client";

import { useState } from "react";
import Image from "next/image";

interface ClothingItem {
  id: number;
  imageUrl: string;
  productImageUrl?: string | null;
  originalImageUrl?: string | null;
  type: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  pattern: string | null;
  vibe: string | null;
  notes: string | null;
  tags?: string[];
}

interface ItemCardProps {
  item: ClothingItem;
  onDelete?: (id: number) => void;
  onUpdate?: (item: ClothingItem) => void;
}

export default function ItemCard({ item, onDelete, onUpdate }: ItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSwappingImage, setIsSwappingImage] = useState(false);

  const canUseProductImage =
    Boolean(item.productImageUrl) && item.imageUrl !== item.productImageUrl;
  const canRestoreOriginal =
    Boolean(item.originalImageUrl) && item.imageUrl !== item.originalImageUrl;

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clothing/${item.id}`, {
        method: "DELETE",
      });

      if (res.ok && onDelete) {
        onDelete(item.id);
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSwapImage(useProductImage: boolean) {
    if (!onUpdate) return;
    setIsSwappingImage(true);
    try {
      const res = await fetch(`/api/clothing/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useProductImage }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update item image");
      }

      const data = await res.json();
      if (data?.item) {
        onUpdate(data.item);
      }
    } catch (error) {
      console.error("Image swap error:", error);
      alert(error instanceof Error ? error.message : "Failed to update item image");
    } finally {
      setIsSwappingImage(false);
    }
  }

  return (
    <div className="relative group border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
      <div className="aspect-square relative bg-gray-100">
        <Image
          src={item.imageUrl}
          alt={item.type || "Clothing item"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          unoptimized
        />
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 touch-manipulation"
          title="Delete item"
          aria-label="Delete item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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

      {(canUseProductImage || canRestoreOriginal) && (
        <div className="p-2 border-t bg-gray-50 flex gap-2">
          {canUseProductImage && (
            <button
              onClick={() => handleSwapImage(true)}
              disabled={isSwappingImage}
              className="flex-1 px-2 py-1.5 text-xs rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use product image
            </button>
          )}
          {canRestoreOriginal && (
            <button
              onClick={() => handleSwapImage(false)}
              disabled={isSwappingImage}
              className="flex-1 px-2 py-1.5 text-xs rounded-md border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use original photo
            </button>
          )}
        </div>
      )}
      <div className="p-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-left"
        >
          <h3 className="font-semibold text-sm mb-1">
            {item.type || "Unknown Item"}
          </h3>
          {item.primaryColor && (
            <p className="text-xs text-gray-600">Color: {item.primaryColor}</p>
          )}
        </button>

        {showDetails && (
          <div className="mt-2 pt-2 border-t text-xs text-gray-600 space-y-1">
            {item.secondaryColor && (
              <p>Secondary: {item.secondaryColor}</p>
            )}
            {item.pattern && <p>Pattern: {item.pattern}</p>}
            {item.vibe && <p>Style: {item.vibe}</p>}
            {item.notes && <p className="italic">{item.notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

