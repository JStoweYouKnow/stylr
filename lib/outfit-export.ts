import html2canvas from "html2canvas";

export interface OutfitExportOptions {
  format?: "png" | "jpg";
  quality?: number;
  includeDetails?: boolean;
  watermark?: boolean;
}

export async function exportOutfitAsImage(
  elementId: string,
  options: OutfitExportOptions = {}
): Promise<string> {
  const {
    format = "png",
    quality = 0.95,
    includeDetails = true,
    watermark = true,
  } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Wait for all images to load before capturing
  const images = element.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if image fails to load
        // Timeout after 5 seconds
        setTimeout(() => resolve(), 5000);
      });
    })
  );

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: false, // Disable CORS since we're using allowTaint
      allowTaint: true, // Allow tainted canvas for external images
      imageTimeout: 15000, // 15 second timeout for loading images
    });

    return canvas.toDataURL(`image/${format}`, quality);
  } catch (error) {
    console.error("html2canvas error:", error);
    throw new Error(`Failed to export outfit: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

