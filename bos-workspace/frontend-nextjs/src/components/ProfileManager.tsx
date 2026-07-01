// File: src/components/ProfileManager.tsx
"use client";

import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Avatar,
  Descriptions,
  Tag,
  Typography,
  Spin,
  Divider,
  Space,
  Modal,
  Form,
  Input,
  Button,
  App as AntdApp,
} from "antd";
import {
  UserOutlined,
  BankOutlined,
  TeamOutlined,
  KeyOutlined,
  MailOutlined,
  CalendarOutlined,
  EditOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { useMyProfile } from "@/hooks/useAuth";
import { useUpdateUser, useResetUserPassword } from "@/hooks/useUsers";
import { useQueryClient } from "@tanstack/react-query";
import SignatureManager from "./SignatureManager";
import DelegationManager from "./DelegationManager";

const { Title, Text, Paragraph } = Typography;

export default function ProfileManager() {
  const queryClient = useQueryClient();
  const { message } = AntdApp.useApp();
  const { data: profile, isLoading } = useMyProfile();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const updateUserMutation = useUpdateUser();
  const resetPasswordMutation = useResetUserPassword();

  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const getUserTypeTag = (type: string) => {
    switch (type) {
      case "SUPER_ADMIN":
        return <Tag color="gold">QUẢN TRỊ TỐI CAO (SUPER ADMIN)</Tag>;
      case "ADMIN":
        return <Tag color="red">QUẢN TRỊ VIÊN (ADMIN)</Tag>;
      default:
        return <Tag color="blue">THÀNH VIÊN (USER)</Tag>;
    }
  };

  const getStatusTag = (status: string) => {
    return status === "ACTIVE" ? (
      <Tag color="success">ĐANG HOẠT ĐỘNG</Tag>
    ) : (
      <Tag color="error">ĐANG TẠM KHÓA</Tag>
    );
  };

  if (isLoading) {
    return (
      <Card bordered={false} className="shadow-sm">
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <Spin size="large" tip="Đang tải thông tin cá nhân..." />
        </div>
      </Card>
    );
  }

  const handleUpdateInfo = (values: { fullName: string; email: string }) => {
    if (!profile) return;
    updateUserMutation.mutate({
      id: profile.id,
      payload: values,
    }, {
      onSuccess: () => {
        message.success("Cập nhật thông tin cá nhân thành công!");
        queryClient.invalidateQueries({ queryKey: ["myProfile"] });
        setIsEditModalOpen(false);
      },
      onError: (err: any) => {
        message.error("Lỗi cập nhật thông tin: " + (err.response?.data?.message || err.message));
      }
    });
  };

  const handleChangePassword = (values: any) => {
    if (!profile) return;
    resetPasswordMutation.mutate({
      id: profile.id,
      password: values.password,
    }, {
      onSuccess: () => {
        message.success("Đổi mật khẩu thành công!");
        setIsPasswordModalOpen(false);
      },
      onError: (err: any) => {
        message.error("Lỗi đổi mật khẩu: " + (err.response?.data?.message || err.message));
      }
    });
  };

  return (
    <Space direction="vertical" size="large" style={{ display: "flex", width: "100%" }}>
      {/* CARD 1: PERSONAL DETAILS PROFILE CARD */}
      <Card bordered={false} className="shadow-sm overflow-hidden" style={{ background: "#ffffff" }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={5} style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <Avatar
                size={110}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: "#1890ff",
                  boxShadow: "0 4px 12px rgba(24, 144, 255, 0.3)",
                  border: "3px solid #ffffff",
                }}
              />
              <div style={{ marginTop: "12px" }}>
                {profile?.status && getStatusTag(profile.status)}
              </div>
            </div>
          </Col>
          <Col xs={24} md={19}>
            <div style={{ marginBottom: "16px" }}>
              <Space align="center" size="middle" wrap>
                <Title level={3} style={{ margin: 0, fontWeight: 700, color: "#1e293b" }}>
                  {profile?.fullName}
                </Title>
                {profile?.userType && getUserTypeTag(profile.userType)}
              </Space>
              <Paragraph type="secondary" style={{ fontSize: "14px", marginTop: "4px", marginBottom: 8 }}>
                Xem thông tin hồ sơ cá nhân và quản lý các mẫu chữ ký, con dấu xác thực số của bạn.
              </Paragraph>
              <Space size="middle" style={{ marginTop: 8 }}>
                <Button 
                  type="primary" 
                  ghost 
                  icon={<EditOutlined />} 
                  onClick={() => {
                    editForm.setFieldsValue({
                      fullName: profile?.fullName,
                      email: profile?.email,
                    });
                    setIsEditModalOpen(true);
                  }}
                >
                  Cập nhật thông tin
                </Button>
                <Button 
                  type="dashed" 
                  danger 
                  icon={<LockOutlined />} 
                  onClick={() => {
                    passwordForm.resetFields();
                    setIsPasswordModalOpen(true);
                  }}
                >
                  Đổi mật khẩu
                </Button>
              </Space>
            </div>

            <Divider style={{ margin: "12px 0" }} />

            <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered={false}>
              <Descriptions.Item
                label={
                  <Space style={{ color: "#64748b" }}>
                    <MailOutlined />
                    <Text type="secondary">Email làm việc</Text>
                  </Space>
                }
              >
                <Text strong>{profile?.email}</Text>
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space style={{ color: "#64748b" }}>
                    <TeamOutlined />
                    <Text type="secondary">Phòng ban</Text>
                  </Space>
                }
              >
                <Text strong>{profile?.department?.name || "Chưa tham gia phòng ban"}</Text>
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space style={{ color: "#64748b" }}>
                    <KeyOutlined />
                    <Text type="secondary">Chức danh / Vai trò</Text>
                  </Space>
                }
              >
                <Text strong>{profile?.role?.name || "Chưa phân vai trò"}</Text>
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space style={{ color: "#64748b" }}>
                    <BankOutlined />
                    <Text type="secondary">Doanh nghiệp</Text>
                  </Space>
                }
              >
                <Text strong>
                  {profile?.tenant ? `${profile.tenant.name} (${profile.tenant.code.toUpperCase()})` : "Hệ thống tổng"}
                </Text>
              </Descriptions.Item>

              <Descriptions.Item
                label={
                  <Space style={{ color: "#64748b" }}>
                    <CalendarOutlined />
                    <Text type="secondary">Ngày gia nhập</Text>
                  </Space>
                }
              >
                <Text strong>
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : ""}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      {/* CARD 2: SIGNATURE MANAGER PANEL */}
      <SignatureManager />

      {/* CARD 3: DELEGATION MANAGER PANEL */}
      <DelegationManager />

      {/* Modals */}
      <Modal
        title="Cập nhật thông tin cá nhân"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateInfo}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: "Vui lòng nhập họ và tên" }]}
          >
            <Input placeholder="Nhập họ và tên" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Vui lòng nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập email" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={updateUserMutation.isPending}>
                Lưu thay đổi
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đổi mật khẩu"
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu mới" },
              { min: 6, message: "Mật khẩu phải dài tối thiểu 6 ký tự" }
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Xác nhận mật khẩu mới"
            dependencies={['password']}
            rules={[
              { required: true, message: "Vui lòng xác nhận mật khẩu mới" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Xác nhận mật khẩu mới" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsPasswordModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={resetPasswordMutation.isPending}>
                Cập nhật mật khẩu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
