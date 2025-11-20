import Parser from "rss-parser";

const parser = new Parser({
  customFields: {
    item: ["media:content", "content:encoded"],
  },
});

export interface RSSArticle {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  description?: string;
}

export async function fetchRSSFeed(url: string): Promise<RSSArticle[]> {
  try {
    const feed = await parser.parseURL(url);
    
    return feed.items.map((item) => ({
      title: item.title || "Untitled",
      link: item.link || "",
      pubDate: item.pubDate || new Date().toISOString(),
      content: item.content || item.contentSnippet || item.description || "",
      description: item.description || item.contentSnippet || "",
    }));
  } catch (error) {
    console.error(`Error fetching RSS feed ${url}:`, error);
    return [];
  }
}

// Popular fashion RSS feeds
export const FASHION_RSS_FEEDS = [
  "https://www.gq.com/feed/rss",
  "https://www.vogue.com/feed/rss",
  "https://www.elle.com/feed/rss",
  "https://www.harpersbazaar.com/feed/rss",
  "https://www.glamour.com/feed/rss",
];

