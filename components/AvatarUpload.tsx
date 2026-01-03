"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/components/Button";
import toast from "react-hot-toast";

interface AvatarUploadProps {
  userId?: string;
  onAvatarUpdated?: (avatarUrl: string) => void;
}

export default function AvatarUpload({ userId, onAvatarUpdated }: AvatarUploadProps) {
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [enhanceWithAI, setEnhanceWithAI] = useState(false); // AI enhancement toggle
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current avatar on mount
  useEffect(() => {
    fetchCurrentAvatar();
  }, []);

  const fetchCurrentAvatar = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/avatar");
      if (response.ok) {
        const data = await response.json();
        if (data.avatar?.url) {
          setCurrentAvatar(data.avatar.url);
        }
      }
    } catch (error) {
      console.error("Failed to fetch avatar:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 4MB due to Vercel limits)
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be less than 4MB");
      e.target.value = "";
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);

    toast.success("Photo selected! Click 'Upload Avatar' to save.");
  };

  const handleGenerateAvatar = async () => {
    if (!selectedFile) {
      toast.error("Please select a photo first");
      return;
    }

    setUploading(true);
    const loadingMessage = enhanceWithAI
      ? "Generating AI-enhanced avatar... This may take 30-60 seconds"
      : "Uploading your avatar...";
    const loadingToast = toast.loading(loadingMessage);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("enhance", enhanceWithAI.toString());
      formData.append("style", "realistic");
      formData.append("background", "white");

      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to generate avatar");
      }

      const data = await response.json();

      if (data.avatar?.url) {
        setCurrentAvatar(data.avatar.url);
        setPreviewImage(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        
        const successMessage = enhanceWithAI
          ? "AI-enhanced avatar created successfully!"
          : "Avatar uploaded successfully!";
        toast.success(successMessage, { id: loadingToast });
        
        if (onAvatarUpdated) {
          onAvatarUpdated(data.avatar.url);
        }
      }
    } catch (error) {
      console.error("Avatar generation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate avatar",
        { id: loadingToast }
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Are you sure you want to delete your avatar?")) {
      return;
    }

    const loadingToast = toast.loading("Deleting avatar...");

    try {
      const response = await fetch("/api/user/avatar", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete avatar");
      }

      setCurrentAvatar(null);
      toast.success("Avatar deleted successfully", { id: loadingToast });
      
      if (onAvatarUpdated) {
        onAvatarUpdated("");
      }
    } catch (error) {
      console.error("Delete avatar error:", error);
      toast.error("Failed to delete avatar", { id: loadingToast });
    }
  };

  const handleCancelSelection = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold mb-2">Your Avatar</h3>
        <p className="text-sm text-gray-600">
          Upload a photo to use for virtual try-ons
        </p>
      </div>

      {/* Current Avatar Display */}
      {currentAvatar && !previewImage && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 max-w-sm mx-auto">
            <img
              src={currentAvatar}
              alt="Your avatar"
              className="w-full h-auto"
            />
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Update Avatar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeleteAvatar}
              disabled={uploading}
            >
              Delete Avatar
            </Button>
          </div>
        </div>
      )}

      {/* Preview Selected Photo */}
      {previewImage && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border-2 border-blue-500 max-w-sm mx-auto">
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-auto"
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Ready to upload:</strong> Your photo will be saved as your avatar.
            </p>
          </div>

          {/* AI Enhancement Option (disabled until billing enabled) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
              <input
                type="checkbox"
                checked={enhanceWithAI}
                onChange={(e) => setEnhanceWithAI(e.target.checked)}
                disabled={true}
                className="rounded"
              />
              <span className="text-sm text-gray-700">
                <strong>Enhance with AI</strong> (Coming soon - requires billing)
              </span>
            </label>
            <p className="text-xs text-gray-600 mt-2 ml-6">
              AI enhancement creates a polished, professional avatar optimized for virtual try-ons.
            </p>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {!currentAvatar && !previewImage && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">No avatar yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Upload a photo to get started
              </p>
            </div>
          </div>
        </div>
      )}

      {/* File Input (Hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="space-y-2">
        {!previewImage && (
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {currentAvatar ? "Update Avatar" : "Upload Photo"}
          </Button>
        )}

        {previewImage && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleGenerateAvatar}
              isLoading={uploading}
              disabled={!selectedFile}
            >
              {uploading
                ? (enhanceWithAI ? "Generating..." : "Uploading...")
                : (enhanceWithAI ? "Generate AI Avatar" : "Upload Avatar")}
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancelSelection}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-xs text-gray-600">
          <strong>Tips for best results:</strong>
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1 list-disc list-inside">
          <li>Use a full-body photo with good lighting</li>
          <li>Stand in a neutral pose facing the camera</li>
          <li>Wear simple, fitted clothing</li>
          <li>Clear background works best</li>
          <li>Image should be less than 4MB</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3 italic">
          Your photo will be used directly for virtual try-ons. AI enhancement coming soon!
        </p>
      </div>
    </div>
  );
}



