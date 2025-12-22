"use client";

import { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Plus, Trash2 } from "lucide-react";
import { getChangeColorClass } from "@/lib/utils";
import AddStockDialog from "./AddStockDialog";
import AlertModal from "./AlertModal";
import { removeFromWatchlist } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";
import Link from "next/link";

type SortField = 'company' | 'symbol' | 'price' | 'change' | 'marketCap' | 'peRatio';
type SortDirection = 'asc' | 'desc';

export default function WatchlistTable({ watchlist }: WatchlistTableProps) {
  const [sortField, setSortField] = useState<SortField>('company');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<SelectedStock | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedWatchlist = useMemo(() => {
    const sorted = [...watchlist].sort((a, b) => {
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (sortField) {
        case 'company':
          aValue = a.company.toLowerCase();
          bValue = b.company.toLowerCase();
          break;
        case 'symbol':
          aValue = a.symbol.toLowerCase();
          bValue = b.symbol.toLowerCase();
          break;
        case 'price':
          aValue = a.currentPrice || 0;
          bValue = b.currentPrice || 0;
          break;
        case 'change':
          aValue = a.changePercent || 0;
          bValue = b.changePercent || 0;
          break;
        case 'marketCap':
          // Parse market cap string back to number for sorting
          aValue = parseMarketCapForSort(a.marketCap);
          bValue = parseMarketCapForSort(b.marketCap);
          break;
        case 'peRatio':
          aValue = a.peRatio === 'N/A' ? 0 : parseFloat(a.peRatio);
          bValue = b.peRatio === 'N/A' ? 0 : parseFloat(b.peRatio);
          break;
        default:
          aValue = a.company.toLowerCase();
          bValue = b.company.toLowerCase();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return sorted;
  }, [watchlist, sortField, sortDirection]);

  const parseMarketCapForSort = (marketCap: string): number => {
    if (marketCap === 'N/A') return 0;
    const match = marketCap.match(/\$?([\d.]+)([TMB])?/);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const suffix = match[2];
    if (suffix === 'T') return num * 1e12;
    if (suffix === 'B') return num * 1e9;
    if (suffix === 'M') return num * 1e6;
    return num;
  };

  const handleAddAlert = (stock: StockWithData) => {
    setSelectedStock({
      symbol: stock.symbol,
      company: stock.company,
      currentPrice: stock.currentPrice,
    });
    setAlertModalOpen(true);
  };

  const handleDelete = async (symbol: string) => {
    setIsDeleting(symbol);
    try {
      await removeFromWatchlist(symbol);
      toast.success(`${symbol} removed from watchlist`);
    } catch (error) {
      toast.error("Failed to remove from watchlist");
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-100 transition-colors"
      aria-label={`Sort by ${field}`}
    >
      {children}
      <ArrowUpDown className="h-4 w-4" />
    </button>
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="watchlist-title">Stocks</h2>
          <Button onClick={() => setAddStockOpen(true)} size="sm" className="yellow-btn">
            <Plus className="h-4 w-4 mr-1" />
            Add Stock
          </Button>
        </div>

        <div className="watchlist-table">
          <Table>
            <TableHeader>
              <TableRow className="table-header-row">
                <TableHead className="table-header">
                  <SortButton field="company">Company</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="symbol">Symbol</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="price">Price</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="change">Change</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="marketCap">Market Cap</SortButton>
                </TableHead>
                <TableHead>
                  <SortButton field="peRatio">P/E Ratio</SortButton>
                </TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedWatchlist.map((stock) => (
                <TableRow key={stock.symbol} className="table-row">
                  <TableCell className="table-cell">
                    <Link
                      href={`/stocks/${stock.symbol}`}
                      className="hover:text-yellow-500 font-medium text-gray-100 transition-colors"
                    >
                      {stock.company}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-gray-100">{stock.symbol}</TableCell>
                  <TableCell className="text-gray-100">{stock.priceFormatted}</TableCell>
                  <TableCell className={getChangeColorClass(stock.changePercent)}>
                    {stock.changeFormatted}
                  </TableCell>
                  <TableCell className="text-gray-100">{stock.marketCap}</TableCell>
                  <TableCell className="text-gray-100">{stock.peRatio}</TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleAddAlert(stock)}
                      variant="ghost"
                      size="sm"
                      className="add-alert"
                    >
                      Add Alert
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => handleDelete(stock.symbol)}
                      variant="ghost"
                      size="icon-sm"
                      disabled={isDeleting === stock.symbol}
                      aria-label={`Remove ${stock.symbol}`}
                      className="hover:bg-transparent"
                    >
                      <Trash2 className="trash-icon" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AddStockDialog
        open={addStockOpen}
        setOpen={setAddStockOpen}
        existingSymbols={watchlist.map(s => s.symbol)}
      />

      {selectedStock && (
        <AlertModal
          open={alertModalOpen}
          setOpen={setAlertModalOpen}
          prefilledStock={selectedStock}
        />
      )}
    </>
  );
}
