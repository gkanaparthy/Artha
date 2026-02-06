"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Settings, Wallet, LogOut, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { SubscriptionInfo } from "@/lib/subscription";

const sidebarItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Journal", href: "/journal" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Settings, label: "Settings", href: "/settings" },
];

interface Account {
    id: string;
    brokerName: string;
}

interface AppSidebarProps {
    isAdmin?: boolean;
}

export function AppSidebar({ isAdmin }: AppSidebarProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!session?.user?.id) return;

                // Fetch accounts and subscription in parallel
                const [accountsRes, subRes] = await Promise.all([
                    fetch(`/api/accounts`),
                    fetch(`/api/subscription`)
                ]);

                if (accountsRes.ok) {
                    const data = await accountsRes.json();
                    setAccounts(data.accounts || []);
                }

                if (subRes.ok) {
                    const data = await subRes.json();
                    setSubscription(data);
                }
            } catch (e) {
                console.error("Failed to fetch sidebar data:", e);
            }
        };
        fetchData();
    }, [session?.user?.id]);

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    return (
        <div className="w-64 border-r bg-card h-screen flex flex-col hidden md:flex">
            <Link href="/dashboard" className="p-6 flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 relative flex items-center justify-center">
                    <Image
                        src="/logo.png"
                        alt="Artha Logo"
                        fill
                        className="object-contain"
                    />
                </div>
                <div>
                    <h1 className="text-xl font-bold font-serif">Artha</h1>
                    <p className="text-xs text-muted-foreground">Trading Journal</p>
                </div>
            </Link>
            <nav className="flex-1 px-4 space-y-2">
                {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn("w-full justify-start", isActive && "bg-secondary")}
                            >
                                <item.icon className="mr-2 h-4 w-4" />
                                {item.label}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            {/* Connected Brokers Section */}
            <div className="px-4 py-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Wallet className="h-3 w-3" />
                    <span>Connected Brokers</span>
                </div>
                {accounts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic pl-5">
                        No brokers connected
                    </p>
                ) : (
                    <div className="space-y-1 pl-5">
                        {accounts.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-center gap-2 text-sm"
                            >
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                <span>{account.brokerName}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* User Section */}
            {session?.user && (
                <div className="px-4 py-3 border-t">
                    <div className="flex items-center gap-3 mb-3">
                        {session.user.image ? (
                            <Image
                                src={session.user.image}
                                alt={session.user.name || "User"}
                                width={36}
                                height={36}
                                className="rounded-full"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {session.user.name || "User"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {session.user.email}
                            </p>
                        </div>
                    </div>

                    {/* Admin Section */}
                    {isAdmin && (
                        <div className="mb-3 space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-2 mb-1">Admin</p>
                            <Link href="/admin/subscriptions">
                                <Button
                                    variant={pathname === "/admin/subscriptions" ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn("w-full justify-start", pathname === "/admin/subscriptions" && "bg-secondary")}
                                >
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    Subscriptions
                                </Button>
                            </Link>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                        onClick={handleSignOut}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            )}

            {/* Subscription Section */}
            {session?.user && subscription && (
                <div className="px-4 py-3 border-t">
                    <SubscriptionStatus subscription={subscription} />
                </div>
            )}

            <div className="p-4 border-t">
                <div className="text-xs text-muted-foreground text-center">
                    v0.1.0 (MVP)
                </div>
            </div>
        </div>
    );
}
