// File: src/components/providers/query-provider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Khởi tạo QueryClient một lần duy nhất trong vòng đời của component
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // Tránh spam gọi lại API khi người dùng chuyển tab trình duyệt
            retry: 1, // Chỉ gọi thử lại 1 lần nếu API bị lỗi
            staleTime: 5 * 60 * 1000, // Dữ liệu được coi là "cũ" sau 5 phút
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
