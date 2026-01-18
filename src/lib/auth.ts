import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { sendVerificationRequest } from "./email";
import { encrypt } from "./encryption";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as ReturnType<typeof PrismaAdapter>,
  session: {
    strategy: "jwt", // Use JWT for Edge Runtime compatibility
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID ?? "",
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? "",
    }),
    // Temporarily disabled - add RESEND_API_KEY to .env.local to enable
    // Resend({
    //   apiKey: process.env.RESEND_API_KEY,
    //   from: process.env.RESEND_FROM_EMAIL || "Artha <login@arthatrades.com>",
    //   sendVerificationRequest,
    //   maxAge: 60 * 60, // 1 hour instead of default 24 hours
    // }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // Add user ID to token on sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Add user ID from token to session
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
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
      }
    },
  },
  trustHost: true,
});
