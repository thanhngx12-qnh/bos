// File: src/app/settings/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Space,
  Card,
  Button,
  Badge,
  Typography,
  Spin,
  Form,
  Input,
  Popconfirm,
  Tabs,
  Table,
  Select,
  TreeSelect,
  Checkbox,
  theme,
  App,
  Col,
  Row,
  Modal,
  Dropdown,
  Tag,
  Tooltip,
  Result,
} from "antd";

import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
  FormOutlined,
  SettingOutlined,
  SearchOutlined,
  ReloadOutlined,
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  BranchesOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import BusinessCalendarManager from "./components/BusinessCalendarManager";
import { useDepartmentTree, DepartmentNode } from "@/hooks/useDepartments";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  Role,
} from "@/hooks/useRoles";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  User,
} from "@/hooks/useUsers";
import {
  useTenantDetail,
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  TenantDetail,
} from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function SystemSettingsPage() {
  const router = useRouter();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { modal, message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bos_token");
      if (!token) {
        router.push("/auth/login");
        return;
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const tenantQuery = useTenantDetail(tenantId);
  const activeTenantName = tenantId === null
    ? "Quản trị Hệ thống (Super Admin)"
    : tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : "Đang tải thông tin doanh nghiệp...";

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
      onError: (err: any) => {
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

  const handleLogout = () => {
    localStorage.removeItem("bos_token");
    localStorage.removeItem("bos_tenant_id");
    localStorage.removeItem("bos_user_name");
    localStorage.removeItem("bos_user_permissions");
    localStorage.removeItem("bos_user_type");
    router.push("/auth/login");
  };

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

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "settings") router.push("/settings");
  };

  const [activeTab, setActiveTab] = useState("users_list");

  // Load hooks
  const deptQuery = useDepartmentTree();
  const roleQuery = useRoles();
  const userQuery = useUsers(1, 100);
  const tenantListQuery = useTenants(1, 100);

  // Mutations
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionMatrixOpen, setIsPermissionMatrixOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, string[]>>({});

  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isTenantEditOpen, setIsTenantEditOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);

  // Forms
  const [userForm] = Form.useForm();
  const [userEditForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [tenantForm] = Form.useForm();
  const [tenantEditForm] = Form.useForm();

  // Search & Filter state for Users
  const [userSearchText, setUserSearchText] = useState("");
  const [selectedFilterDept, setSelectedFilterDept] = useState<number | undefined>(undefined);
  const [selectedFilterRole, setSelectedFilterRole] = useState<number | undefined>(undefined);

  // Search state for Tenants
  const [tenantSearchText, setTenantSearchText] = useState("");

  // Map departments to TreeSelect structure
  const mapDeptToTreeSelect = (nodes: DepartmentNode[]): any[] => {
    return nodes.map((node) => ({
      value: node.id,
      title: node.name,
      children: node.children ? mapDeptToTreeSelect(node.children) : [],
    }));
  };

  // User Actions
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userEditForm.setFieldsValue({
      fullName: user.fullName,
      email: user.email,
      departmentId: user.departmentId,
      roleId: user.roleId,
      status: user.status,
      tenantId: user.tenantId,
    });
    setIsUserEditOpen(true);
  };

  // Role Matrix Actions
  const modulesList = [
    "users",
    "departments",
    "roles",
    "entities",
    "workflows",
    "records",
    "print_templates",
    "tenants",
  ];
  const actionsList = ["CREATE", "READ", "UPDATE", "DELETE"];

  const getModuleLabel = (mod: string) => {
    switch (mod) {
      case "users":
        return "Tài khoản (Users)";
      case "departments":
        return "Phòng ban (Departments)";
      case "roles":
        return "Vai trò (Roles)";
      case "entities":
        return "Biểu mẫu (Entities)";
      case "workflows":
        return "Quy trình (Workflows)";
      case "print_templates":
        return "Mẫu in (Print Templates)";
      case "records":
        return "Hồ sơ & Biểu mẫu (Records)";
      case "tenants":
        return "Doanh nghiệp (Tenants)";
      default:
        return mod;
    }
  };

  const handleOpenPermissionMatrix = (role: Role) => {
    setSelectedRole(role);
    setPermissionsMatrix(role.permissions || {});
    setIsPermissionMatrixOpen(true);
  };

  const togglePermissionCheckbox = (module: string, action: string, checked: boolean) => {
    const updated = { ...permissionsMatrix };
    const moduleActions = updated[module] || [];
    if (checked) {
      updated[module] = [...moduleActions, action];
    } else {
      updated[module] = moduleActions.filter((a) => a !== action);
    }
    setPermissionsMatrix(updated);
  };

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    updateRole.mutate(
      {
        id: selectedRole.id,
        payload: { permissions: permissionsMatrix },
      },
      {
        onSuccess: () => {
          message.success(`Cập nhật phân quyền cho Vai trò "${selectedRole.name}" thành công!`);
          setIsPermissionMatrixOpen(false);
        },
      }
    );
  };

  // Tenant Actions
  const handleEditTenant = (tenant: TenantDetail) => {
    setSelectedTenant(tenant);
    tenantEditForm.setFieldsValue({ name: tenant.name });
    setIsTenantEditOpen(true);
  };

  // Filtered Users List
  const filteredUsers = (userQuery.data?.data || []).filter((user) => {
    const matchSearch =
      user.fullName.toLowerCase().includes(userSearchText.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchText.toLowerCase());
    const matchDept = selectedFilterDept === undefined || user.departmentId === selectedFilterDept;
    const matchRole = selectedFilterRole === undefined || user.roleId === selectedFilterRole;
    return matchSearch && matchDept && matchRole;
  });

  // Filtered Tenants List
  const filteredTenants = (tenantListQuery.data?.data || []).filter((tenant) => {
    return (
      tenant.name.toLowerCase().includes(tenantSearchText.toLowerCase()) ||
      tenant.code.toLowerCase().includes(tenantSearchText.toLowerCase())
    );
  });

  // Flat department map for quickly showing name in table
  const deptMap: Record<number, string> = {};
  const buildDeptMap = (nodes: DepartmentNode[]) => {
    nodes.forEach((n) => {
      deptMap[n.id] = n.name;
      if (n.children) buildDeptMap(n.children);
    });
  };
  if (deptQuery.data) {
    buildDeptMap(deptQuery.data);
  }

  // Flat role map
  const roleMap: Record<number, string> = {};
  (roleQuery.data?.data || []).forEach((r) => {
    roleMap[r.id] = r.name;
  });


  if (permissionsLoaded && !isSuperAdmin && !userPermissions.users?.includes("READ") && !userPermissions.roles?.includes("READ")) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập trang Cài đặt Hệ thống."
          extra={<Button type="primary" onClick={() => router.push("/")}>Quay lại Trang chủ</Button>}
        />
      </div>
    );
  }

  const sidebarItems = [
    { key: "dashboard", icon: <DashboardOutlined />, label: "Bảng tổng quan" },
  ];

  if (isSuperAdmin || userPermissions.departments?.includes("READ")) {
    sidebarItems.push({ key: "organization", icon: <PartitionOutlined />, label: "Cơ cấu Tổ chức" });
  }
  if (isSuperAdmin || userPermissions.entities?.includes("READ")) {
    sidebarItems.push({ key: "metadata", icon: <BuildOutlined />, label: "Biểu mẫu Động" });
  }
  if (isSuperAdmin || userPermissions.workflows?.includes("READ")) {
    sidebarItems.push({ key: "workflow", icon: <DeploymentUnitOutlined />, label: "Luồng Quy trình" });
  }
  if (isSuperAdmin || userPermissions.records?.includes("READ")) {
    sidebarItems.push({ key: "records", icon: <FormOutlined />, label: "Hồ sơ & Biểu mẫu" });
  }
  if (isSuperAdmin || userPermissions.users?.includes("READ") || userPermissions.roles?.includes("READ")) {
    sidebarItems.push({ key: "settings", icon: <SettingOutlined />, label: "Cài đặt Hệ thống" });
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{ borderRight: "1px solid #f0f0f0" }}
      >
        <div
          className="flex items-center justify-center py-4 border-b border-gray-100"
          style={{ minHeight: "64px" }}
        >
          <Title level={4} style={{ margin: 0, color: "#0050b3" }}>
            {collapsed ? "BOS" : "BOS Platform"}
          </Title>
        </div>
        <Menu
          theme="light"
          selectedKeys={["settings"]}
          mode="inline"
          onClick={handleMenuClick}
          items={sidebarItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Dropdown menu={tenantMenu} trigger={['click']} placement="bottomLeft">
            <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading || switchTenantMutation.isPending}>
              <Text strong>{activeTenantName}</Text>
            </Button>
          </Dropdown>
          <Space size="large">
            <Badge count={3} dot>
              <Button type="text" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#0050b3" }} />
                <Text strong className="hidden md:block">
                  {userName}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: "24px" }}>
          <Space direction="vertical" size="large" className="w-full">
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <Breadcrumb items={[{ title: "Trang chủ" }, { title: "Cài đặt Hệ thống" }]} />
              <Title level={2} style={{ margin: "8px 0 0 0" }}>
                Cài đặt Hệ thống
              </Title>
              <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                Quản lý thành viên, nhóm vai trò phân quyền hệ thống và quản trị các phân nhánh doanh nghiệp (SaaS Tenants).
              </Paragraph>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="line"
              size="large"
              items={[
                // TAB 1: THÀNH VIÊN
                {
                  key: "users_list",
                  label: (
                    <span>
                      <UsergroupAddOutlined /> Quản lý Thành viên
                    </span>
                  ),
                  children: (
                    <Card
                      title={
                        <Row gutter={16} align="middle" style={{ width: "100%", padding: "8px 0" }}>
                          <Col xs={24} md={6}>
                            <Title level={4} style={{ margin: 0 }}>Danh sách Thành viên</Title>
                          </Col>
                          <Col xs={24} md={18} style={{ display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" }}>
                            <Input
                              placeholder="Tìm kiếm theo Tên hoặc Email..."
                              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                              value={userSearchText}
                              onChange={(e) => setUserSearchText(e.target.value)}
                              style={{ width: 220 }}
                              allowClear
                            />
                            <TreeSelect
                              placeholder="Lọc Phòng ban"
                              style={{ width: 180 }}
                              treeData={mapDeptToTreeSelect(deptQuery.data || [])}
                              value={selectedFilterDept}
                              onChange={setSelectedFilterDept}
                              allowClear
                              treeDefaultExpandAll
                            />
                            <Select
                              placeholder="Lọc Vai trò"
                              style={{ width: 150 }}
                              value={selectedFilterRole}
                              onChange={setSelectedFilterRole}
                              allowClear
                              options={(roleQuery.data?.data || []).map((r) => ({
                                value: r.id,
                                label: r.name,
                              }))}
                            />
                            <Button
                              type="text"
                              icon={<ReloadOutlined />}
                              onClick={() => {
                                userQuery.refetch();
                                deptQuery.refetch();
                                roleQuery.refetch();
                              }}
                            />
                          </Col>
                        </Row>
                      }
                      extra={
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            userForm.resetFields();
                            setIsUserModalOpen(true);
                          }}
                        >
                          Tạo Thành viên
                        </Button>
                      }
                    >
                      <Table
                        dataSource={filteredUsers}
                        rowKey="id"
                        loading={userQuery.isLoading}
                        pagination={{ pageSize: 10 }}
                        columns={[
                          {
                            title: "Họ tên",
                            dataIndex: "fullName",
                            key: "fullName",
                            render: (text) => <Text strong>{text}</Text>,
                          },
                          { title: "Email", dataIndex: "email", key: "email" },
                          {
                            title: "Phòng ban",
                            dataIndex: "departmentId",
                            key: "departmentId",
                            render: (deptId) =>
                              deptId ? (
                                <Tag color="blue">{deptMap[deptId] || `Phòng ban #${deptId}`}</Tag>
                              ) : (
                                <Tag color="default">Chưa gán</Tag>
                              ),
                          },
                          {
                            title: "Vai trò",
                            dataIndex: "roleId",
                            key: "roleId",
                            render: (roleId) =>
                              roleId ? (
                                <Tag color="purple">{roleMap[roleId] || `Vai trò #${roleId}`}</Tag>
                              ) : (
                                <Tag color="default">Chưa gán</Tag>
                              ),
                          },
                          {
                            title: "Trạng thái",
                            dataIndex: "status",
                            key: "status",
                            render: (status, record) => (
                              <Tooltip title="Nhấn để đổi trạng thái nhanh">
                                <Tag
                                  color={status === "ACTIVE" ? "success" : "error"}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                                    updateUser.mutate({
                                      id: record.id,
                                      payload: { status: nextStatus },
                                    }, {
                                      onSuccess: () => message.success("Đã cập nhật trạng thái thành công!")
                                    });
                                  }}
                                >
                                  {status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "ĐANG KHÓA"}
                                </Tag>
                              </Tooltip>
                            ),
                          },
                          {
                            title: "Hành động",
                            key: "actions",
                            align: "center",
                            render: (_, user) => (
                              <Space size="middle">
                                <Button
                                  type="link"
                                  icon={<EditOutlined />}
                                  onClick={() => handleEditUser(user)}
                                >
                                  Sửa
                                </Button>
                                <Popconfirm
                                  title="Xóa tài khoản này?"
                                  onConfirm={() =>
                                    deleteUser.mutate(user.id, {
                                      onSuccess: () =>
                                        message.success("Xóa tài khoản thành công!"),
                                    })
                                  }
                                >
                                  <Button type="link" danger icon={<DeleteOutlined />}>
                                    Xóa
                                  </Button>
                                </Popconfirm>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  ),
                },
                // TAB 2: VAI TRÒ
                {
                  key: "roles_permissions",
                  label: (
                    <span>
                      <SafetyCertificateOutlined /> Vai trò & Phân quyền
                    </span>
                  ),
                  children: (
                    <Card
                      title="Nhóm Vai trò RBAC (Quyền hạn hệ thống)"
                      extra={
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            roleForm.resetFields();
                            setIsRoleModalOpen(true);
                          }}
                        >
                          Tạo Vai trò mới
                        </Button>
                      }
                    >
                      <Table
                        dataSource={roleQuery.data?.data || []}
                        rowKey="id"
                        loading={roleQuery.isLoading}
                        columns={[
                          {
                            title: "ID",
                            dataIndex: "id",
                            key: "id",
                            width: 80,
                          },
                          {
                            title: "Tên Vai Trò",
                            dataIndex: "name",
                            key: "name",
                            render: (name) => (
                              <Text strong style={{ color: "#0050b3" }}>
                                {name}
                              </Text>
                            ),
                          },
                          {
                            title: "Số Phân Hệ Được Gán Quyền",
                            dataIndex: "permissions",
                            key: "permissions",
                            render: (perm) => (
                              <Tag color="cyan">
                                {Object.keys(perm || {}).filter(k => (perm[k] || []).length > 0).length} Phân hệ
                              </Tag>
                            ),
                          },
                          {
                            title: "Chi tiết Quyền hạn",
                            dataIndex: "permissions",
                            key: "details",
                            render: (perm) => {
                              const keys = Object.keys(perm || {}).filter(k => (perm[k] || []).length > 0);
                              if (keys.length === 0) return <Text type="secondary">Chưa cấu hình quyền</Text>;
                              return (
                                <Space size={[0, 4]} wrap>
                                  {keys.map((k) => (
                                    <span key={k} style={{ marginRight: 6 }}>
                                      <Text code>{getModuleLabel(k)}</Text>:
                                      <Text type="success" style={{ fontSize: "11px", marginLeft: 2 }}>
                                        ({perm[k].join(",")})
                                      </Text>
                                    </span>
                                  ))}
                                </Space>
                              );
                            }
                          },
                          {
                            title: "Hành động",
                            key: "actions",
                            align: "center",
                            render: (_, role) => (
                              <Space size="middle">
                                <Button
                                  type="primary"
                                  ghost
                                  icon={<SafetyCertificateOutlined />}
                                  onClick={() => handleOpenPermissionMatrix(role)}
                                >
                                  Cấu hình Ma trận Quyền
                                </Button>
                                <Popconfirm
                                  title="Xóa vai trò này?"
                                  onConfirm={() =>
                                    deleteRole.mutate(role.id, {
                                      onSuccess: () => {
                                        message.success("Xóa vai trò thành công!");
                                      },
                                      onError: () => {
                                        modal.error({
                                          title: "Không thể xóa Vai trò",
                                          content: `Không thể xóa Vai trò "${role.name}" vì hiện tại đang có tài khoản nhân viên liên kết sử dụng vai trò này. Vui lòng chuyển toàn bộ nhân viên sang vai trò khác trước khi xóa.`,
                                          okText: "Đã hiểu",
                                        });
                                      },
                                    })
                                  }
                                >
                                  <Button type="link" danger icon={<DeleteOutlined />}>
                                    Xóa
                                  </Button>
                                </Popconfirm>
                              </Space>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  ),
                },
                // TAB 3: SAAS TENANTS (CHỈ CHO SUPER ADMIN - tenantId === null)
                ...(tenantId === null
                  ? [
                      {
                        key: "saas_tenants",
                        label: (
                          <span>
                            <GlobalOutlined /> Quản trị SaaS Tenants
                          </span>
                        ),
                        children: (
                          <Card
                            title={
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                <Input
                                  placeholder="Tìm kiếm Doanh nghiệp theo tên hoặc mã..."
                                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                                  value={tenantSearchText}
                                  onChange={(e) => setTenantSearchText(e.target.value)}
                                  style={{ width: 350 }}
                                  allowClear
                                />
                                <Button
                                  type="text"
                                  icon={<ReloadOutlined />}
                                  onClick={() => tenantListQuery.refetch()}
                                />
                              </div>
                            }
                            extra={
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  tenantForm.resetFields();
                                  setIsTenantModalOpen(true);
                                }}
                              >
                                Thêm Doanh nghiệp
                              </Button>
                            }
                          >
                            {tenantListQuery.isLoading ? (
                              <Spin style={{ display: "block", margin: "40px auto" }} />
                            ) : (
                              <Row gutter={[16, 16]}>
                                {filteredTenants.length === 0 ? (
                                  <Col span={24} style={{ textAlign: "center", padding: "40px 0" }}>
                                    <Text type="secondary">Không tìm thấy doanh nghiệp nào.</Text>
                                  </Col>
                                ) : (
                                  filteredTenants.map((t) => (
                                    <Col xs={24} sm={12} md={8} key={t.id}>
                                      <Card
                                        hoverable
                                        style={{ borderColor: "#f0f0f0", height: "100%" }}
                                        actions={[
                                          <Tooltip title="Đổi tên doanh nghiệp" key="edit">
                                            <EditOutlined onClick={() => handleEditTenant(t)} />
                                          </Tooltip>,
                                          <Popconfirm
                                            title="Xóa vĩnh viễn doanh nghiệp & toàn bộ dữ liệu đi kèm (Không thể phục hồi)?"
                                            onConfirm={() =>
                                              deleteTenant.mutate(t.id, {
                                                onSuccess: () => {
                                                  message.success("Xóa doanh nghiệp SaaS thành công!");
                                                },
                                              })
                                            }
                                            key="delete"
                                            okText="Xóa cứng"
                                            cancelText="Hủy"
                                          >
                                            <Tooltip title="Xóa vĩnh viễn dữ liệu (Cascade)">
                                              <DeleteOutlined style={{ color: "#ff4d4f" }} />
                                            </Tooltip>
                                          </Popconfirm>,
                                        ]}
                                      >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                                          <Avatar
                                            size={48}
                                            style={{ backgroundColor: "#e6f7ff", color: "#1890ff" }}
                                            icon={<BankOutlined />}
                                          />
                                          <div>
                                            <Title level={4} style={{ margin: 0 }}>{t.name}</Title>
                                            <Text code>{t.code}</Text>
                                          </div>
                                        </div>

                                        <div style={{ margin: "16px 0", fontSize: "13px" }}>
                                          <Row gutter={[8, 8]}>
                                            <Col span={12}>
                                              <Space>
                                                <TeamOutlined style={{ color: "#8c8c8c" }} />
                                                <Text type="secondary">Nhân sự:</Text>
                                                <Text strong>{t._count?.users ?? 0}</Text>
                                              </Space>
                                            </Col>
                                            <Col span={12}>
                                              <Space>
                                                <FileTextOutlined style={{ color: "#8c8c8c" }} />
                                                <Text type="secondary">Hồ sơ:</Text>
                                                <Text strong>{t._count?.records ?? 0}</Text>
                                              </Space>
                                            </Col>
                                            <Col span={12}>
                                              <Space>
                                                <BranchesOutlined style={{ color: "#8c8c8c" }} />
                                                <Text type="secondary">Quy trình:</Text>
                                                <Text strong>{t._count?.workflows ?? 0}</Text>
                                              </Space>
                                            </Col>
                                            <Col span={12}>
                                              <Space>
                                                <BuildOutlined style={{ color: "#8c8c8c" }} />
                                                <Text type="secondary">Biểu mẫu:</Text>
                                                <Text strong>{t._count?.entities ?? 0}</Text>
                                              </Space>
                                            </Col>
                                          </Row>
                                        </div>

                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f5f5f5", paddingTop: "12px" }}>
                                          <Tag color="success">ĐANG HOẠT ĐỘNG</Tag>
                                          <Text type="secondary" style={{ fontSize: "11px" }}>
                                            Tạo: {new Date(t.createdAt).toLocaleDateString("vi-VN")}
                                          </Text>
                                        </div>
                                      </Card>
                                    </Col>
                                  ))
                                )}
                              </Row>
                            )}
                          </Card>
                        ),
                      }
                    ]
                  : []),
                ...(tenantId !== null
                  ? [
                      {
                        key: "business_calendar",
                        label: (
                          <span>
                            <CalendarOutlined /> Lịch làm việc & SLA
                          </span>
                        ),
                        children: <BusinessCalendarManager />,
                      },
                    ]
                  : []),
              ]}
            />
          </Space>
        </Content>
      </Layout>


      <Modal
        title="Tạo Thành viên mới"
        open={isUserModalOpen}
        onCancel={() => setIsUserModalOpen(false)}
        onOk={() => userForm.submit()}
        confirmLoading={createUser.isPending}
        width={600}
      >
        <Form
          form={userForm}
          layout="vertical"
          initialValues={{ tenantId: tenantId || undefined }}
          onFinish={(vals) =>
            createUser.mutate(vals, {
              onSuccess: () => {
                message.success("Tạo thành viên thành công!");
                setIsUserModalOpen(false);
              },
            })
          }
        >
          <Row gutter={16}>
            {isSuperAdmin && (
              <Col span={24}>
                <Form.Item
                  name="tenantId"
                  label="Thuộc Doanh nghiệp"
                  rules={[{ required: true, message: "Vui lòng chọn Doanh nghiệp" }]}
                >
                  <Select
                    placeholder="Chọn doanh nghiệp"
                    options={(tenantListQuery.data?.data || []).map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.code})`,
                    }))}
                    showSearch
                    filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Họ tên thành viên"
                rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
              >
                <Input placeholder="Nguyễn Văn A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email làm việc"
                rules={[
                  {
                    required: true,
                    type: "email",
                    message: "Vui lòng nhập Email hợp lệ",
                  },
                ]}
              >
                <Input placeholder="username@company.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label="Mật khẩu"
                rules={[
                  {
                    required: true,
                    message: "Vui lòng nhập mật khẩu tối thiểu 6 ký tự",
                    min: 6,
                  },
                ]}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentId" label="Thuộc phòng ban">
                <TreeSelect
                  placeholder="Chọn phòng ban từ sơ đồ"
                  treeData={mapDeptToTreeSelect(deptQuery.data || [])}
                  allowClear
                  treeDefaultExpandAll
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roleId" label="Vai trò gán">
                <Select
                  placeholder="Chọn vai trò"
                  allowClear
                  options={(roleQuery.data?.data || []).map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Cập nhật thông tin thành viên"
        open={isUserEditOpen}
        onCancel={() => setIsUserEditOpen(false)}
        onOk={() => userEditForm.submit()}
        confirmLoading={updateUser.isPending}
        width={600}
      >
        <Form
          form={userEditForm}
          layout="vertical"
          onFinish={(vals) => {
            if (selectedUser)
              updateUser.mutate(
                { id: selectedUser.id, payload: vals },
                {
                  onSuccess: () => {
                    message.success("Cập nhật thành viên thành công!");
                    setIsUserEditOpen(false);
                  },
                }
              );
          }}
        >
          <Row gutter={16}>
            {isSuperAdmin && (
              <Col span={24}>
                <Form.Item
                  name="tenantId"
                  label="Thuộc Doanh nghiệp"
                  rules={[{ required: true, message: "Vui lòng chọn Doanh nghiệp" }]}
                >
                  <Select
                    placeholder="Chọn doanh nghiệp"
                    options={(tenantListQuery.data?.data || []).map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.code})`,
                    }))}
                    showSearch
                    filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Họ tên thành viên"
                rules={[{ required: true, message: "Họ tên không được để trống" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email làm việc"
                rules={[{ required: true, type: "email", message: "Nhập Email hợp lệ" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentId" label="Thuộc phòng ban">
                <TreeSelect
                  treeData={mapDeptToTreeSelect(deptQuery.data || [])}
                  allowClear
                  treeDefaultExpandAll
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="roleId" label="Vai trò gán">
                <Select
                  allowClear
                  options={(roleQuery.data?.data || []).map((r) => ({
                    value: r.id,
                    label: r.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="status" label="Trạng thái tài khoản">
                <Select
                  options={[
                    { value: "ACTIVE", label: "Hoạt động (ACTIVE)" },
                    { value: "INACTIVE", label: "Tạm khóa (INACTIVE)" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* --- CÁC MODAL VAI TRÒ --- */}
      <Modal
        title="Tạo Vai trò mới"
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        onOk={() => roleForm.submit()}
        confirmLoading={createRole.isPending}
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={(vals) =>
            createRole.mutate(
              { name: vals.name, permissions: {} },
              {
                onSuccess: () => {
                  message.success("Tạo vai trò thành công!");
                  setIsRoleModalOpen(false);
                },
              }
            )
          }
        >
          <Form.Item
            name="name"
            label="Tên Vai Trò Mới"
            rules={[
              {
                required: true,
                message: "Nhập tên vai trò ví dụ: Quản lý biểu mẫu...",
              },
            ]}
          >
            <Input placeholder="Ví dụ: Kế toán trưởng, Nhân sự..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MA TRẬN PHÂN QUYỀN */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#0050b3" }} />
            <Text strong>Thiết lập Ma trận Phân quyền cho: {selectedRole?.name}</Text>
          </Space>
        }
        open={isPermissionMatrixOpen}
        onCancel={() => setIsPermissionMatrixOpen(false)}
        onOk={handleSavePermissions}
        confirmLoading={updateRole.isPending}
        width={1000}
      >
        <div style={{ marginTop: "20px" }}>
          <Row gutter={24}>
            <Col span={15}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #f0f0f0",
                }}
              >
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                    <th style={{ padding: "12px", textAlign: "left" }}>Phân Hệ (Module)</th>
                    {actionsList.map((act) => (
                      <th key={act} style={{ padding: "12px", textAlign: "center" }}>{act}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modulesList.map((mod) => (
                    <tr key={mod} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "12px" }}>
                        <Text strong>{getModuleLabel(mod)}</Text>
                      </td>
                      {actionsList.map((act) => {
                        const isChecked = permissionsMatrix[mod]?.includes(act) || false;
                        return (
                          <td key={act} style={{ padding: "12px", textAlign: "center" }}>
                            <Checkbox
                              checked={isChecked}
                              onChange={(e) => togglePermissionCheckbox(mod, act, e.target.checked)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Col>

            <Col span={9}>
              <Card
                title={<Text type="secondary">Real-time JSON Compile</Text>}
                size="small"
                bodyStyle={{ padding: 0 }}
              >
                <pre
                  style={{
                    margin: 0,
                    padding: "16px",
                    maxHeight: "260px",
                    overflowY: "auto",
                    background: "#001529",
                    color: "#00ffcc",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    borderRadius: "0 0 8px 8px",
                  }}
                >
                  {JSON.stringify(permissionsMatrix, null, 2)}
                </pre>
              </Card>
            </Col>
          </Row>
        </div>
      </Modal>

      {/* --- CÁC MODAL DOANH NGHIỆP (TENANT) --- */}
      <Modal
        title="Tạo Doanh nghiệp mới"
        open={isTenantModalOpen}
        onCancel={() => setIsTenantModalOpen(false)}
        onOk={() => tenantForm.submit()}
        confirmLoading={createTenant.isPending}
      >
        <Form
          form={tenantForm}
          layout="vertical"
          onFinish={(vals) =>
            createTenant.mutate(vals, {
              onSuccess: () => {
                message.success("Tạo doanh nghiệp SaaS thành công!");
                setIsTenantModalOpen(false);
              },
            })
          }
        >
          <Form.Item
            name="name"
            label="Tên Doanh nghiệp"
            rules={[{ required: true, message: "Vui lòng nhập tên doanh nghiệp" }]}
          >
            <Input placeholder="Ví dụ: Công ty Cổ phần Vận tải BOS" />
          </Form.Item>
          <Form.Item
            name="code"
            label="Mã Doanh nghiệp (Snake Case)"
            rules={[
              { required: true, message: "Vui lòng nhập mã doanh nghiệp" },
              {
                pattern: /^[a-z0-9_]+$/,
                message: "Mã doanh nghiệp chỉ chứa chữ thường, số và gạch dưới (Ví dụ: vantai_bos)",
              },
            ]}
          >
            <Input placeholder="Ví dụ: vantai_bos" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đổi tên Doanh nghiệp"
        open={isTenantEditOpen}
        onCancel={() => setIsTenantEditOpen(false)}
        onOk={() => tenantEditForm.submit()}
        confirmLoading={updateTenant.isPending}
      >
        <Form
          form={tenantEditForm}
          layout="vertical"
          onFinish={(vals) => {
            if (selectedTenant)
              updateTenant.mutate(
                { id: selectedTenant.id, payload: vals },
                {
                  onSuccess: () => {
                    message.success("Cập nhật thông tin doanh nghiệp thành công!");
                    setIsTenantEditOpen(false);
                  },
                }
              );
          }}
        >
          <Form.Item
            name="name"
            label="Tên Doanh nghiệp mới"
            rules={[{ required: true, message: "Không được để trống tên doanh nghiệp" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
