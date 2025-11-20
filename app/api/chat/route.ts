import { streamText } from "ai";
import { google } from "@ai-sdk/google";
import { prisma } from "@/lib/db";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages, userId } = await req.json();

  // Fetch user's wardrobe for context
  let wardrobeContext = "";
  if (userId) {
    const items = await prisma.clothingItem.findMany({
      where: { userId },
      select: {
        type: true,
        primaryColor: true,
        secondaryColor: true,
        pattern: true,
        vibe: true,
        layeringCategory: true,
      },
      take: 50, // Limit for token efficiency
    });

    if (items.length > 0) {
      wardrobeContext = `\n\nUser's wardrobe contains ${items.length} items:\n${items
        .map(
          (item, i) =>
            `${i + 1}. ${item.type || "Item"} - ${item.primaryColor || "unknown color"}${
              item.pattern ? `, ${item.pattern}` : ""
            }${item.vibe ? ` (${item.vibe})` : ""}`
        )
        .join("\n")}`;
    }
  }

  const systemPrompt = `You are Stylr AI, a personal fashion stylist assistant. You help users create stylish outfits from their existing wardrobe.

Your expertise:
- Outfit recommendations based on occasion, weather, and personal style
- Color coordination and harmony
- Layering advice for different temperatures
- Style tips from fashion publications like GQ, Vogue, etc.
- Helping users see their wardrobe in new ways

Guidelines:
- Always prioritize the user's existing wardrobe - don't suggest purchasing unless explicitly asked
- Be encouraging and creative in mixing items
- Explain WHY certain combinations work (color theory, proportions, etc.)
- Reference current trends when relevant, but prioritize timeless style
- Keep responses concise and actionable${wardrobeContext}`;

  const result = streamText({
    model: google("gemini-1.5-flash"),
    system: systemPrompt,
    messages,
    temperature: 0.7,
    maxOutputTokens: 500,
  });

  return result.toTextStreamResponse();
}
