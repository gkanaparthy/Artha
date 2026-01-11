"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Wallet, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/demo" },
  { icon: BookOpen, label: "Journal", href: "/demo/journal" },
  { icon: BarChart3, label: "Reports", href: "/demo/reports" },
];

export function DemoSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-card h-screen flex flex-col hidden md:flex">
      <Link
        href="/"
        className="p-6 flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
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
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Demo Mode Notice */}
      <div className="px-4 py-3 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Wallet className="h-3 w-3" />
          <span>Connected Brokers</span>
        </div>
        <div className="space-y-1 pl-5">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Demo Broker</span>
          </div>
        </div>
      </div>

      {/* Demo User Section */}
      <div className="px-4 py-3 border-t">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
            <User className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Guest User</p>
            <p className="text-xs text-amber-500 truncate">Demo Mode</p>
          </div>
        </div>
        <Link href="/login">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sign In for Full Access
          </Button>
        </Link>
      </div>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          v0.1.0 (Demo)
        </div>
      </div>
    </div>
  );
}
