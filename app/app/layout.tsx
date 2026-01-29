import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://epoch.akatsuki.buzz"),
  title: {
    default: "Epoch | Private prediction market on Solana",
    template: "%s | Epoch",
  },
  description: "Private prediction market on Solana. Trade on outcomes of real-world events with privacy and speed.",
  keywords: [
    "prediction market",
    "solana",
    "crypto",
    "blockchain",
    "finance",
    "trading",
    "epoch",
  ],
  authors: [{ name: "Epoch Team" }],
  creator: "Epoch",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://epoch.akatsuki.buzz",
    title: "Epoch | Private prediction market on Solana",
    description: "Private prediction market on Solana. Trade on outcomes of real-world events.",
    siteName: "Epoch",
    images: [
      {
        url: "/opengraph.png",
        width: 1200,
        height: 630,
        alt: "Epoch Prediction Market",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Epoch | Private prediction market on Solana",
    description: "Private prediction market on Solana. Trade on outcomes of real-world events.",
    images: ["/opengraph.png"],
    creator: "@epoch_market",
  },
  icons: {
    icon: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
