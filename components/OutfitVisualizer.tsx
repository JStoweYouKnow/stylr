"use client";

import { useState, useRef } from "react";
import Button from "@/components/Button";
import toast from "react-hot-toast";

interface OutfitVisualizerProps {
  itemIds: number[];
  mode?: 'ai-generated' | 'virtual-tryon';
}

export default function OutfitVisualizer({ itemIds, mode = 'ai-generated' }: OutfitVisualizerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'ai-generated' | 'virtual-tryon'>(mode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAIGenerate = async () => {
    if (itemIds.length === 0) {
      toast.error('Please select at least one clothing item');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Generating AI outfit visualization...');

    try {
      const response = await fetch('/api/outfits/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds,
          userPreferences: {
            style: 'modern casual',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate');
      }

      const data = await response.json();

      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success('Outfit rendered!', { id: loadingToast });
      } else if (data.message) {
        toast.error(data.message, { id: loadingToast });
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate outfit',
        { id: loadingToast }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVirtualTryOn = async () => {
    if (itemIds.length === 0) {
      toast.error('Please select at least one clothing item');
      return;
    }

    if (!fileInputRef.current?.files?.[0]) {
      toast.error('Please upload your photo first');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Processing virtual try-on... This may take 30-60 seconds');

    try {
      const formData = new FormData();
      formData.append('itemIds', JSON.stringify(itemIds));
      formData.append('personImage', fileInputRef.current.files[0]);

      const response = await fetch('/api/outfits/tryon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate virtual try-on');
      }

      const data = await response.json();

      if (data.finalImageUrl) {
        setImageUrl(data.finalImageUrl);
        toast.success(
          `Virtual try-on complete! Processed ${data.itemsCount} items in ${(data.totalProcessingTime / 1000).toFixed(1)}s`,
          { id: loadingToast, duration: 5000 }
        );
      }
    } catch (error) {
      console.error('Virtual try-on error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to generate virtual try-on',
        { id: loadingToast }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        e.target.value = '';
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        e.target.value = '';
        return;
      }

      toast.success('Photo uploaded! Now click "Try On Outfit"');
    }
  };

  return (
    <div className="space-y-6 bg-white rounded-lg border p-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Visualize Outfit</h3>
        <p className="text-sm text-gray-600">
          See how this outfit looks with AI generation or virtual try-on
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => setSelectedMode('ai-generated')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedMode === 'ai-generated'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          AI Generated
        </button>
        <button
          onClick={() => setSelectedMode('virtual-tryon')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedMode === 'virtual-tryon'
              ? 'bg-black text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Virtual Try-On
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          {selectedMode === 'ai-generated' ? (
            <>
              <strong>AI Generated:</strong> Creates a professional fashion photo of a model wearing your outfit.
              Fast and realistic. (~10 seconds, $0.01)
            </>
          ) : (
            <>
              <strong>Virtual Try-On:</strong> See yourself wearing this outfit! Upload a full-body photo for best results.
              Takes 30-60 seconds. (~$0.50)
            </>
          )}
        </p>
      </div>

      {/* Virtual Try-On Photo Upload */}
      {selectedMode === 'virtual-tryon' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload Your Photo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-black file:text-white
              file:cursor-pointer
              hover:file:bg-gray-800
              touch-manipulation"
          />
          <p className="text-xs text-gray-500 mt-2">
            For best results, use a full-body photo with good lighting and a simple background.
          </p>
        </div>
      )}

      {/* Action Button */}
      <Button
        variant="primary"
        size="md"
        fullWidth
        onClick={selectedMode === 'ai-generated' ? handleAIGenerate : handleVirtualTryOn}
        isLoading={loading}
        disabled={itemIds.length === 0 || (selectedMode === 'virtual-tryon' && !fileInputRef.current?.files?.[0])}
      >
        {loading ? (
          selectedMode === 'ai-generated' ? 'Generating...' : 'Processing Try-On...'
        ) : (
          selectedMode === 'ai-generated' ? 'Generate Outfit Image' : 'Try On Outfit'
        )}
      </Button>

      {/* Result Display */}
      {imageUrl && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-200">
            <img
              src={imageUrl}
              alt="Outfit visualization"
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-2">
            <a
              href={imageUrl}
              download="stylr-outfit.jpg"
              className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition text-sm font-medium"
            >
              Download
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(imageUrl);
                toast.success('Image URL copied!');
              }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition text-sm font-medium"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      {/* Items Selected Info */}
      <div className="text-xs text-gray-500">
        {itemIds.length} item{itemIds.length !== 1 ? 's' : ''} selected for visualization
      </div>
    </div>
  );
}
