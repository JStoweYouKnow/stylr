"use client";

import { useState } from "react";
import Image from "next/image";

interface ClothingItem {
  id: number;
  imageUrl: string;
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
}

export default function ItemCard({ item, onDelete }: ItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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
          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
          title="Delete item"
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

