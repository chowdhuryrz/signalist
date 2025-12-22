import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Watchlist from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";
import { getBatchQuotes, getStockProfile, getStockMetrics } from "@/lib/actions/quote.actions";
import { getUserAlerts } from "@/lib/actions/alert.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { formatMarketCapValue, formatPrice, formatChangePercent } from "@/lib/utils";
import WatchlistTable from "@/components/watchlist/WatchlistTable";
import AlertsPanel from "@/components/watchlist/AlertsPanel";
import WatchlistNews from "@/components/watchlist/WatchlistNews";

export default async function WatchlistPage() {
  // 1. Authenticate user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  // 2. Fetch watchlist from database
  await connectToDatabase();
  const watchlistItems = await Watchlist.find({ userId }).lean();

  if (watchlistItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-semibold text-gray-100">Your Watchlist is Empty</h2>
        <p className="text-gray-400">Add stocks to start tracking them</p>
      </div>
    );
  }

  // 3. Extract symbols and fetch batch quotes
  const symbols = watchlistItems.map(item => item.symbol);
  const quotesMap = await getBatchQuotes(symbols);

  // 4. Fetch additional data in parallel (profile, metrics)
  const enrichedWatchlist = await Promise.all(
    watchlistItems.map(async (item) => {
      const quote = quotesMap[item.symbol] || {};
      const profile = await getStockProfile(item.symbol);
      const metrics = await getStockMetrics(item.symbol);

      const currentPrice = quote.c;
      const changePercent = quote.dp;
      const marketCap = profile.marketCapitalization;
      const peRatio = metrics.metric?.peNormalizedAnnual;

      return {
        userId: item.userId,
        symbol: item.symbol,
        company: item.company,
        addedAt: item.addedAt,
        currentPrice,
        changePercent,
        priceFormatted: currentPrice ? formatPrice(currentPrice) : "N/A",
        changeFormatted: formatChangePercent(changePercent),
        marketCap: marketCap ? formatMarketCapValue(marketCap * 1e6) : "N/A", // Convert from millions
        peRatio: peRatio ? peRatio.toFixed(2) : "N/A",
      } as StockWithData;
    })
  );

  // 5. Fetch user alerts
  const alerts = await getUserAlerts();

  // 6. Enrich alerts with current price and change data
  const enrichedAlerts: EnrichedAlert[] = alerts.map((alert) => {
    const quote = quotesMap[alert.symbol] || {};
    return {
      id: alert._id.toString(),
      symbol: alert.symbol,
      company: alert.company,
      alertName: alert.alertName,
      currentPrice: quote.c || 0,
      changePercent: quote.dp,
      alertType: alert.alertType,
      threshold: alert.threshold,
      cadence: alert.cadence,
      isActive: alert.isActive,
    };
  });

  // 7. Fetch news filtered by watchlist symbols
  const news = await getNews(symbols);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Watchlist</h1>
      </div>

      <div className="watchlist-container">
        {/* Left Column: Watchlist Table */}
        <div className="watchlist">
          <WatchlistTable watchlist={enrichedWatchlist} />
        </div>

        {/* Right Column: Alerts Panel */}
        <div className="watchlist-alerts">
          <AlertsPanel alerts={enrichedAlerts} watchlistSymbols={symbols} />
        </div>
      </div>

      {/* News Section */}
      <WatchlistNews news={news} />
    </div>
  );
}
