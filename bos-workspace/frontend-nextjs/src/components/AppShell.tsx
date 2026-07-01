// File: src/components/AppShell.tsx
"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Popover,
  List,
  Divider,
  Space,
  Button,
  Badge,
  Typography,
  theme,
  App as AntdApp,
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
  SunOutlined,
  MoonOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";
import { useMyTasks } from "@/hooks/useTasks";
import dayjs from "dayjs";
import { api } from "@/lib/axios";
import {
  useNotificationsList,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useRealtimeNotifications,
} from "@/hooks/useNotifications";
import GlobalSearch from "@/components/GlobalSearch";
import { useTheme } from "@/providers/theme-provider";
import RecordDetailDrawer from "@/app/records/components/RecordDetailDrawer";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// =================== AUTH CONTEXT ===================
interface AuthState {
  tenantId: number | null;
  userName: string;
  isSuperAdmin: boolean;
  userPermissions: Record<string, string[]>;
  permissionsLoaded: boolean;
}

const AuthContext = createContext<AuthState>({
  tenantId: null,
  userName: "Thành viên BOS",
  isSuperAdmin: false,
  userPermissions: {},
  permissionsLoaded: false,
});

export function useAppAuth() {
  return useContext(AuthContext);
}

// =================== ROUTE-TO-KEY MAP ===================
const ROUTE_KEY_MAP: Record<string, string> = {
  "/": "dashboard",
  "/organization": "organization",
  "/metadata": "metadata",
  "/records": "records",
  "/settings": "settings",
  "/profile": "profile",
};

function getSelectedKey(pathname: string | null): string {
  if (!pathname) return "dashboard";
  // Check exact match first
  if (ROUTE_KEY_MAP[pathname]) return ROUTE_KEY_MAP[pathname];
  // Check prefix match (e.g., /metadata/1/fields -> metadata)
  for (const [route, key] of Object.entries(ROUTE_KEY_MAP)) {
    if (route !== "/" && pathname.startsWith(route)) return key;
  }
  return "dashboard";
}

