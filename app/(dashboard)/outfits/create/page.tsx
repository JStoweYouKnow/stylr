import OutfitBoard from "@/components/outfits/outfit-board";

// Force dynamic rendering - this page uses React DnD which requires client-side context
export const dynamic = 'force-dynamic';

export default function CreateOutfitPage() {
  return (
    <div>
      <h2 className="text-3xl font-semibold mb-6">Create Outfit</h2>
      <OutfitBoard />
    </div>
  );
}

