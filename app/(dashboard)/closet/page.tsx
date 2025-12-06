"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import ClothingGrid from "@/components/closet/ClothingGrid";
import UploadButton from "@/components/closet/UploadButton";

export default function ClosetPage() {
  const { status } = useSession();

  useEffect(() => {
    console.log("ClosetPage mounted, session status:", status);
    
    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      console.log("No session found, redirecting to login...");
      window.location.href = "https://stylr.projcomfort.com/login";
    }
  }, [status]);

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Don't render content if redirecting
  if (status === "unauthenticated") {
    return null;
  }

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

