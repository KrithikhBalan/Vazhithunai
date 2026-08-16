import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/providers/Providers";

export const metadata: Metadata = {
  title: {
    default: "Vazhithunai — AI Travel Companion",
    template: "%s | Vazhithunai",
  },
  description:
    "Bilingual AI-powered trip planning, expense splitting, and travel management for Tamil Nadu travelers. Plan trips, split costs, and explore Tamil Nadu with ease.",
  keywords: [
    "trip planning",
    "expense splitting",
    "Tamil Nadu travel",
    "வழித்துணை",
    "Tamil travel app",
    "UPI expense split",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vazhithunai",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Vazhithunai",
    title: "Vazhithunai — AI Travel Companion",
    description: "Bilingual AI-powered trip planning and expense splitting",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D9488",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Tamil:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/*
         * Providers is a 'use client' component, creating the client boundary.
         * This prevents Firebase (and other browser APIs) from running during
         * Next.js server-side static pre-rendering at build time.
         */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
