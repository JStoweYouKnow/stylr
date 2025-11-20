"use client";

import { useState, useEffect } from "react";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removeBg, setRemoveBg] = useState(true);
  const [processingBg, setProcessingBg] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleUpload() {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      let fileToUpload: File = file;

      if (removeBg) {
        setProcessingBg(true);
        try {
          const { removeBackground } = await import("@imgly/background-removal");
          const resultBlob = await removeBackground(file, {
            debug: false,
          });
          fileToUpload = new File(
            [resultBlob],
            `stylr-${Date.now()}.png`,
            { type: "image/png" }
          );
          setPreviewUrl(URL.createObjectURL(resultBlob));
        } catch (bgError) {
          console.error("Background removal failed:", bgError);
          setError("Background removal failed. Uploading original image.");
          setRemoveBg(false);
        } finally {
          setProcessingBg(false);
        }
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/clothing/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();
      console.log("Upload result:", data);
      setSuccess(true);
      setFile(null);
      setPreviewUrl(null);
      
      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      // Reload page after 1 second to show new item
      setTimeout(() => {
        window.location.href = "/closet";
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="p-6 border rounded-xl max-w-2xl">
      <h3 className="text-xl font-semibold mb-4">Upload Clothing Item</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium mb-2">
            Select Image
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-black file:text-white
              file:cursor-pointer
              hover:file:bg-gray-800"
          />
        </div>

        {file && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <img
              src={previewUrl || URL.createObjectURL(file)}
              alt="Preview"
              className="max-w-xs rounded-lg border"
            />
            {processingBg && (
              <p className="text-xs text-gray-500 mt-2">
                Removing background...
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            id="remove-bg"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
          />
          <label htmlFor="remove-bg" className="text-gray-700">
            Remove background before upload (beta)
          </label>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            Upload successful! Redirecting to closet...
          </div>
        )}

        <button
          className="mt-4 px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleUpload}
          disabled={!file || uploading || processingBg}
        >
          {processingBg
            ? "Processing..."
            : uploading
            ? "Uploading..."
            : "Upload & Analyze"}
        </button>
      </div>
    </div>
  );
}

