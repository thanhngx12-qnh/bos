// File: src/components/ProfileManager.tsx
"use client";

import React from "react";
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
} from "antd";
import {
  UserOutlined,
  BankOutlined,
  TeamOutlined,
  KeyOutlined,
  MailOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useMyProfile } from "@/hooks/useAuth";
import SignatureManager from "./SignatureManager";
import DelegationManager from "./DelegationManager";

const { Title, Text, Paragraph } = Typography;

export default function ProfileManager() {
  const { data: profile, isLoading } = useMyProfile();

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
              <Paragraph type="secondary" style={{ fontSize: "14px", marginTop: "4px", marginBottom: 0 }}>
                Xem thông tin hồ sơ cá nhân và quản lý các mẫu chữ ký, con dấu xác thực số của bạn.
              </Paragraph>
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
    </Space>
  );
}
