"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { createAlert, updateAlert } from "@/lib/actions/alert.actions";
import { toast } from "sonner";

type AlertFormData = {
  symbol: string;
  company: string;
  alertName: string;
  alertType: 'upper' | 'lower';
  threshold: string;
  cadence: 'once' | 'daily' | 'weekly';
};

type AlertModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  alertId?: string;
  existingAlert?: {
    symbol: string;
    company: string;
    alertName: string;
    alertType: 'upper' | 'lower';
    threshold: string;
    cadence: 'once' | 'daily' | 'weekly';
  };
  prefilledStock?: SelectedStock;
  watchlistSymbols?: string[];
};

const CADENCE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export default function AlertModal({
  open,
  setOpen,
  alertId,
  existingAlert,
  prefilledStock,
  watchlistSymbols = [],
}: AlertModalProps) {
  const isEditMode = !!alertId;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AlertFormData>({
    defaultValues: existingAlert || {
      symbol: prefilledStock?.symbol || '',
      company: prefilledStock?.company || '',
      alertName: '',
      alertType: 'upper',
      threshold: prefilledStock?.currentPrice?.toString() || '',
      cadence: 'once',
    },
  });

  const alertType = watch('alertType');

  // Update company name when pre-filled stock changes
  useEffect(() => {
    if (prefilledStock && !isEditMode) {
      setValue('company', prefilledStock.company);
    }
  }, [prefilledStock, setValue, isEditMode]);

  const onSubmit = async (data: AlertFormData) => {
    const threshold = parseFloat(data.threshold);
    if (isNaN(threshold) || threshold <= 0) {
      toast.error("Please enter a valid price threshold");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && alertId) {
        await updateAlert(alertId, {
          alertName: data.alertName,
          alertType: data.alertType,
          threshold,
          cadence: data.cadence,
        });
        toast.success("Alert updated successfully");
      } else {
        await createAlert({
          symbol: data.symbol,
          company: data.company,
          alertName: data.alertName,
          alertType: data.alertType,
          threshold,
          cadence: data.cadence,
        });
        toast.success("Alert created successfully");
      }

      setOpen(false);
      reset();
    } catch (error) {
      toast.error(isEditMode ? "Failed to update alert" : "Failed to create alert");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="alert-dialog">
        <DialogHeader>
          <DialogTitle className="alert-title">
            {isEditMode ? 'Edit Alert' : 'Create Alert'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isEditMode
              ? 'Update your price alert settings'
              : 'Set up a price alert for your watchlist stock'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Symbol Picker (only in create mode) */}
          {!isEditMode && !prefilledStock && (
            <div className="space-y-2">
              <Label htmlFor="symbol" className="form-label">Stock Symbol</Label>
              <Controller
                name="symbol"
                control={control}
                rules={{ required: "Symbol is required" }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="symbol" className="select-trigger">
                      <SelectValue placeholder="Select a stock" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {watchlistSymbols.map((symbol) => (
                        <SelectItem key={symbol} value={symbol} className="text-gray-100">
                          {symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.symbol && (
                <p className="text-sm text-red-500">{errors.symbol.message}</p>
              )}
            </div>
          )}

          {/* Alert Name */}
          <div className="space-y-2">
            <Label htmlFor="alertName" className="form-label">Alert Name</Label>
            <Input
              id="alertName"
              placeholder="e.g., AAPL Price Alert"
              className="form-input"
              {...register("alertName", { required: "Alert name is required" })}
              aria-invalid={!!errors.alertName}
            />
            {errors.alertName && (
              <p className="text-sm text-red-500">{errors.alertName.message}</p>
            )}
          </div>

          {/* Alert Type */}
          <div className="space-y-2">
            <Label htmlFor="alertType" className="form-label">Alert Type</Label>
            <Controller
              name="alertType"
              control={control}
              rules={{ required: "Alert type is required" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="alertType" className="select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="upper" className="text-gray-100">Price Above (Upper Limit)</SelectItem>
                    <SelectItem value="lower" className="text-gray-100">Price Below (Lower Limit)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.alertType && (
              <p className="text-sm text-red-500">{errors.alertType.message}</p>
            )}
          </div>

          {/* Threshold Price */}
          <div className="space-y-2">
            <Label htmlFor="threshold" className="form-label">
              Threshold Price ({alertType === 'upper' ? 'Above' : 'Below'})
            </Label>
            <Input
              id="threshold"
              type="number"
              step="0.01"
              placeholder="Enter target price"
              className="form-input"
              {...register("threshold", {
                required: "Threshold price is required",
                validate: (value) => {
                  const num = parseFloat(value);
                  return (!isNaN(num) && num > 0) || "Enter a valid positive number";
                },
              })}
              aria-invalid={!!errors.threshold}
            />
            {errors.threshold && (
              <p className="text-sm text-red-500">{errors.threshold.message}</p>
            )}
          </div>

          {/* Cadence */}
          <div className="space-y-2">
            <Label htmlFor="cadence" className="form-label">Notification Frequency</Label>
            <Controller
              name="cadence"
              control={control}
              rules={{ required: "Cadence is required" }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="cadence" className="select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {CADENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-gray-100">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.cadence && (
              <p className="text-sm text-red-500">{errors.cadence.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="border-gray-600 text-gray-400 hover:bg-gray-700">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="yellow-btn">
              {isSubmitting ? "Saving..." : isEditMode ? "Update Alert" : "Create Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
