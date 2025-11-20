"use client";

import { useState } from "react";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
      const formData = new FormData();
      formData.append("file", file);

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

  return (
    <div className="p-4 sm:p-6 border rounded-xl max-w-2xl w-full">
      <h3 className="text-lg sm:text-xl font-semibold mb-4">Upload Clothing Item</h3>
      
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
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-black file:text-white
              file:cursor-pointer
              hover:file:bg-gray-800
              touch-manipulation"
          />
        </div>

        {file && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Preview:</p>
            <img
              src={URL.createObjectURL(file)}
              alt="Preview"
              className="max-w-full sm:max-w-xs rounded-lg border"
            />
          </div>
        )}

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
          className="mt-4 w-full sm:w-auto px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? "Uploading..." : "Upload & Analyze"}
        </button>
      </div>
    </div>
  );
}

