import { ClothingAnalysis } from "./types";

export async function analyzeWithGemini(imageUrl: string): Promise<ClothingAnalysis> {
  const prompt = `Analyze this clothing item image and return a JSON object with the following structure:
{
  "type": "e.g., shirt, pants, jacket, dress, shoes, etc.",
  "primaryColor": "main color of the item",
  "secondaryColor": "secondary color if present, or null",
  "pattern": "pattern type (solid, striped, plaid, floral, etc.) or null",
  "fit": "fit style (slim, regular, loose, etc.) or null",
  "vibe": "style vibe (casual, formal, sporty, etc.)",
  "notes": "any additional relevant notes about the item",
  "layeringCategory": "base, mid, outer, or accessory"
}

Be specific and accurate. Return ONLY valid JSON, no markdown formatting.`;

  // Fetch the image and convert to base64
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // Determine mime type from URL or response
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  // Extract JSON from response (handle markdown code blocks if present)
  let jsonText = content.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  }

  const analysis = JSON.parse(jsonText) as ClothingAnalysis;
  return analysis;
}
