import * as cheerio from "cheerio";
import axios from "axios";

export interface TrendArticle {
  title: string;
  url: string;
  summary: string;
  tags: string[];
  publishedAt: string;
}

export async function scrapeGQArticle(url: string): Promise<TrendArticle | null> {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const title = $("h1").first().text().trim() || $("title").text().trim();
    const summary =
      $('meta[property="og:description"]').attr("content") ||
      $("p").first().text().trim();
    const tags = $('meta[name="keywords"]')
      .attr("content")
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];
    const publishedAt =
      $('meta[property="article:published_time"]').attr("content") ||
      new Date().toISOString();

    return {
      title,
      url,
      summary: summary.substring(0, 500),
      tags,
      publishedAt,
    };
  } catch (error) {
    console.error(`Error scraping GQ article ${url}:`, error);
    return null;
  }
}

export async function extractTrendsFromArticle(
  article: TrendArticle
): Promise<{
  colors?: string[];
  styles?: string[];
  seasons?: string[];
  occasions?: string[];
}> {
  // Use keywords and content to extract trends
  const text = `${article.title} ${article.summary} ${article.tags.join(" ")}`.toLowerCase();

  const colorKeywords = [
    "black",
    "white",
    "navy",
    "beige",
    "brown",
    "gray",
    "grey",
    "blue",
    "green",
    "red",
    "pink",
    "purple",
    "yellow",
    "orange",
    "burgundy",
    "khaki",
    "olive",
  ];

  const styleKeywords = [
    "minimalist",
    "streetwear",
    "preppy",
    "bohemian",
    "classic",
    "edgy",
    "casual",
    "formal",
    "sporty",
    "vintage",
    "modern",
    "elegant",
  ];

  const seasonKeywords = ["spring", "summer", "fall", "autumn", "winter"];

  const occasionKeywords = [
    "work",
    "office",
    "casual",
    "formal",
    "party",
    "wedding",
    "date",
    "vacation",
    "travel",
  ];

  const colors = colorKeywords.filter((color) => text.includes(color));
  const styles = styleKeywords.filter((style) => text.includes(style));
  const seasons = seasonKeywords.filter((season) => text.includes(season));
  const occasions = occasionKeywords.filter((occasion) => text.includes(occasion));

  return {
    colors: colors.length > 0 ? colors : undefined,
    styles: styles.length > 0 ? styles : undefined,
    seasons: seasons.length > 0 ? seasons : undefined,
    occasions: occasions.length > 0 ? occasions : undefined,
  };
}

