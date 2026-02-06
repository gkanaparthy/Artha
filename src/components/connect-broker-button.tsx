"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";
import { PaywallDialog } from "@/components/paywall-dialog";

interface ConnectBrokerButtonProps {
    onSuccess?: () => void;
}

export function ConnectBrokerButton({ onSuccess }: ConnectBrokerButtonProps = {}) {
    const [loading, setLoading] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);

    useEffect(() => {
        // Listen for messages from popup window
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "SNAPTRADE_CONNECTION_SUCCESS") {
                if (onSuccess) {
                    onSuccess();
                } else {
                    // Refresh the page to show new data
                    window.location.reload();
                }
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [onSuccess]);

    const handleConnect = async () => {
        try {
            setLoading(true);

            // 0. Check subscription status
            const subRes = await fetch("/api/subscription");
            if (subRes.ok) {
                const subData = await subRes.json();
                if (!subData.canAccessPro) {
                    setLoading(false);
                    setShowPaywall(true);
                    return;
                }
            }

            // 1. Register with SnapTrade (idempotent - uses session user)
            const registerRes = await fetch("/api/auth/snaptrade/register", {
                method: "POST",
            });

            if (!registerRes.ok) {
                const error = await registerRes.json();
                throw new Error(error.error || "Registration failed");
            }

            // 2. Get connection link with callback URL
            const callbackUrl = `${window.location.origin}/auth/callback`;
            const res = await fetch("/api/auth/snaptrade/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ redirectUri: callbackUrl }),
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

                // Check if popup was blocked
                if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                    // Popup was blocked - redirect in same window instead
                    window.location.href = data.redirectURI;
                    return;
                }

                // Focus the popup to bring it to front
                popup.focus();

                // Monitor popup close
                const checkClosed = setInterval(() => {
                    try {
                        if (popup.closed) {
                            clearInterval(checkClosed);
                            setLoading(false);
                            // Refresh data in case connection was successful
                            window.location.reload();
                        }
                    } catch {
                        // Cross-origin error - popup is on different domain
                        clearInterval(checkClosed);
                    }
                }, 500);
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
        <>
            <Button onClick={handleConnect} disabled={loading} size="sm" className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Connect Broker
            </Button>
            <PaywallDialog
                open={showPaywall}
                onOpenChange={setShowPaywall}
                feature="broker connection"
            />
        </>
    );
}
