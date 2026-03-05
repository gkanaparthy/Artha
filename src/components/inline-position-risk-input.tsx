"use client";

import { useRef, useState } from "react";
import { Check, Loader2, PencilLine, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { encodePositionKey } from "@/lib/utils/position-key";

interface InlinePositionRiskInputProps {
  positionKey?: string | null;
  initialRiskUsd?: number | null;
  isDemo?: boolean;
  className?: string;
  onRiskSaved?: (positionKey: string, initialRiskUsd: number | null) => void;
}

export function InlinePositionRiskInput({
  positionKey,
  initialRiskUsd,
  isDemo = false,
  className,
  onRiskSaved,
}: InlinePositionRiskInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canEdit = !isDemo && Boolean(positionKey);

  const startEditing = () => {
    if (!canEdit || !positionKey) return;
    setValue(initialRiskUsd ? String(initialRiskUsd) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancel = () => {
    setEditing(false);
    setValue("");
  };

  const save = async () => {
    if (!positionKey) return;

    const encodedKey = encodePositionKey(positionKey);
    const parsed = Number(value);
    const hasValidRisk = Number.isFinite(parsed) && parsed > 0;

    setSaving(true);
    try {
      if (!value.trim() || !hasValidRisk) {
        if (initialRiskUsd && initialRiskUsd > 0) {
          await fetch(`/api/positions/${encodedKey}/risk`, { method: "DELETE" });
          onRiskSaved?.(positionKey, null);
        }
        setEditing(false);
        return;
      }

      const res = await fetch(`/api/positions/${encodedKey}/risk`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialRiskUsd: parsed }),
      });

      if (res.ok) {
        onRiskSaved?.(positionKey, parsed);
        setEditing(false);
      }
    } catch {
      // Keep editing open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") cancel();
  };

  if (editing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="relative flex items-center">
          <span className="pointer-events-none absolute left-2 text-[10px] text-muted-foreground">$</span>
          <input
            ref={inputRef}
            type="number"
            min="0.01"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="500"
            disabled={saving}
            className="h-6 w-20 rounded border border-input bg-background pl-5 pr-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
          <>
            <button
              onClick={() => void save()}
              className="text-green-500 hover:text-green-600 transition-colors"
              title="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={cancel}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  if (!canEdit) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (initialRiskUsd && initialRiskUsd > 0) {
    return (
      <div className={cn("group/risk inline-flex items-center gap-1", className)}>
        <Badge variant="outline" className="font-mono">
          ${formatCurrency(initialRiskUsd)}
        </Badge>
        <button
          onClick={startEditing}
          title="Edit risk"
          className="opacity-0 group-hover/risk:opacity-100 transition-opacity text-[#E59889] hover:text-[#E59889]/70"
        >
          <PencilLine className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startEditing}
      title="Set 1R risk"
      className={cn(
        "flex items-center gap-1 text-xs text-[#E59889] hover:text-[#E59889]/70 transition-colors",
        className
      )}
    >
      <PencilLine className="h-3 w-3" />
      Set risk
    </button>
  );
}
