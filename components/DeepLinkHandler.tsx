"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { App as CapacitorApp } from "@capacitor/app";
import toast from "react-hot-toast";

/**
 * Deep link handler for OAuth callbacks and other deep links
 * Listens for custom URL scheme (stylr://) and routes to appropriate pages
 */
export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // Listen for app URL open events (deep links)
    const listener = CapacitorApp.addListener("appUrlOpen", (data) => {
      console.log("Deep link received:", data.url);

      try {
        const url = new URL(data.url);

        // Handle stylr:// scheme
        if (url.protocol === "stylr:") {
          const pathname = url.hostname || url.pathname.replace(/^\//, "");
          const searchParams = new URLSearchParams(url.search);

          // Build the navigation path with query params
          let targetPath = `/${pathname}`;
          if (searchParams.toString()) {
            targetPath += `?${searchParams.toString()}`;
          }

          console.log("Navigating to:", targetPath);

          // Handle OAuth success/error messages
          if (searchParams.get("gmail_connected") === "true") {
            toast.success("Gmail connected successfully!");
          } else if (searchParams.get("error") === "gmail_auth_denied") {
            toast.error("Gmail authorization was denied");
          } else if (searchParams.get("error") === "gmail_connection_failed") {
            toast.error("Failed to connect Gmail. Please try again.");
          }

          // Navigate to the target path
          router.push(targetPath);
        }
      } catch (error) {
        console.error("Failed to parse deep link:", error);
      }
    });

    // Cleanup listener on unmount
    return () => {
      listener.then((l) => l.remove());
    };
  }, [router]);

  return null; // This component doesn't render anything
}
