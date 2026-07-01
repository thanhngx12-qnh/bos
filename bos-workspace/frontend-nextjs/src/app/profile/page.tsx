// File: src/app/profile/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Space,
  Button,
  Badge,
  Typography,
  theme,
  App as AntdApp,
  Dropdown,
} from "antd";

import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  FormOutlined,
  SettingOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";
import ProfileManager from "@/components/ProfileManager";
import AppShell, { useAppAuth } from "@/components/AppShell";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

function ProfileContent() {
  return (
    <div className="bos-page-content">
      <Space direction="vertical" size="large" className="w-full">
              <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                <Breadcrumb items={[{ title: "Trang chủ" }, { title: "Thông tin cá nhân" }]} />
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  Thông tin cá nhân
                </Title>
                <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                  Xem chi tiết tài khoản nhân sự và cấu hình các mẫu chữ ký, con dấu xác thực điện tử của riêng bạn.
                </Paragraph>
              </div>

              <ProfileManager />
      </Space>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileContent />
    </AppShell>
  );
}
