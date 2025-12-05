"use client";

import { useEffect, useState } from "react";
import OutfitCard from "@/components/outfits/OutfitCard";
import Link from "next/link";
import Button from "@/components/Button";

interface ClothingItem {
  id: number;
  imageUrl: string;
  type: string | null;
  primaryColor: string | null;
}

interface Outfit {
  id: number;
  name?: string | null;
  occasion?: string | null;
  items: ClothingItem[];
}

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOutfits();
  }, []);

  async function fetchOutfits() {
    try {
      const response = await fetch("/api/outfits");
      if (!response.ok) throw new Error("Failed to fetch outfits");
      const data = await response.json();
      setOutfits(data.outfits || []);
    } catch (error) {
      console.error("Error fetching outfits:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h2 className="text-3xl font-semibold mb-6">My Outfits</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="aspect-square bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold">My Outfits</h2>
        <Link href="/outfits/create">
          <Button variant="primary" size="md">
            Create New Outfit
          </Button>
        </Link>
      </div>

      {outfits.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <p className="text-gray-600 mb-4">You haven't created any outfits yet.</p>
          <Link href="/outfits/create">
            <Button variant="primary" size="md">
              Create Your First Outfit
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </div>
  );
}

