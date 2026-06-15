// File: src/app/(dashboard)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Layout,
  Menu,
  Button,
  Space,
  Avatar,
  Dropdown,
  Spin,
  Typography,
} from "antd";
import {
  DashboardOutlined,
  SettingOutlined,
  DeploymentUnitOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  DatabaseOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useEntities } from "@/hooks/useEntities";

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");

  const router = useRouter();
  const pathname = usePathname();
  const { data: entities, isLoading: isLoadingEntities } = useEntities();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedTenantId = localStorage.getItem("tenant_id");

    if (!token) {
      router.replace("/login");
    } else {
      setIsAuthenticated(true);
      setTenantId(savedTenantId || "Global");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenant_id");
    router.push("/login");
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f5f5f5",
        }}
      >
        <Space orientation="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Đang bảo mật kết nối...</Text>
        </Space>
      </div>
    );
  }

  // Phòng vệ cực hạn: Đảm bảo dữ liệu luôn là mảng thực sự
  const entityList = Array.isArray(entities)
    ? entities
    : (entities as any)?.data && Array.isArray((entities as any).data)
      ? (entities as any).data
      : (entities as any)?.items && Array.isArray((entities as any).items)
        ? (entities as any).items
        : [];

  // Chuyển đổi danh sách thực thể động từ API thành các Menu Items
  const entityMenuItems = entityList
    .map((entity: any) => {
      if (!entity) return null;
      return {
        key: `/entities/${entity.code || entity.id}`,
        icon: <DatabaseOutlined />,
        label:
          entity.name ||
          entity.displayName ||
          entity.code ||
          "Thực thể không tên",
      };
    })
    .filter(Boolean); // Loại bỏ các phần tử lỗi nếu có

  // Menu hệ thống tĩnh
  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: "Bảng điều khiển",
    },
    {
      key: "/metadata",
      icon: <SettingOutlined />,
      label: "Kiến tạo Metadata",
    },
    {
      key: "/workflows",
      icon: <DeploymentUnitOutlined />,
      label: "Quy trình (Workflow)",
    },
    {
      type: "group" as const,
      label: "Thực thể Dữ liệu",
      children: isLoadingEntities
        ? [{ key: "loading", label: "Đang tải thực thể...", disabled: true }]
        : entityMenuItems.length > 0
          ? entityMenuItems
          : [{ key: "no-entity", label: "Chưa có thực thể", disabled: true }],
    },
    {
      type: "divider" as const,
    },
    {
      key: "/audit-logs",
      icon: <AuditOutlined />,
      label: "Nhật ký hệ thống",
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
        width={260}
      >
        <div
          style={{
            height: "64px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid #1f1f1f",
            overflow: "hidden",
          }}
        >
          <Title
            level={4}
            style={{ color: "#fff", margin: 0, whiteSpace: "nowrap" }}
          >
            {collapsed ? "BOS" : `BOS - ${tenantId.toUpperCase()}`}
          </Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          onClick={({ key }) => router.push(key)}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,.08)",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "16px", width: 64, height: 64 }}
          />
          <Space size="large">
            <Text type="secondary" style={{ fontSize: "13px" }}>
              Tenant ID:{" "}
              <strong style={{ color: "#1677ff" }}>{tenantId}</strong>
            </Text>
            {/* Tối ưu hóa Dropdown để tránh giải cấu trúc thừa gây lỗi */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: "logout",
                    icon: <LogoutOutlined />,
                    label: "Đăng xuất tài khoản",
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} />
                <Text strong>Administrator</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px",
            padding: "24px",
            background: "#fff",
            borderRadius: "8px",
            minHeight: "280px",
            overflowY: "auto",
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
