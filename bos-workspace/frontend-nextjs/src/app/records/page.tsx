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
} from "antd";
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
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useTenantDetail } from "@/hooks/useTenant";
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bos_token");
      if (!token) { router.push("/auth/login"); return; }
      const storedTenantId = localStorage.getItem("bos_tenant_id");
      const storedUserName = localStorage.getItem("bos_user_name");
      if (storedTenantId) setTenantId(Number(storedTenantId));
      if (storedUserName) setUserName(storedUserName);
    }
  }, [router]);

  const tenantQuery = useTenantDetail(tenantId);
  const activeTenantName = tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : "Đang tải...";

  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem("bos_token");
    localStorage.removeItem("bos_tenant_id");
    localStorage.removeItem("bos_user_name");
    router.push("/auth/login");
  };

  const userMenu = {
    items: [
      { key: "profile", label: "Thông tin cá nhân" },
      { key: "security", label: "Thiết lập bảo mật" },
      { type: "divider" as const },
      { key: "logout", label: "Đăng xuất hệ thống", danger: true },
    ],
    onClick: (info: any) => { if (info.key === "logout") handleLogout(); },
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "tenants") router.push("/metadata");
  };

  // State quản lý entity được chọn
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

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

  const filtersStr = statusFilter ? JSON.stringify({ status: statusFilter }) : "";
  const {
    data: recordsData,
    isLoading: isRecordsLoading,
    refetch: refetchRecords,
  } = useRecords(selectedEntityId, page, 10, searchQuery, filtersStr);

  const { data: tasksData } = useMyTasks("PENDING", 1, 5);

  // Tổng hợp thống kê
  const records = recordsData?.data || [];
  const totalRecords = recordsData?.total || 0;
  const statsApproved = records.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length;
  const statsPending = records.filter((r) => r.status === "IN_PROGRESS" || r.status === "PENDING").length;
  const statsRejected = records.filter((r) => r.status === "REJECTED").length;

  // Table columns
  const columns = [
    {
      title: "Mã Hồ sơ",
      dataIndex: "businessCode",
      key: "businessCode",
      width: 140,
      render: (code: string) => (
        <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>{code}</Tag>
      ),
    },
    {
      title: "Tiêu đề Hồ sơ",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (title: string, record: RecordData) => (
        <Text strong style={{ cursor: "pointer" }} onClick={() => setDetailRecord(record)}>
          {title || <Text type="secondary" italic>(Chưa có tiêu đề)</Text>}
        </Text>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
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
          <Space>
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
            items={[
              { key: "dashboard", icon: <DashboardOutlined />, label: "Bảng tổng quan" },
              { key: "organization", icon: <PartitionOutlined />, label: "Cơ cấu Tổ chức" },
              { key: "metadata", icon: <BuildOutlined />, label: "Biểu mẫu Động" },
              { key: "workflow", icon: <DeploymentUnitOutlined />, label: "Luồng Quy trình" },
              { key: "records", icon: <FormOutlined />, label: "Hồ sơ & Biểu mẫu" },
              ...(tenantId === null ? [{ key: "tenants", icon: <GlobalOutlined />, label: "Quản trị SaaS Tenant" }] : []),
            ]}
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
              <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading}>
                <Text strong>{activeTenantName}</Text>
              </Button>
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