// =================== APPSHELL PROPS ===================
interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { message } = AntdApp.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // ========== Auth State (dùng chung cho tất cả pages) ==========
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [globalRecordId, setGlobalRecordId] = useState<number | null>(null);

  // ========== Real-time Notifications & List ==========
  useRealtimeNotifications(userId, tenantId);

  const [notiPage, setNotiPage] = useState(1);
  const notiQuery = useNotificationsList(notiPage, 10, !!userId);
  const unreadCountQuery = useUnreadNotificationsCount(userId);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadCount = unreadCountQuery.data?.count || 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bos_token");
      if (!token) {
        router.push("/auth/login");
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload && payload.sub) {
          setUserId(Number(payload.sub));
        }
      } catch (e) {
        console.error("Error decoding token in AppShell", e);
      }
      const storedTenantId = localStorage.getItem("bos_tenant_id");
      const storedUserName = localStorage.getItem("bos_user_name");
      const storedUserType = localStorage.getItem("bos_user_type");
      setIsSuperAdmin(storedUserType === "SUPER_ADMIN");

      if (storedTenantId) {
        setTenantId(Number(storedTenantId));
      }
      if (storedUserName) {
        setUserName(storedUserName);
      }
      const storedPermissions = localStorage.getItem("bos_user_permissions");
      if (storedPermissions) {
        try {
          setUserPermissions(JSON.parse(storedPermissions));
        } catch (e) {
          console.error(e);
        }
      }
      setPermissionsLoaded(true);
    }
  }, [router]);

  // ========== Tenant Switcher ==========
  const tenantQuery = useTenantDetail(tenantId);
  const activeTenantName = tenantId === null
    ? "Quản trị Hệ thống (Super Admin)"
    : tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : "Đang tải...";

  const { data: myTenants = [] } = useMyTenants();
  const switchTenantMutation = useSwitchTenant();

  const handleSwitchTenant = (targetTenantId: number | null) => {
    switchTenantMutation.mutate({ tenantId: targetTenantId as any }, {
      onSuccess: (res) => {
        message.success("Chuyển doanh nghiệp thành công!");
        localStorage.setItem("bos_token", res.accessToken);
        localStorage.setItem("bos_user_name", res.user.fullName);
        localStorage.setItem("bos_user_permissions", JSON.stringify((res.user as any).role?.permissions || {}));
        localStorage.setItem("bos_user_type", (res.user as any).userType);
        if (res.user.tenantId === null || res.user.tenantId === undefined) {
          localStorage.removeItem("bos_tenant_id");
        } else {
          localStorage.setItem("bos_tenant_id", String(res.user.tenantId));
        }
        window.location.reload();
      },
      onError: () => {
        message.error("Không thể chuyển đổi doanh nghiệp.");
      }
    });
  };

  const tenantMenu = {
    items: [
      ...(isSuperAdmin ? [{
        key: "root",
        label: "Quản trị Hệ thống (Super Admin)",
        icon: <SettingOutlined />,
        disabled: tenantId === null,
      }] : []),
      ...myTenants.map((t) => ({
        key: String(t.id),
        label: t.name,
        icon: <BankOutlined />,
        disabled: t.id === tenantId,
      }))
    ],
    onClick: (info: any) => {
      if (info.key === "root") {
        handleSwitchTenant(null);
      } else {
        handleSwitchTenant(Number(info.key));
      }
    }
  };

  // ========== Theme Token ==========
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // ========== Logout ==========
  const handleLogout = () => {
    localStorage.removeItem("bos_token");
    localStorage.removeItem("bos_tenant_id");
    localStorage.removeItem("bos_user_name");
    localStorage.removeItem("bos_user_permissions");
    localStorage.removeItem("bos_user_type");
    router.push("/auth/login");
  };

  // ========== User Menu ==========
  const userMenu = {
    items: [
      { key: "profile", label: "Thông tin cá nhân" },
      { key: "security", label: "Thiết lập bảo mật" },
      { type: "divider" as const },
      { key: "logout", label: "Đăng xuất hệ thống", danger: true },
    ],
    onClick: (info: any) => {
      if (info.key === "logout") {
        handleLogout();
      } else if (info.key === "profile") {
        router.push("/profile");
      }
    },
  };

  // ========== Menu Click (Sidebar Navigation) ==========
  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "settings") router.push("/settings");
  };

  // ========== Fetch Pending Tasks Count for Badge ==========
  const { data: pendingTasksData } = useMyTasks("PENDING", 1, 1);
  const pendingCount = pendingTasksData?.total || 0;

  // ========== Sidebar Items (with Permissions) ==========
  const sidebarItems: any[] = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span>Bảng tổng quan</span>
          {pendingCount > 0 && (
            <Badge
              count={pendingCount}
              style={{
                backgroundColor: "#ff4d4f",
                boxShadow: "none",
              }}
              size="small"
            />
          )}
        </span>
      ),
    },
  ];

  if (isSuperAdmin || userPermissions.departments?.includes("READ")) {
    sidebarItems.push({ key: "organization", icon: <PartitionOutlined />, label: "Cơ cấu Tổ chức" });
  }
  if (isSuperAdmin || userPermissions.entities?.includes("READ")) {
    sidebarItems.push({ key: "metadata", icon: <BuildOutlined />, label: "Thiết kế biểu mẫu & luồng" });
  }
  if (isSuperAdmin || userPermissions.records?.includes("READ")) {
    sidebarItems.push({
      key: "records",
      icon: <FormOutlined />,
      label: (
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span>Hồ sơ & Biểu mẫu</span>
          {pendingCount > 0 && (
            <Badge
              count={pendingCount}
              style={{
                backgroundColor: "#ff4d4f",
                boxShadow: "none",
              }}
              size="small"
            />
          )}
        </span>
      ),
    });
  }
  if (isSuperAdmin || userPermissions.users?.includes("READ") || userPermissions.roles?.includes("READ")) {
    sidebarItems.push({ key: "settings", icon: <SettingOutlined />, label: "Cài đặt Hệ thống" });
  }

  // ========== Selected Key from pathname ==========
  const selectedKey = getSelectedKey(pathname);

  // Nội dung popover danh sách thông báo
  const notificationContent = (
    <div style={{ width: 320 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8 }}>
        <Text strong style={{ fontSize: 15 }}>Thông báo</Text>
        {unreadCount > 0 && (
          <Button 
            type="link" 
            size="small" 
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
            style={{ padding: 0, fontSize: 12 }}
          >
            Đọc tất cả
          </Button>
        )}
      </div>
      <Divider style={{ margin: "4px 0 8px 0" }} />
      
      {notiQuery.isLoading ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#8c8c8c" }}>Đang tải...</div>
      ) : !notiQuery.data?.data || notiQuery.data.data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "16px 0", color: "#bfbfbf" }}>Không có thông báo nào</div>
      ) : (
        <>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <List
              size="small"
              dataSource={notiQuery.data.data}
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "8px 12px",
                    borderRadius: 4,
                    backgroundColor: item.isRead ? "transparent" : "#e6f7ff",
                    borderBottom: "1px solid #f0f0f0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    if (!item.isRead) {
                      markReadMutation.mutate(item.id);
                    }
                    
                    // Trích xuất ID dạng #123
                    const idMatch = item.message.match(/#(\d+)/);
                    if (idMatch && idMatch[1]) {
                      const recordId = Number(idMatch[1]);
                      setGlobalRecordId(recordId);
                      return;
                    }

                    // Trích xuất mã dạng PA1-2026-0001 hoặc QM-XNKM-0001
                    const codeMatch = item.message.match(/([A-Z0-9_]+-\d{4}-\d+|QM-[A-Z0-9_-]+)/i);
                    if (codeMatch && codeMatch[0]) {
                      const code = codeMatch[0];
                      try {
                        const { data } = await api.get(`/api/v1/search?q=${encodeURIComponent(code)}&limit=1`);
                        if (data && data.length > 0) {
                          const matchResult = data[0];
                          setGlobalRecordId(matchResult.recordId);
                        } else {
                          router.push("/records");
                        }
                      } catch (err) {
                        router.push("/records");
                      }
                    } else {
                      router.push("/records");
                    }
                  }}
                >
                  <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                    <Text strong={!item.isRead} style={{ fontSize: 13, paddingRight: 20 }}>
                      {item.title}
                    </Text>
                    {!item.isRead && (
                      <span 
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: "#1890ff",
                          borderRadius: "50%",
                          flexShrink: 0
                        }} 
                      />
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    {item.message}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#8c8c8c" }}>
                    {dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")}
                  </Text>
                </List.Item>
              )}
            />
          </div>
          {notiQuery.data.total > notiQuery.data.data.length && (
            <div style={{ textAlign: "center", paddingTop: 8 }}>
              <Button type="link" size="small" onClick={() => setNotiPage((prev) => prev + 1)}>
                Xem thêm
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ========== Auth Context Value ==========
  const authValue: AuthState = {
    tenantId,
    userName,
    isSuperAdmin,
    userPermissions,
    permissionsLoaded,
  };

  return (
    <AuthContext.Provider value={authValue}>
      <Layout style={{ minHeight: "100vh" }}>
        {/* =================== SIDER =================== */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
          width={240}
          className="app-sider"
          style={{ borderRight: "1px solid #f0f0f0" }}
        >
          <div className="app-sider-logo">
            <Title level={4} style={{ margin: 0, color: "#0050b3" }}>
              {collapsed ? "BOS" : "BOS Platform"}
            </Title>
          </div>
          <Menu
            theme="light"
            selectedKeys={[selectedKey]}
            mode="inline"
            onClick={handleMenuClick}
            items={sidebarItems}
          />
        </Sider>

        {/* =================== MAIN LAYOUT =================== */}
        <Layout>
          {/* =================== HEADER =================== */}
          <Header
            className="app-header"
            style={{
              background: colorBgContainer,
            }}
          >
            <Space size="middle">
              <Dropdown menu={tenantMenu} trigger={['click']} placement="bottomLeft">
                <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading || switchTenantMutation.isPending}>
                  <Text strong>{activeTenantName}</Text>
                </Button>
              </Dropdown>
            </Space>

            <GlobalSearch />

            {/* Công cụ góc phải */}
            <Space size="large">
              <Button
                type="text"
                shape="circle"
                icon={isDarkMode ? <SunOutlined style={{ color: "#eab308" }} /> : <MoonOutlined />}
                onClick={toggleTheme}
              />
              <Popover
                content={notificationContent}
                trigger="click"
                placement="bottomRight"
                overlayClassName="notification-popover"
              >
                <Badge count={unreadCount} overflowCount={99}>
                  <Button type="text" shape="circle" icon={<BellOutlined />} />
                </Badge>
              </Popover>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#0050b3" }} />
                  <Text strong className="app-header-username">{userName}</Text>
                </Space>
              </Dropdown>
            </Space>
          </Header>

          {/* =================== CONTENT =================== */}
          <Content style={{ margin: "24px", overflow: "initial" }}>
            {children}
          </Content>
        </Layout>
      </Layout>

      {globalRecordId && (
        <RecordDetailDrawer
          open={!!globalRecordId}
          recordId={globalRecordId}
          onClose={() => setGlobalRecordId(null)}
        />
      )}
    </AuthContext.Provider>
  );
}
