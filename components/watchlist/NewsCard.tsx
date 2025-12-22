"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

type NewsCardProps = {
  article: MarketNewsArticle;
};

export default function NewsCard({ article }: NewsCardProps) {
  return (
    <div className="news-item">
      {article.related && (
        <div className="news-tag">
          {article.related}
        </div>
      )}
      <h3 className="news-title">{article.headline}</h3>
      <p className="news-summary">{article.summary}</p>
      <div className="news-meta">
        <span className="font-medium">{article.source}</span>
        <span className="mx-2">•</span>
        <span>{formatTimeAgo(article.datetime)}</span>
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="news-cta inline-flex items-center gap-1 mt-3"
      >
        Read more
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
