// File: src/app/organization/page.tsx
"use client";

import React, { useState } from "react";
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
  SafetyCertificateOutlined,
  UsergroupAddOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useDepartmentTree,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  DepartmentNode,
} from "@/hooks/useDepartments";
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

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function UnifiedOrganizationPage() {
  const router = useRouter();
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Khởi tạo và kích hoạt context-aware APIs an toàn chuẩn AntD v5 [1]
  const { modal, message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTenant] = useState("Công ty Vận tải BOS (vantai_bos)");
  const [activeTab, setActiveTab] = useState("org_tree");

  // Khởi tạo các API Hooks
  const deptQuery = useDepartmentTree();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const roleQuery = useRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const userQuery = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  // Biến trạng thái Modals
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDeptEditOpen, setIsDeptEditOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentNode | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUserEditOpen, setIsUserEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isPermissionMatrixOpen, setIsPermissionMatrixOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissionsMatrix, setPermissionsMatrix] = useState<
    Record<string, string[]>
  >({});

  // Khai báo Forms
  const [deptForm] = Form.useForm();
  const [deptEditForm] = Form.useForm();
  const [userForm] = Form.useForm();
  const [userEditForm] = Form.useForm();
  const [roleForm] = Form.useForm();

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
  };

  // --- LOGIC PHÒNG BAN (CLOSURE TREE) ---
  const handleAddDeptChild = (node: DepartmentNode) => {
    setSelectedDept(node);
    deptForm.resetFields();
    setIsDeptModalOpen(true);
  };

  const handleEditDept = (node: DepartmentNode) => {
    setSelectedDept(node);
    deptEditForm.setFieldsValue({ name: node.name });
    setIsDeptEditOpen(true);
  };

  const mapDeptToTreeSelect = (nodes: DepartmentNode[]): any[] => {
    return nodes.map((node) => ({
      value: node.id,
      title: node.name,
      children: node.children ? mapDeptToTreeSelect(node.children) : [],
    }));
  };

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
            minWidth: "300px",
          }}
          className="group"
        >
          <Text strong={node.parentId === null}>{node.name}</Text>
          <span
            className="opacity-0 group-hover:opacity-100 ml-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Space size="small">
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined />}
                onClick={() => handleAddDeptChild(node)}
              />
              <Button
                size="small"
                type="text"
                icon={<EditOutlined style={{ color: "#fa8c16" }} />}
                onClick={() => handleEditDept(node)}
              />
              {node.parentId !== null && (
                <Popconfirm
                  title="Xóa phòng ban con?"
                  onConfirm={() =>
                    deleteDept.mutate(node.id, {
                      onSuccess: () => {
                        message.success("Xóa phòng ban thành công!");
                      },
                      onError: () => {
                        modal.error({
                          title: "Không thể xóa Phòng ban",
                          content:
                            "Phòng ban này hiện tại đang có dữ liệu nhân viên liên kết hoặc các phòng ban con trực thuộc. Vui lòng chuyển đổi dữ liệu trước khi xóa.",
                          okText: "Đã hiểu",
                        });
                      },
                    })
                  }
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
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

  // --- LOGIC TÀI KHOẢN (USERS) ---
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userEditForm.setFieldsValue({
      fullName: user.fullName,
      email: user.email,
      departmentId: user.departmentId,
      roleId: user.roleId,
      status: user.status,
    });
    setIsUserEditOpen(true);
  };

  // --- LOGIC PHÂN QUYỀN (ROLE-PERMISSION MATRIX) ---
  const modulesList = [
    "users",
    "departments",
    "roles",
    "entities",
    "workflows",
  ];
  const actionsList = ["CREATE", "READ", "UPDATE", "DELETE"];

  const handleOpenPermissionMatrix = (role: Role) => {
    setSelectedRole(role);
    setPermissionsMatrix(role.permissions || {});
    setIsPermissionMatrixOpen(true);
  };

  const togglePermissionCheckbox = (
    module: string,
    action: string,
    checked: boolean,
  ) => {
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
          message.success(
            `Cập nhật phân quyền Vai trò "${selectedRole.name}" thành công!`,
          );
          setIsPermissionMatrixOpen(false);
        },
      },
    );
  };

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
          items={[
            {
              key: "dashboard",
              icon: <DashboardOutlined />,
              label: "Bảng tổng quan",
            },
            {
              key: "tenants",
              icon: <GlobalOutlined />,
              label: "Quản trị SaaS Tenant",
            },
            {
              key: "organization",
              icon: <PartitionOutlined />,
              label: "Cơ cấu Tổ chức",
            },
            {
              key: "metadata",
              icon: <BuildOutlined />,
              label: "Biểu mẫu Động",
            },
            {
              key: "workflow",
              icon: <DeploymentUnitOutlined />,
              label: "Luồng Quy trình",
            },
          ]}
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
          <Button icon={<GlobalOutlined />}>
            <Text strong>{activeTenant}</Text>
          </Button>
          <Space size="large">
            <Badge count={3} dot>
              <Button type="text" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Space style={{ cursor: "pointer" }}>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: "#0050b3" }}
              />
              <Text strong className="hidden md:block">
                Hệ thống Admin
              </Text>
            </Space>
          </Space>
        </Header>

        <Content style={{ margin: "24px" }}>
          <Space direction="vertical" size="large" className="w-full">
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <Breadcrumb
                items={[{ title: "Trang chủ" }, { title: "Cơ cấu Tổ chức" }]}
              />
              <Title level={2} style={{ margin: "8px 0 0 0" }}>
                Quản lý Nhân sự & Phân quyền
              </Title>
              <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                Cách ly đa doanh nghiệp, đồng bộ sâu sắc vai trò, phòng ban và
                tài khoản.
              </Paragraph>
            </div>

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              items={[
                // TAB 1: SƠ ĐỒ PHÒNG BAN
                {
                  key: "org_tree",
                  label: "Sơ đồ Phòng ban",
                  icon: <PartitionOutlined />,
                  children: (
                    <Card
                      title="Phân cấp cơ cấu tổ chức"
                      extra={
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setSelectedDept(null);
                            deptForm.resetFields();
                            setIsDeptModalOpen(true);
                          }}
                        >
                          Thêm Phòng ban gốc
                        </Button>
                      }
                    >
                      {deptQuery.isLoading ? (
                        <Spin
                          style={{ display: "block", margin: "40px auto" }}
                        />
                      ) : (
                        <Tree
                          showIcon
                          defaultExpandAll
                          blockNode
                          selectable={false}
                          treeData={mapDeptTreeData(deptQuery.data || [])}
                        />
                      )}
                    </Card>
                  ),
                },
                // TAB 2: QUẢN TRỊ TÀI KHOẢN (USERS)
                {
                  key: "users_list",
                  label: "Tài khoản Thành viên",
                  icon: <UsergroupAddOutlined />,
                  children: (
                    <Card
                      title="Danh sách nhân viên"
                      extra={
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            userForm.resetFields();
                            setIsUserModalOpen(true);
                          }}
                        >
                          Tạo Thành viên mới
                        </Button>
                      }
                    >
                      <Table
                        dataSource={userQuery.data?.data || []}
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
                            title: "Trạng thái",
                            dataIndex: "status",
                            key: "status",
                            render: (status) => (
                              <Badge
                                status={
                                  status === "ACTIVE" ? "success" : "error"
                                }
                                text={status}
                              />
                            ),
                          },
                          {
                            title: "Hành động",
                            key: "actions",
                            render: (_, user) => (
                              <Space size="middle">
                                <Button
                                  type="link"
                                  icon={<EditOutlined />}
                                  onClick={() => handleEditUser(user)}
                                >
                                  Cập nhật
                                </Button>
                                <Popconfirm
                                  title="Xóa tài khoản này?"
                                  onConfirm={() =>
                                    deleteUser.mutate(user.id, {
                                      onSuccess: () =>
                                        message.success(
                                          "Xóa tài khoản thành công!",
                                        ),
                                    })
                                  }
                                >
                                  <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                  >
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
                // TAB 3: PHÂN QUYỀN (ROLES)
                {
                  key: "roles_permissions",
                  label: "Vai trò & Phân quyền",
                  icon: <SafetyCertificateOutlined />,
                  children: (
                    <Card
                      title="Nhóm Vai trò RBAC"
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
                            title: "Mã ID",
                            dataIndex: "id",
                            key: "id",
                            width: 100,
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
                            title: "Quyền đã gán",
                            dataIndex: "permissions",
                            key: "permissions",
                            render: (perm) => (
                              <Text type="secondary">
                                {Object.keys(perm || {}).length} Phân hệ
                              </Text>
                            ),
                          },
                          {
                            title: "Hành động",
                            key: "actions",
                            render: (_, role) => (
                              <Space size="middle">
                                <Button
                                  type="primary"
                                  ghost
                                  icon={<SafetyCertificateOutlined />}
                                  onClick={() =>
                                    handleOpenPermissionMatrix(role)
                                  }
                                >
                                  Phân Quyền Ma Trận
                                </Button>
                                <Popconfirm
                                  title="Xóa vai trò phân quyền?"
                                  onConfirm={() =>
                                    deleteRole.mutate(role.id, {
                                      onSuccess: () => {
                                        message.success(
                                          "Xóa vai trò thành công!",
                                        );
                                      },
                                      onError: () => {
                                        // SỬ DỤNG MẪU HOÀN TOÀN TẬP TRUNG TỪ APP HOOKS KHÔNG LỖI CONTEXT [1]
                                        modal.error({
                                          title: "Không thể xóa Vai trò",
                                          content: `Không thể xóa Vai trò "${role.name}" vì hiện tại đang có dữ liệu tài khoản nhân viên liên kết sử dụng vai trò này. Vui lòng chuyển toàn bộ nhân viên liên quan sang vai trò khác trước khi tiến hành xóa cứng khỏi hệ thống.`,
                                          okText: "Đã hiểu",
                                        });
                                      },
                                    })
                                  }
                                >
                                  <Button
                                    type="link"
                                    danger
                                    icon={<DeleteOutlined />}
                                  >
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
              ]}
            />
          </Space>
        </Content>
      </Layout>

      {/* --- CÁC MODAL HÀNH ĐỘNG PHÒNG BAN --- */}
      <Modal
        title={
          selectedDept
            ? `Thêm nhánh phòng ban dưới "${selectedDept.name}"`
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
              { name: vals.name, parentId: selectedDept?.id },
              {
                onSuccess: () => {
                  message.success("Thêm thành công!");
                  setIsDeptModalOpen(false);
                },
              },
            )
          }
        >
          <Form.Item
            name="name"
            label="Tên phòng ban"
            rules={[{ required: true, message: "Yêu cầu nhập tên phòng ban" }]}
          >
            <Input placeholder="Ví dụ: Phòng Kinh Doanh..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Sửa tên phòng ban"
        open={isDeptEditOpen}
        onCancel={() => setIsDeptEditOpen(false)}
        onOk={() => deptEditForm.submit()}
        confirmLoading={updateDept.isPending}
      >
        <Form
          form={deptEditForm}
          layout="vertical"
          onFinish={(vals) => {
            if (selectedDept)
              updateDept.mutate(
                { id: selectedDept.id, payload: { name: vals.name } },
                {
                  onSuccess: () => {
                    message.success("Cập nhật thành công!");
                    setIsDeptEditOpen(false);
                  },
                },
              );
          }}
        >
          <Form.Item
            name="name"
            label="Tên phòng ban mới"
            rules={[{ required: true, message: "Yêu cầu nhập tên mới" }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* --- CÁC MODAL HÀNH ĐỘNG TÀI KHOẢN --- */}
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
          onFinish={(vals) =>
            createUser.mutate(vals, {
              onSuccess: () => {
                message.success("Tạo thành công!");
                setIsUserModalOpen(false);
              },
            })
          }
        >
          <Row gutter={16}>
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
                <Input placeholder="username@bos.com" />
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
                    message.success("Cập nhật thành công!");
                    setIsUserEditOpen(false);
                  },
                },
              );
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Họ tên thành viên"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email làm việc"
                rules={[{ required: true, type: "email" }]}
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
                  message.success("Tạo thành công!");
                  setIsRoleModalOpen(false);
                },
              },
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
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL PHÂN QUYỀN MA TRẬN PHỨC TẠP CHUẨN VIP PRO */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#0050b3" }} />{" "}
            <Text strong>
              Thiết lập Ma trận Phân quyền cho: {selectedRole?.name}
            </Text>
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
                  <tr
                    style={{
                      background: "#fafafa",
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <th style={{ padding: "12px", textAlign: "left" }}>
                      Phân Hệ (Module)
                    </th>
                    {actionsList.map((act) => (
                      <th
                        key={act}
                        style={{ padding: "12px", textAlign: "center" }}
                      >
                        {act}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {modulesList.map((mod) => (
                    <tr key={mod} style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td
                        style={{ padding: "12px", textTransform: "capitalize" }}
                      >
                        <Text strong>{mod}</Text>
                      </td>
                      {actionsList.map((act) => {
                        const isChecked =
                          permissionsMatrix[mod]?.includes(act) || false;
                        return (
                          <td
                            key={act}
                            style={{ padding: "12px", textAlign: "center" }}
                          >
                            <Checkbox
                              checked={isChecked}
                              onChange={(e) =>
                                togglePermissionCheckbox(
                                  mod,
                                  act,
                                  e.target.checked,
                                )
                              }
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
    </Layout>
  );
}
