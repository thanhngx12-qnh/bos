// File: src/app/layout.tsx
import React from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import Providers from "@/providers/Providers";
import "./globals.css";

export const metadata = {
  title: "BOS - Business Operating System",
  description: "Nền tảng aPaaS Low-Code đa ngành",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
