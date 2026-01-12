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
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if image fails to load
        // Timeout after 5 seconds
        setTimeout(() => resolve(), 5000);
      });
    })
  );

  try {
    // Try with CORS first (for same-origin images)
    let canvas;
    try {
      canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 10000,
      });
    } catch (corsError) {
      // If CORS fails, try with allowTaint (for external images)
      console.warn("CORS capture failed, trying with allowTaint:", corsError);
      canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        logging: false,
        useCORS: false,
        allowTaint: true,
        imageTimeout: 10000,
      });
    }

    // Try to get data URL - this may fail if canvas is tainted
    try {
      return canvas.toDataURL(`image/${format}`, quality);
    } catch (dataUrlError) {
      // If toDataURL fails due to tainted canvas, try toBlob approach
      throw new Error("Cannot export canvas with external images due to browser security restrictions. Please ensure all images are from the same origin or have CORS enabled.");
    }
  } catch (error) {
    console.error("html2canvas error:", error);
    if (error instanceof Error && error.message.includes("tainted")) {
      throw new Error("Cannot export outfit: Some images are from external sources and cannot be included in the export due to browser security restrictions.");
    }
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

