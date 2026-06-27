"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Dropdown,
  Space,
  Button,
  Badge,
  Spin,
  Typography,
  Row,
  Col,
  theme,
  Table,
  Tag,
  Input,
  Select,
  Empty,
  Tooltip,
  Card,
  Statistic,
  App as AntdApp,
  message,
  Result,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  FormOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FilterOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";
import { BankOutlined } from "@ant-design/icons";
import { useEntities, Entity } from "@/hooks/useEntities";
import { useRecords, RecordData } from "@/hooks/useRecords";
import { useFields } from "@/hooks/useFields";
import { useMyTasks } from "@/hooks/useTasks";
import RecordSubmitModal from "./components/RecordSubmitModal";
import RecordDetailDrawer from "./components/RecordDetailDrawer";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Nháp", color: "default", icon: <FileTextOutlined /> },
  IN_PROGRESS: { label: "Đang xử lý", color: "processing", icon: <SyncOutlined spin /> },
  APPROVED: { label: "Đã duyệt", color: "success", icon: <CheckCircleOutlined /> },
  COMPLETED: { label: "Đã duyệt", color: "success", icon: <CheckCircleOutlined /> },
  REJECTED: { label: "Từ chối", color: "error", icon: <CloseCircleOutlined /> },
  PENDING: { label: "Chờ duyệt", color: "warning", icon: <ClockCircleOutlined /> },
};

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collapsed, setCollapsed] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bos_token");
      if (!token) { router.push("/auth/login"); return; }
      const storedTenantId = localStorage.getItem("bos_tenant_id");
      const storedUserName = localStorage.getItem("bos_user_name");
      const storedUserType = localStorage.getItem("bos_user_type");
      setIsSuperAdmin(storedUserType === "SUPER_ADMIN");

      if (storedTenantId) setTenantId(Number(storedTenantId));
      if (storedUserName) setUserName(storedUserName);
      const storedPermissions = localStorage.getItem("bos_user_permissions");
      if (storedPermissions) {
        try {
          setUserPermissions(JSON.parse(storedPermissions));
        } catch (e) {
          console.error(e);
        }
      }
      permissionsQueryClientCheck();
    }
  }, [router]);

  const permissionsQueryClientCheck = () => {
    setPermissionsLoaded(true);
  };

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

  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

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

  // State quản lý entity được chọn
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // States cho sắp xếp động và bộ lọc nâng cao theo từng trường
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [customFilters, setCustomFilters] = useState<Record<string, any>>({});
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Modal/Drawer state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RecordData | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordData | null>(null);

  // Lấy entityId từ URL param nếu có
  useEffect(() => {
    const eid = searchParams.get("entityId");
    if (eid) setSelectedEntityId(Number(eid));
  }, [searchParams]);

  // Data
  const { data: entitiesData, isLoading: isEntitiesLoading } = useEntities(1, 100);
  const entities = entitiesData?.data || [];

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedEntityId) || null,
    [entities, selectedEntityId]
  );

  // Tải các trường động của biểu mẫu đang chọn
  const { data: fields = [] } = useFields(selectedEntityId);

  // Gộp bộ lọc trạng thái và các bộ lọc động theo các trường custom
  const filtersStr = useMemo(() => {
    const activeFilters = { ...customFilters };
    if (statusFilter) {
      activeFilters.status = statusFilter;
    }
    return Object.keys(activeFilters).length > 0 ? JSON.stringify(activeFilters) : "";
  }, [customFilters, statusFilter]);

  const {
    data: recordsData,
    isLoading: isRecordsLoading,
    refetch: refetchRecords,
  } = useRecords(selectedEntityId, page, 10, searchQuery, filtersStr, sortBy, sortOrder);

  const { data: tasksData } = useMyTasks("PENDING", 1, 5);

  // Tổng hợp thống kê
  const records = recordsData?.data || [];
  const totalRecords = recordsData?.total || 0;
  const statsApproved = records.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length;
  const statsPending = records.filter((r) => r.status === "IN_PROGRESS" || r.status === "PENDING").length;
  const statsRejected = records.filter((r) => r.status === "REJECTED").length;

  // Tạo cấu trúc cột động dựa trên thiết kế biểu mẫu (Metadata Entity Fields)
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "Mã Hồ sơ",
        dataIndex: "businessCode",
        key: "businessCode",
        width: 140,
        sorter: true,
        sortOrder: (sortBy === "businessCode" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (code: string) => (
          <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>{code}</Tag>
        ),
      },
      {
        title: "Tiêu đề Hồ sơ",
        dataIndex: "title",
        key: "title",
        ellipsis: true,
        sorter: true,
        sortOrder: (sortBy === "title" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (title: string, record: RecordData) => (
          <Text strong style={{ cursor: "pointer" }} onClick={() => setDetailRecord(record)}>
            {title || <Text type="secondary" italic>(Chưa có tiêu đề)</Text>}
          </Text>
        ),
      },
    ];

    // Tạo các cột động cho các trường custom (không hiển thị các trường phức tạp như TABLE hoặc FILE để giữ bảng gọn gàng)
    const customColumns = fields
      .filter((f) => f.type !== "TABLE" && f.type !== "FILE" && f.type !== "IMAGE")
      .map((field) => ({
        title: field.name,
        dataIndex: ["data", field.code],
        key: field.code,
        sorter: true,
        sortOrder: (sortBy === field.code ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (val: any) => {
          if (val === undefined || val === null || val === "") return "-";
          if (field.type === "CHECKBOX") {
            return val === true || val === "true" ? "☑ Có" : "☐ Không";
          }
          if (field.type === "DATE") {
            return new Date(val).toLocaleDateString("vi-VN");
          }
          if (field.type === "DATETIME") {
            return new Date(val).toLocaleString("vi-VN");
          }
          if (field.type === "CURRENCY") {
            return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
          }
          if (Array.isArray(val)) {
            return val.join(", ");
          }
          if (typeof val === "object") {
            return JSON.stringify(val);
          }
          return String(val);
        },
      }));

    const endColumns = [
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: 140,
        sorter: true,
        sortOrder: (sortBy === "status" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (status: string) => {
          const s = STATUS_MAP[status] || { label: status, color: "default", icon: null };
          return (
            <Tag icon={s.icon} color={s.color} style={{ borderRadius: 12, padding: "2px 10px" }}>
              {s.label}
            </Tag>
          );
        },
      },
      {
        title: "Ngày nộp",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        sorter: true,
        sortOrder: (sortBy === "createdAt" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (date: string) => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(date).toLocaleString("vi-VN")}
          </Text>
        ),
      },
      {
        title: "Hành động",
        key: "actions",
        width: 120,
        align: "center" as const,
        render: (_: any, record: RecordData) => {
          const canEdit = record.status === "DRAFT" || record.status === "REJECTED";
          return (
            <Space onClick={(e) => e.stopPropagation()}>
              <Tooltip title="Xem chi tiết">
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => setDetailRecord(record)}
                  style={{ color: "#1890ff" }}
                />
              </Tooltip>
              {canEdit && (
                <Tooltip title="Sửa & Trình ký lại">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setEditingRecord(record);
                      setSubmitModalOpen(true);
                    }}
                    style={{ color: "#faad14" }}
                  />
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ];

    return [...baseColumns, ...customColumns, ...endColumns];
  }, [fields, sortBy, sortOrder]);


  if (permissionsLoaded && !isSuperAdmin && !userPermissions.records?.includes("READ")) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập Hồ sơ & Biểu mẫu."
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
    <AntdApp>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Sider Navigation */}
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
            selectedKeys={["records"]}
            mode="inline"
            onClick={handleMenuClick}
            items={sidebarItems}
          />
        </Sider>

        <Layout>
          {/* Header */}
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
            <Space size="middle">
              <Dropdown menu={tenantMenu} trigger={['click']} placement="bottomLeft">
                <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading || switchTenantMutation.isPending}>
                  <Text strong>{activeTenantName}</Text>
                </Button>
              </Dropdown>
            </Space>
            <Space size="large">
              <Badge count={tasksData?.total || 0} overflowCount={99}>
                <Button
                  type="text"
                  shape="circle"
                  icon={<BellOutlined />}
                  onClick={() => router.push("/")}
                />
              </Badge>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#0050b3" }} />
                  <div className="hidden md:block">
                    <Text strong>{userName}</Text>
                  </div>
                </Space>
              </Dropdown>
            </Space>
          </Header>

          {/* Content */}
          <Content style={{ margin: "24px", overflow: "initial" }}>
            <Space direction="vertical" size="large" className="w-full">
              {/* Page Header */}
              <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100">
                <div>
                  <Breadcrumb
                    items={[
                      { title: "Trang chủ" },
                      { title: "Hồ sơ & Biểu mẫu" },
                      ...(selectedEntity ? [{ title: selectedEntity.name }] : []),
                    ]}
                  />
                  <Title level={2} style={{ margin: "8px 0 0 0" }}>
                    {selectedEntity ? selectedEntity.name : "Quản lý Hồ sơ"}
                  </Title>
                  <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                    {selectedEntity
                      ? `Danh sách và quản lý hồ sơ cho biểu mẫu: ${selectedEntity.code}`
                      : "Chọn một biểu mẫu bên trái để xem và nộp hồ sơ."}
                  </Paragraph>
                </div>
                {selectedEntity && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingRecord(null);
                      setSubmitModalOpen(true);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #0050b3 0%, #1890ff 100%)",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(0,80,179,0.3)",
                    }}
                  >
                    Nộp hồ sơ mới
                  </Button>
                )}
              </div>

              <Row gutter={[20, 20]}>
                {/* Left Panel: Entity Selector */}
                <Col xs={24} md={6}>
                  <Card
                    title={
                      <Space>
                        <FolderOpenOutlined style={{ color: "#0050b3" }} />
                        <span>Loại Biểu mẫu</span>
                      </Space>
                    }
                    bordered={false}
                    className="shadow-sm"
                    style={{ borderRadius: 8, height: "100%" }}
                    bodyStyle={{ padding: "8px 0" }}
                  >
                    {isEntitiesLoading ? (
                      <div className="flex justify-center py-8">
                        <Spin />
                      </div>
                    ) : entities.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có biểu mẫu nào"
                        style={{ margin: "24px 0" }}
                      />
                    ) : (
                      <Menu
                        mode="inline"
                        selectedKeys={selectedEntityId ? [String(selectedEntityId)] : []}
                        onClick={({ key }) => {
                          setSelectedEntityId(Number(key));
                          setPage(1);
                          setSearchQuery("");
                          setStatusFilter("");
                        }}
                        style={{ border: "none" }}
                        items={entities.map((e) => ({
                          key: String(e.id),
                          icon: <FormOutlined />,
                          label: (
                            <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
                              <Text strong style={{ fontSize: 13 }}>{e.name}</Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>{e.code}</Text>
                            </Space>
                          ),
                        }))}
                      />
                    )}
                  </Card>
                </Col>

                {/* Right Panel: Records List */}
                <Col xs={24} md={18}>
                  {!selectedEntityId ? (
                    <Card bordered={false} className="shadow-sm" style={{ borderRadius: 8 }}>
                      <Empty
                        image={<FormOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                        description={
                          <Space direction="vertical" size={4}>
                            <Text strong style={{ fontSize: 16, color: "#595959" }}>
                              Chọn Biểu mẫu để bắt đầu
                            </Text>
                            <Text type="secondary">
                              Chọn một loại biểu mẫu từ danh sách bên trái để xem hồ sơ và nộp mới.
                            </Text>
                          </Space>
                        }
                        style={{ padding: "60px 0" }}
                      />
                    </Card>
                  ) : (
                    <Space direction="vertical" size="middle" className="w-full">
                      {/* Stats */}
                      <Row gutter={[12, 12]}>
                        <Col xs={8}>
                          <Card
                            bordered={false}
                            className="shadow-sm"
                            style={{ borderLeft: "4px solid #1890ff", borderRadius: 8 }}
                            bodyStyle={{ padding: "12px 16px" }}
                          >
                            <Statistic
                              title={<Text type="secondary" style={{ fontSize: 12 }}>Đang xử lý</Text>}
                              value={statsPending}
                              valueStyle={{ color: "#1890ff", fontSize: 24 }}
                              prefix={<SyncOutlined />}
                            />
                          </Card>
                        </Col>
                        <Col xs={8}>
                          <Card
                            bordered={false}
                            className="shadow-sm"
                            style={{ borderLeft: "4px solid #52c41a", borderRadius: 8 }}
                            bodyStyle={{ padding: "12px 16px" }}
                          >
                            <Statistic
                              title={<Text type="secondary" style={{ fontSize: 12 }}>Đã phê duyệt</Text>}
                              value={statsApproved}
                              valueStyle={{ color: "#52c41a", fontSize: 24 }}
                              prefix={<CheckCircleOutlined />}
                            />
                          </Card>
                        </Col>
                        <Col xs={8}>
                          <Card
                            bordered={false}
                            className="shadow-sm"
                            style={{ borderLeft: "4px solid #ff4d4f", borderRadius: 8 }}
                            bodyStyle={{ padding: "12px 16px" }}
                          >
                            <Statistic
                              title={<Text type="secondary" style={{ fontSize: 12 }}>Từ chối</Text>}
                              value={statsRejected}
                              valueStyle={{ color: "#ff4d4f", fontSize: 24 }}
                              prefix={<CloseCircleOutlined />}
                            />
                          </Card>
                        </Col>
                      </Row>

                      {/* Toolbar */}
                      <Card
                        bordered={false}
                        className="shadow-sm"
                        style={{ borderRadius: 8 }}
                        bodyStyle={{ padding: "16px 24px" }}
                      >
                        <Row gutter={[12, 12]} align="middle">
                          <Col flex="auto">
                            <Search
                              placeholder="Tìm kiếm theo mã hồ sơ, tiêu đề..."
                              value={searchQuery}
                              onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                              }}
                              allowClear
                              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                              style={{ maxWidth: 360 }}
                            />
                          </Col>
                          <Col>
                            <Space>
                              <Select
                                placeholder={
                                  <Space>
                                    <FilterOutlined />
                                    Trạng thái
                                  </Space>
                                }
                                allowClear
                                value={statusFilter || undefined}
                                onChange={(val) => {
                                  setStatusFilter(val || "");
                                  setPage(1);
                                }}
                                style={{ width: 160 }}
                                options={[
                                  { value: "DRAFT", label: "Nháp" },
                                  { value: "IN_PROGRESS", label: "Đang xử lý" },
                                  { value: "APPROVED", label: "Đã duyệt" },
                                  { value: "REJECTED", label: "Từ chối" },
                                ]}
                              />
                              <Button
                                icon={<FilterOutlined />}
                                type={isFilterPanelOpen ? "primary" : "default"}
                                onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                              >
                                Bộ lọc nâng cao
                              </Button>
                              <Tooltip title="Làm mới">
                                <Button icon={<ReloadOutlined />} onClick={() => refetchRecords()} />
                              </Tooltip>
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => {
                                  setEditingRecord(null);
                                  setSubmitModalOpen(true);
                                }}
                              >
                                Nộp hồ sơ mới
                              </Button>
                            </Space>
                          </Col>
                        </Row>

                        {/* Advanced Filter Panel for Entity Custom Fields */}
                        {isFilterPanelOpen && fields.length > 0 && (
                          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #e8e8e8" }}>
                            <Row gutter={[16, 12]}>
                              {fields
                                .filter((f) => f.type !== "TABLE" && f.type !== "FILE" && f.type !== "IMAGE")
                                .map((field) => (
                                  <Col xs={24} sm={12} md={8} lg={6} key={field.code}>
                                    <div style={{ marginBottom: 4 }}>
                                      <Text type="secondary" style={{ fontSize: 12 }}>{field.name}</Text>
                                    </div>
                                    {field.type === "CHECKBOX" ? (
                                      <Select
                                        placeholder="Tất cả"
                                        allowClear
                                        style={{ width: "100%" }}
                                        value={customFilters[field.code]}
                                        onChange={(val) => {
                                          const newFilters = { ...customFilters };
                                          if (val !== undefined && val !== null) {
                                            newFilters[field.code] = val;
                                          } else {
                                            delete newFilters[field.code];
                                          }
                                          setCustomFilters(newFilters);
                                          setPage(1);
                                        }}
                                        options={[
                                          { value: "true", label: "Có" },
                                          { value: "false", label: "Không" },
                                        ]}
                                      />
                                    ) : field.type === "SELECT" || field.type === "MULTI_SELECT" ? (
                                      <Select
                                        placeholder={`Chọn ${field.name}...`}
                                        allowClear
                                        style={{ width: "100%" }}
                                        value={customFilters[field.code]}
                                        onChange={(val) => {
                                          const newFilters = { ...customFilters };
                                          if (val) {
                                            newFilters[field.code] = val;
                                          } else {
                                            delete newFilters[field.code];
                                          }
                                          setCustomFilters(newFilters);
                                          setPage(1);
                                        }}
                                        options={(field.config?.options?.choices || []).map((c: string) => ({
                                          value: c,
                                          label: c,
                                        }))}
                                      />
                                    ) : field.type === "DATE" || field.type === "DATETIME" ? (
                                      <DatePicker
                                        placeholder={`Chọn ngày...`}
                                        style={{ width: "100%" }}
                                        value={customFilters[field.code] ? dayjs(customFilters[field.code]) : null}
                                        onChange={(date) => {
                                          const dateStr = date ? date.format("YYYY-MM-DD") : undefined;
                                          const newFilters = { ...customFilters };
                                          if (dateStr) {
                                            newFilters[field.code] = dateStr;
                                          } else {
                                            delete newFilters[field.code];
                                          }
                                          setCustomFilters(newFilters);
                                          setPage(1);
                                        }}
                                      />
                                    ) : (
                                      <Input
                                        placeholder={`Nhập ${field.name}...`}
                                        allowClear
                                        value={customFilters[field.code] || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          const newFilters = { ...customFilters };
                                          if (val) {
                                            newFilters[field.code] = val;
                                          } else {
                                            delete newFilters[field.code];
                                          }
                                          setCustomFilters(newFilters);
                                          setPage(1);
                                        }}
                                      />
                                    )}
                                  </Col>
                                ))}
                              <Col span={24} style={{ textAlign: "right", marginTop: 8 }}>
                                <Button
                                  type="link"
                                  danger
                                  onClick={() => {
                                    setCustomFilters({});
                                    setPage(1);
                                  }}
                                >
                                  Xóa bộ lọc nâng cao
                                </Button>
                              </Col>
                            </Row>
                          </div>
                        )}
                      </Card>

                      {/* Table */}
                      <Card
                        bordered={false}
                        className="shadow-sm"
                        style={{ borderRadius: 8 }}
                        bodyStyle={{ padding: 0 }}
                      >
                        <Table
                          dataSource={records}
                          columns={columns}
                          rowKey="id"
                          loading={isRecordsLoading}
                          onChange={(pagination, filters, sorter: any) => {
                            if (sorter && sorter.field) {
                              const fieldCode = Array.isArray(sorter.field) ? sorter.field[1] : sorter.field;
                              setSortBy(fieldCode);
                              setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
                            } else {
                              setSortBy("id");
                              setSortOrder("desc");
                            }
                          }}
                          pagination={{
                            current: page,
                            pageSize: 10,
                            total: totalRecords,
                            onChange: (p) => setPage(p),
                            showSizeChanger: false,
                            showTotal: (total) => `Tổng ${total} hồ sơ`,
                          }}
                          locale={{
                            emptyText: (
                              <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="Chưa có hồ sơ nào. Nhấn 'Nộp hồ sơ mới' để bắt đầu."
                              />
                            ),
                          }}
                          onRow={(record) => ({
                            onClick: () => setDetailRecord(record),
                            style: { cursor: "pointer" },
                          })}
                          rowClassName={(_, index) =>
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        />
                      </Card>
                    </Space>
                  )}
                </Col>
              </Row>
            </Space>
          </Content>
        </Layout>
      </Layout>

      {/* Modal Nộp hồ sơ */}
      {selectedEntity && (
        <RecordSubmitModal
          open={submitModalOpen}
          entity={selectedEntity}
          record={editingRecord}
          onClose={() => {
            setSubmitModalOpen(false);
            setEditingRecord(null);
          }}
          onSuccess={() => {
            setSubmitModalOpen(false);
            setEditingRecord(null);
            refetchRecords();
          }}
        />
      )}

      {/* Drawer Chi tiết */}
      {detailRecord && (
        <RecordDetailDrawer
          record={detailRecord}
          open={!!detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </AntdApp>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Spin size="large" /></div>}>
      <RecordsContent />
    </Suspense>
  );
}
