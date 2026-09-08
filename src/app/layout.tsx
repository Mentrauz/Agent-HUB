import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, VT323 } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/feedback/Toaster";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agent Hub — Visual AI Agent & Multi-Agent Orchestration Platform",
  description: "Build complex multi-agent graphs on an interactive canvas, orchestrate workflows, connect to 500+ MCP tools, and stream live execution telemetry. Enterprise-grade AI orchestration, 100% open-source.",
};

export const viewport: Viewport = {
  themeColor: "#0B0F14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=VT323&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} ${vt323.variable}`}>
        <a href="#main-content" className="skip-to-content-link">
          Skip to main content
        </a>
        <Providers>
          <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
            <Header />
            <div className="flex flex-1 min-h-0 overflow-hidden w-full">
              <Sidebar />
              <main id="main-content" className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto min-h-0 w-full transition-all duration-300">
                {children}
              </main>
            </div>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
