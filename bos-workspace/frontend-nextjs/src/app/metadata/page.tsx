// File: src/app/metadata/page.tsx
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
  Table,
  Modal,
  Form,
  Input,
  Popconfirm,
  Tag,
  theme,
  App,
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
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import {
  useEntities,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  Entity,
} from "@/hooks/useEntities";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function EntitiesListPage() {
  const router = useRouter();
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const { message } = App.useApp();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTenant] = useState("Công ty Vận tải BOS (vantai_bos)");

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

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
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
        </Form>
      </Modal>
    </Layout>
  );
}
