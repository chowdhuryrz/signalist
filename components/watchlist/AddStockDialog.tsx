"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, Star } from "lucide-react";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { addToWatchlist, removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

type AddStockDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function AddStockDialog({ open, setOpen }: AddStockDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const isSearchMode = !!searchTerm.trim();

  // Fetch initial popular stocks
  useEffect(() => {
    if (open && !isSearchMode) {
      const fetchInitial = async () => {
        setLoading(true);
        try {
          const popularStocks = await searchStocks();
          setStocks(popularStocks);
        } catch (error) {
          console.error("Error fetching initial stocks:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchInitial();
    }
  }, [open, isSearchMode]);

  const handleSearch = useCallback(async () => {
    if (!isSearchMode) {
      const popularStocks = await searchStocks();
      setStocks(popularStocks);
      return;
    }

    setLoading(true);
    try {
      const results = await searchStocks(searchTerm.trim());
      setStocks(results);
    } catch (error) {
      console.error("Search error:", error);
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, [isSearchMode, searchTerm]);

  const debouncedSearch = useDebounce(handleSearch, 300);

  useEffect(() => {
    if (open) {
      debouncedSearch();
    }
  }, [debouncedSearch, open]);

  const handleToggleWatchlist = async (stock: StockWithWatchlistStatus, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setToggling(stock.symbol);
    try {
      if (stock.isInWatchlist) {
        await removeFromWatchlist(stock.symbol);
        toast.success(`${stock.symbol} removed from watchlist`);
        // Update local state
        setStocks(prev => prev.map(s =>
          s.symbol === stock.symbol ? { ...s, isInWatchlist: false } : s
        ));
      } else {
        await addToWatchlist(stock.symbol, stock.name);
        toast.success(`${stock.symbol} added to watchlist`);
        // Update local state
        setStocks(prev => prev.map(s =>
          s.symbol === stock.symbol ? { ...s, isInWatchlist: true } : s
        ));
      }
    } catch (error) {
      toast.error(`Failed to ${stock.isInWatchlist ? 'remove' : 'add'} stock`);
      console.error(error);
    } finally {
      setToggling(null);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearchTerm("");
    setStocks([]);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="alert-dialog max-w-2xl max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="alert-title">Add Stock to Watchlist</DialogTitle>
          <DialogDescription className="text-gray-400">
            Search for stocks to add to your watchlist
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by symbol or company name..."
            className="form-input"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-500" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide-default">
          {loading && stocks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              Loading stocks...
            </div>
          ) : stocks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              {isSearchMode ? "No results found" : "No stocks available"}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm text-gray-400 px-2 py-1">
                {isSearchMode ? "Search results" : "Popular stocks"} ({stocks.length})
              </div>
              {stocks.map((stock) => {
                const isToggling = toggling === stock.symbol;

                return (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <TrendingUp className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-100">{stock.name}</div>
                        <div className="text-sm text-gray-400">
                          {stock.symbol} • {stock.exchange}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleToggleWatchlist(stock, e)}
                      disabled={isToggling}
                      className="p-2 hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
                      aria-label={stock.isInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      {isToggling ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                      ) : (
                        <Star
                          className={`h-5 w-5 transition-colors ${
                            stock.isInWatchlist
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-gray-500 hover:text-yellow-500"
                          }`}
                        />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
