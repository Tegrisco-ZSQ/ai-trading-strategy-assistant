import Parser from "rss-parser";

import { NewsArticle } from "@/types/trading";

const parser = new Parser();

function normalizePublishedDate(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

function isInLookbackWindow(isoDateOrRaw: string, lookbackDays: number): boolean {
  if (!isoDateOrRaw) {
    return true;
  }
  const published = new Date(isoDateOrRaw);
  if (Number.isNaN(published.getTime())) {
    return true;
  }
  const now = Date.now();
  const threshold = now - lookbackDays * 24 * 60 * 60 * 1000;
  return published.getTime() >= threshold;
}

export async function fetchRssNews(
  tickerQuery: string,
  maxRecords = 8,
  lookbackDays = 7
): Promise<NewsArticle[]> {
  const query = tickerQuery.trim().replace(/\s+/g, "+");
  const url = `https://news.google.com/rss/search?q=${query}+stock&hl=en-US&gl=US&ceid=US:en`;

  try {
    const feed = await parser.parseURL(url);
    const articles = (feed.items ?? [])
      .slice(0, maxRecords * 3)
      .map((item) => ({
        headline: item.title ?? "",
        url: item.link ?? "",
        published: normalizePublishedDate(item.isoDate ?? item.pubDate)
      }))
      .filter((article) => article.headline)
      .filter((article) => isInLookbackWindow(article.published, lookbackDays))
      .slice(0, maxRecords);

    return articles;
  } catch {
    return [];
  }
}
