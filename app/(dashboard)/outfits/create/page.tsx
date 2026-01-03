"use client";

import dynamicImport from "next/dynamic";

// Dynamically import OutfitBoard with SSR disabled - React DnD requires client-side only
const OutfitBoard = dynamicImport(() => import("@/components/outfits/outfit-board"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-gray-500">Loading outfit builder...</div>
    </div>
  ),
});

export default function CreateOutfitPage() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Create Outfit</h2>
      <OutfitBoard />
    </div>
  );
}

