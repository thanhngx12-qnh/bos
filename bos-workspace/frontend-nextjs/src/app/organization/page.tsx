// File: src/app/organization/page.tsx
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
  Tree,
  Spin,
  Form,
  Input,
  Popconfirm,
  Table,
  TreeSelect,
  theme,
  App,
  Col,
  Row,
  Modal,
  Dropdown,
  Tag,
  Empty,
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
  FolderOpenOutlined,
  FolderOutlined,
  FormOutlined,
  SettingOutlined,
  TeamOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useDepartmentTree,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  DepartmentNode,
} from "@/hooks/useDepartments";
import { useRoles } from "@/hooks/useRoles";
import { useUsers, User } from "@/hooks/useUsers";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";
import { BankOutlined } from "@ant-design/icons";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function DepartmentTreePage() {
  const router = useRouter();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  const { modal, message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");

  // Selected Department Node from the Tree
  const [selectedDeptNode, setSelectedDeptNode] = useState<DepartmentNode | null>(null);

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

  const handleSwitchTenant = (targetTenantId: number) => {
    switchTenantMutation.mutate({ tenantId: targetTenantId }, {
      onSuccess: (res) => {
        message.success("Chuyển doanh nghiệp thành công!");
        localStorage.setItem("bos_token", res.accessToken);
        localStorage.setItem("bos_user_name", res.user.fullName);
        localStorage.setItem("bos_user_permissions", JSON.stringify((res.user as any).role?.permissions || {}));
        localStorage.setItem("bos_user_type", (res.user as any).userType);
        if ((res.user as any).userType === "SUPER_ADMIN") {
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
    items: myTenants.map((t) => ({
      key: String(t.id),
      label: t.name,
      icon: <BankOutlined />,
      disabled: t.id === tenantId,
    })),
    onClick: (info: any) => {
      handleSwitchTenant(Number(info.key));
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

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "settings") router.push("/settings");
  };

  // Load Department, Users, and Roles
  const deptQuery = useDepartmentTree();
  const userQuery = useUsers(1, 200);
  const roleQuery = useRoles();

  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  // Modals for Department structure manipulation
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDeptEditOpen, setIsDeptEditOpen] = useState(false);
  const [actionDeptNode, setActionDeptNode] = useState<DepartmentNode | null>(null);

  const [deptForm] = Form.useForm();
  const [deptEditForm] = Form.useForm();

  // Helper function to find a node in the tree recursively
  const findDeptInTree = (nodes: DepartmentNode[], id: number): DepartmentNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findDeptInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to fetch parent department name
  const getParentDeptName = (parentId: number | null): string => {
    if (!parentId || !deptQuery.data) return "Là phòng ban gốc";
    const parent = findDeptInTree(deptQuery.data, parentId);
    return parent ? parent.name : "Phòng ban cấp trên";
  };

  // Count sub-departments recursively
  const countSubDepts = (node: DepartmentNode): number => {
    if (!node.children || node.children.length === 0) return 0;
    let count = node.children.length;
    node.children.forEach((c) => {
      count += countSubDepts(c);
    });
    return count;
  };

  // Map roles for lookup table
  const roleMap: Record<number, string> = {};
  (roleQuery.data?.data || []).forEach((r) => {
    roleMap[r.id] = r.name;
  });

  const handleAddDeptChild = (node: DepartmentNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionDeptNode(node);
    deptForm.resetFields();
    setIsDeptModalOpen(true);
  };

  const handleEditDept = (node: DepartmentNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionDeptNode(node);
    deptEditForm.setFieldsValue({ name: node.name });
    setIsDeptEditOpen(true);
  };

  // Map tree node to AntD tree data format
  const mapDeptTreeData = (nodes: DepartmentNode[]): any[] => {
    return nodes.map((node) => ({
      key: String(node.id),
      title: (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            paddingRight: "8px",
          }}
          className="group"
        >
          <span style={{ fontSize: "14px", fontWeight: node.parentId === null ? "600" : "normal" }}>
            {node.name}
          </span>
          <span
            style={{ marginLeft: "12px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <Space size="small">
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined style={{ color: "#1890ff" }} />}
                onClick={(e) => handleAddDeptChild(node, e)}
              />
              <Button
                size="small"
                type="text"
                icon={<EditOutlined style={{ color: "#fa8c16" }} />}
                onClick={(e) => handleEditDept(node, e)}
              />
              {node.parentId !== null && (
                <Popconfirm
                  title="Xóa phòng ban này?"
                  description="Các phòng ban con và nhân viên trực thuộc sẽ mất liên kết hoặc bị chặn xóa."
                  onConfirm={() =>
                    deleteDept.mutate(node.id, {
                      onSuccess: () => {
                        message.success("Xóa phòng ban thành công!");
                        if (selectedDeptNode?.id === node.id) {
                          setSelectedDeptNode(null);
                        }
                      },
                      onError: () => {
                        modal.error({
                          title: "Lỗi xóa phòng ban",
                          content:
                            "Phòng ban này hiện đang có dữ liệu nhân viên liên kết hoặc chứa các phòng ban con trực thuộc. Vui lòng dọn dẹp hoặc chuyển đổi nhân sự trước khi thực hiện xóa.",
                          okText: "Đã hiểu",
                        });
                      },
                    })
                  }
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              )}
            </Space>
          </span>
        </div>
      ),
      icon: ({ expanded }: { expanded: boolean }) =>
        expanded ? (
          <FolderOpenOutlined style={{ color: "#1890ff" }} />
        ) : (
          <FolderOutlined style={{ color: "#1890ff" }} />
        ),
      children: node.children ? mapDeptTreeData(node.children) : [],
    }));
  };

  // Antd Tree Selection callback
  const handleSelectTreeNode = (selectedKeys: any[]) => {
    if (selectedKeys.length > 0 && deptQuery.data) {
      const id = Number(selectedKeys[0]);
      const found = findDeptInTree(deptQuery.data, id);
      setSelectedDeptNode(found);
    } else {
      setSelectedDeptNode(null);
    }
  };

  // Get users for the currently selected department
  const selectedDeptUsers = selectedDeptNode
    ? (userQuery.data?.data || []).filter((u) => u.departmentId === selectedDeptNode.id)
    : [];

  const isSuperAdmin = tenantId === null;

  if (permissionsLoaded && !isSuperAdmin && !userPermissions.departments?.includes("READ")) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập Sơ đồ Cơ cấu Tổ chức."
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
          selectedKeys={["organization"]}
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
              <Breadcrumb items={[{ title: "Trang chủ" }, { title: "Cơ cấu Tổ chức" }]} />
              <Title level={2} style={{ margin: "8px 0 0 0" }}>
                Quản lý Sơ đồ Phòng ban
              </Title>
              <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                Xây dựng sơ đồ phân cấp phòng ban doanh nghiệp, định vị nhanh danh sách nhân sự trực thuộc từng đơn vị.
              </Paragraph>
            </div>

            <Row gutter={24}>
              {/* CỘT TRÁI: CÂY PHÒNG BAN */}
              <Col xs={24} md={10}>
                <Card
                  title="Sơ đồ Cơ cấu Tổ chức"
                  bodyStyle={{ padding: "16px" }}
                  extra={
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setActionDeptNode(null);
                        deptForm.resetFields();
                        setIsDeptModalOpen(true);
                      }}
                    >
                      Thêm Phòng ban Gốc
                    </Button>
                  }
                >
                  {deptQuery.isLoading ? (
                    <div style={{ padding: "40px 0", textAlign: "center" }}>
                      <Spin size="large" />
                    </div>
                  ) : (
                    <div style={{ maxHeight: "600px", overflowY: "auto", padding: "4px" }}>
                      {deptQuery.data && deptQuery.data.length > 0 ? (
                        <Tree
                          showIcon
                          defaultExpandAll
                          blockNode
                          showLine={{ showLeafIcon: false }}
                          treeData={mapDeptTreeData(deptQuery.data)}
                          onSelect={handleSelectTreeNode}
                        />
                      ) : (
                        <Empty description="Chưa có dữ liệu phòng ban gốc nào" />
                      )}
                    </div>
                  )}
                </Card>
              </Col>

              {/* CỘT PHẢI: CHI TIẾT PHÒNG BAN & NHÂN SỰ */}
              <Col xs={24} md={14}>
                {selectedDeptNode ? (
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Card
                      title={
                        <Space>
                          <HomeOutlined style={{ color: "#1890ff" }} />
                          <Text strong style={{ fontSize: "16px" }}>
                            Chi tiết đơn vị: {selectedDeptNode.name}
                          </Text>
                        </Space>
                      }
                      bodyStyle={{ padding: "20px" }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col span={12}>
                          <Text type="secondary">Phòng ban cấp trên: </Text>
                          <br />
                          <Text strong>{getParentDeptName(selectedDeptNode.parentId)}</Text>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Mã định danh phòng ban: </Text>
                          <br />
                          <Tag color="cyan">DEPT-{selectedDeptNode.id}</Tag>
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Số lượng phòng ban trực thuộc: </Text>
                          <br />
                          <Badge count={countSubDepts(selectedDeptNode)} showZero color="#1890ff" />
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">Tổng số nhân sự trực thuộc: </Text>
                          <br />
                          <Badge count={selectedDeptUsers.length} showZero color="#52c41a" />
                        </Col>
                      </Row>
                    </Card>

                    <Card
                      title={
                        <Space>
                          <TeamOutlined style={{ color: "#52c41a" }} />
                          <Text strong>Danh sách Nhân sự trực thuộc ({selectedDeptUsers.length})</Text>
                        </Space>
                      }
                    >
                      <Table
                        dataSource={selectedDeptUsers}
                        rowKey="id"
                        pagination={{ pageSize: 5 }}
                        size="small"
                        columns={[
                          {
                            title: "Họ và Tên",
                            dataIndex: "fullName",
                            key: "fullName",
                            render: (text) => <Text strong>{text}</Text>,
                          },
                          {
                            title: "Email",
                            dataIndex: "email",
                            key: "email",
                          },
                          {
                            title: "Vai trò gán",
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
                            render: (status) => (
                              <Tag color={status === "ACTIVE" ? "success" : "error"}>
                                {status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "ĐANG KHÓA"}
                              </Tag>
                            ),
                          },
                        ]}
                      />
                    </Card>
                  </Space>
                ) : (
                  <Card style={{ textAlign: "center", padding: "80px 0" }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <span style={{ color: "#8c8c8c" }}>
                          Chọn một phòng ban từ Sơ đồ bên trái để xem thông tin chi tiết và danh sách nhân sự
                        </span>
                      }
                    />
                  </Card>
                )}
              </Col>
            </Row>
          </Space>
        </Content>
      </Layout>

      {/* --- CÁC MODAL HÀNH ĐỘNG PHÒNG BAN --- */}
      <Modal
        title={
          actionDeptNode
            ? `Thêm nhánh phòng ban dưới "${actionDeptNode.name}"`
            : "Thêm Phòng ban Gốc"
        }
        open={isDeptModalOpen}
        onCancel={() => setIsDeptModalOpen(false)}
        onOk={() => deptForm.submit()}
        confirmLoading={createDept.isPending}
      >
        <Form
          form={deptForm}
          layout="vertical"
          onFinish={(vals) =>
            createDept.mutate(
              { name: vals.name, parentId: actionDeptNode?.id },
              {
                onSuccess: () => {
                  message.success("Thêm phòng ban thành công!");
                  setIsDeptModalOpen(false);
                },
              }
            )
          }
        >
          <Form.Item
            name="name"
            label="Tên phòng ban"
            rules={[{ required: true, message: "Vui lòng nhập tên phòng ban" }]}
          >
            <Input placeholder="Ví dụ: Phòng Kỹ Thuật, Ban Nhân Sự..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Đổi tên phòng ban"
        open={isDeptEditOpen}
        onCancel={() => setIsDeptEditOpen(false)}
        onOk={() => deptEditForm.submit()}
        confirmLoading={updateDept.isPending}
      >
        <Form
          form={deptEditForm}
          layout="vertical"
          onFinish={(vals) => {
            if (actionDeptNode)
              updateDept.mutate(
                { id: actionDeptNode.id, payload: { name: vals.name } },
                {
                  onSuccess: () => {
                    message.success("Đổi tên phòng ban thành công!");
                    setIsDeptEditOpen(false);
                    // Refresh details panel if it's the currently selected node
                    if (selectedDeptNode?.id === actionDeptNode.id) {
                      setSelectedDeptNode((prev) => (prev ? { ...prev, name: vals.name } : null));
                    }
                  },
                }
              );
          }}
        >
          <Form.Item
            name="name"
            label="Tên phòng ban mới"
            rules={[{ required: true, message: "Tên phòng ban không được trống" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
