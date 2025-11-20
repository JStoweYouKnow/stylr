import { ClothingAnalysis } from "./types";

export async function analyzeWithOpenAI(imageUrl: string): Promise<ClothingAnalysis> {
  const prompt = `Analyze this clothing item image and return a JSON object with the following structure:
{
  "type": "e.g., shirt, pants, jacket, dress, shoes, etc.",
  "primaryColor": "main color of the item",
  "secondaryColor": "secondary color if present, or null",
  "pattern": "pattern type (solid, striped, plaid, etc.) or null",
  "fit": "fit style (slim, regular, loose, etc.) or null",
  "vibe": "style vibe (casual, formal, sporty, etc.)",
  "notes": "any additional relevant notes about the item",
  "layeringCategory": "base, mid, outer, or accessory"
}

Be specific and accurate. Return ONLY valid JSON, no markdown formatting.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from response (handle markdown code blocks if present)
  let jsonText = content.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  }

  const analysis = JSON.parse(jsonText) as ClothingAnalysis;
  return analysis;
}
