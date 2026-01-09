"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";

export function ConnectBrokerButton() {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Listen for messages from popup window
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "SNAPTRADE_CONNECTION_SUCCESS") {
                // Refresh the page to show new data
                window.location.reload();
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleConnect = async () => {
        try {
            setLoading(true);

            // Generate a user ID for this session
            let userId = localStorage.getItem("trade_journal_user_id");
            if (!userId) {
                userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                localStorage.setItem("trade_journal_user_id", userId);
            }

            // 1. Register (idempotent)
            const registerRes = await fetch("/api/auth/snaptrade/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            if (!registerRes.ok) {
                const error = await registerRes.json();
                throw new Error(error.error || "Registration failed");
            }

            // 2. Get Link with callback URL
            const callbackUrl = `${window.location.origin}/auth/callback`;
            const res = await fetch("/api/auth/snaptrade/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, redirectUri: callbackUrl }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to get connection link");
            }

            const data = await res.json();

            if (data.redirectURI) {
                // Open in popup window
                const width = 500;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;

                const popup = window.open(
                    data.redirectURI,
                    "SnapTrade Connection",
                    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
                );

                // Monitor popup close
                if (popup) {
                    const checkClosed = setInterval(() => {
                        if (popup.closed) {
                            clearInterval(checkClosed);
                            setLoading(false);
                            // Refresh data in case connection was successful
                            window.location.reload();
                        }
                    }, 500);
                }
            } else {
                throw new Error("Failed to get connection link");
            }
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Error connecting broker");
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleConnect} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Connect Broker
        </Button>
    );
}
