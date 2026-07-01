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
import AppShell, { useAppAuth } from "@/components/AppShell";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

function EntitiesListContent() {
  const router = useRouter();
  const { message } = App.useApp();
  const { isSuperAdmin, userPermissions, permissionsLoaded } = useAppAuth();

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

  const handleInsertCodePattern = (formInstance: any, token?: string) => {
    if (!token) return;
    const currentVal = formInstance.getFieldValue("autoCodePattern") || "";
    formInstance.setFieldsValue({
      autoCodePattern: currentVal + token,
    });
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
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập trang Thiết kế Biểu mẫu."
          extra={<Button type="primary" onClick={() => router.push("/")}>Quay lại Trang chủ</Button>}
        />
      </div>
    );
  }

  return (
    <>
      <div className="bos-page-content">
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
        </div>

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
            label="Tiền tố tự sinh mã hồ sơ (autoCodePattern)"
            extra="Ví dụ: DXMS- hoặc PAY-{YYYY}-. Số thứ tự 4 số (ví dụ: -0001) sẽ tự động được thêm ở cuối."
          >
            <Input placeholder="Ví dụ: DXMS-" />
          </Form.Item>
          <Form.Item label="Chèn nhanh biến ngày tháng vào tiền tố mã">
            <Select
              placeholder="Chọn định dạng ngày tháng..."
              value={undefined}
              onChange={(val) => handleInsertCodePattern(entityForm, val)}
              options={[
                { value: "{YYYY}", label: "Năm 4 số ({YYYY})" },
                { value: "{YY}", label: "Năm 2 số ({YY})" },
                { value: "{MM}", label: "Tháng 2 số ({MM})" },
                { value: "{DD}", label: "Ngày 2 số ({DD})" },
              ]}
            />
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
            label="Tiền tố tự sinh mã hồ sơ (autoCodePattern)"
            extra="Ví dụ: DXMS- hoặc PAY-{YYYY}-. Số thứ tự 4 số (ví dụ: -0001) sẽ tự động được thêm ở cuối."
          >
            <Input placeholder="Ví dụ: DXMS-" />
          </Form.Item>
          <Form.Item label="Chèn nhanh biến ngày tháng vào tiền tố mã">
            <Select
              placeholder="Chọn định dạng ngày tháng..."
              value={undefined}
              onChange={(val) => handleInsertCodePattern(entityEditForm, val)}
              options={[
                { value: "{YYYY}", label: "Năm 4 số ({YYYY})" },
                { value: "{YY}", label: "Năm 2 số ({YY})" },
                { value: "{MM}", label: "Tháng 2 số ({MM})" },
                { value: "{DD}", label: "Ngày 2 số ({DD})" },
              ]}
            />
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
    </>
  );
}

export default function EntitiesListPage() {
  return (
    <AppShell>
      <EntitiesListContent />
    </AppShell>
  );
}
