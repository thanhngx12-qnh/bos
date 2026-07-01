// File: src/app/layout.tsx - Trigger Vercel Staging Build
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AntdRegistry from "@/lib/antd-registry";
import QueryProvider from "@/providers/query-provider";
import { App } from "antd";
import { ThemeProvider } from "@/providers/theme-provider";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/components/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BOS Platform - Hệ thống Quản trị Doanh nghiệp Low-Code",
  description:
    "Nền tảng vận hành tự động đa doanh nghiệp với kiến trúc biểu mẫu động và quy trình sâu sắc",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable}>
      <body className={inter.className}>
        <ErrorBoundary>
          <AntdRegistry>
            <ThemeProvider>
              <QueryProvider>
                <AuthGuard>
                  {/* Thành phần App bọc ngoài cùng giải quyết triệt để vấn đề consume context tĩnh của React 19 */}
                  <App>{children}</App>
                </AuthGuard>
              </QueryProvider>
            </ThemeProvider>
          </AntdRegistry>
        </ErrorBoundary>
      </body>
    </html>
  );
}
