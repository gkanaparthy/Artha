import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";

import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Artha - Free Trading Journal & Analytics",
    template: "%s | Artha",
  },
  description: "The beautiful, automated trading journal for serious traders. Sync trades instantly, track performance, and refine your edge—completely free.",
  keywords: ["trading journal", "stock trading", "options trading", "trade tracker", "trading analytics", "portfolio tracker", "free trading journal"],
  authors: [{ name: "Artha" }],
  creator: "Artha",
  metadataBase: new URL("https://arthatrades.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arthatrades.com",
    siteName: "Artha",
    title: "Artha - Free Trading Journal & Analytics",
    description: "The beautiful, automated trading journal for serious traders. Sync trades instantly, track performance, and refine your edge—completely free.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Artha Trading Journal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artha - Free Trading Journal & Analytics",
    description: "The beautiful, automated trading journal for serious traders. Sync trades instantly, track performance, and refine your edge—completely free.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
