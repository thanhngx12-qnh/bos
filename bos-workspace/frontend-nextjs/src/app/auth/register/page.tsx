// File: src/app/auth/register/page.tsx
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
import {
  MailOutlined,
  LockOutlined,
  UserOutlined,
  ShopOutlined,
  CodeOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useRegisterTenant } from "@/hooks/useAuth";
import { z } from "zod";
import Link from "next/link";

const { Title, Text, Paragraph } = Typography;

// Schema Zod kiểm thử nghiêm ngặt
const registerSchema = z.object({
  tenantName: z.string().min(3, "Tên doanh nghiệp tối thiểu phải chứa 3 ký tự"),
  tenantCode: z
    .string()
    .min(3, "Mã định danh doanh nghiệp tối thiểu phải chứa 3 ký tự")
    .regex(
      /^[a-z0-9_]+$/,
      "Mã chỉ được chứa chữ thường không dấu, số và ký tự gạch dưới (_), định dạng snake_case",
    ),
  adminFullName: z
    .string()
    .min(2, "Họ tên quản trị viên tối thiểu phải chứa 2 ký tự"),
  adminEmail: z
    .string()
    .min(1, "Vui lòng nhập email")
    .email("Email không đúng định dạng công việc"),
  adminPassword: z
    .string()
    .min(6, "Mật khẩu tối thiểu phải chứa 6 ký tự")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số",
    ),
});

export default function RegisterTenantPage() {
  const router = useRouter();
  const registerMutation = useRegisterTenant();
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
    const validation = registerSchema.safeParse(values);
    if (!validation.success) {
      const firstError =
        validation.error.errors[0]?.message || "Dữ liệu nhập liệu không hợp lệ";
      setApiError(firstError);
      return;
    }

    registerMutation.mutate(values, {
      onSuccess: () => {
        message.success(
          "Đăng ký doanh nghiệp thành công! Đang chuyển hướng...",
        );
        setTimeout(() => {
          router.push("/auth/login");
        }, 1500);
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
        {/* Left branding cover panel */}
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
              Khởi tạo Doanh Nghiệp SaaS của Bạn
            </Title>
            <Paragraph
              style={{
                color: "#ffffffd9",
                fontSize: "16px",
                maxWidth: "480px",
              }}
            >
              Thiết lập môi trường làm việc cô lập dữ liệu (Multi-Tenant
              isolation). Chỉ cần 1 phút cấu hình để sở hữu ngay cổng quản trị
              low-code đa phòng ban.
            </Paragraph>
          </Space>
        </Col>

        {/* Right Onboarding form panel */}
        <Col
          xs={24}
          md={13}
          lg={12}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "24px",
            overflowY: "auto",
          }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: "540px",
              borderRadius: "12px",
              border: "1px solid #f0f0f0",
            }}
            className="shadow-sm"
          >
            <div style={{ marginBottom: "24px" }}>
              <Title level={3} style={{ margin: 0, color: "#0050b3" }}>
                Đăng Ký Doanh Nghiệp
              </Title>
              <Text type="secondary">
                Cài đặt phân vùng hệ thống aPaaS cô lập
              </Text>
            </div>

            {/* Hộp thông báo Alert hiển thị lỗi từ API (vd: Lỗi 409 Conflict) */}
            {apiError && (
              <Alert
                message="Không thể đăng ký"
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
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="tenantName"
                    label="Tên Doanh Nghiệp"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập tên doanh nghiệp của bạn!",
                      },
                      {
                        min: 3,
                        message:
                          "Tên doanh nghiệp tối thiểu phải chứa 3 ký tự!",
                      },
                    ]}
                  >
                    <Input
                      prefix={<ShopOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="Công ty Cổ phần Vận tải BOS"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="tenantCode"
                    label="Mã Định Danh Doanh Nghiệp (snake_case)"
                    extra="Viết liền không dấu, dùng gạch dưới để nối (vd: vantai_bos)."
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập mã định danh doanh nghiệp!",
                      },
                      {
                        min: 3,
                        message: "Mã doanh nghiệp tối thiểu phải chứa 3 ký tự!",
                      },
                      {
                        pattern: /^[a-z0-9_]+$/,
                        message:
                          "Chỉ chấp nhận chữ thường không dấu, số và ký tự gạch dưới (_)",
                      },
                    ]}
                  >
                    <Input
                      prefix={<CodeOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="vantai_bos"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="adminFullName"
                    label="Họ và Tên Quản Trị Viên"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập họ và tên của quản trị viên!",
                      },
                      {
                        min: 2,
                        message:
                          "Họ tên quản trị viên tối thiểu phải chứa 2 ký tự!",
                      },
                    ]}
                  >
                    <Input
                      prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="Nguyễn Văn Admin"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="adminEmail"
                    label="Email Quản Trị Hệ Thống"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập email quản trị viên!",
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
                </Col>

                <Col span={24}>
                  <Form.Item
                    name="adminPassword"
                    label="Mật Khẩu Đăng Nhập"
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập mật khẩu quản trị!",
                      },
                      {
                        min: 6,
                        message: "Mật khẩu phải chứa ít nhất 6 ký tự!",
                      },
                      {
                        pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
                        message:
                          "Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số!",
                      },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                      placeholder="••••••••"
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginTop: "24px", marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  loading={registerMutation.isPending}
                >
                  Khởi Tạo Hệ Thống Doanh Nghiệp
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <Text type="secondary">
                Doanh nghiệp của bạn đã có phân vùng?{" "}
              </Text>
              <Link href="/auth/login" passHref legacyBehavior>
                <Button type="link" style={{ padding: 0 }}>
                  Đăng nhập ngay
                </Button>
              </Link>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
