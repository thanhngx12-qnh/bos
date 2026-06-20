// File: src/app/auth/register/page.tsx
"use client";

import React, { useEffect } from "react";
import { Space, Typography, Spin } from "antd";
import { useRouter } from "next/navigation";

const { Text } = Typography;

export default function RegisterTenantPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth/login");
  }, [router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
      <Space direction="vertical" align="center">
        <Spin size="large" />
        <Text type="secondary">Chức năng đăng ký công khai đã bị đóng. Đang chuyển hướng...</Text>
      </Space>
    </div>
  );
}
