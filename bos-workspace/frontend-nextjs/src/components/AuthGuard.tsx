// File: src/components/AuthGuard.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Spin } from "antd";

// Helper to decode JWT and check if it's expired
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("bos_token");
        const isAuthRoute = pathname ? pathname.startsWith("/auth") : false;

        if ((!token || isTokenExpired(token)) && !isAuthRoute) {
          localStorage.removeItem("bos_token");
          localStorage.removeItem("bos_tenant_id");
          localStorage.removeItem("bos_user_name");
          localStorage.removeItem("bos_user_permissions");
          localStorage.removeItem("bos_user_type");
          setAuthorized(false);
          window.location.replace("/auth/login");
        } else {
          setAuthorized(true);
        }
      }
    };

    checkAuth();
  }, [pathname]);

  const isAuthRoute = pathname ? pathname.startsWith("/auth") : false;

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
