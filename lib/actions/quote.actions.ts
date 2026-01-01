"use server";

import { cache } from "react";

const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: 60 } // Cache for 60 seconds
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}`);
  }
  return await res.json() as T;
}

type FinnhubQuote = {
  c?: number;  // Current price
  d?: number;  // Change
  dp?: number; // Percent change
  h?: number;  // High price of the day
  l?: number;  // Low price of the day
  o?: number;  // Open price of the day
  pc?: number; // Previous close price
  t?: number;  // Timestamp
};

type FinnhubProfile = {
  name?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
};

type FinnhubMetrics = {
  metric?: {
    peNormalizedAnnual?: number;
    marketCapitalization?: number;
  };
};

export const getBatchQuotes = cache(async (symbols: string[]): Promise<Record<string, QuoteData>> => {
  try {
    if (!FINNHUB_API_KEY) {
      throw new Error("FINNHUB API key not configured");
    }

    if (symbols.length === 0) {
      return {};
    }

    // Fetch quotes in parallel
    const quotePromises = symbols.map(async (symbol) => {
      try {
        const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
        const quote = await fetchJSON<FinnhubQuote>(url);

        return {
          symbol,
          data: {
            c: quote.c,
            dp: quote.dp,
          } as QuoteData,
        };
      } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        return { symbol, data: {} as QuoteData };
      }
    });

    const results = await Promise.all(quotePromises);

    // Convert array to record
    const quotesRecord: Record<string, QuoteData> = {};
    results.forEach(({ symbol, data }) => {
      quotesRecord[symbol] = data;
    });

    return quotesRecord;
  } catch (error) {
    console.error("Error fetching batch quotes:", error);
    return {};
  }
});

export const getStockProfile = cache(async (symbol: string): Promise<ProfileData> => {
  try {
    if (!FINNHUB_API_KEY) {
      throw new Error("FINNHUB API key not configured");
    }

    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`;
    const profile = await fetchJSON<FinnhubProfile>(url);

    return {
      name: profile.name,
      marketCapitalization: profile.marketCapitalization,
    };
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    return {};
  }
});

export const getStockMetrics = cache(async (symbol: string): Promise<FinancialsData> => {
  try {
    if (!FINNHUB_API_KEY) {
      throw new Error("FINNHUB API key not configured");
    }

    const url = `${FINNHUB_BASE_URL}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_API_KEY}`;
    const metrics = await fetchJSON<FinnhubMetrics>(url);

    return {
      metric: metrics.metric,
    };
  } catch (error) {
    console.error(`Error fetching metrics for ${symbol}:`, error);
    return {};
  }
});
