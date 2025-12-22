"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";

export default function WatchlistButton({
  symbol,
  company,
  isInWatchlist: initialIsInWatchlist,
  showTrashIcon = false,
  type = "button",
  onWatchlistChange,
}: WatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(initialIsInWatchlist);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleWatchlist = async () => {
    setIsLoading(true);
    try {
      if (isInWatchlist) {
        await removeFromWatchlist(symbol);
        setIsInWatchlist(false);
        toast.success(`${symbol} removed from watchlist`);
        onWatchlistChange?.(symbol, false);
      } else {
        await addToWatchlist(symbol, company);
        setIsInWatchlist(true);
        toast.success(`${symbol} added to watchlist`);
        onWatchlistChange?.(symbol, true);
      }
    } catch (error) {
      toast.error("Failed to update watchlist");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (type === "icon") {
    return (
      <button
        onClick={handleToggleWatchlist}
        disabled={isLoading}
        className="p-2 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
        aria-label={isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      >
        {showTrashIcon && isInWatchlist ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${isInWatchlist ? "fill-current text-yellow-500" : "text-gray-400"}`}
            viewBox="0 0 20 20"
            fill={isInWatchlist ? "currentColor" : "none"}
            stroke="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggleWatchlist}
      disabled={isLoading}
      className={`w-full h-11 rounded font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        isInWatchlist
          ? "bg-red-500 hover:bg-red-500 text-gray-900"
          : "bg-yellow-500 hover:bg-yellow-500 text-gray-900"
      }`}
    >
      {isLoading ? "..." : isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
    </button>
  );
}
