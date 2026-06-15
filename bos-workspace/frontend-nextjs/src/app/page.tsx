// File: src/app/page.tsx
"use client";

import React from "react";
import { Button, Card, Space, Typography } from "antd";
import { SettingOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export default function HomePage() {
  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <Card bordered={true}>
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Title level={2}>Hệ điều hành Doanh nghiệp BOS</Title>
          <Paragraph>
            Hạ tầng Frontend đã cấu hình thành công với Next.js 15, Ant Design,
            Tailwind CSS v4, Axios Interceptor và React Query.
          </Paragraph>
          <Space>
            <Button type="primary" icon={<SettingOutlined />}>
              Kiến tạo Metadata
            </Button>
            <Button icon={<UserOutlined />}>Đăng nhập hệ thống</Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
}
