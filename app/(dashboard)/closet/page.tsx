import ClothingGrid from "@/components/closet/ClothingGrid";
import UploadButton from "@/components/closet/UploadButton";

export default function ClosetPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold">Your Closet</h2>
        <UploadButton />
      </div>
      <ClothingGrid />
    </div>
  );
}

