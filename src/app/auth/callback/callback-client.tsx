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
        const mode = searchParams.get("mode");
        const target = searchParams.get("target");
        const errorMessage = searchParams.get("error");
        const isReconnect = mode === "reconnect";

        if (connectionStatus === "ERROR" || errorMessage) {
          setStatus("error");
          setMessage(errorMessage || "Connection failed");

          if (window.opener) {
            window.opener.postMessage(
              {
                type: isReconnect ? "SNAPTRADE_RECONNECT_ERROR" : "SNAPTRADE_CONNECTION_ERROR",
                error: errorMessage || "Connection failed",
                target,
              },
              window.location.origin
            );
            setTimeout(() => window.close(), 1500);
          }
          return;
        }

        // If Popup: notify the opener and close fast.
        if (window.opener) {
          setStatus("success");
          setMessage(isReconnect ? "Broker reconnected! Updating settings..." : "Broker connected! Finishing up...");
          window.opener.postMessage(
            {
              type: isReconnect ? "SNAPTRADE_RECONNECT_SUCCESS" : "SNAPTRADE_CONNECTION_SUCCESS",
              target,
            },
            window.location.origin
          );
          setTimeout(() => window.close(), 1500); // Fast close
          return;
        }

        if (isReconnect) {
          setStatus("success");
          setMessage("Broker reconnected! Redirecting to settings...");
          setTimeout(() => {
            window.location.href = target || "/settings?broker_reconnected=true";
          }, 1500);
          return;
        }

        // If NOT Popup: We must run the sync here because there is no opener to do it
        setMessage("Starting trade sync...");
        const syncRes = await fetch("/api/trades/sync-initial", {
          method: "POST",
        });

        if (syncRes.status === 401) {
          setStatus("error");
          setMessage("Your session expired. Please log in again to complete the connection.");
          setTimeout(() => {
            window.location.href = "/login?callbackUrl=/dashboard";
          }, 2000);
          return;
        }

        setStatus("success");
        if (syncRes.ok) {
          const data = await syncRes.json();
          setMessage(data.synced > 0
            ? `Broker connected! ${data.synced} trades imported.`
            : "Broker connected! Your trades are being prepared...");
        } else {
          setMessage("Broker connected! Your trades will sync shortly.");
        }

        // For non-popup, redirect after delay
        const isOnboarding = sessionStorage.getItem("onboarding_in_progress") === "true";
        setTimeout(() => {
          if (isOnboarding) {
            window.location.href = "/onboarding?connected=true";
          } else {
            window.location.href = "/dashboard?sync=started";
          }
        }, 3000);
      } catch (error) {
        console.error("Callback error:", error);
        setStatus("error");
        setMessage("Failed to complete connection. Please try again.");
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
