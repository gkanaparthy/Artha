"use client";

import { useFilters } from "@/contexts/filter-context";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncTradesButton() {
    const { syncing, setSyncing, triggerRefresh } = useFilters();

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await fetch("/api/trades/sync", {
                method: "POST",
            });

            if (res.ok) {
                // Trigger refresh of all data viewing components
                triggerRefresh();
            } else {
                const error = await res.json();
                console.error("Sync failed:", error);
                alert("Sync failed: " + (error.error || "Unknown error"));
            }
        } catch (e) {
            console.error(e);
            alert("Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Button
            onClick={handleSync}
            disabled={syncing}
            variant="default"
            size="sm"
            className="gap-2"
        >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Trades"}
        </Button>
    );
}
