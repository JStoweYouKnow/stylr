import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const color = searchParams.get("color");
    const type = searchParams.get("type");
    const vibe = searchParams.get("vibe");
    const pattern = searchParams.get("pattern");
    const layeringCategory = searchParams.get("layeringCategory");
    const tags = searchParams.get("tags")?.split(",").filter(Boolean);

    // Build where clause dynamically
    const where: any = {
      userId,
    };

    if (color) {
      where.OR = [
        { primaryColor: { contains: color, mode: "insensitive" } },
        { secondaryColor: { contains: color, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = { contains: type, mode: "insensitive" };
    }

    if (vibe) {
      where.vibe = { contains: vibe, mode: "insensitive" };
    }

    if (pattern) {
      where.pattern = { contains: pattern, mode: "insensitive" };
    }

    if (layeringCategory) {
      where.layeringCategory = layeringCategory;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const items = await prisma.clothingItem.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      items,
      count: items.length,
      filters: {
        color,
        type,
        vibe,
        pattern,
        layeringCategory,
        tags,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
