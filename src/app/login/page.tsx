"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Chrome, Apple, Loader2, TrendingUp, BarChart3, Target, Sparkles } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const handleSignIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-1/2 -right-20 w-80 h-80 bg-orange-400/20 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.6, 0.4],
            }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.4, 0.3],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <Image
                src="/logo.svg"
                alt="Artha Logo"
                width={64}
                height={64}
                className="rounded-2xl"
              />
              <div>
                <h1 className="text-4xl font-bold">Artha</h1>
                <p className="text-white/80">Trading Journal</p>
              </div>
            </div>

            <h2 className="text-3xl font-bold mb-4">
              Track Your Trades.<br />
              Improve Your Results.
            </h2>

            <p className="text-lg text-white/90 mb-12 max-w-md">
              Connect your brokerage accounts and gain powerful insights into your trading performance.
            </p>

            {/* Features */}
            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Real-time Sync</p>
                  <p className="text-sm text-white/80">Auto-import trades from your brokers</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Advanced Analytics</p>
                  <p className="text-sm text-white/80">Visualize your trading patterns</p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">Performance Tracking</p>
                  <p className="text-sm text-white/80">Win rate, profit factor, and more</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Image
              src="/logo.svg"
              alt="Artha Logo"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <div>
              <h1 className="text-2xl font-bold text-gradient">Artha</h1>
              <p className="text-sm text-muted-foreground">Trading Journal</p>
            </div>
          </div>

          <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center pb-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center mb-4"
              >
                <Sparkles className="h-8 w-8 text-amber-500" />
              </motion.div>
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to access your trading journal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Google Sign In */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-base font-medium relative overflow-hidden",
                    "border-2 hover:border-primary/50 hover:bg-primary/5",
                    "transition-all duration-300"
                  )}
                  onClick={() => handleSignIn("google")}
                  disabled={loading !== null}
                >
                  {loading === "google" ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                  ) : (
                    <Chrome className="h-5 w-5 mr-3 text-[#4285F4]" />
                  )}
                  Continue with Google
                </Button>
              </motion.div>

              {/* Apple Sign In */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 text-base font-medium relative overflow-hidden",
                    "border-2 hover:border-primary/50 hover:bg-primary/5",
                    "transition-all duration-300"
                  )}
                  onClick={() => handleSignIn("apple")}
                  disabled={loading !== null}
                >
                  {loading === "apple" ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                  ) : (
                    <Apple className="h-5 w-5 mr-3" />
                  )}
                  Continue with Apple
                </Button>
              </motion.div>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Secure & Private
                  </span>
                </div>
              </div>

              {/* Info */}
              <p className="text-xs text-center text-muted-foreground">
                By signing in, you agree to our{" "}
                <a href="#" className="text-primary hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-primary hover:underline">Privacy Policy</a>
              </p>
            </CardContent>
          </Card>

          {/* Bottom text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-sm text-muted-foreground mt-8"
          >
            Don&apos;t have an account?{" "}
            <span className="text-primary font-medium">
              Sign in to create one automatically
            </span>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
