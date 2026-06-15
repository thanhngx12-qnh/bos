// File: src/providers/Providers.tsx
"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import viVN from "antd/locale/vi_VN";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Tránh khởi tạo lại QueryClient khi component re-render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        locale={viVN}
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1677ff", // Tông xanh đặc trưng của BOS
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
}
