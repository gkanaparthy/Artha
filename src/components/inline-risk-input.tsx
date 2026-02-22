"use client";

import { useRef, useState } from "react";
import { Check, Loader2, PencilLine, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatRMultiple } from "@/lib/utils";
import { encodePositionKey } from "@/lib/utils/position-key";
import type { DisplayPosition } from "@/types/trading";

interface InlineRiskInputProps {
  position: DisplayPosition;
  isDemo?: boolean;
  onRiskSaved?: () => void;
  /** Extra classes on the root element */
  className?: string;
}

export function InlineRiskInput({ position, isDemo, onRiskSaved, className }: InlineRiskInputProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rMultiple = position.status === "closed" ? position.rMultiple : null;
  const canEdit = !isDemo && position.status === "closed" && Boolean(position.positionKey);

  const startEditing = () => {
    if (!canEdit) return;
    setValue(position.initialRiskUsd ? String(position.initialRiskUsd) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancel = () => {
    setEditing(false);
    setValue("");
  };

  const save = async () => {
    if (!position.positionKey) return;
    const encodedKey = encodePositionKey(position.positionKey);
    const parsed = parseFloat(value);

    setSaving(true);
    try {
      if (!value.trim() || !Number.isFinite(parsed) || parsed <= 0) {
        // Treat empty/invalid as a clear if risk was previously set
        if (position.initialRiskUsd) {
          await fetch(`/api/positions/${encodedKey}/risk`, { method: "DELETE" });
          onRiskSaved?.();
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
        setEditing(false);
        onRiskSaved?.();
      }
    } catch {
      // Keep editing open on error so user can retry
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); save(); }
    if (e.key === "Escape") cancel();
  };

  // ── Editing state ──────────────────────────────────────────────────────────
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
            <button onClick={save} className="text-green-500 hover:text-green-600 transition-colors" title="Save">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={cancel} className="text-muted-foreground hover:text-foreground transition-colors" title="Cancel">
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Has R-multiple: show badge + pencil on hover ───────────────────────────
  if (rMultiple !== null && rMultiple !== undefined) {
    return (
      <div className={cn("group/risk inline-flex items-center gap-1", className)}>
        <Badge
          variant="outline"
          className={cn(
            "font-mono",
            rMultiple >= 0
              ? "border-green-500/50 text-green-500 bg-green-500/10"
              : "border-red-500/50 text-red-500 bg-red-500/10"
          )}
        >
          {formatRMultiple(rMultiple)}
        </Badge>
        {canEdit && (
          <button
            onClick={startEditing}
            title="Edit risk"
            className="opacity-0 group-hover/risk:opacity-100 transition-opacity text-[#E59889] hover:text-[#E59889]/70"
          >
            <PencilLine className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // ── No risk yet: orange pencil prompt ─────────────────────────────────────
  if (canEdit) {
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

  return <span className="text-muted-foreground">—</span>;
}
