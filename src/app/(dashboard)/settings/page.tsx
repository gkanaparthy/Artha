"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  Link2,
  Unlink,
  RefreshCw,
  LogOut,
  User,
  Building2,
  Settings,
  Sparkles,
  Shield,
  Mail,
  CheckCircle2,
  Moon,
  Sun,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition, AnimatedCard } from "@/components/motion";
import { cn } from "@/lib/utils";

interface Account {
  id: string;
  brokerName: string | null;
  snapTradeAccountId: string;
  createdAt: string;
  disabled: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  _count: {
    trades: number;
  };
}

interface UserData {
  id: string;
  snapTradeUserId: string | null;
  createdAt: string;
  accounts: Account[];
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [reconnecting, setReconnecting] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/user`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  // Check for callback parameters (broker connection result)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      if (params.get('broker_connected') === 'true') {
        toast.success('Broker connected successfully!', {
          description: 'Your trades are being synced.'
        });
        // Clean up URL
        window.history.replaceState({}, '', '/settings');
        // Refresh data to show new account
        fetchUserData();
      } else if (params.get('broker_reconnected') === 'true') {
        toast.success('Connection restored!', {
          description: 'Your broker is reconnected and trades are syncing again.'
        });
        // Clean up URL
        window.history.replaceState({}, '', '/settings');
        // Refresh data to show updated account
        fetchUserData();
      } else if (params.get('broker_error')) {
        const error = params.get('broker_error');
        toast.error('Failed to connect broker', {
          description: error || 'Please try again or contact support.'
        });
        window.history.replaceState({}, '', '/settings');
      } else if (params.get('error')) {
        const error = params.get('error');
        toast.error('Error', {
          description: error || 'An unknown error occurred'
        });
        window.history.replaceState({}, '', '/settings');
      }
    }
  }, []);

  const handleConnectBroker = async () => {
    try {
      setConnecting(true);

      // Register user with SnapTrade
      console.log('[ConnectBroker] Step 1: Registering user with SnapTrade');
      const registerRes = await fetch("/api/auth/snaptrade/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!registerRes.ok) {
        const errorData = await registerRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ConnectBroker] Registration failed:', registerRes.status, errorData);
        throw new Error(`Registration failed: ${errorData.error || registerRes.statusText}`);
      }

      const registerData = await registerRes.json();
      console.log('[ConnectBroker] Registration successful:', registerData);

      // Get connection link with callback URL
      console.log('[ConnectBroker] Step 2: Getting connection link');

      // Build the callback URL - SnapTrade will redirect here after OAuth
      const callbackUrl = `${window.location.origin}/api/auth/snaptrade/callback`;
      console.log('[ConnectBroker] Callback URL:', callbackUrl);

      const loginRes = await fetch("/api/auth/snaptrade/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectUri: callbackUrl }),
      });

      if (!loginRes.ok) {
        const errorData = await loginRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[ConnectBroker] Login link failed:', loginRes.status, errorData);
        throw new Error(`Failed to get connection link: ${errorData.error || loginRes.statusText}`);
      }

      const loginData = await loginRes.json();
      console.log('[ConnectBroker] Got connection link, redirecting...');

      const { redirectURI } = loginData;
      if (!redirectURI) {
        throw new Error('No redirect URI received from server');
      }

      window.location.href = redirectURI;
    } catch (e) {
      console.error('[ConnectBroker] Error:', e);
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      alert(`Failed to connect broker: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Are you sure you want to disconnect this broker? This will DELETE ALL TRADES associated with this account.")) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts?id=${accountId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to disconnect");
      }

      // Refresh data
      await fetchUserData();
    } catch (e) {
      console.error(e);
      alert("Failed to disconnect broker. Please try again.");
    }
  };

  const handleReconnect = async (accountId: string, brokerName: string) => {
    try {
      setReconnecting(accountId);

      toast.loading(`Generating reconnection link for ${brokerName}...`, {
        id: `reconnect-${accountId}`
      });

      const res = await fetch('/api/accounts/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || 'Failed to generate reconnection link', {
          id: `reconnect-${accountId}`,
          description: data.details || 'Please try again or contact support.'
        });
        return;
      }

      // Show success message
      toast.success('Redirecting to broker login...', {
        id: `reconnect-${accountId}`,
        description: `Log in to the SAME ${brokerName} account to preserve your trade history.`,
        duration: 3000
      });

      // Redirect to SnapTrade OAuth flow
      setTimeout(() => {
        window.location.href = data.redirectURI;
      }, 1000);

    } catch (error) {
      console.error('[Reconnect] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Failed to reconnect', {
        id: `reconnect-${accountId}`,
        description: message
      });
    } finally {
      setReconnecting(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);

      const response = await fetch("/api/trades/sync", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert(result.error || "Sync failed. Please try again.");
        return;
      }

      await fetchUserData();

      // Build detailed feedback message
      let message = `Sync complete! ${result.synced} trade${result.synced !== 1 ? 's' : ''} synced`;

      if (result.accounts > 0) {
        message += ` from ${result.accounts} account${result.accounts !== 1 ? 's' : ''}`;
      }

      if (result.failedAccounts?.length > 0) {
        message += `\n\nWarning: Failed to sync ${result.failedAccounts.length} account(s): ${result.failedAccounts.join(', ')}`;
      }

      if (result.skippedTrades > 0) {
        message += `\n\n${result.skippedTrades} activities skipped (dividends, transfers, etc.)`;
      }

      alert(message);
    } catch (e) {
      console.error(e);
      alert("Network error. Please check your connection and try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    if (!confirm("Are you sure you want to sign out?")) {
      return;
    }
    await signOut({ callbackUrl: "/login" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  // Check if there are any disabled connections
  const hasDisabledConnections = userData?.accounts.some(acc => acc.disabled) || false;
  const disabledCount = userData?.accounts.filter(acc => acc.disabled).length || 0;

  return (
    <PageTransition>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
              <span className="text-gradient">Settings</span>
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 float" />
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your account and broker connections</p>
          </div>
        </motion.div>

        {/* Warning Banner for Disabled Connections */}
        {hasDisabledConnections && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Issue Detected</AlertTitle>
              <AlertDescription>
                {disabledCount === 1
                  ? 'One broker connection is disconnected.'
                  : `${disabledCount} broker connections are disconnected.`}{' '}
                Your trades may not be syncing. Please reconnect your {disabledCount === 1 ? 'account' : 'accounts'} below to continue receiving updates.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* User Info */}
        <AnimatedCard delay={0.1}>
          <Card className="card-hover overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {session?.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session?.user?.name || "User"}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base sm:text-lg">{session?.user?.name || "Account"}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Signed in via OAuth</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full sm:w-auto h-9"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </label>
                  <Input
                    value={session?.user?.email || "Not available"}
                    readOnly
                    className="bg-muted/50 border-muted"
                  />
                </div>

                {userData?.snapTradeUserId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      SnapTrade User ID
                    </label>
                    <Input
                      value={userData.snapTradeUserId}
                      readOnly
                      className="font-mono text-sm bg-muted/50 border-muted"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Authenticated
                </Badge>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Connected Accounts */}
        <AnimatedCard delay={0.2}>
          <Card className="card-hover overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">Connected Brokers</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Manage your brokerage account connections</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncAll}
                    disabled={syncing || !userData?.accounts.length}
                    className="btn-glow w-full sm:w-auto h-9"
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                    Sync All
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConnectBroker}
                    disabled={connecting}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 btn-glow w-full sm:w-auto h-9"
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    Connect Broker
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {!userData || userData.accounts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-16 h-16 mb-4">
                    <div className="absolute inset-0 bg-muted/50 rounded-full" />
                    <Unlink className="h-8 w-8 text-muted-foreground absolute inset-0 m-auto" />
                  </div>
                  <p className="text-lg font-medium text-foreground mb-1">No brokers connected</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Click &quot;Connect Broker&quot; to link your brokerage account and start syncing your trades.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userData.accounts.map((account, index) => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-xl border bg-gradient-to-br from-card to-muted/20 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {account.brokerName || "Unknown Broker"}
                          </div>
                          <div className="text-xs sm:text-sm text-muted-foreground font-mono truncate">
                            ID: {account.snapTradeAccountId.slice(0, 12)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <Badge variant="secondary" className="bg-muted/50 text-xs">
                          {account._count.trades} trades
                        </Badge>
                        {account.disabled ? (
                          <Badge variant="outline" className="text-red-500 border-red-500/50 bg-red-500/10 text-xs">
                            <AlertCircle className="h-3 w-3 mr-1.5" />
                            Disconnected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-500 border-green-500/50 bg-green-500/10 text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                            Connected
                          </Badge>
                        )}
                        {account.disabled ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReconnect(account.id, account.brokerName || 'Unknown')}
                            disabled={reconnecting === account.id}
                            className="bg-blue-500 hover:bg-blue-600 text-white h-8 text-xs"
                          >
                            {reconnecting === account.id ? (
                              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-1.5" />
                            )}
                            Reconnect
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDisconnect(account.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={account.disabled ? "Delete Connection" : "Disconnect Broker"}
                        >
                          {account.disabled ? <Trash2 className="h-4 w-4" /> : <Unlink className="h-4 w-4" />}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Preferences */}
        <AnimatedCard delay={0.3}>
          <Card className="card-hover overflow-hidden">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Preferences</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Customize your experience</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      {mounted && theme === "dark" ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      Theme
                    </span>
                    <Switch
                      checked={mounted && theme === "dark"}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {mounted && theme === "dark" ? "Dark mode enabled" : "Light mode enabled"}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">Currency</span>
                    <Badge variant="outline">USD</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    All values displayed in US Dollars.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        {/* Version Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-sm text-muted-foreground pb-8"
        >
          <p>Artha Trading Journal v0.1.0 (MVP)</p>
          <p className="text-xs mt-1">Powered by SnapTrade</p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
