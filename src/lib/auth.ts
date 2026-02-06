import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { sendVerificationRequest } from "./email";


export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
  session: {
    strategy: "jwt", // Use JWT for Edge Runtime compatibility
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "offline",  // Request refresh token
          prompt: "consent",       // Force consent screen to get refresh token
        },
      },
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM_EMAIL || "Artha <login@arthatrades.com>",
      sendVerificationRequest,
      maxAge: 4 * 60 * 60, // 4 hours
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors to login page with error parameter
  },
  debug: true,
  callbacks: {
    jwt: async ({ token, user, account, trigger }) => {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
        console.log('[Auth] JWT created for user:', user.email, 'ID:', user.id);
      }

      // Refresh onboarding status from DB whenever token says not completed.
      // This self-heals stale JWTs: once the DB has onboardingCompleted=true,
      // the very next request updates the token and stops further DB checks.
      if (token.id && token.onboardingCompleted !== true) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { onboardingCompleted: true, _count: { select: { brokerAccounts: true } } }
        });

        if (dbUser?.onboardingCompleted) {
          // DB says completed — update token
          token.onboardingCompleted = true;
        } else if (dbUser && dbUser._count.brokerAccounts > 0) {
          // Existing user with broker accounts — auto-complete onboarding
          await prisma.user.update({
            where: { id: token.id as string },
            data: { onboardingCompleted: true },
          });
          token.onboardingCompleted = true;
        } else {
          token.onboardingCompleted = false;
        }
      }

      // Also refresh on explicit session update (e.g. after completing onboarding wizard)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { onboardingCompleted: true }
        });
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false;
      }

      // Log account linking (OAuth)
      if (account) {
        console.log('[Auth] Account linked:', {
          provider: account.provider,
          type: account.type,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'N/A',
        });

        // Warning if no refresh token (user will need to re-auth frequently)
        if (account.provider === 'google' && !account.refresh_token) {
          console.warn('[Auth] ⚠️ No refresh token from Google - user may have previously authorized this app');
        }
      }

      // Fallback: if token.id is missing but we have an email, look up the user
      // This handles cases where users have old JWTs without the id field
      if (!token.id && token.email) {
        console.log('[Auth] Token missing ID, looking up user by email:', token.email);
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true }
        });
        if (dbUser) {
          token.id = dbUser.id;
          console.log('[Auth] User ID found:', dbUser.id);
        } else {
          console.error('[Auth] ❌ User not found for email:', token.email);
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      // Add user ID from token to session
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).onboardingCompleted = token.onboardingCompleted ?? false;
      } else if (session.user && !token.id) {
        console.error('[Auth] ❌ Session created without user ID for:', session.user.email);
      }
      return session;
    },
    signIn: async ({ user, account, profile }) => {
      // Log successful sign-ins
      console.log('[Auth] Sign-in attempt:', {
        email: user.email,
        provider: account?.provider || 'email',
        userId: user.id,
        host: typeof window !== 'undefined' ? window.location.host : 'server-side',
      });

      // Always allow sign-in
      return true;
    },
    redirect: async ({ url, baseUrl }) => {
      // Diagnostic logging for redirects
      console.log('[Auth] Redirecting to:', url, 'Base:', baseUrl);

      // After sign in, redirect to dashboard
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  events: {
    // Encrypt OAuth tokens before storing in database
    async linkAccount(message) {
      const accountId = message.account.id as string;
      console.log('[Auth] Account linking event:', {
        provider: message.account.provider,
        userId: message.user.id,
        email: message.user.email,
      });

      const { encrypt } = await import("./encryption");

      // Encrypt sensitive OAuth tokens
      const encryptedData: Record<string, string> = {};

      if (message.account.refresh_token) {
        encryptedData.refresh_token = encrypt(message.account.refresh_token as string);
      }
      if (message.account.access_token) {
        encryptedData.access_token = encrypt(message.account.access_token as string);
      }
      if (message.account.id_token) {
        encryptedData.id_token = encrypt(message.account.id_token as string);
      }

      // Update account with encrypted tokens
      if (Object.keys(encryptedData).length > 0) {
        await prisma.account.update({
          where: { id: accountId },
          data: encryptedData,
        });
        console.log('[Auth] OAuth tokens encrypted and stored for:', message.user.email);
      }
    },
    async signIn(message) {
      console.log('[Auth] ✅ Sign-in successful:', {
        email: message.user.email,
        isNewUser: message.isNewUser,
      });
    },
    async signOut(message) {
      const email = 'token' in message ? message.token?.email : 'unknown';
      console.log('[Auth] Sign-out:', email || 'unknown');
    },
    async createUser(message) {
      console.log('[Auth] 🆕 New user created:', message.user.email);
    },
    async session(message) {
      // Log session checks (can be noisy, only in dev)
      if (process.env.NODE_ENV === 'development') {
        console.log('[Auth] Session checked for:', message.session.user?.email);
      }
    },
  },
  trustHost: true,
});
