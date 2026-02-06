"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Settings, Menu, X, LogOut, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
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

interface MobileNavProps {
    isAdmin?: boolean;
}

export function MobileNav({ isAdmin }: MobileNavProps) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            fetch('/api/subscription')
                .then(res => res.ok ? res.json() : null)
                .then(data => { if (data) setSubscription(data); })
                .catch(() => {});
        }
    }, [session?.user?.id]);

    // Close menu when route changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsOpen(false);
    }, [pathname]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    const handleSignOut = () => {
        signOut({ callbackUrl: "/login" });
    };

    return (
        <>
            {/* Mobile Header Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-b z-50 flex items-center justify-between px-4">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <div className="w-8 h-8 relative flex items-center justify-center">
                        <Image src="/logo.png" alt="" fill className="object-contain" />
                    </div>
                    <span className="font-serif font-bold text-lg">Artha</span>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-10 w-10"
                    aria-label="Toggle navigation menu"
                    aria-expanded={isOpen}
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') setIsOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Close navigation menu"
                />
            )}

            {/* Slide-out Menu */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                className={cn(
                    "md:hidden fixed top-0 right-0 h-full w-72 bg-card z-50 transform transition-transform duration-300 ease-in-out shadow-xl",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <div className="flex flex-col h-full pt-16">
                    {/* User Info */}
                    {session?.user && (
                        <div className="px-4 py-4 border-b">
                            <div className="flex items-center gap-3">
                                {session.user.image ? (
                                    <Image
                                        src={session.user.image}
                                        alt={session.user.name || "User"}
                                        width={40}
                                        height={40}
                                        className="rounded-full"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                        </div>
                    )}

                    {/* Navigation Items */}
                    <nav className="flex-1 px-4 py-4 space-y-2">
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "secondary" : "ghost"}
                                        className={cn(
                                            "w-full justify-start h-12 text-base",
                                            isActive && "bg-secondary"
                                        )}
                                    >
                                        <item.icon className="mr-3 h-5 w-5" />
                                        {item.label}
                                    </Button>
                                </Link>
                            );
                        })}
                        {isAdmin && (
                            <Link href="/admin/subscriptions">
                                <Button
                                    variant={pathname === "/admin/subscriptions" ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start h-12 text-base",
                                        pathname === "/admin/subscriptions" && "bg-secondary"
                                    )}
                                >
                                    <CreditCard className="mr-3 h-5 w-5" />
                                    Admin
                                </Button>
                            </Link>
                        )}
                    </nav>

                    {/* Subscription Status */}
                    {session?.user && subscription && (
                        <div className="px-4 py-3 border-t">
                            <SubscriptionStatus subscription={subscription} />
                        </div>
                    )}

                    {/* Sign Out */}
                    <div className="px-4 py-4 border-t">
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-12 text-base text-muted-foreground hover:text-foreground"
                            onClick={handleSignOut}
                        >
                            <LogOut className="h-5 w-5 mr-3" />
                            Sign Out
                        </Button>
                    </div>

                    {/* Version */}
                    <div className="px-4 py-3 border-t">
                        <p className="text-xs text-muted-foreground text-center">
                            v0.1.0 (MVP)
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
