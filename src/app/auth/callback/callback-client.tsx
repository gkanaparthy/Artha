"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export function CallbackClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing connection...");
  const [isPopup, setIsPopup] = useState(false);

  useEffect(() => {
    // Check if this is a popup window
    setIsPopup(!!window.opener);

    const handleCallback = async () => {
      try {
        // Get status from URL params
        const connectionStatus = searchParams.get("status");
        const errorMessage = searchParams.get("error");

        if (connectionStatus === "ERROR" || errorMessage) {
          setStatus("error");
          setMessage(errorMessage || "Connection failed");
          return;
        }

        // Attempt initial sync - may return empty for newly connected accounts
        setMessage("Syncing your trades...");
        const syncRes = await fetch("/api/trades/sync", {
          method: "POST",
        });

        let syncResult = null;
        if (syncRes.ok) {
          syncResult = await syncRes.json();
        }

        setStatus("success");

        // Check if sync returned trades or was empty
        if (syncResult && syncResult.synced > 0) {
          setMessage(`Synced ${syncResult.synced} trades successfully!`);
        } else {
          // Empty result - broker data may still be processing
          setMessage("Broker connected! If trades don't appear, click 'Sync Trades' in a few minutes.");
        }

        // Notify parent window and close after delay
        if (window.opener) {
          window.opener.postMessage({ type: "SNAPTRADE_CONNECTION_SUCCESS" }, "*");
          setTimeout(() => window.close(), 2000);
        } else {
          // If not opened as popup, redirect to dashboard
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 2000);
        }
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("error");
        setMessage("Failed to complete connection");
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg text-muted-foreground">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg font-medium text-green-500">{message}</p>
            <p className="text-sm text-muted-foreground">
              {isPopup ? "This window will close automatically..." : "Redirecting to dashboard..."}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <p className="text-lg font-medium text-red-500">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}
