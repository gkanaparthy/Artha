"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, Menu, X, LogIn, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import Image from "next/image";

const sidebarItems = [
  { icon: Home, label: "Dashboard", href: "/demo" },
  { icon: BookOpen, label: "Journal", href: "/demo/journal" },
  { icon: BarChart3, label: "Reports", href: "/demo/reports" },
];

export function DemoMobileNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-b z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 relative flex items-center justify-center">
            <Image src="/logo.png" alt="Artha" fill className="object-contain" />
          </div>
          <span className="font-serif font-bold text-lg">Artha</span>
          <Badge
            variant="outline"
            className="border-amber-500/50 text-amber-500 bg-amber-500/10 text-xs"
          >
            Demo
          </Badge>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="h-10 w-10"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Menu */}
      <div
        className={cn(
          "md:hidden fixed top-0 right-0 h-full w-72 bg-card z-50 transform transition-transform duration-300 ease-in-out shadow-xl",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full pt-16">
          {/* Demo User Info */}
          <div className="px-4 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Guest User</p>
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <p className="text-xs text-amber-500">Demo Mode</p>
                </div>
              </div>
            </div>
          </div>

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
          </nav>

          {/* Sign In */}
          <div className="px-4 py-4 border-t">
            <Link href="/login">
              <Button className="w-full justify-start h-12 text-base gap-3">
                <LogIn className="h-5 w-5" />
                Sign In for Full Access
              </Button>
            </Link>
          </div>

          {/* Version */}
          <div className="px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground text-center">
              v0.1.0 (Demo)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
