"use client";


import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Chrome, Loader2, Info, Mail, ArrowRight, CheckCircle, AlertTriangle, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Playfair_Display, Inter } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"] });

function LoginContent() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showCookieWarning, setShowCookieWarning] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // If already logged in, redirect away from login page immediately
  // This helps when a magic link was "consumed" by a previewer but the session was established
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      router.replace("/dashboard");
    }
  }, [sessionStatus, router]);

  // Set auth error based on query param
  useEffect(() => {
    // Only show errors if we aren't already authenticated
    if (errorParam && sessionStatus !== "authenticated") {
      switch (errorParam) {
        case "Verification":
          setAuthError("The sign-in link has expired or has already been used. Please request a new one.");
          break;
        case "Configuration":
          setAuthError("There is a problem with the server configuration. Please try again later.");
          break;
        case "AccessDenied":
          setAuthError("You do not have permission to sign in.");
          break;
        default:
          setAuthError("An unexpected error occurred during sign in. Please try again.");
      }
    }
  }, [errorParam, sessionStatus]);

  // Check if cookies are enabled
  useEffect(() => {
    const checkCookies = () => {
      try {
        // Try to set a test cookie
        document.cookie = "cookietest=1; SameSite=Lax";
        const cookiesEnabled = document.cookie.indexOf("cookietest=") !== -1;

        // Delete test cookie
        document.cookie = "cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT";

        if (!cookiesEnabled) {
          setCookiesBlocked(true);
          console.warn('[Login] Cookies are blocked - user may have login issues');
        }
      } catch (e) {
        setCookiesBlocked(true);
        console.error('[Login] Cookie detection failed:', e);
      }
    };

    checkCookies();
  }, []);

  const handleSignIn = async (provider: "google") => {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || loading === "email") return;

    setLoading("email");
    try {
      // Use redirect: false to prevent NextAuth from redirecting to its default verify-request page
      // This keeps the user on our nicely designed login page with the "Check your email" message
      const result = await signIn("resend", {
        email,
        redirect: false,
        callbackUrl: "/dashboard"
      });

      // If no error, show the email sent confirmation
      if (!result?.error) {
        setEmailSent(true);
      } else {
        console.error("Email sign in error:", result.error);
        setAuthError("Failed to send magic link. Please try again or use Google.");
      }
    } catch (error) {
      console.error("Email sign in error:", error);
      setAuthError("An unexpected error occurred. Please try again.");
    } finally {
      // Don't clear loading immediately on success to prevent re-clicks during visual transition
      if (!emailSent) {
        setLoading(null);
      }
    }
  };

  return (
    <div className={cn("min-h-screen flex bg-[#FAFBF6]", inter.className)}>
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#E8EFE0] flex-col justify-between p-12">
        {/* Brand Top Left */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 z-10"
        >
          <Link href="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="w-20 h-20 relative flex items-center justify-center">
              <Image src="/logo.png" alt="" fill className="object-contain" />
            </div>
            <span className={cn("text-[#2E4A3B] text-4xl font-bold tracking-tight", playfair.className)}>
              Artha
            </span>
          </Link>
        </motion.div>

        {/* Tagline/Copy */}
        <div className="z-10 mt-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className={cn("text-5xl font-bold text-[#2E4A3B] leading-tight mb-6", playfair.className)}
          >
            Where your trading <br />journey grows.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[#2E4A3B]/80 text-lg max-w-md"
          >
            Join thousands of traders improving their performance with advanced analytics and journaling.
          </motion.p>
        </div>

        {/* Landscape Illustration (CSS Shapes) */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Sun */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute top-24 right-24 w-32 h-32 rounded-full bg-[#E59889]/20 blur-xl" // Soft peach sun
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            className="absolute top-32 right-32 w-16 h-16 rounded-full bg-[#E59889] mix-blend-multiply opacity-80"
          />

          {/* Hills */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="absolute bottom-0 right-0 w-[120%] h-[50%] bg-[#C8D6B9] rounded-[100%] translate-x-1/4 translate-y-1/4" // Light green hill
          />
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute bottom-0 left-0 w-[120%] h-[40%] bg-[#A8C5A5] rounded-[100%] -translate-x-1/4 translate-y-1/4" // Medium green hill
          />
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[35%] bg-[#2E4A3B] rounded-[100%] translate-y-1/4 opacity-10" // Dark foreground hill
          />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FAFBF6] relative">
        <div className="w-full max-w-[380px] space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-12 h-12 relative flex items-center justify-center"> <Image src="/logo.png" alt="" fill className="object-contain" /> </div> <span className={cn("text-[#2E4A3B] text-3xl font-bold", playfair.className)}>Artha</span>
            </Link>
          </div>

          <div className="space-y-2 text-center">
            <h1 className={cn("text-4xl font-bold text-[#2E4A3B]", playfair.className)}>
              Welcome back
            </h1>
            <p className="text-[#2E4A3B]/70 text-base">
              Please enter your details to sign in.
            </p>
          </div>

          {/* Auth Error Banner */}
          <AnimatePresence>
            {authError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 mb-6 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-900">
                      Sign in failed
                    </p>
                    <p className="text-xs text-red-700 leading-relaxed">
                      {authError}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cookie Warning Banner */}
          {cookiesBlocked && showCookieWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-[#E59889]/10 border border-[#E59889]/30 relative"
            >
              <button
                onClick={() => setShowCookieWarning(false)}
                className="absolute top-2 right-2 p-1 hover:bg-[#E59889]/20 rounded-lg transition-colors"
                aria-label="Dismiss cookie warning"
              >
                <X className="h-4 w-4 text-[#2E4A3B]/60" />
              </button>
              <div className="flex gap-3 pr-6">
                <AlertTriangle className="h-5 w-5 text-[#E59889] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#2E4A3B]">
                    Cookies Required
                  </p>
                  <p className="text-xs text-[#2E4A3B]/70 leading-relaxed">
                    Cookies are currently blocked in your browser. Please enable cookies to sign in.
                    Check your browser settings or disable ad blockers.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-4 pt-4">
            {/* Email Magic Link Form */}
            {emailSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl bg-[#2E4A3B]/5 border border-[#2E4A3B]/10 text-center space-y-3"
              >
                <CheckCircle className="h-12 w-12 text-[#2E4A3B] mx-auto" />
                <h3 className="text-lg font-semibold text-[#2E4A3B]">Check your email</h3>
                <p className="text-sm text-[#2E4A3B]/70">
                  We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
                </p>
                <Button
                  variant="ghost"
                  className="text-[#2E4A3B] hover:bg-[#2E4A3B]/10"
                  onClick={() => setEmailSent(false)}
                >
                  Use a different email
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E4A3B]/40" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-white border border-[#2E4A3B]/10 rounded-xl text-[#2E4A3B] placeholder:text-[#2E4A3B]/40 focus:outline-none focus:ring-2 focus:ring-[#2E4A3B]/20 focus:border-transparent transition-all"
                    aria-label="Email address"
                    required
                  />
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button
                    type="submit"
                    className="w-full h-14 bg-[#2E4A3B] hover:bg-[#2E4A3B]/90 text-white rounded-xl text-base font-medium shadow-lg shadow-[#2E4A3B]/20 hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    disabled={loading !== null || !email}
                  >
                    {loading === "email" ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Continue with Email
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            )}

            <div className="flex items-center gap-3 my-6">
              <div className="h-[1px] flex-1 bg-[#2E4A3B]/10"></div>
              <span className="text-xs text-[#2E4A3B]/60 font-medium uppercase tracking-wider">or continue with</span>
              <div className="h-[1px] flex-1 bg-[#2E4A3B]/10"></div>
            </div>

            {/* Google Button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                className="w-full h-14 bg-white hover:bg-white/80 text-[#2E4A3B] border border-[#2E4A3B]/10 rounded-xl text-base font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3"
                onClick={() => handleSignIn("google")}
                disabled={loading !== null}
              >
                {loading === "google" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#2E4A3B]" />
                ) : (
                  <Chrome className="h-5 w-5 text-[#4285F4]" />
                )}
                Continue with Google
              </Button>
            </motion.div>

          </div>

          {/* Footer Links */}
          <p className="text-xs text-center text-[#2E4A3B]/70 leading-relaxed max-w-xs mx-auto">
            By continuing, you agree to our <br />
            <Link href="/terms" className="font-semibold text-[#2E4A3B] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-[#2E4A3B] hover:underline">Privacy Policy</Link>.
          </p>
        </div>

        {/* Floating Help Button (Aesthetic touch) */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-8 right-8 w-12 h-12 rounded-full bg-[#E59889] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
          aria-label="Get help with login"
          onClick={() => window.location.href = '/contact'}
        >
          <Info className="h-6 w-6" />
        </motion.button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAFBF6]">
        <Loader2 className="h-10 w-10 animate-spin text-[#2E4A3B]/20" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
