import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isLandingPage = req.nextUrl.pathname === "/";
  const isOnboardingPage = req.nextUrl.pathname.startsWith("/onboarding");
  const isAuthCallback = req.nextUrl.pathname.startsWith("/api/auth");
  const isSnapTradeCallback = req.nextUrl.pathname.startsWith("/auth/callback"); // SnapTrade broker connection callback
  const isDebugApi = req.nextUrl.pathname.startsWith("/api/debug");
  const isPublicApi = req.nextUrl.pathname === "/api/health";
  const isCronApi = req.nextUrl.pathname.startsWith("/api/cron");
  const isPublicPage = req.nextUrl.pathname.startsWith("/privacy") ||
    req.nextUrl.pathname.startsWith("/terms") ||
    req.nextUrl.pathname.startsWith("/contact") ||
    req.nextUrl.pathname.startsWith("/pricing");
  const isDemoPage = req.nextUrl.pathname.startsWith("/demo");
  const isPublicStatsApi = req.nextUrl.pathname.startsWith("/api/stats");
  const isStripeWebhook = req.nextUrl.pathname === "/api/stripe/webhook";
  const isApiRoute = req.nextUrl.pathname.startsWith("/api/");

  // Allow auth callbacks, SnapTrade callback, cron jobs, demo pages, debug APIs, and public APIs
  if (isAuthCallback || isSnapTradeCallback || isPublicApi || isCronApi || isPublicPage || isDemoPage || isDebugApi || isPublicStatsApi || isStripeWebhook) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect non-logged-in users to login page if they are not on public pages
  if (!isLoggedIn && !isLoginPage && !isLandingPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Onboarding redirect for logged-in users who haven't completed onboarding
  // Only redirect page navigations, not API routes (broker connection needs APIs during onboarding)
  if (isLoggedIn && !isOnboardingPage && !isLoginPage && !isLandingPage && !isApiRoute) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onboardingCompleted = (req.auth as any)?.user?.onboardingCompleted;
    // Catch undefined/null cases (old JWTs) - redirect to onboarding if not explicitly true
    if (onboardingCompleted !== true) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  // Already completed onboarding but visiting /onboarding — send to dashboard
  if (isLoggedIn && isOnboardingPage) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onboardingCompleted = (req.auth as any)?.user?.onboardingCompleted;
    if (onboardingCompleted === true) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
