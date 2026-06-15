// File: src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Cập nhật Metadata cho toàn bộ hệ thống BOS
export const metadata: Metadata = {
  title: "BOS - Business Operating System",
  description: "Nền tảng aPaaS Low-Code quản trị doanh nghiệp toàn diện",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
