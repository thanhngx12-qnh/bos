// File: src/app/organization/page.tsx
"use client";

import React, { useState } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Dropdown,
  Space,
  Card,
  Button,
  Badge,
  Typography,
  Row,
  Col,
  Tree,
  Spin,
  Modal,
  Form,
  Input,
  Popconfirm,
  message,
  theme,
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
  LoadingOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useDepartmentTree,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  DepartmentNode,
} from "@/hooks/useDepartments";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function OrganizationPage() {
  const router = useRouter();
  const queryClient = useDepartmentTree();
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTenant] = useState("Công ty Vận tải BOS (vantai_bos)");

  // Trạng thái Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<DepartmentNode | null>(null);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  // Điều hướng menu sidebar
  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
  };

  const handleAddRootClick = () => {
    setSelectedNode(null);
    form.resetFields();
    setIsCreateModalOpen(true);
  };

  const handleAddChildClick = (node: DepartmentNode) => {
    setSelectedNode(node);
    form.resetFields();
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (node: DepartmentNode) => {
    setSelectedNode(node);
    editForm.setFieldsValue({ name: node.name });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (node: DepartmentNode) => {
    deleteMutation.mutate(node.id, {
      onSuccess: () => {
        message.success(`Đã xóa phòng ban "${node.name}" thành công!`);
      },
      onError: (err: any) => {
        const errMsg =
          err?.response?.data?.message || "Không thể xóa phòng ban này.";
        message.error(errMsg);
      },
    });
  };

  const onCreateFinish = (values: { name: string }) => {
    const payload = {
      name: values.name,
      parentId: selectedNode ? selectedNode.id : undefined,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        message.success("Đã thêm phòng ban mới thành công!");
        setIsCreateModalOpen(false);
        form.resetFields();
      },
      onError: (err: any) => {
        const errMsg =
          err?.response?.data?.message || "Không thể thêm phòng ban.";
        message.error(errMsg);
      },
    });
  };

  const onEditFinish = (values: { name: string }) => {
    if (!selectedNode) return;

    updateMutation.mutate(
      {
        id: selectedNode.id,
        payload: { name: values.name },
      },
      {
        onSuccess: () => {
          message.success("Đã cập nhật tên phòng ban thành công!");
          setIsEditModalOpen(false);
        },
        onError: (err: any) => {
          const errMsg =
            err?.response?.data?.message || "Không thể cập nhật tên phòng ban.";
          message.error(errMsg);
        },
      },
    );
  };

  // Đệ quy ánh xạ cây phòng ban sang dạng TreeDataNode của Ant Design kèm nút bấm tương tác nhanh
  const mapTreeData = (nodes: DepartmentNode[]): any[] => {
    return nodes.map((node) => ({
      key: String(node.id),
      title: (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            minWidth: "320px",
            padding: "4px 8px",
            borderRadius: "4px",
          }}
          className="group hover:bg-slate-100"
        >
          <Text strong={node.parentId === null} style={{ fontSize: "14px" }}>
            {node.name}
          </Text>
          <span
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-4"
            onClick={(e) => e.stopPropagation()}
          >
            <Space size="small">
              <Button
                size="small"
                type="text"
                icon={<PlusOutlined style={{ color: "#0050b3" }} />}
                onClick={() => handleAddChildClick(node)}
                title="Thêm phòng ban con"
              />
              <Button
                size="small"
                type="text"
                icon={<EditOutlined style={{ color: "#fa8c16" }} />}
                onClick={() => handleEditClick(node)}
                title="Đổi tên"
              />
              {node.parentId !== null && (
                <Popconfirm
                  title="Xác nhận xóa"
                  description="Bạn có chắc chắn muốn xóa mềm phòng ban này không?"
                  onConfirm={() => handleDeleteClick(node)}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    title="Xóa phòng ban"
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
      children: node.children ? mapTreeData(node.children) : [],
    }));
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sider Navigation */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
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

      {/* Main Area */}
      <Layout>
        {/* Header Section */}
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
          <Space>
            <Button icon={<GlobalOutlined />}>
              <Text strong>{activeTenant}</Text>
            </Button>
          </Space>
          <Space size="large">
            <Badge count={3} dot>
              <Button type="text" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Space style={{ cursor: "pointer" }}>
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: "#0050b3" }}
              />
              <div className="hidden md:block">
                <Text strong>Hệ thống Admin</Text>
              </div>
            </Space>
          </Space>
        </Header>

        {/* Content Section */}
        <Content style={{ margin: "24px 24px 0" }}>
          <Space direction="vertical" size="large" className="w-full">
            {/* Page Header Tiêu Chuẩn */}
            <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div>
                <Breadcrumb
                  items={[
                    { title: "Trang chủ" },
                    { title: "Cơ cấu Tổ chức" },
                    { title: "Sơ đồ phòng ban" },
                  ]}
                />
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  Sơ đồ Cơ cấu Phòng ban
                </Title>
                <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                  Quản lý phân rã cơ cấu tổ chức theo mô hình cây phân cấp tự
                  động tính toán Closure Table.
                </Paragraph>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleAddRootClick}
              >
                Thêm Phòng ban Gốc
              </Button>
            </div>

            {/* Tree Area inside elegant Card */}
            <Card
              bordered={false}
              className="shadow-sm"
              title={
                <Text strong style={{ fontSize: "16px" }}>
                  Mô hình cây phân cấp
                </Text>
              }
            >
              {queryClient.isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Spin
                    indicator={
                      <LoadingOutlined style={{ fontSize: 32 }} spin />
                    }
                    tip="Đang tải sơ đồ phòng ban..."
                  />
                </div>
              ) : queryClient.data && queryClient.data.length > 0 ? (
                <div
                  style={{
                    background: "#fcfdfd",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #eef2f5",
                  }}
                >
                  <Tree
                    showIcon
                    defaultExpandAll
                    blockNode
                    selectable={false}
                    treeData={mapTreeData(queryClient.data)}
                  />
                </div>
              ) : (
                <div className="py-12">
                  <Badge
                    status="warning"
                    text="Chưa có phòng ban nào trong doanh nghiệp này."
                    style={{
                      marginBottom: "16px",
                      display: "block",
                      textAlign: "center",
                    }}
                  />
                  <Button
                    type="dashed"
                    block
                    onClick={handleAddRootClick}
                    icon={<PlusOutlined />}
                  >
                    Khởi tạo phòng ban đầu tiên
                  </Button>
                </div>
              )}
            </Card>
          </Space>
        </Content>
      </Layout>

      {/* Modal Thêm Mới Phòng Ban */}
      <Modal
        title={
          selectedNode
            ? `Thêm phòng ban con dưới "${selectedNode.name}"`
            : "Thêm phòng ban gốc mới"
        }
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreateFinish}
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="name"
            label="Tên phòng ban"
            rules={[
              { required: true, message: "Vui lòng nhập tên phòng ban!" },
              { min: 2, message: "Tên phòng ban tối thiểu 2 ký tự!" },
            ]}
          >
            <Input
              placeholder="Ví dụ: Phòng Kỹ thuật, Ban Giám đốc..."
              size="large"
            />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsCreateModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending}
              >
                Khởi tạo
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Sửa Tên Phòng Ban */}
      <Modal
        title={`Đổi tên phòng ban "${selectedNode?.name}"`}
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={onEditFinish}
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="name"
            label="Tên phòng ban mới"
            rules={[
              { required: true, message: "Vui lòng nhập tên mới!" },
              { min: 2, message: "Tên mới tối thiểu 2 ký tự!" },
            ]}
          >
            <Input
              placeholder="Ví dụ: Phòng Nghiên cứu & Phát triển..."
              size="large"
            />
          </Form.Item>
          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateMutation.isPending}
              >
                Cập nhật
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
