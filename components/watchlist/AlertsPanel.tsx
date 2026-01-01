"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AlertCard from "./AlertCard";
import AlertModal from "./AlertModal";

type AlertsPanelProps = {
  alerts: EnrichedAlert[];
  watchlistSymbols: string[];
};

export default function AlertsPanel({ alerts, watchlistSymbols }: AlertsPanelProps) {
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="watchlist-title">Alerts</h2>
          <Button
            onClick={() => setCreateModalOpen(true)}
            size="sm"
            disabled={watchlistSymbols.length === 0}
            className="yellow-btn"
          >
            <Plus className="h-4 w-4 mr-1" />
            Create Alert
          </Button>
        </div>

        <div className="alert-list">
          {alerts.length === 0 ? (
            <div className="alert-empty">
              <p>No alerts created yet</p>
              <p className="text-sm mt-1">Click "Create Alert" to get started</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </div>
      </div>

      <AlertModal
        open={createModalOpen}
        setOpen={setCreateModalOpen}
        watchlistSymbols={watchlistSymbols}
      />
    </>
  );
}
