// File: src/app/login/page.tsx
"use client";

import React, { useEffect } from "react";
import { Form, Input, Button, Card, Typography } from "antd";
import {
  UserOutlined,
  LockOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/hooks/useAuth";
import { LoginRequest } from "@/services/auth";

const { Title, Text } = Typography;

interface LoginFormValues extends LoginRequest {
  tenantId: string;
}

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [form] = Form.useForm<LoginFormValues>();

  // Tự động điền lại Tenant ID nếu người dùng đã sử dụng thiết bị này trước đó
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTenantId = localStorage.getItem("tenant_id");
      if (savedTenantId) {
        form.setFieldsValue({ tenantId: savedTenantId });
      }
    }
  }, [form]);

  const onFinish = async (values: LoginFormValues) => {
    const { tenantId, email, password } = values;
    await login({ email, password }, tenantId);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        padding: "20px",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <Title level={2} style={{ marginBottom: "8px", color: "#1677ff" }}>
            Nền tảng BOS
          </Title>
          <Text type="secondary">
            Cổng đăng nhập hệ điều hành aPaaS đa ngành
          </Text>
        </div>

        <Form
          form={form}
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          {/* Định danh Tenant - Chìa khóa SaaS Multi-Tenancy */}
          <Form.Item
            name="tenantId"
            label="Định danh Doanh nghiệp (Tenant ID)"
            rules={[
              { required: true, message: "Vui lòng nhập Tenant ID!" },
              {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message: "Chỉ chấp nhận chữ, số, ký tự gạch ngang/dưới",
              },
            ]}
          >
            <Input
              prefix={
                <ApartmentOutlined style={{ color: "rgba(0,0,0,0.25)" }} />
              }
              placeholder="ví dụ: hanoi-branch, mien-nam"
              size="large"
            />
          </Form.Item>

          {/* Email đăng nhập */}
          <Form.Item
            name="email"
            label="Email Đăng nhập"
            rules={[
              { required: true, message: "Vui lòng nhập Email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
              placeholder="admin@bos.com"
              size="large"
            />
          </Form.Item>

          {/* Mật khẩu */}
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: "Vui lòng nhập Mật khẩu!" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "rgba(0,0,0,0.25)" }} />}
              placeholder="••••••••"
              size="large"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: "28px", marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
            >
              Đăng nhập hệ thống
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
