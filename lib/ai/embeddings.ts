import crypto from "crypto";

function normalizeVector(vector: number[]): number[] {
  const length = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (length === 0) return vector;
  return vector.map((val) => val / length);
}

function hashToVector(input: string, dimensions = 64): number[] {
  const hash = crypto.createHash("sha256").update(input).digest("hex");
  const vector: number[] = [];
  for (let i = 0; i < dimensions; i++) {
    const slice = hash.slice((i * 2) % hash.length, ((i + 1) * 2) % hash.length);
    const value = parseInt(slice || "0", 16);
    vector.push((value / 255) * 2 - 1); // Normalize between -1 and 1
  }
  return normalizeVector(vector);
}

export function generateClothingEmbedding(data: {
  type?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  pattern?: string | null;
  vibe?: string | null;
  notes?: string | null;
}): number[] {
  const text = Object.values(data)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) {
    return hashToVector("default");
  }

  return hashToVector(text);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  return dotProduct;
}

