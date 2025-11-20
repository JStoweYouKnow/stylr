export interface ClothingAnalysis {
  type: string;
  primaryColor: string;
  secondaryColor: string | null;
  pattern: string | null;
  fit: string | null;
  vibe: string;
  notes: string;
  layeringCategory?: string;
}

export async function analyzeClothingImage(imageUrl: string): Promise<ClothingAnalysis> {
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  // Extract JSON from response (handle markdown code blocks if present)
  let jsonText = content.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  }

  const analysis = JSON.parse(jsonText) as ClothingAnalysis;
  return analysis;
}

