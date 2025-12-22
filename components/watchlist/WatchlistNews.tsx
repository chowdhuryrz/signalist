"use client";

import NewsCard from "./NewsCard";

export default function WatchlistNews({ news }: WatchlistNewsProps) {
  if (!news || news.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="watchlist-title">Latest News</h2>
        <div className="news-item">
          <div className="text-center py-8 text-gray-500">
            <p>No news available for your watchlist stocks</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="watchlist-title">Latest News</h2>
      <div className="watchlist-news">
        {news.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
