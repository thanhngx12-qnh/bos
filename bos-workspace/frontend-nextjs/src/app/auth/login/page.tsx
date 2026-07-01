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
import {
  MailOutlined,
  LockOutlined,
  GlobalOutlined,
  ArrowLeftOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  SlidersOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useLogin,
  useLoginSelectTenant,
  useRequestForgotPasswordOtp,
  useResetPasswordWithOtp,
} from "@/hooks/useAuth";
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
  const requestOtpMutation = useRequestForgotPasswordOtp();
  const resetPasswordMutation = useResetPasswordWithOtp();

  const [form] = Form.useForm();
  const [forgotForm] = Form.useForm();
  const [apiError, setApiError] = useState<string | null>(null);

  const [requireTenantSelect, setRequireTenantSelect] = useState(false);
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  // Quên mật khẩu states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");

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
        backgroundColor: "#f0f2f5",
        overflow: "hidden",
      }}
    >
      <Row style={{ width: "100%", minHeight: "100vh" }} align="middle">
        {/* Left branding panel */}
        <Col
          xs={0}
          md={11}
          lg={12}
          style={{
            height: "100vh",
            background: "radial-gradient(circle at 0% 0%, #001529 0%, #002766 50%, #001529 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 80px",
            color: "#ffffff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative Background Blur Circles */}
          <div
            style={{
              position: "absolute",
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              background: "rgba(24, 144, 255, 0.15)",
              filter: "blur(80px)",
              top: "-50px",
              left: "-50px",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background: "rgba(0, 80, 179, 0.2)",
              filter: "blur(100px)",
              bottom: "-100px",
              right: "-100px",
              pointerEvents: "none",
            }}
          />

          <div className="bos-animate-fade-in" style={{ position: "relative", zIndex: 2 }}>
            {/* Header / Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              >
                <GlobalOutlined style={{ fontSize: "26px", color: "#1890ff" }} />
              </div>
              <div>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    letterSpacing: "2px",
                    background: "linear-gradient(90deg, #ffffff, #1890ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  BOS PLATFORM
                </span>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "1px" }}>
                  NEXT-GEN ENTERPRISE OPERATING SYSTEM
                </div>
              </div>
            </div>

            {/* Slogan */}
            <Title
              level={1}
              style={{
                color: "#ffffff",
                marginTop: "16px",
                marginBottom: "24px",
                fontWeight: 800,
                fontSize: "36px",
                lineHeight: "1.25",
                letterSpacing: "-0.5px",
              }}
            >
              Hệ Thống Vận Hành<br />Doanh Nghiệp Toàn Diện
            </Title>

            <Paragraph
              style={{
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "15px",
                lineHeight: "1.6",
                maxWidth: "480px",
                marginBottom: "40px",
              }}
            >
              Nền tảng aPaaS Low-Code tích hợp sâu sắc mô hình Động hóa Biểu mẫu thông minh, phân quyền RLS chặt chẽ và động cơ quy trình chuẩn hóa doanh nghiệp.
            </Paragraph>

            {/* Feature lists in Glassmorphic Cards */}
            <div style={{ maxWidth: "480px" }}>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  marginBottom: "16px",
                  transition: "all 0.3s",
                }}
                className="bos-card-hover"
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(24, 144, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1890ff",
                  }}
                >
                  <SlidersOutlined style={{ fontSize: "18px" }} />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "#ffffff", fontSize: "15px", fontWeight: 600 }}>
                    Động hóa Biểu mẫu Thông minh
                  </h4>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: "1.4" }}>
                    Tự động tính toán công thức phức tạp & tự động điền Regex nhanh chóng.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  marginBottom: "16px",
                  transition: "all 0.3s",
                }}
                className="bos-card-hover"
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(82, 196, 26, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#52c41a",
                  }}
                >
                  <SafetyCertificateOutlined style={{ fontSize: "18px" }} />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "#ffffff", fontSize: "15px", fontWeight: 600 }}>
                    Bảo mật Row-Level Security (RLS)
                  </h4>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: "1.4" }}>
                    Phân quyền chặt chẽ từng hàng dữ liệu theo phòng ban và vai trò.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  transition: "all 0.3s",
                }}
                className="bos-card-hover"
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(250, 173, 20, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#faad14",
                  }}
                >
                  <SyncOutlined style={{ fontSize: "18px" }} />
                </div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "#ffffff", fontSize: "15px", fontWeight: 600 }}>
                    Động cơ Luồng Phê duyệt tối ưu
                  </h4>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.5)", fontSize: "13px", lineHeight: "1.4" }}>
                    Chuẩn hóa các bước duyệt, ký số và tự động hóa trạng thái hồ sơ.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Col>

        {/* Right action form panel */}
        <Col
          xs={24}
          md={13}
          lg={12}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "40px 24px",
            height: "100vh",
            backgroundColor: "#f8fafc",
          }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: "440px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
              padding: "16px",
            }}
            className="bos-animate-fade-in-up"
          >
            {isForgotPassword ? (
              // LUỒNG QUÊN MẬT KHẨU
              <div className="bos-animate-fade-in">
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                  <Title level={3} style={{ margin: "0 0 8px 0", color: "#0050b3", fontWeight: 700 }}>
                    Khôi Phục Mật Khẩu
                  </Title>
                  <Text type="secondary">
                    {forgotStep === 1
                      ? "Nhập email của bạn để nhận mã xác thực OTP"
                      : `Mã OTP đã được gửi đến email ${forgotEmail}`}
                  </Text>
                </div>

                {apiError && (
                  <Alert
                    message={apiError}
                    type="error"
                    showIcon
                    style={{ marginBottom: "20px", borderRadius: "8px" }}
                    closable
                    onClose={() => setApiError(null)}
                  />
                )}

                {forgotStep === 1 ? (
                  <Form
                    form={forgotForm}
                    layout="vertical"
                    onFinish={async (values) => {
                      setApiError(null);
                      requestOtpMutation.mutate(
                        { email: values.email },
                        {
                          onSuccess: () => {
                            message.success("Đã gửi mã OTP thành công. Vui lòng kiểm tra email của bạn!");
                            setForgotEmail(values.email);
                            setForgotStep(2);
                            forgotForm.resetFields();
                          },
                          onError: (err: any) => {
                            setApiError(extractErrorMessage(err));
                          },
                        }
                      );
                    }}
                  >
                    <Form.Item
                      name="email"
                      label="Email tài khoản"
                      rules={[
                        { required: true, message: "Vui lòng nhập email tài khoản của bạn!" },
                        { type: "email", message: "Địa chỉ Email không hợp lệ!" },
                      ]}
                    >
                      <Input
                        prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
                        placeholder="your-email@vantaibos.com"
                        size="large"
                        style={{ borderRadius: "8px" }}
                      />
                    </Form.Item>

                    <Form.Item style={{ marginTop: "28px", marginBottom: "8px" }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={requestOtpMutation.isPending}
                        style={{ borderRadius: "8px", height: "45px", fontWeight: 600 }}
                      >
                        Gửi Mã OTP Xác Thực
                      </Button>
                    </Form.Item>
                  </Form>
                ) : (
                  <Form
                    form={forgotForm}
                    layout="vertical"
                    onFinish={async (values) => {
                      setApiError(null);
                      resetPasswordMutation.mutate(
                        {
                          email: forgotEmail,
                          otpCode: values.otpCode,
                          newPassword: values.newPassword,
                        },
                        {
                          onSuccess: () => {
                            message.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.");
                            setIsForgotPassword(false);
                            setForgotStep(1);
                            setForgotEmail("");
                            forgotForm.resetFields();
                          },
                          onError: (err: any) => {
                            setApiError(extractErrorMessage(err));
                          },
                        }
                      );
                    }}
                  >
                    <Form.Item
                      name="otpCode"
                      label="Mã xác thực OTP"
                      rules={[
                        { required: true, message: "Vui lòng nhập mã xác thực OTP 6 chữ số!" },
                        { len: 6, message: "Mã OTP phải chứa đúng 6 chữ số!" },
                      ]}
                    >
                      <Input
                        placeholder="123456"
                        size="large"
                        style={{
                          textAlign: "center",
                          fontSize: "20px",
                          letterSpacing: "8px",
                          fontWeight: "bold",
                          borderRadius: "8px",
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="Mật khẩu mới"
                      rules={[
                        { required: true, message: "Vui lòng nhập mật khẩu mới!" },
                        { min: 6, message: "Mật khẩu mới phải chứa ít nhất 6 ký tự!" },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                        placeholder="••••••••"
                        size="large"
                        style={{ borderRadius: "8px" }}
                      />
                    </Form.Item>

                    <Form.Item style={{ marginTop: "28px", marginBottom: "8px" }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={resetPasswordMutation.isPending}
                        style={{ borderRadius: "8px", height: "45px", fontWeight: 600 }}
                      >
                        Đặt Lại Mật Khẩu
                      </Button>
                    </Form.Item>
                  </Form>
                )}

                <div style={{ textAlign: "center", marginTop: "16px" }}>
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotStep(1);
                      setForgotEmail("");
                      setApiError(null);
                      forgotForm.resetFields();
                    }}
                    style={{ color: "#64748b" }}
                  >
                    Quay lại đăng nhập
                  </Button>
                </div>
              </div>
            ) : requireTenantSelect ? (
              // LUỒNG CHỌN DOANH NGHIỆP
              <div className="bos-animate-fade-in">
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <Title level={3} style={{ margin: "0 0 8px 0", color: "#0050b3", fontWeight: 700 }}>
                    Chọn Doanh Nghiệp
                  </Title>
                  <Paragraph type="secondary">
                    Tài khoản của bạn liên kết với nhiều doanh nghiệp. Vui lòng chọn doanh nghiệp làm việc:
                  </Paragraph>
                </div>
                {apiError && (
                  <Alert
                    message={apiError}
                    type="error"
                    showIcon
                    style={{ marginBottom: "20px", borderRadius: "8px" }}
                    closable
                    onClose={() => setApiError(null)}
                  />
                )}
                <Space direction="vertical" style={{ width: "100%" }} size="middle">
                  {tenantsList.map((t) => (
                    <Button
                      key={t.id}
                      icon={<BankOutlined style={{ fontSize: "16px", color: "#0050b3" }} />}
                      size="large"
                      block
                      onClick={() => handleSelectTenant(t.id)}
                      loading={loginSelectTenantMutation.isPending}
                      style={{
                        height: "56px",
                        textAlign: "left",
                        padding: "0 20px",
                        display: "flex",
                        alignItems: "center",
                        fontSize: "15px",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#ffffff",
                      }}
                      className="bos-card-interactive"
                    >
                      <span style={{ fontWeight: 600, color: "#1e293b" }}>{t.name}</span>
                      <span style={{ marginLeft: "auto", fontSize: "12px", color: "#64748b", opacity: 0.8 }}>
                        ({t.code})
                      </span>
                    </Button>
                  ))}
                  <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBackToLogin}
                    style={{ marginTop: "12px", color: "#64748b" }}
                  >
                    Quay lại đăng nhập
                  </Button>
                </Space>
              </div>
            ) : (
              // LUỒNG ĐĂNG NHẬP CHÍNH
              <div className="bos-animate-fade-in">
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                  <Title level={3} style={{ margin: "0 0 8px 0", color: "#0050b3", fontWeight: 700 }}>
                    Đăng Nhập Hệ Thống
                  </Title>
                  <Text type="secondary">
                    Cổng làm việc bảo mật cao dành cho doanh nghiệp
                  </Text>
                </div>

                {apiError && (
                  <Alert
                    message={apiError}
                    type="error"
                    showIcon
                    style={{ marginBottom: "20px", borderRadius: "8px" }}
                    closable
                    onClose={() => setApiError(null)}
                  />
                )}

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={onFinish}
                  requiredMark={false}
                  validateTrigger={["onChange", "onBlur"]}
                >
                  <Form.Item
                    name="email"
                    label={<span style={{ fontWeight: 600, color: "#475569" }}>Email công việc</span>}
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập email công việc của bạn!",
                      },
                      { type: "email", message: "Địa chỉ Email không hợp lệ!" },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined style={{ color: "#94a3b8" }} />}
                      placeholder="admin@vantaibos.com"
                      size="large"
                      style={{ borderRadius: "8px" }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label={<span style={{ fontWeight: 600, color: "#475569" }}>Mật khẩu</span>}
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập mật khẩu đăng nhập!",
                      },
                      { min: 6, message: "Mật khẩu phải chứa ít nhất 6 ký tự!" },
                    ]}
                  >
                    <Input.Password
                      prefix={<LockOutlined style={{ color: "#94a3b8" }} />}
                      placeholder="••••••••"
                      size="large"
                      style={{ borderRadius: "8px" }}
                    />
                  </Form.Item>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: "24px",
                      marginTop: "-8px",
                    }}
                  >
                    <Button
                      type="link"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotStep(1);
                        setApiError(null);
                        forgotForm.resetFields();
                      }}
                      style={{ padding: 0, fontWeight: 500, fontSize: "14px" }}
                    >
                      Quên mật khẩu?
                    </Button>
                  </div>

                  <Form.Item style={{ marginTop: "32px", marginBottom: "8px" }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      block
                      loading={loginMutation.isPending}
                      style={{ borderRadius: "8px", height: "45px", fontWeight: 600 }}
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
