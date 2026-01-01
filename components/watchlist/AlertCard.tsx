"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { getAlertText, getChangeColorClass, formatPrice } from "@/lib/utils";
import { toggleAlertActive, deleteAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner";
import AlertModal from "./AlertModal";

type AlertCardProps = {
  alert: EnrichedAlert;
};

export default function AlertCard({ alert }: AlertCardProps) {
  const [isActive, setIsActive] = useState(alert.isActive);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      await toggleAlertActive(alert.id, checked);
      setIsActive(checked);
      toast.success(`Alert ${checked ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error("Failed to update alert");
      console.error(error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this alert?")) return;

    setIsDeleting(true);
    try {
      await deleteAlert(alert.id);
      toast.success("Alert deleted");
    } catch (error) {
      toast.error("Failed to delete alert");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCadenceBadgeVariant = (cadence: string): "default" | "success" | "warning" => {
    switch (cadence) {
      case 'once': return 'default';
      case 'daily': return 'success';
      case 'weekly': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <div className={`alert-item ${!isActive ? 'opacity-60' : ''}`}>
        <div className="alert-details">
          <div>
            <div className="alert-name">{alert.alertName}</div>
            <div className="alert-company">
              {alert.company} ({alert.symbol})
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            aria-label="Toggle alert"
          />
        </div>

        <div className="mb-3">
          <div className="alert-price">
            {formatPrice(alert.currentPrice)}
            <span className={`ml-2 text-sm ${getChangeColorClass(alert.changePercent)}`}>
              {alert.changePercent ? `${alert.changePercent > 0 ? '+' : ''}${alert.changePercent.toFixed(2)}%` : ''}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {getAlertText({
              id: alert.id,
              symbol: alert.symbol,
              company: alert.company,
              alertName: alert.alertName,
              currentPrice: alert.currentPrice,
              alertType: alert.alertType,
              threshold: alert.threshold,
              changePercent: alert.changePercent,
            })}
          </div>
        </div>

        <div className="alert-actions">
          <Badge variant={getCadenceBadgeVariant(alert.cadence)}>
            {alert.cadence.charAt(0).toUpperCase() + alert.cadence.slice(1)}
          </Badge>
          <div className="flex gap-1">
            <Button
              onClick={() => setEditModalOpen(true)}
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              aria-label="Edit alert"
              className="alert-update-btn"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleDelete}
              variant="ghost"
              size="icon-sm"
              disabled={isDeleting}
              aria-label="Delete alert"
              className="alert-delete-btn"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertModal
        open={editModalOpen}
        setOpen={setEditModalOpen}
        alertId={alert.id}
        existingAlert={{
          symbol: alert.symbol,
          company: alert.company,
          alertName: alert.alertName,
          alertType: alert.alertType,
          threshold: alert.threshold.toString(),
          cadence: alert.cadence,
        }}
      />
    </>
  );
}
