"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LogIn, Sparkles } from "lucide-react";

export function DemoHeader() {
  return (
    <header className="hidden md:flex h-16 border-b px-4 md:px-6 items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-amber-500/50 text-amber-500 bg-amber-500/10">
          <Sparkles className="h-3 w-3 mr-1" />
          Demo Mode
        </Badge>
        <span className="text-xs text-muted-foreground">
          Explore with sample data
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link href="/login">
          <Button size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </Link>
      </div>
    </header>
  );
}
