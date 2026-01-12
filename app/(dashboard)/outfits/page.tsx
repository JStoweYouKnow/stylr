"use client";

import { useEffect, useState } from "react";
import dynamicImport from "next/dynamic";
import OutfitCard from "@/components/outfits/OutfitCard";
import Button from "@/components/Button";
import { toast } from "react-hot-toast";

// Dynamically import OutfitBoard with SSR disabled - React DnD requires client-side only
const OutfitBoard = dynamicImport(() => import("@/components/outfits/outfit-board"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Loading outfit builder...</div>
    </div>
  ),
});

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

type Tab = "outfits" | "create";

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("outfits");

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

  function handleSaveSuccess() {
    toast.success("Outfit saved successfully!");
    setActiveTab("outfits");
    fetchOutfits();
  }

  function handleDeleteOutfit(id: number) {
    setOutfits((prev) => prev.filter((outfit) => outfit.id !== id));
    toast.success("Outfit deleted successfully!");
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Outfits</h2>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("outfits")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "outfits"
              ? "text-black border-b-2 border-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          My Outfits
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "create"
              ? "text-black border-b-2 border-black"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Create New
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "outfits" ? (
        <>
          {loading ? (
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
          ) : outfits.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
              <p className="text-gray-600 mb-4">You haven't created any outfits yet.</p>
              <Button
                variant="primary"
                size="md"
                onClick={() => setActiveTab("create")}
              >
                Create Your First Outfit
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  type="saved"
                  onDelete={handleDeleteOutfit}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <OutfitBoard onSaveSuccess={handleSaveSuccess} />
      )}
    </div>
  );
}

