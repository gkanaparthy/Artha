"use client";

import { ConnectBrokerButton } from "@/components/connect-broker-button";
import { SyncTradesButton } from "@/components/sync-trades-button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
    return (
        <header className="hidden md:flex h-16 border-b px-4 md:px-6 items-center justify-end bg-background/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <ThemeToggle />
                <SyncTradesButton />
                <ConnectBrokerButton />
            </div>
        </header>
    );
}
