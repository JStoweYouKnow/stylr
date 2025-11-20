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

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
    useCORS: true,
    allowTaint: false,
  });

  return canvas.toDataURL(`image/${format}`, quality);
}

export function downloadImage(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

