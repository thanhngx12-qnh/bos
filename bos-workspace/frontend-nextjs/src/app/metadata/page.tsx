// File: src/app/metadata/page.tsx
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
  Table,
  Modal,
  Form,
  Input,
  Popconfirm,
  Tag,
  theme,
  App,
  Dropdown,
  Select,
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
  ArrowRightOutlined,
  DatabaseOutlined,
  FormOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  Entity,
} from "@/hooks/useEntities";
import { useFields } from "@/hooks/useFields";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";
import { BankOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function EntitiesListPage() {
  const router = useRouter();
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const { message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  
  // State quản lý Tenant và User động
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
      }
    },
  };


  // Entities API Hooks
  const entitiesQuery = useEntities();
  const createEntity = useCreateEntity();
  const updateEntity = useUpdateEntity();
  const deleteEntity = useDeleteEntity();

  // Trạng thái Modals
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isEntityEditOpen, setIsEntityEditOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const [entityForm] = Form.useForm();
  const [entityEditForm] = Form.useForm();

  // Lấy danh sách trường của thực thể đang sửa đổi để hỗ trợ chèn mẫu tiêu đề
  const entityFieldsQuery = useFields(editingEntity?.id || null);
  const fields = entityFieldsQuery.data || [];

  const handleInsertFieldPattern = (formInstance: any, pattern?: string) => {
    if (!pattern) return;
    const currentVal = formInstance.getFieldValue("titlePattern") || "";
    formInstance.setFieldsValue({
      titlePattern: currentVal + pattern,
    });
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "settings") router.push("/settings");
  };

  const onEntityCreate = (values: any) => {
    createEntity.mutate(values, {
      onSuccess: () => {
        message.success("Tạo biểu mẫu thành công!");
        setIsEntityModalOpen(false);
        entityForm.resetFields();
      },
      onError: (err: any) => {
        const errMsg =
          err?.response?.data?.message || "Không thể tạo biểu mẫu.";
        message.error(errMsg);
      },
    });
  };

  const onEntityEdit = (values: any) => {
    if (!editingEntity) return;
    updateEntity.mutate(
      { id: editingEntity.id, payload: values },
      {
        onSuccess: () => {
          message.success("Cập nhật thông tin biểu mẫu thành công!");
          setIsEntityEditOpen(false);
        },
        onError: (err: any) => {
          const errMsg =
            err?.response?.data?.message || "Không thể cập nhật biểu mẫu.";
          message.error(errMsg);
        },
      },
    );
  };


  if (permissionsLoaded && !isSuperAdmin && !userPermissions.entities?.includes("READ")) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập trang Thiết kế Biểu mẫu."
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
          selectedKeys={["metadata"]}
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
          className="flex justify-between w-full"
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
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#0050b3" }}
                />
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
              <Breadcrumb
                items={[{ title: "Trang chủ" }, { title: "Động hóa biểu mẫu" }]}
              />
              <Title level={2} style={{ margin: "8px 0 0 0" }}>
                Quản lý Thực thể Biểu mẫu
              </Title>
              <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                Khởi tạo phân vùng thực thể biểu mẫu, tự động gán mã nghiệp vụ
                tuần tự.
              </Paragraph>
            </div>

            <Card
              title={
                <Space>
                  <DatabaseOutlined style={{ color: "#0050b3" }} />{" "}
                  <Text strong>Danh sách Biểu mẫu của Doanh nghiệp</Text>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    entityForm.resetFields();
                    setIsEntityModalOpen(true);
                  }}
                >
                  Tạo Biểu mẫu mới
                </Button>
              }
              className="shadow-sm"
            >
              <Table
                dataSource={entitiesQuery.data?.data || []}
                rowKey="id"
                loading={entitiesQuery.isLoading}
                columns={[
                  {
                    title: "Tên Biểu Mẫu",
                    dataIndex: "name",
                    key: "name",
                    render: (text) => (
                      <Text strong style={{ fontSize: "15px" }}>
                        {text}
                      </Text>
                    ),
                  },
                  {
                    title: "Mã Định Danh (Code)",
                    dataIndex: "code",
                    key: "code",
                    render: (code) => (
                      <Tag
                        color="blue"
                        style={{ fontSize: "13px", padding: "4px 8px" }}
                      >
                        {code}
                      </Tag>
                    ),
                  },
                  {
                    title: "Tự sinh mã (autoCodePattern)",
                    dataIndex: "autoCodePattern",
                    key: "autoCodePattern",
                    render: (pattern) => (
                      <Text code>{pattern || "Không áp dụng"}</Text>
                    ),
                  },
                  {
                    title: "Mô tả",
                    dataIndex: "description",
                    key: "description",
                    render: (desc) => (
                      <Text type="secondary">{desc || "Không có mô tả"}</Text>
                    ),
                  },
                  {
                    title: "Trình Thiết Kế",
                    key: "designer",
                    width: 200,
                    render: (_, record) => (
                      <Button
                        type="primary"
                        ghost
                        icon={<ArrowRightOutlined />}
                        onClick={() =>
                          router.push(`/metadata/${record.id}/fields`)
                        }
                      >
                        Thiết kế Trường
                      </Button>
                    ),
                  },
                  {
                    title: "Hành động",
                    key: "actions",
                    width: 150,
                    render: (_, record) => (
                      <Space size="middle">
                        <Button
                          type="link"
                          icon={<EditOutlined style={{ color: "#fa8c16" }} />}
                          onClick={() => {
                            setEditingEntity(record);
                            entityEditForm.setFieldsValue(record);
                            setIsEntityEditOpen(true);
                          }}
                        >
                          Sửa
                        </Button>
                        <Popconfirm
                          title="Xóa biểu mẫu này và toàn bộ trường liên đới?"
                          onConfirm={() =>
                            deleteEntity.mutate(record.id, {
                              onSuccess: () =>
                                message.success("Xóa thực thể thành công!"),
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
          </Space>
        </Content>
      </Layout>

      {/* --- MODAL TẠO BIỂU MẪU MỚI (ENTITY) --- */}
      <Modal
        title="Tạo Thực thể Biểu mẫu mới"
        open={isEntityModalOpen}
        onCancel={() => setIsEntityModalOpen(false)}
        onOk={() => entityForm.submit()}
        confirmLoading={createEntity.isPending}
      >
        <Form
          form={entityForm}
          layout="vertical"
          onFinish={onEntityCreate}
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="name"
            label="Tên biểu mẫu hiển thị"
            rules={[
              {
                required: true,
                message: "Nhập tên biểu mẫu (vd: Đề xuất mua sắm)",
              },
            ]}
          >
            <Input placeholder="Ví dụ: Đề xuất mua sắm thiết bị" />
          </Form.Item>
          <Form.Item
            name="code"
            label="Mã định danh biểu mẫu (Viết hoa không dấu, UPPERCASE_snake_case)"
            rules={[
              {
                required: true,
                pattern: /^[A-Z0-9_]+$/,
                message:
                  "Chỉ nhập chữ hoa, số và gạch dưới (vd: PURCHASE_REQUEST)",
              },
            ]}
          >
            <Input placeholder="PURCHASE_REQUEST" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả mục đích">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="autoCodePattern"
            label="Mẫu tự sinh mã nghiệp vụ (autoCodePattern)"
            extra="Cú pháp hỗ trợ dạng SEQ (ví dụ: QTMS-{SEQ:4})"
          >
            <Input placeholder="QTMS-{SEQ:4}" />
          </Form.Item>
          <Form.Item
            name="titlePattern"
            label="Mẫu định dạng tiêu đề hồ sơ (titlePattern)"
            extra="Mẫu sinh tiêu đề động. Hỗ trợ các trường mẫu dạng {ma_truong} và {RECORD_CODE} (Ví dụ: Đề xuất thanh toán {supplier_name} - {RECORD_CODE})"
          >
            <Input placeholder="Ví dụ: Đề xuất thanh toán {supplier_name} - {RECORD_CODE}" />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- MODAL CẬP NHẬT BIỂU MẪU (ENTITY) --- */}
      <Modal
        title="Cập nhật thông tin thực thể"
        open={isEntityEditOpen}
        onCancel={() => setIsEntityEditOpen(false)}
        onOk={() => entityEditForm.submit()}
        confirmLoading={updateEntity.isPending}
      >
        <Form
          form={entityEditForm}
          layout="vertical"
          onFinish={onEntityEdit}
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="name"
            label="Tên biểu mẫu hiển thị"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả mục đích">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="autoCodePattern"
            label="Mẫu tự sinh mã nghiệp vụ (autoCodePattern)"
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="titlePattern"
            label="Mẫu định dạng tiêu đề hồ sơ (titlePattern)"
            extra="Mẫu sinh tiêu đề động. Hỗ trợ các trường mẫu dạng {ma_truong} và {RECORD_CODE} (Ví dụ: Đề xuất thanh toán {supplier_name} - {RECORD_CODE})"
          >
            <Input placeholder="Ví dụ: Đề xuất thanh toán {supplier_name} - {RECORD_CODE}" />
          </Form.Item>
          {editingEntity && (
            <Form.Item label="Chèn nhanh trường dữ liệu vào mẫu">
              <Select
                placeholder="Chọn trường để chèn..."
                value={undefined}
                onChange={(val) => handleInsertFieldPattern(entityEditForm, val)}
                options={[
                  { value: "{RECORD_CODE}", label: "Mã hồ sơ tự sinh ({RECORD_CODE})" },
                  ...fields.map((f) => ({
                    value: `{${f.code}}`,
                    label: `${f.name} ({${f.code}})`,
                  })),
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Layout>
  );
}
