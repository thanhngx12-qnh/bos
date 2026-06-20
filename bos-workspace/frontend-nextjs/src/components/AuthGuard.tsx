// File: src/components/AuthGuard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("bos_token");
        const isAuthRoute = pathname.startsWith("/auth");

        if (!token && !isAuthRoute) {
          setAuthorized(false);
          router.replace("/auth/login");
        } else {
          setAuthorized(true);
        }
      }
    };

    checkAuth();
  }, [pathname, router]);

  const isAuthRoute = pathname.startsWith("/auth");

  if (!authorized && !isAuthRoute) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f8fafc",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <Spin size="large" />
        <span style={{ color: "#0050b3", fontWeight: 500, fontSize: "14px" }}>
          Đang kiểm tra quyền truy cập...
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
