// File: src/app/auth/login/page.tsx
"use client";

import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  message,
  Row,
  Col,
  Alert,
} from "antd";
import { MailOutlined, LockOutlined, GlobalOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useLogin } from "@/hooks/useAuth";
import { z } from "zod";
import Link from "next/link";

const { Title, Text, Paragraph } = Typography;

// Schema Zod kiểm thử nghiêm ngặt
const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không đúng định dạng công việc"),
  password: z.string().min(6, "Mật khẩu tối thiểu phải chứa 6 ký tự"),
});

export default function LoginPage() {
  const router = useRouter();
  const loginMutation = useLogin();
  const [form] = Form.useForm();
  const [apiError, setApiError] = useState<string | null>(null);

  // Hàm bóc tách lỗi đa tầng từ Backend NestJS
  const extractErrorMessage = (err: any): string => {
    const data = err?.response?.data;
    if (!data)
      return "Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền Internet.";
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) return data.message.join(", ");
    return data.error || "Đã xảy ra lỗi không xác định.";
  };

  const onFinish = async (values: any) => {
    setApiError(null);

    // Validate tầng 2 với Zod
    const validation = loginSchema.safeParse(values);
    if (!validation.success) {
      const firstError =
        validation.error.errors[0]?.message || "Dữ liệu không hợp lệ";
      setApiError(firstError);
      return;
    }

    loginMutation.mutate(values, {
      onSuccess: (res) => {
        message.success("Đăng nhập thành công!");
        localStorage.setItem("bos_token", res.accessToken);
        localStorage.setItem("bos_tenant_id", String(res.user.tenantId));
        localStorage.setItem("bos_user_name", res.user.fullName);
        router.push("/");
      },
      onError: (err: any) => {
        const parsedError = extractErrorMessage(err);
        setApiError(parsedError);
      },
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#f8fafc",
      }}
    >
      <Row style={{ width: "100%" }} align="middle">
        {/* Left branding panel */}
        <Col
          xs={0}
          md={11}
          lg={12}
          style={{
            height: "100vh",
            background: "linear-gradient(135deg, #001529 0%, #0050b3 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px",
            color: "#ffffff",
          }}
        >
          <Space direction="vertical" size="large">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <GlobalOutlined style={{ fontSize: "32px", color: "#1890ff" }} />
              <Title level={2} style={{ color: "#ffffff", margin: 0 }}>
                BOS PLATFORM
              </Title>
            </div>
            <Title
              level={1}
              style={{ color: "#ffffff", marginTop: "24px", fontWeight: 800 }}
            >
              Hệ Thống Vận Hành Doanh Nghiệp Toàn Diện
            </Title>
            <Paragraph
              style={{
                color: "#ffffffd9",
                fontSize: "16px",
                maxWidth: "480px",
              }}
            >
              Nền tảng aPaaS Low-Code tích hợp sâu sắc mô hình Động hóa Biểu
              mẫu, phân quyền RLS chặt chẽ và động cơ quy trình chuẩn hóa cao.
            </Paragraph>
          </Space>
        </Col>

        {/* Right action form panel */}
        <Col
          xs={24}
          md={13}
          lg={12}
          style={{ display: "flex", justifyContent: "center", padding: "24px" }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: "440px",
              borderRadius: "12px",
              border: "1px solid #f0f0f0",
            }}
            className="shadow-sm"
          >
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <Title level={3} style={{ margin: 0, color: "#0050b3" }}>
                Đăng Nhập Hệ Thống
              </Title>
              <Text type="secondary">
                Cổng làm việc bảo mật cao doanh nghiệp
              </Text>
            </div>

            {/* Hộp thông báo Alert hiển thị lỗi từ API (vd: Lỗi 401 Unauthorized) */}
            {apiError && (
              <Alert
                message="Không thể đăng nhập"
                description={apiError}
                type="error"
                showIcon
                closable
                onClose={() => setApiError(null)}
                style={{ marginBottom: "24px", borderRadius: "8px" }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              requiredMark={true}
              validateTrigger={["onChange", "onBlur"]}
            >
              <Form.Item
                name="email"
                label="Email công việc"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng nhập email công việc của bạn!",
                  },
                  { type: "email", message: "Địa chỉ Email không hợp lệ!" },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="admin@vantaibos.com"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng nhập mật khẩu đăng nhập!",
                  },
                  { min: 6, message: "Mật khẩu phải chứa ít nhất 6 ký tự!" },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="••••••••"
                  size="large"
                />
              </Form.Item>

              <Form.Item style={{ marginTop: "32px" }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={loginMutation.isPending}
                >
                  Đăng Nhập
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Text type="secondary">Chưa có tài khoản doanh nghiệp? </Text>
              <Link href="/auth/register" passHref legacyBehavior>
                <Button type="link" style={{ padding: 0 }}>
                  Đăng ký Tenant mới
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
