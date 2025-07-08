import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: " Blackbird Investor Intelligence",
  description: "AI-powered investor chat interface for company metrics and data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-gray-900">
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased h-full bg-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}
