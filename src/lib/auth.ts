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
      maxAge: 60 * 60, // 1 hour instead of default 24 hours
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login", // Redirect errors to login page with error parameter
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    jwt: async ({ token, user, account, trigger }) => {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
        console.log('[Auth] JWT created for user:', user.email, 'ID:', user.id);
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
      });

      // Always allow sign-in
      return true;
    },
    redirect: async ({ url, baseUrl }) => {
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
