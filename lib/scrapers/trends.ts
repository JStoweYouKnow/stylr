import { fetchRSSFeed, FASHION_RSS_FEEDS } from "./rss";
import { scrapeGQArticle, extractTrendsFromArticle } from "./gq";
import { prisma } from "@/lib/db";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function scrapeAndStoreTrends() {
  console.log("🕷️ Starting trend scraping...");

  const allArticles: Array<{
    title: string;
    url: string;
    summary: string;
    source: string;
    publishedAt: string;
  }> = [];

  // Fetch from RSS feeds
  for (const feedUrl of FASHION_RSS_FEEDS) {
    try {
      const articles = await fetchRSSFeed(feedUrl);
      const source = new URL(feedUrl).hostname.replace("www.", "");

      for (const article of articles.slice(0, 5)) {
        // Limit to 5 most recent per feed
        allArticles.push({
          title: article.title,
          url: article.link,
          summary: article.description || article.content.substring(0, 300),
          source,
          publishedAt: article.pubDate,
        });
      }
    } catch (error) {
      console.error(`Error processing feed ${feedUrl}:`, error);
    }
  }

  console.log(`📰 Found ${allArticles.length} articles`);

  // Process articles and extract trends
  for (const article of allArticles) {
    try {
      // Use AI to summarize and extract key trends
      const { text: aiSummary } = await generateText({
        model: google("gemini-1.5-flash"),
        prompt: `Analyze this fashion article and extract key style trends, colors, and fashion tips. Return a JSON object with:
{
  "trends": ["trend1", "trend2"],
  "colors": ["color1", "color2"],
  "styles": ["style1", "style2"],
  "season": "spring/summer/fall/winter",
  "tips": ["tip1", "tip2"]
}

Article: ${article.title}
${article.summary}`,
        temperature: 0.3,
        maxTokens: 300,
      });

      // Parse AI response
      let trendData;
      try {
        const jsonMatch = aiSummary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          trendData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // Fallback to simple extraction
        trendData = await extractTrendsFromArticle({
          title: article.title,
          url: article.url,
          summary: article.summary,
          tags: [],
          publishedAt: article.publishedAt,
        });
      }

      // Store in database
      await prisma.styleRule.create({
        data: {
          source: article.source,
          title: article.title,
          description: article.summary.substring(0, 500),
          rule: {
            trends: trendData.trends || [],
            colors: trendData.colors || [],
            styles: trendData.styles || [],
            season: trendData.season || null,
            tips: trendData.tips || [],
            url: article.url,
          },
          season: trendData.season || null,
        },
      });

      console.log(`✅ Stored trend: ${article.title}`);
    } catch (error) {
      console.error(`Error processing article ${article.title}:`, error);
    }
  }

  console.log("🎉 Trend scraping complete!");
  return { processed: allArticles.length };
}

