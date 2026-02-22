"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { encodePositionKey } from "@/lib/utils/position-key";
import { cn, formatCurrency, formatRMultiple } from "@/lib/utils";
import type { DisplayPosition } from "@/types/trading";

interface RiskEntryPopoverProps {
  position: DisplayPosition;
  isDemo?: boolean;
  onRiskSaved?: () => void;
  children: React.ReactNode;
}

interface RiskEntryContentProps {
  position: DisplayPosition;
  riskUsd: string;
  setRiskUsd: (v: string) => void;
  stopPrice: string;
  setStopPrice: (v: string) => void;
  targetPrice: string;
  setTargetPrice: (v: string) => void;
  showAdvanced: boolean;
  setShowAdvanced: (v: boolean) => void;
  saving: boolean;
  error: string | null;
  previewRMultiple: number | null;
  hasRiskInput: boolean;
  onSave: (e: React.FormEvent) => void;
  onClear: () => void;
  onCancel: () => void;
}

function RiskEntryContent({
  position,
  riskUsd,
  setRiskUsd,
  stopPrice,
  setStopPrice,
  targetPrice,
  setTargetPrice,
  showAdvanced,
  setShowAdvanced,
  saving,
  error,
  previewRMultiple,
  hasRiskInput,
  onSave,
  onClear,
  onCancel,
}: RiskEntryContentProps) {
  const displayPnl = position.pnl;

  return (
    <form onSubmit={onSave} className="space-y-3">
      {/* Position context */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{position.symbol}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground capitalize">{position.status}</span>
        </div>
        {displayPnl !== null && displayPnl !== undefined && (
          <p className={cn("text-xs font-medium mt-0.5", displayPnl >= 0 ? "text-green-500" : "text-red-500")}>
            P&L: {displayPnl >= 0 ? "+" : "-"}${formatCurrency(Math.abs(displayPnl))}
          </p>
        )}
      </div>

      <Separator />

      {/* Risk input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Initial Risk (1R)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <Input
            type="number"
            min="0.01"
            step="any"
            placeholder="500"
            value={riskUsd}
            onChange={(e) => setRiskUsd(e.target.value)}
            className="pl-7"
            autoFocus
          />
        </div>

        {/* Live R-multiple preview */}
        {previewRMultiple !== null && (
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs",
                previewRMultiple >= 0
                  ? "border-green-500/50 text-green-500 bg-green-500/10"
                  : "border-red-500/50 text-red-500 bg-red-500/10"
              )}
            >
              {formatRMultiple(previewRMultiple)}
            </Badge>
            <span className="text-xs text-muted-foreground">preview</span>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <p className="text-xs text-muted-foreground">
          Your planned max loss in USD for this position.
        </p>
      </div>

      {/* Advanced fields */}
      <div>
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Advanced
        </button>

        {showAdvanced && (
          <div className="mt-2 space-y-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Stop Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Target Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasRiskInput && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-xs mr-auto"
            onClick={onClear}
            disabled={saving}
          >
            Clear
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-8 px-3 text-xs"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function RiskEntryPopover({
  position,
  isDemo,
  onRiskSaved,
  children,
}: RiskEntryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [riskUsd, setRiskUsd] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fetch existing risk data when popover opens
  useEffect(() => {
    if (!open || !position.positionKey) return;

    const encodedKey = encodePositionKey(position.positionKey);
    fetch(`/api/positions/${encodedKey}/risk`)
      .then((res) => res.json())
      .then((data) => {
        if (data.risk) {
          setRiskUsd(data.risk.initialRiskUsd != null ? String(data.risk.initialRiskUsd) : "");
          setStopPrice(data.risk.initialStopPrice != null ? String(data.risk.initialStopPrice) : "");
          setTargetPrice(data.risk.initialTargetPrice != null ? String(data.risk.initialTargetPrice) : "");
        }
      })
      .catch(() => {
        // Non-critical — fields stay empty
      });
  }, [open, position.positionKey]);

  const previewRMultiple = useMemo(() => {
    const risk = parseFloat(riskUsd);
    if (!Number.isFinite(risk) || risk <= 0 || position.pnl == null) return null;
    return position.pnl / risk;
  }, [riskUsd, position.pnl]);

  const hasRiskInput =
    typeof position.initialRiskUsd === "number" &&
    Number.isFinite(position.initialRiskUsd) &&
    position.initialRiskUsd > 0;

  // Guard: no-op in demo mode or without positionKey
  if (isDemo || !position.positionKey) {
    return <>{children}</>;
  }

  const encodedKey = encodePositionKey(position.positionKey);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRisk = parseFloat(riskUsd);
    if (!Number.isFinite(parsedRisk) || parsedRisk <= 0) {
      setError("Risk must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, number> = { initialRiskUsd: parsedRisk };
      const parsedStop = parseFloat(stopPrice);
      const parsedTarget = parseFloat(targetPrice);
      if (Number.isFinite(parsedStop) && parsedStop > 0) body.initialStopPrice = parsedStop;
      if (Number.isFinite(parsedTarget) && parsedTarget > 0) body.initialTargetPrice = parsedTarget;

      const res = await fetch(`/api/positions/${encodedKey}/risk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to save risk");

      setOpen(false);
      onRiskSaved?.();
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/positions/${encodedKey}/risk`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear risk");
      setOpen(false);
      onRiskSaved?.();
    } catch {
      setError("Failed to clear. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Reset state on close
      setRiskUsd("");
      setStopPrice("");
      setTargetPrice("");
      setShowAdvanced(false);
      setError(null);
    }
    setOpen(next);
  };

  const contentProps = {
    position,
    riskUsd,
    setRiskUsd,
    stopPrice,
    setStopPrice,
    targetPrice,
    setTargetPrice,
    showAdvanced,
    setShowAdvanced,
    saving,
    error,
    previewRMultiple,
    hasRiskInput,
    onSave: handleSave,
    onClear: handleClear,
    onCancel: () => handleOpenChange(false),
  };

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Set Risk</DialogTitle>
          </DialogHeader>
          <RiskEntryContent {...contentProps} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-[300px] p-4" align="end">
        <RiskEntryContent {...contentProps} />
      </PopoverContent>
    </Popover>
  );
}
