"use server";

import { getDateRange, validateArticle, formatArticle } from "@/lib/utils";
import { POPULAR_STOCK_SYMBOLS } from "@/lib/constants";
import { cache } from "react";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const NEXT_PUBLIC_FINNHUB_API_KEY =
  process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? "";

async function fetchJSON<T>(
  url: string,
  revalidateSeconds?: number
): Promise<T> {
  const options: RequestInit & { next?: { revalidate?: number } } =
    revalidateSeconds
      ? { cache: "force-cache", next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" };

  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Fetch failed ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export { fetchJSON };

type FinnhubProfileResponse = {
  name?: string;
  exchange?: string;
  ticker?: string;
};

export const searchStocks = cache(async (query?: string): Promise<StockWithWatchlistStatus[]> => {
  try {
    const token = process.env.FINNHUB_API_KEY ?? NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) {
      console.error("Error in stock search: FINNHUB API key is not configured");
      return [];
    }

    let results: FinnhubSearchResult[] = [];

    if (!query) {
      // No query: fetch top 10 popular symbols
      const popularSymbols = POPULAR_STOCK_SYMBOLS.slice(0, 10);

      const profilePromises = popularSymbols.map(async (symbol) => {
        try {
          const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
          const profile = await fetchJSON<FinnhubProfileResponse>(url, 3600);

          return {
            symbol: symbol,
            description: profile.name || symbol,
            displaySymbol: symbol,
            type: "Common Stock",
            exchange: profile.exchange || "US"
          } as FinnhubSearchResult;
        } catch (e) {
          console.error(`Error fetching profile for ${symbol}:`, e);
          return null;
        }
      });

      const profiles = await Promise.all(profilePromises);
      results = profiles.filter((p): p is FinnhubSearchResult => p !== null);
    } else {
      // Query provided: search using Finnhub search API
      const trimmedQuery = query.trim();
      const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(trimmedQuery)}&token=${token}`;
      const response = await fetchJSON<FinnhubSearchResponse>(url, 1800);
      results = response.result || [];
    }

    // Get user's watchlist to mark stocks
    let watchlistSymbols = new Set<string>();
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session?.user) {
        await connectToDatabase();
        const watchlistItems = await Watchlist.find(
          { userId: session.user.id },
          { symbol: 1, _id: 0 }
        ).lean();
        watchlistSymbols = new Set(watchlistItems.map(item => item.symbol.toUpperCase()));
      }
    } catch (error) {
      console.error("Error fetching watchlist for search:", error);
      // Continue without watchlist data
    }

    // Map to StockWithWatchlistStatus
    const stocks: StockWithWatchlistStatus[] = results.map((result) => {
      const symbol = result.symbol.toUpperCase();
      return {
        symbol,
        name: result.description,
        exchange: result.displaySymbol || "US",
        type: result.type || "Stock",
        isInWatchlist: watchlistSymbols.has(symbol)
      };
    });

    // Limit to 15 results
    return stocks.slice(0, 15);
  } catch (error) {
    console.error("Error in stock search:", error);
    return [];
  }
});

export async function getNews(
  symbols?: string[]
): Promise<MarketNewsArticle[]> {
  try {
    const range = getDateRange(5);
    const token = process.env.FINNHUB_API_KEY ?? NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) {
      throw new Error("FINNHUB API key is not configured");
    }
    const cleanSymbols = (symbols || [])
      .map((s) => s?.trim().toUpperCase())
      .filter((s): s is string => Boolean(s));

    const maxArticles = 6;

    // If we have symbols, try to fetch company news per symbol and round-robin select
    if (cleanSymbols.length > 0) {
      const perSymbolArticles: Record<string, RawNewsArticle[]> = {};

      await Promise.all(
        cleanSymbols.map(async (sym) => {
          try {
            const url = `${FINNHUB_BASE_URL}/company-news?symbol=${encodeURIComponent(
              sym
            )}&from=${range.from}&to=${range.to}&token=${token}`;
            const articles = await fetchJSON<RawNewsArticle[]>(url, 300);
            perSymbolArticles[sym] = (articles || []).filter(validateArticle);
          } catch (e) {
            console.error("Error fetching company news for", sym, e);
            perSymbolArticles[sym] = [];
          }
        })
      );

      const collected: MarketNewsArticle[] = [];
      // Round-robin up to 6 picks
      for (let round = 0; round < maxArticles; round++) {
        for (let i = 0; i < cleanSymbols.length; i++) {
          const sym = cleanSymbols[i];
          const list = perSymbolArticles[sym] || [];
          if (list.length === 0) continue;
          const article = list.shift();
          if (!article || !validateArticle(article)) continue;
          collected.push(formatArticle(article, true, sym, round));
          if (collected.length >= maxArticles) break;
        }
        if (collected.length >= maxArticles) break;
      }

      if (collected.length > 0) {
        // Sort by datetime desc
        collected.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
        return collected.slice(0, maxArticles);
      }
      // If none collected, fall through to general news
    }

    // General market news fallback or when no symbols provided
    const generalUrl = `${FINNHUB_BASE_URL}/news?category=general&token=${token}`;
    const general = await fetchJSON<RawNewsArticle[]>(generalUrl, 300);

    const seen = new Set<string>();
    const unique: RawNewsArticle[] = [];
    for (const art of general || []) {
      if (!validateArticle(art)) continue;
      const key = `${art.id}-${art.url}-${art.headline}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(art);
      if (unique.length >= 20) break; // cap early before final slicing
    }

    const formatted = unique
      .slice(0, maxArticles)
      .map((a, idx) => formatArticle(a, false, undefined, idx));
    return formatted;
  } catch (err) {
    console.error("getNews error:", err);
    throw new Error("Failed to fetch news");
  }
}
