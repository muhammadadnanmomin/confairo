import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import Script from "next/script"; // ✅ added
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Confairo — Academic Conference Management Platform",
  description:
    "Streamline academic conferences with Confairo. Manage submissions, reviews, and registrations in one place.",

  icons: {
    icon: [
      {
        url: "/logos/Transparent_Symbol.png",
        type: "image/png",
      },
    ],
    apple: "/logos/Transparent_Symbol.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${geist.variable}
          ${geistMono.variable}
          font-sans antialiased
          bg-background text-foreground
        `}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          {/* ✅ REQUIRED FOR TOASTS */}
          <Toaster />

          {/* ✅ Confairo AI Chatbot */}
          <ChatbotWidget />
        </ThemeProvider>

        {/* ✅ Razorpay Checkout Script */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}