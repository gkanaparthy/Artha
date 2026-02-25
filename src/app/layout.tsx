import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { JsonLd } from "@/components/seo/json-ld";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Artha: See What Your Trading Behavior Actually Costs You",
    template: "%s | Artha",
  },
  description: "Automated trading journal for serious traders. Sync trades instantly, track psychology, and measure performance with FIFO P&L plus R-multiple analytics in Artha Pro.",
  keywords: ["trading journal", "stock trading", "options trading", "trade tracker", "trading analytics", "portfolio tracker", "r multiple", "risk multiple", "net r", "avg r", "trading risk management"],
  authors: [{ name: "Gautham Kanaparthy" }],
  creator: "Gautham Kanaparthy",
  metadataBase: new URL("https://arthatrades.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://arthatrades.com",
    siteName: "Artha",
    title: "Artha: See What Your Trading Behavior Actually Costs You",
    description: "Automated trading journal for serious traders. Track psychology, FIFO P&L, and R-multiple analytics in Artha Pro.",
    images: [
      {
        url: "https://arthatrades.com/og-image.png",
        width: 1200,
        height: 1200,
        alt: "Artha - Trading Journal & Analytics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artha: See What Your Trading Behavior Actually Costs You",
    description: "Automated trading journal for serious traders. Track psychology, FIFO P&L, and R-multiple analytics in Artha Pro.",
    images: ["https://arthatrades.com/og-image.png"],
    creator: "@arthatrades",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.getItem('layout-density') === 'compact') {
                  document.documentElement.setAttribute('data-density', 'compact');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
