// File: src/app/layout.tsx
import type { Metadata } from "next";
import AntdRegistry from "@/lib/antd-registry";
import QueryProvider from "@/providers/query-provider";
import { ConfigProvider, App } from "antd"; // Tích hợp thành phần App làm cầu nối Context
import "./globals.css";

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
    <html lang="vi">
      <body>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: "#0050b3", // Xanh Navy Hoàng Gia
                colorBgBase: "#f8fafc", // Màu nền xám đá dịu mắt
                borderRadius: 8, // Bo góc chuẩn chỉnh
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              },
            }}
          >
            <QueryProvider>
              {/* Thành phần App bọc ngoài cùng giải quyết triệt để vấn đề consume context tĩnh của React 19 */}
              <App>{children}</App>
            </QueryProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
