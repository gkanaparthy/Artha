import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { sendVerificationRequest } from "./email";


export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
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
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === 'production' && !process.env.AUTH_URL?.includes('localhost'),
  callbacks: {
    jwt: async ({ token, user, account, trigger }) => {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
        console.log('[Auth] JWT created for user:', user.id);
      }

      // Refresh onboarding status from DB
      if (token.id && token.onboardingCompleted !== true) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { onboardingCompleted: true, _count: { select: { brokerAccounts: true } } }
          });

          if (dbUser?.onboardingCompleted) {
            token.onboardingCompleted = true;
          } else if (dbUser && dbUser._count.brokerAccounts > 0) {
            token.onboardingCompleted = true;
          } else {
            token.onboardingCompleted = false;
          }
        } catch (e) {
          console.error('[Auth] JWT Error:', e);
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).onboardingCompleted = token.onboardingCompleted ?? false;
      }
      return session;
    },
    signIn: async ({ user, account }) => {
      console.log('[Auth] SignIn attempt:', user.email, account?.provider);
      return true;
    },
    redirect: async ({ url, baseUrl }) => {
      // Force arthatrades.com to ensure session stickiness
      const base = 'https://arthatrades.com';
      if (url.startsWith(base)) return url;
      if (url.startsWith("/")) return `${base}${url}`;
      return base;
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
});
