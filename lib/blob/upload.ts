import { put } from "@vercel/blob";

export async function uploadToBlob(file: File, path: string) {
  const blob = await put(path, file, {
    access: "public",
  });
  // Return blob with pathname for compatibility
  return {
    ...blob,
    pathname: blob.pathname || path,
  };
}

