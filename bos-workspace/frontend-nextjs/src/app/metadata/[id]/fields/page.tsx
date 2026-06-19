// File: src/app/metadata/[id]/fields/page.tsx
"use client";

import React, { useState } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Space,
  Typography,
  Badge,
  Button,
  Row,
  Col,
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Select,
  theme,
  App,
  Spin,
  Collapse,
} from "antd";
import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  ArrowLeftOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEntities } from "@/hooks/useEntities";
import {
  useFields,
  useCreateField,
  useUpdateField,
  useDeleteField,
  Field,
} from "@/hooks/useFields";
import { useWorkflows, WorkflowStep } from "@/hooks/useWorkflows";

import WorkflowStepsController from "./components/WorkflowStepsController";
import DragDropCanvas from "./components/DragDropCanvas";
import ToolboxAndInspector from "./components/ToolboxAndInspector";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function WorkspaceContainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = React.use(params); // Unwrapping dynamic parameters chuẩn Next.js 15 App Router [1]
  const entityIdNum = Number(id);

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const { message } = App.useApp();

  // Trạng thái liên kết đồng bộ 3 phân khu [1]
  const [activeStep, setActiveStep] = useState<WorkflowStep | null>(null);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  // Gọi API Hooks
  const entitiesQuery = useEntities();
  const activeEntity = entitiesQuery.data?.data?.find(
    (e) => e.id === entityIdNum,
  );

  const fieldsQuery = useFields(entityIdNum);
  const createField = useCreateField();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();

  // Gọi API Hooks liên kết luồng quy trình của Entity [1]
  const workflowsQuery = useWorkflows(entityIdNum);
  const activeWorkflow = workflowsQuery.data?.data?.[0]; // Lấy quy trình đầu tiên của Thực thể

  // Trạng thái modal thêm nhanh
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<string>("TEXT");
  const [quickForm] = Form.useForm();
  const watchedQuickType = Form.useWatch("type", quickForm);

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
  };

  const handleAddQuickField = (type: string) => {
    setQuickCreateType(type);
    quickForm.resetFields();
    quickForm.setFieldsValue({
      type,
      orderIndex: (fieldsQuery.data?.length || 0) + 1,
      isRequired: false,
      options: {
        columns: [],
      },
    });
    setIsQuickCreateOpen(true);
  };

  const formatChoicesPayload = (values: any) => {
    const formatted = { ...values };
    if (
      (values.type === "SELECT" || values.type === "MULTI_SELECT") &&
      values.options?.choices &&
      typeof values.options.choices === "string"
    ) {
      formatted.options = {
        ...values.options,
        choices: values.options.choices
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean),
      };
    }
    return formatted;
  };

  const onQuickFieldCreateSubmit = (values: any) => {
    const payload = formatChoicesPayload({
      ...values,
      entityId: entityIdNum,
    });

    createField.mutate(payload, {
      onSuccess: () => {
        message.success(`Khởi tạo thành công trường "${values.name}"!`);
        setIsQuickCreateOpen(false);
        quickForm.resetFields();
      },
      onError: (err: any) => {
        const errMsg =
          err?.response?.data?.message || "Không thể khởi tạo trường mới.";
        message.error(errMsg);
      },
    });
  };

  const onSaveInspectorSubmit = (values: any) => {
    if (!selectedField) return;
    const payload = formatChoicesPayload(values);

    updateField.mutate(
      {
        id: selectedField.id,
        entityId: entityIdNum,
        payload: {
          name: payload.name,
          type: payload.type,
          isRequired: payload.isRequired,
          orderIndex: payload.orderIndex,
          options: payload.options,
        },
      },
      {
        onSuccess: () => {
          message.success(
            "Cập nhật thông số kỹ thuật cấu hình trường thành công!",
          );
          setSelectedField(null);
        },
        onError: (err: any) => {
          const errMsg =
            err?.response?.data?.message || "Có lỗi xảy ra khi lưu.";
          message.error(errMsg);
        },
      },
    );
  };

  const handleDeleteFieldSubmit = (field: Field) => {
    deleteField.mutate(
      { id: field.id, entityId: entityIdNum },
      {
        onSuccess: () => {
          message.success("Đã gỡ bỏ trường dữ liệu khỏi biểu mẫu!");
          if (selectedField?.id === field.id) setSelectedField(null);
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Không thể xóa.";
          message.error(errMsg);
        },
      },
    );
  };

  // Trích xuất activeVersionId trực tiếp từ Quy trình liên đới thực tế [1]
  const activeVersionId = activeWorkflow?.versions?.[0]?.id || null;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={false}
        theme="light"
        style={{ borderRight: "1px solid #f0f0f0" }}
      >
        <div
          className="flex items-center justify-center py-4 border-b border-gray-100"
          style={{ minHeight: "64px" }}
        >
          <Title level={4} style={{ margin: 0, color: "#0050b3" }}>
            BOS Platform
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
            {/* Standard low-code workspace page header */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <Breadcrumb
                  items={[
                    { title: "Trang chủ" },
                    {
                      title: "Động hóa biểu mẫu",
                      onClick: () => router.push("/metadata"),
                      style: { cursor: "pointer" },
                    },
                    {
                      title: activeEntity
                        ? `Kiến tạo: ${activeEntity.name}`
                        : "Không gian thiết kế",
                    },
                  ]}
                />
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  Không gian Kiến tạo:{" "}
                  {activeEntity?.name || <Spin size="small" />}
                </Title>
                <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                  Trình thiết kế ba phân khu liên kết sâu sắc: Form Schema, Step
                  permissions, Formula compiler.
                </Paragraph>
              </div>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/metadata")}
              >
                Quay lại danh sách
              </Button>
            </div>

            {/* SIÊU LAYOUT BA PHÂN KHU (3-PANEL SYNC WORKSPACE) */}
            <Row gutter={[20, 20]}>
              {/* PHÂN KHU 1: TRÁI - WORKFLOW STEPS CONTROLLER TRUY VẤN LIVE STEPS (5 COLS) */}
              <Col xs={24} xl={5}>
                <WorkflowStepsController
                  versionId={activeVersionId}
                  activeStep={activeStep}
                  setActiveStep={setActiveStep}
                />
              </Col>

              {/* PHÂN KHU 2: GIỮA - FORM CANVAS PREVIEW ĐỒNG BỘ ĐỘNG (13 COLS) */}
              <Col xs={24} md={14} xl={13}>
                <DragDropCanvas
                  fields={fieldsQuery.data || []}
                  isLoading={fieldsQuery.isLoading}
                  selectedField={selectedField}
                  setSelectedField={setSelectedField}
                  activeStep={activeStep}
                  onEditClick={(field) => setSelectedField(field)}
                  onDeleteClick={(field) => handleDeleteFieldSubmit(field)}
                />
              </Col>

              {/* PHÂN KHU 3: PHẢI - TOOLBOX & FIELD INSPECTOR (6 COLS) */}
              <Col xs={24} md={10} xl={6}>
                <ToolboxAndInspector
                  fields={fieldsQuery.data || []}
                  entities={entitiesQuery.data?.data || []}
                  selectedField={selectedField}
                  onAddQuickField={handleAddQuickField}
                  onSaveInspector={onSaveInspectorSubmit}
                  isSaving={updateField.isPending}
                />
              </Col>
            </Row>
          </Space>
        </Content>
      </Layout>

      {/* --- MODAL THÊM TRƯỜNG DỮ LIỆU ĐỘNG NHANH TỪ TOOLBOX --- */}
      <Modal
        title={`Tạo trường: Kiểu ${quickCreateType}`}
        open={isQuickCreateOpen}
        onCancel={() => setIsQuickCreateOpen(false)}
        onOk={() => quickForm.submit()}
        confirmLoading={createField.isPending}
        width={600}
      >
        <Form
          form={quickForm}
          layout="vertical"
          onFinish={onQuickFieldCreateSubmit}
          style={{ marginTop: "16px" }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên trường hiển thị"
                rules={[
                  { required: true, message: "Vui lòng nhập tên trường" },
                ]}
              >
                <Input placeholder="Ví dụ: Đơn giá" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã trường (snake_case viết thường)"
                rules={[
                  {
                    required: true,
                    pattern: /^[a-z0-9_]+$/,
                    message: "Chữ thường và gạch dưới",
                  },
                ]}
              >
                <Input placeholder="unit_price" />
              </Form.Item>
            </Col>
            {/* HOÀN TOÀN KHẮC PHỤC CHẶT CHẼ THẺ ĐÓNG </Form.Item> */}
            <Col span={12}>
              <Form.Item name="type" label="Kiểu trường">
                <Select
                  disabled
                  options={[{ value: quickCreateType, label: quickCreateType }]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="orderIndex"
                label="Thứ tự hiển thị"
                rules={[{ required: true }]}
              >
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="isRequired" valuePropName="checked">
                <Checkbox>Trường này bắt buộc nhập (isRequired)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name={["options", "placeholder"]}
                label="Gợi ý nhập liệu (Placeholder)"
              >
                <Input placeholder="Gợi ý..." />
              </Form.Item>
            </Col>

            {/* options động tùy kiểu trường */}
            {(watchedQuickType === "TEXT" ||
              watchedQuickType === "EMAIL" ||
              watchedQuickType === "PHONE" ||
              watchedQuickType === "TEXTAREA") && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "minLength"]}
                    label="Độ dài tối thiểu"
                  >
                    <InputNumber className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={["options", "maxLength"]}
                    label="Độ dài tối đa"
                  >
                    <InputNumber className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "regexPattern"]}
                    label="Biểu thức chính quy (Regex)"
                  >
                    <Input placeholder="^[a-zA-Z0-9]+$" />
                  </Form.Item>
                </Col>
              </>
            )}

            {(watchedQuickType === "NUMBER" ||
              watchedQuickType === "DECIMAL" ||
              watchedQuickType === "CURRENCY" ||
              watchedQuickType === "PERCENTAGE") && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "min"]}
                    label="Giá trị tối thiểu"
                  >
                    <InputNumber className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={["options", "max"]} label="Giá trị tối đa">
                    <InputNumber className="w-full" />
                  </Form.Item>
                </Col>
                {watchedQuickType === "CURRENCY" && (
                  <Col span={24}>
                    <Form.Item
                      name={["options", "prefix"]}
                      label="Ký hiệu tiền tệ (prefix)"
                    >
                      <Input placeholder="vd: VNĐ" />
                    </Form.Item>
                  </Col>
                )}
              </>
            )}

            {(watchedQuickType === "SELECT" ||
              watchedQuickType === "MULTI_SELECT") && (
              <Col span={24}>
                <Form.Item
                  name={["options", "choices"]}
                  label="Lựa chọn (choices) - Cách nhau bằng dấu phẩy"
                  rules={[{ required: true, message: "Vui lòng nhập choices" }]}
                >
                  <Input placeholder="IT, HR, SALES" />
                </Form.Item>
              </Col>
            )}

            {watchedQuickType === "LOOKUP" && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "lookupEntityId"]}
                    label="Liên kết tới Biểu mẫu"
                    rules={[{ required: true, message: "Chọn biểu mẫu" }]}
                  >
                    <Select
                      placeholder="Chọn biểu mẫu"
                      options={(entitiesQuery.data?.data || []).map((e) => ({
                        value: e.id,
                        label: e.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={["options", "displayField"]}
                    label="Trường hiển thị"
                    rules={[{ required: true, message: "Nhập displayField" }]}
                  >
                    <Input placeholder="project_name" />
                  </Form.Item>
                </Col>
              </>
            )}

            {/* Tạo bảng con trong modal tạo nhanh */}
            {watchedQuickType === "TABLE" && (
              <Col span={24}>
                <Card
                  size="small"
                  title="Thiết lập các cột con cho Lưới TABLE"
                  headStyle={{ background: "#fafafa" }}
                >
                  <Form.List name={["options", "columns"]}>
                    {(columns, { add, remove }) => (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {columns.map(({ key, name, ...restField }) => (
                          <Card
                            size="small"
                            key={key}
                            style={{ background: "#fcfdfd" }}
                          >
                            <Space direction="vertical" className="w-full">
                              <Form.Item
                                {...restField}
                                name={[name, "name"]}
                                label="Tên cột"
                                rules={[{ required: true }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Input size="small" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "code"]}
                                label="Mã cột (snake_case)"
                                rules={[{ required: true }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Input size="small" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "type"]}
                                label="Loại cột"
                                rules={[{ required: true }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Select
                                  size="small"
                                  options={[
                                    { value: "TEXT", label: "TEXT" },
                                    { value: "NUMBER", label: "NUMBER" },
                                  ]}
                                />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "isRequired"]}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <Checkbox>Bắt buộc nhập</Checkbox>
                              </Form.Item>
                              <Button
                                type="text"
                                danger
                                onClick={() => remove(name)}
                                icon={<MinusCircleOutlined />}
                                size="small"
                              >
                                Xóa cột
                              </Button>
                            </Space>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() =>
                            add({
                              name: "",
                              code: "",
                              type: "TEXT",
                              isRequired: false,
                            })
                          }
                          block
                          icon={<PlusOutlined />}
                          size="small"
                        >
                          Thêm cột
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
}
