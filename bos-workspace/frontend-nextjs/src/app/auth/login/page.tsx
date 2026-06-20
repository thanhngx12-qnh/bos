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
import { MailOutlined, LockOutlined, GlobalOutlined, ArrowLeftOutlined, BankOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useLogin, useLoginSelectTenant } from "@/hooks/useAuth";
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
  const loginSelectTenantMutation = useLoginSelectTenant();

  const [form] = Form.useForm();
  const [apiError, setApiError] = useState<string | null>(null);

  const [requireTenantSelect, setRequireTenantSelect] = useState(false);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

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

    const validation = loginSchema.safeParse(values);
    if (!validation.success) {
      const firstError =
        validation.error.errors[0]?.message || "Dữ liệu không hợp lệ";
      setApiError(firstError);
      return;
    }

    loginMutation.mutate(values, {
      onSuccess: (res) => {
        if (res.requireTenantSelect) {
          setTenantsList(res.tenants);
          setPendingEmail(res.email);
          setPendingPassword(values.password);
          setRequireTenantSelect(true);
          return;
        }

        message.success("Đăng nhập thành công!");
        localStorage.setItem("bos_token", res.accessToken);
        localStorage.setItem("bos_user_name", res.user.fullName);
        localStorage.setItem("bos_user_permissions", JSON.stringify((res.user as any).role?.permissions || {}));
        localStorage.setItem("bos_user_type", (res.user as any).userType);
        if ((res.user as any).userType === "SUPER_ADMIN") {
          localStorage.removeItem("bos_tenant_id");
        } else {
          localStorage.setItem("bos_tenant_id", String(res.user.tenantId));
        }
        router.push("/");
      },
      onError: (err: any) => {
        const parsedError = extractErrorMessage(err);
        setApiError(parsedError);
      },
    });
  };

  const handleSelectTenant = (tenantId: number) => {
    setApiError(null);
    loginSelectTenantMutation.mutate({
      email: pendingEmail,
      password: pendingPassword,
      tenantId,
    }, {
      onSuccess: (res) => {
        message.success("Đăng nhập thành công!");
        localStorage.setItem("bos_token", res.accessToken);
        localStorage.setItem("bos_user_name", res.user.fullName);
        localStorage.setItem("bos_user_permissions", JSON.stringify((res.user as any).role?.permissions || {}));
        localStorage.setItem("bos_user_type", (res.user as any).userType);
        if ((res.user as any).userType === "SUPER_ADMIN") {
          localStorage.removeItem("bos_tenant_id");
        } else {
          localStorage.setItem("bos_tenant_id", String(res.user.tenantId));
        }
        router.push("/");
      },
      onError: (err: any) => {
        const parsedError = extractErrorMessage(err);
        setApiError(parsedError);
      }
    });
  };

  const handleBackToLogin = () => {
    setRequireTenantSelect(false);
    setTenantsList([]);
    setPendingEmail("");
    setPendingPassword("");
    setApiError(null);
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
            {requireTenantSelect ? (
              <div>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <Title level={3} style={{ margin: 0, color: "#0050b3" }}>
                    Chọn Doanh Nghiệp
                  </Title>
                  <Paragraph type="secondary" style={{ marginTop: 8 }}>
                    Tài khoản của bạn liên kết với nhiều doanh nghiệp. Vui lòng chọn một doanh nghiệp để làm việc:
                  </Paragraph>
                </div>
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  {tenantsList.map((t) => (
                    <Button
                      key={t.id}
                      icon={<BankOutlined />}
                      size="large"
                      block
                      onClick={() => handleSelectTenant(t.id)}
                      loading={loginSelectTenantMutation.isPending}
                      style={{
                        height: "56px",
                        textAlign: "left",
                        paddingLeft: "20px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "15px",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: "12px", opacity: 0.6 }}>({t.code})</span>
                    </Button>
                  ))}
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBackToLogin}
                    style={{ marginTop: "12px" }}
                  >
                    Quay lại đăng nhập
                  </Button>
                </Space>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                  <Title level={3} style={{ margin: 0, color: "#0050b3" }}>
                    Đăng Nhập Hệ Thống
                  </Title>
                  <Text type="secondary">
                    Cổng làm việc bảo mật cao doanh nghiệp
                  </Text>
                </div>

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
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
