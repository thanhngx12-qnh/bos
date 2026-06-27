// File: src/app/metadata/[id]/fields/components/AutomationRulesManager.tsx
"use client";

import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Card,
  Typography,
  Row,
  Col,
  Divider,
  Tag,
  Badge,
  Empty,
  Tooltip,
  App,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MailOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  UserOutlined,
  SettingOutlined,
  FilterOutlined,
   ThunderboltOutlined,
} from "@ant-design/icons";
import {
  useAutomationEvents,
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  AutomationRule,
} from "@/hooks/useAutomations";
import { useEntities } from "@/hooks/useEntities";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useUsers } from "@/hooks/useUsers";
import { useFields, Field } from "@/hooks/useFields";

const { Title, Paragraph, Text } = Typography;

interface AutomationRulesManagerProps {
  entityId: number;
  fields: Field[];
}

export default function AutomationRulesManager({
  entityId,
  fields,
}: AutomationRulesManagerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Queries & Mutations
  const eventsQuery = useAutomationEvents();
  const rulesQuery = useAutomationRules();
  const createMutation = useCreateAutomationRule();
  const updateMutation = useUpdateAutomationRule();
  const deleteMutation = useDeleteAutomationRule();
  const usersQuery = useUsers(1, 1000);
  const currentEntityWorkflowsQuery = useWorkflows(entityId);

  // Watch selected trigger event in the rule form
  const watchedEventId = Form.useWatch("eventId", form);
  const selectedEvent = eventsQuery.data?.find((e) => e.id === watchedEventId);

  // Filter rules belonging to current Entity
  const entityRules = React.useMemo(() => {
    if (!rulesQuery.data) return [];
    return rulesQuery.data.filter((rule) => {
      const conds = rule.conditions;
      if (!conds || !Array.isArray(conds.rules)) return false;
      return conds.rules.some(
        (r: any) => r.field === "entityId" && Number(r.value) === Number(entityId)
      );
    });
  }, [rulesQuery.data, entityId]);

  // Handler for Toggle Switch (Active/Inactive)
  const handleToggleActive = (rule: AutomationRule, checked: boolean) => {
    updateMutation.mutate(
      { id: rule.id, isActive: checked },
      {
        onSuccess: () => {
          message.success(`Đã ${checked ? "bật" : "tắt"} quy tắc tự động thành công!`);
        },
        onError: () => {
          message.error("Không thể thay đổi trạng thái quy tắc.");
        },
      }
    );
  };

  // Open Create Modal
  const handleCreateClick = () => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      conditionsOperator: "AND",
      conditionsRules: [],
      actions: [{ type: "START_WORKFLOW", fieldMappingList: [] }],
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleEditClick = (rule: AutomationRule) => {
    setEditingRule(rule);
    form.resetFields();

    // Extract scoped metadata criteria (entityId, workflowId) from the condition rules
    const conds = rule.conditions || {};
    const conditionsOperator = conds.operator || "AND";
    const rulesList = conds.rules || [];

    const userConditionsRules = rulesList.filter(
      (r: any) => r.field !== "entityId" && r.field !== "workflowId"
    );

    const workflowIdRule = rulesList.find((r: any) => r.field === "workflowId");
    const workflowIdToListen = workflowIdRule ? Number(workflowIdRule.value) : undefined;

    // Process actions configuration
    const formattedActions = (rule.actions || []).map((act: any) => {
      if (act.type === "START_WORKFLOW") {
        const fieldMappingList = Object.entries(act.fieldMapping || {}).map(
          ([targetFieldCode, sourceFieldCode]) => ({
            targetFieldCode,
            sourceFieldCode,
          })
        );
        return {
          ...act,
          fieldMappingList,
        };
      }
      return act;
    });

    form.setFieldsValue({
      name: rule.name,
      eventId: rule.eventId,
      isActive: rule.isActive,
      conditionsOperator,
      workflowIdToListen,
      conditionsRules: userConditionsRules,
      actions: formattedActions,
    });

    setIsModalOpen(true);
  };

  // Delete handler
  const handleDeleteClick = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        message.success("Đã xóa quy tắc tự động hóa thành công!");
      },
      onError: () => {
        message.error("Có lỗi xảy ra khi xóa quy tắc tự động.");
      },
    });
  };

  // Form Submit Handler
  const onFormSubmit = (values: any) => {
    // 1. Build backend conditions object
    const condsList = [
      { field: "entityId", operator: "==", value: Number(entityId) },
    ];
    if (values.workflowIdToListen) {
      condsList.push({
        field: "workflowId",
        operator: "==",
        value: Number(values.workflowIdToListen),
      });
    }
    if (Array.isArray(values.conditionsRules)) {
      values.conditionsRules.forEach((cr: any) => {
        if (cr.field && cr.operator) {
          condsList.push({
            field: cr.field,
            operator: cr.operator,
            value: cr.value || "",
          });
        }
      });
    }

    const conditions = {
      operator: values.conditionsOperator || "AND",
      rules: condsList,
    };

    // 2. Format actions
    const formattedActions = (values.actions || []).map((act: any) => {
      const formattedAct: any = { type: act.type };
      if (act.type === "SEND_EMAIL") {
        formattedAct.to = act.to;
        formattedAct.subject = act.subject;
        formattedAct.body = act.body;
      } else if (act.type === "SEND_WEBHOOK") {
        formattedAct.url = act.url;
      } else if (act.type === "CREATE_TASK") {
        formattedAct.assigneeId = Number(act.assigneeId);
        formattedAct.taskTitle = act.taskTitle;
        formattedAct.taskDescription = act.taskDescription;
      } else if (act.type === "START_WORKFLOW") {
        formattedAct.targetEntityId = Number(act.targetEntityId);
        formattedAct.targetWorkflowId = act.targetWorkflowId ? Number(act.targetWorkflowId) : null;
        
        const fieldMapping: Record<string, string> = {};
        if (Array.isArray(act.fieldMappingList)) {
          act.fieldMappingList.forEach((fm: any) => {
            if (fm.targetFieldCode && fm.sourceFieldCode) {
              fieldMapping[fm.targetFieldCode] = fm.sourceFieldCode;
            }
          });
        }
        formattedAct.fieldMapping = fieldMapping;
      }
      return formattedAct;
    });

    const payload = {
      name: values.name,
      eventId: Number(values.eventId),
      isActive: !!values.isActive,
      conditions,
      actions: formattedActions,
    };

    if (editingRule) {
      updateMutation.mutate(
        { id: editingRule.id, ...payload },
        {
          onSuccess: () => {
            message.success("Cập nhật quy tắc tự động thành công!");
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            message.error(err?.response?.data?.message || "Lỗi khi cập nhật.");
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          message.success("Khởi tạo quy tắc tự động mới thành công!");
          setIsModalOpen(false);
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message || "Lỗi khi tạo mới.");
        },
      });
    }
  };

  // Table columns definition
  const columns = [
    {
      title: "Tên quy tắc",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong style={{ color: "#2d3748" }}>{text}</Text>,
    },
    {
      title: "Sự kiện kích hoạt",
      dataIndex: "eventDef",
      key: "eventDef",
      render: (eventDef: any) => {
        let color = "blue";
        if (eventDef?.code === "record.created") color = "cyan";
        if (eventDef?.code === "workflow.completed") color = "purple";
        return (
          <Tag color={color} style={{ borderRadius: 4, padding: "2px 8px" }}>
            <ThunderboltOutlined style={{ marginRight: 4 }} />
            {eventDef?.name || eventDef?.code}
          </Tag>
        );
      },
    },
    {
      title: "Hành động thực thi",
      dataIndex: "actions",
      key: "actions",
      render: (actions: any[]) => {
        if (!Array.isArray(actions) || actions.length === 0) return <Text type="secondary">Chưa cấu hình hành động</Text>;
        return (
          <Space direction="vertical" size={2}>
            {actions.map((act, index) => {
              let label = "";
              let icon = null;
              if (act.type === "SEND_EMAIL") {
                label = `Gửi Email tới ${act.to}`;
                icon = <MailOutlined style={{ color: "#3182ce" }} />;
              } else if (act.type === "SEND_WEBHOOK") {
                label = `Gửi Webhook tới ${act.url}`;
                icon = <LinkOutlined style={{ color: "#319795" }} />;
              } else if (act.type === "CREATE_TASK") {
                label = `Giao nhiệm vụ: ${act.taskTitle}`;
                icon = <UserOutlined style={{ color: "#d69e2e" }} />;
              } else if (act.type === "START_WORKFLOW") {
                label = `Tự động tạo biểu mẫu (Downstream) & chạy workflow`;
                icon = <PlayCircleOutlined style={{ color: "#b7791f" }} />;
              }
              return (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px" }}>
                  {icon}
                  <span style={{ color: "#4a5568" }}>{label}</span>
                </div>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: "Hoạt động",
      dataIndex: "isActive",
      key: "isActive",
      width: 120,
      render: (isActive: boolean, record: AutomationRule) => (
        <Switch
          checked={isActive}
          loading={updateMutation.isPending}
          onChange={(checked) => handleToggleActive(record, checked)}
        />
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      render: (_: any, record: AutomationRule) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa cấu hình">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#3182ce" }} />}
              onClick={() => handleEditClick(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa quy tắc tự động hóa?"
            description="Hành động này không thể hoàn tác."
            onConfirm={() => handleDeleteClick(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa quy tắc">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#1a202c" }}>
            <SettingOutlined style={{ color: "#0050b3" }} />
            Danh sách Quy tắc Tự động hóa (Automation Rules)
          </Title>
          <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
            Cấu hình các quy tắc điều hướng, gửi email/webhook hoặc chuỗi quy trình tiếp theo khi bản ghi thay đổi hoặc quy trình duyệt hoàn tất.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateClick}
          style={{
            background: "linear-gradient(135deg, #0050b3 0%, #096dd9 100%)",
            border: "none",
            borderRadius: "6px",
            boxShadow: "0 2px 4px rgba(0, 80, 179, 0.2)",
          }}
        >
          Thêm quy tắc mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={entityRules}
        rowKey="id"
        loading={rulesQuery.isLoading || eventsQuery.isLoading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: (
            <Empty
              description="Chưa có quy tắc tự động nào được thiết lập cho biểu mẫu này."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="dashed" onClick={handleCreateClick}>
                Kiến tạo Quy tắc Đầu tiên
              </Button>
            </Empty>
          ),
        }}
      />

      {/* MODAL CẤU HÌNH QUY TẮC TỰ ĐỘNG HÓA */}
      <Modal
        title={
          <div style={{ fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: 8, color: "#1a202c" }}>
            <SettingOutlined style={{ color: "#0050b3" }} />
            {editingRule ? "Cập nhật Quy tắc Tự động" : "Thiết lập Quy tắc Tự động Mới"}
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={760}
        okText={editingRule ? "Cập nhật" : "Khởi tạo"}
        cancelText="Hủy bỏ"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFormSubmit}
          style={{ marginTop: 20 }}
        >
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="name"
                label={<Text strong>Tên quy tắc tự động hóa</Text>}
                rules={[{ required: true, message: "Vui lòng nhập tên quy tắc" }]}
              >
                <Input placeholder="Ví dụ: Tự động chạy quy trình Hợp đồng sau khi Đơn hàng duyệt" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="eventId"
                label={<Text strong>Sự kiện kích hoạt (Trigger)</Text>}
                rules={[{ required: true, message: "Vui lòng chọn sự kiện kích hoạt" }]}
              >
                <Select
                  placeholder="Chọn trigger..."
                  options={eventsQuery.data?.map((e) => ({ value: e.id, label: e.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Special filter if the trigger is workflow.completed */}
          {selectedEvent?.code === "workflow.completed" && (
            <Form.Item
              name="workflowIdToListen"
              label={<Text strong>Áp dụng khi hoàn thành quy trình cụ thể</Text>}
              tooltip="Chọn quy trình cụ thể của biểu mẫu hiện tại mà khi hoàn thành sẽ kích hoạt quy tắc này. Để trống nếu áp dụng cho toàn bộ quy trình."
            >
              <Select
                placeholder="Áp dụng cho tất cả quy trình..."
                allowClear
                options={currentEntityWorkflowsQuery.data?.data?.map((w) => ({
                  value: w.id,
                  label: w.name,
                }))}
              />
            </Form.Item>
          )}

          <Form.Item name="isActive" valuePropName="checked" style={{ marginBottom: 12 }}>
            <Switch checkedChildren="Kích hoạt" unCheckedChildren="Tạm dừng" defaultChecked />
          </Form.Item>

          <Divider style={{ margin: "16px 0" }} />

          {/* PHÂN KHU 2: ĐIỀU KIỆN LỌC (CONDITIONS BUILDER) */}
          <Card
            size="small"
            title={
              <Space>
                <FilterOutlined style={{ color: "#0050b3" }} />
                <span>Điều kiện lọc nâng cao (Criteria Filters)</span>
              </Space>
            }
            headStyle={{ background: "#f7fafc", borderBottom: "1px solid #edf2f7" }}
            bodyStyle={{ padding: "16px" }}
            style={{ marginBottom: 20, border: "1px solid #e2e8f0" }}
          >
            <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
              <Col span={10}>
                <Form.Item
                  name="conditionsOperator"
                  label="Loại liên kết logic"
                  style={{ marginBottom: 0 }}
                  initialValue="AND"
                >
                  <Select
                    options={[
                      { value: "AND", label: "Tất cả điều kiện đúng (AND)" },
                      { value: "OR", label: "Chỉ cần 1 điều kiện đúng (OR)" },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.List name="conditionsRules">
              {(fieldsList, { add, remove }) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {fieldsList.map((ruleField) => (
                    <Space key={ruleField.key} align="baseline" style={{ display: "flex", width: "100%" }}>
                      <Form.Item
                        {...ruleField}
                        name={[ruleField.name, "field"]}
                        rules={[{ required: true, message: "Chọn trường lọc" }]}
                        style={{ marginBottom: 0, width: 220 }}
                      >
                        <Select
                          placeholder="Chọn trường dữ liệu..."
                          options={fields.map((f) => ({ value: f.code, label: `${f.name} (${f.code})` }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...ruleField}
                        name={[ruleField.name, "operator"]}
                        rules={[{ required: true, message: "Chọn toán tử" }]}
                        style={{ marginBottom: 0, width: 180 }}
                      >
                        <Select
                          placeholder="Phép toán..."
                          options={[
                            { value: "==", label: "Bằng (=)" },
                            { value: "!=", label: "Khác (!=)" },
                            { value: ">", label: "Lớn hơn (>)" },
                            { value: "<", label: "Nhỏ hơn (<)" },
                            { value: ">=", label: "Lớn hơn hoặc bằng (>=)" },
                            { value: "<=", label: "Nhỏ hơn hoặc bằng (<=)" },
                            { value: "CONTAINS", label: "Chứa chuỗi" },
                            { value: "IS_NULL", label: "Trống" },
                            { value: "IS_NOT_NULL", label: "Không trống" },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => {
                          const prevOp = prevValues?.conditionsRules?.[ruleField.name]?.operator;
                          const currOp = currentValues?.conditionsRules?.[ruleField.name]?.operator;
                          return prevOp !== currOp;
                        }}
                      >
                        {({ getFieldValue }) => {
                          const op = getFieldValue(["conditionsRules", ruleField.name, "operator"]);
                          if (op === "IS_NULL" || op === "IS_NOT_NULL") return null;
                          return (
                            <Form.Item
                              {...ruleField}
                              name={[ruleField.name, "value"]}
                              rules={[{ required: true, message: "Nhập giá trị" }]}
                              style={{ marginBottom: 0, width: 200 }}
                            >
                              <Input placeholder="Giá trị so sánh..." />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>

                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(ruleField.name)}
                      />
                    </Space>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ field: undefined, operator: "==", value: "" })}
                    icon={<PlusOutlined />}
                    style={{ width: "100%" }}
                    size="small"
                  >
                    Thêm điều kiện lọc
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>

          <Divider style={{ margin: "20px 0" }} />

          {/* PHÂN KHU 3: HÀNH ĐỘNG THỰC THI (ACTIONS BUILDER) */}
          <Card
            size="small"
            title={
              <Space>
                <PlayCircleOutlined style={{ color: "#0050b3" }} />
                <span>Hành động thực thi (Execution Actions)</span>
              </Space>
            }
            headStyle={{ background: "#f7fafc", borderBottom: "1px solid #edf2f7" }}
            bodyStyle={{ padding: "16px" }}
            style={{ border: "1px solid #e2e8f0" }}
          >
            <Form.List name="actions">
              {(fieldsList, { add, remove }) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {fieldsList.map((actionField) => (
                    <Card
                      key={actionField.key}
                      size="small"
                      style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8 }}
                      title={
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                          <Text strong style={{ color: "#4a5568" }}>Hành động #{actionField.name + 1}</Text>
                          {fieldsList.length > 1 && (
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={<DeleteOutlined />}
                              onClick={() => remove(actionField.name)}
                            >
                              Xóa hành động
                            </Button>
                          )}
                        </div>
                      }
                    >
                      <Form.Item
                        {...actionField}
                        name={[actionField.name, "type"]}
                        label="Loại hành động"
                        rules={[{ required: true, message: "Chọn loại hành động" }]}
                        style={{ marginBottom: 12 }}
                      >
                        <Select
                          options={[
                            { value: "START_WORKFLOW", label: "Tự động kích hoạt quy trình con (START_WORKFLOW)" },
                            { value: "SEND_EMAIL", label: "Gửi Email Thông báo (SEND_EMAIL)" },
                            { value: "SEND_WEBHOOK", label: "Gửi Webhook tích hợp (SEND_WEBHOOK)" },
                            { value: "CREATE_TASK", label: "Giao nhiệm vụ độc lập (CREATE_TASK)" },
                          ]}
                          onChange={() => {
                            // Clear specific properties inside the action card when type changes
                            const actions = form.getFieldValue("actions") || [];
                            if (actions[actionField.name]) {
                              const type = actions[actionField.name].type;
                              actions[actionField.name] = { type };
                              form.setFieldsValue({ actions });
                            }
                          }}
                        />
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => {
                          const prevType = prevValues?.actions?.[actionField.name]?.type;
                          const currType = currentValues?.actions?.[actionField.name]?.type;
                          return prevType !== currType;
                        }}
                      >
                        {({ getFieldValue }) => {
                          const actionType = getFieldValue(["actions", actionField.name, "type"]);
                          if (actionType === "SEND_EMAIL") {
                            return (
                              <Row gutter={12}>
                                <Col span={12}>
                                  <Form.Item
                                    {...actionField}
                                    name={[actionField.name, "to"]}
                                    label="Email người nhận"
                                    rules={[{ required: true, message: "Nhập email" }]}
                                  >
                                    <Input placeholder="ví dụ: admin@company.com" />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    {...actionField}
                                    name={[actionField.name, "subject"]}
                                    label="Tiêu đề Email"
                                    rules={[{ required: true, message: "Nhập tiêu đề" }]}
                                  >
                                    <Input placeholder="Nhập tiêu đề email..." />
                                  </Form.Item>
                                </Col>
                                <Col span={24}>
                                  <Form.Item
                                    {...actionField}
                                    name={[actionField.name, "body"]}
                                    label="Nội dung Email"
                                    rules={[{ required: true, message: "Nhập nội dung" }]}
                                  >
                                    <Input.TextArea rows={3} placeholder="Hỗ trợ các biến như {creator_email}, {id}... " />
                                  </Form.Item>
                                </Col>
                              </Row>
                            );
                          }

                          if (actionType === "SEND_WEBHOOK") {
                            return (
                              <Form.Item
                                {...actionField}
                                name={[actionField.name, "url"]}
                                label="Địa chỉ URL nhận Webhook API"
                                rules={[{ required: true, message: "Nhập URL Webhook" }]}
                              >
                                <Input placeholder="https://api.yourdomain.com/webhooks/listener" />
                              </Form.Item>
                            );
                          }

                          if (actionType === "CREATE_TASK") {
                            return (
                              <Row gutter={12}>
                                <Col span={12}>
                                  <Form.Item
                                    {...actionField}
                                    name={[actionField.name, "assigneeId"]}
                                    label="Người nhận nhiệm vụ"
                                    rules={[{ required: true, message: "Chọn người nhận nhiệm vụ" }]}
                                  >
                                    <Select
                                      placeholder="Chọn nhân viên..."
                                      options={usersQuery.data?.data?.map((u) => ({
                                        value: u.id,
                                        label: `${u.fullName} (${u.email})`,
                                      }))}
                                      showSearch
                                      filterOption={(input, opt) =>
                                        String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                      }
                                    />
                                  </Form.Item>
                                </Col>
                                <Col span={12}>
                                  <Form.Item
                                    {...actionField}
                                    name={[actionField.name, "taskTitle"]}
                                    label="Tiêu đề công việc"
                                    rules={[{ required: true, message: "Nhập tiêu đề công việc" }]}
                                  >
                                    <Input placeholder="Ví dụ: Kiểm tra tiến độ thanh toán hợp đồng..." />
                                  </Form.Item>
                                </Col>
                                <Col span={24}>
                                  <Form.Item
                                    {...actionField}
                                    name={[actionField.name, "taskDescription"]}
                                    label="Mô tả công việc chi tiết"
                                  >
                                    <Input.TextArea rows={2} placeholder="Mô tả chi tiết nhiệm vụ cần thực hiện..." />
                                  </Form.Item>
                                </Col>
                              </Row>
                            );
                          }

                          if (actionType === "START_WORKFLOW") {
                            return (
                              <StartWorkflowConfigurator
                                actionName={actionField.name}
                                currentEntityFields={fields}
                              />
                            );
                          }

                          return null;
                        }}
                      </Form.Item>
                    </Card>
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add({ type: "START_WORKFLOW", fieldMappingList: [] })}
                    icon={<PlusOutlined />}
                    style={{ width: "100%" }}
                  >
                    Thêm hành động khác
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>
        </Form>
      </Modal>
    </Card>
  );
}

/**
 * HELPER TO EVALUATE FIELD TYPE COMPATIBILITY FOR DATA MAPPINGS
 */
const isTypeCompatible = (targetType: string, sourceType: string): boolean => {
  const refTypes = ["USER_REF", "DEPT_REF", "ROLE_REF"];
  
  // If either side is a reference type, strictly enforce that they must be identical
  if (refTypes.includes(targetType) || refTypes.includes(sourceType)) {
    return targetType === sourceType;
  }

  if (targetType === sourceType) return true;

  const numericTypes = ["NUMBER", "DECIMAL", "CURRENCY", "PERCENTAGE"];

  // Numeric types are fully compatible with each other
  if (numericTypes.includes(targetType) && numericTypes.includes(sourceType)) {
    return true;
  }

  // Date/Time types are compatible with each other
  const dateTypes = ["DATE", "DATETIME", "MONTH_YEAR"];
  if (dateTypes.includes(targetType) && dateTypes.includes(sourceType)) {
    return true;
  }

  // TEXT/TEXTAREA targets can accept any type (string serialization fallback)
  if (targetType === "TEXT" || targetType === "TEXTAREA") {
    return true;
  }

  return false;
};

/**
 * SUB-COMPONENT TO MANAGE CONTEXTUAL ASYNC DROPDOWNS AND FIELD MAPPING CONFIG FOR START_WORKFLOW ACTION
 */
interface StartWorkflowConfiguratorProps {
  actionName: number;
  currentEntityFields: Field[];
}

const StartWorkflowConfigurator: React.FC<StartWorkflowConfiguratorProps> = ({
  actionName,
  currentEntityFields,
}) => {
  const form = Form.useFormInstance();
  const targetEntityId = Form.useWatch(["actions", actionName, "targetEntityId"], form);

  // Fetch workflows for chosen target entity
  const { data: workflowsData, isLoading: isWorkflowsLoading } = useWorkflows(targetEntityId || null);
  const targetWorkflows = workflowsData?.data || [];

  // Fetch fields for chosen target entity
  const { data: targetFields, isLoading: isFieldsLoading } = useFields(targetEntityId || null);

  const entitiesQuery = useEntities(1, 100);
  const entities = entitiesQuery.data?.data || [];

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item
          name={[actionName, "targetEntityId"]}
          label="Biểu mẫu đích (Biểu mẫu con sẽ tự động sinh)"
          rules={[{ required: true, message: "Chọn biểu mẫu con cần sinh" }]}
        >
          <Select
            placeholder="Chọn biểu mẫu..."
            options={entities.map((e) => ({ value: e.id, label: `${e.name} (${e.code})` }))}
            onChange={() => {
              // Clear dependent target fields on target entity change
              const actions = form.getFieldValue("actions") || [];
              if (actions[actionName]) {
                actions[actionName].targetWorkflowId = undefined;
                actions[actionName].fieldMappingList = [];
                form.setFieldsValue({ actions });
              }
            }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item
          name={[actionName, "targetWorkflowId"]}
          label="Quy trình phê duyệt đích cần kích hoạt"
          tooltip="Hệ thống sẽ tìm phiên bản quy trình đã PUBLISHED của biểu mẫu đích để kích hoạt. Để trống nếu chỉ tạo hồ sơ thô."
        >
          <Select
            placeholder="Không kích hoạt quy trình duyệt..."
            allowClear
            loading={isWorkflowsLoading}
            options={targetWorkflows.map((w) => ({ value: w.id, label: w.name }))}
          />
        </Form.Item>
      </Col>

      {targetEntityId && (
        <Col span={24} style={{ marginTop: 12 }}>
          <Card
            size="small"
            title="Định cấu hình truyền/gán giá trị sang Biểu mẫu con"
            style={{ background: "#f8fafc", border: "1px dashed #cbd5e0" }}
          >
            <Form.List name={[actionName, "fieldMappingList"]}>
              {(mappingFields, { add, remove }) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mappingFields.map((fmField) => (
                    <MappingRow
                      key={fmField.key}
                      actionName={actionName}
                      mappingFieldName={fmField.name}
                      fmField={fmField}
                      remove={remove}
                      targetFields={targetFields || []}
                      currentEntityFields={currentEntityFields}
                      isFieldsLoading={isFieldsLoading}
                    />
                  ))}
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    style={{ width: "100%", marginTop: 8 }}
                    size="small"
                  >
                    Thêm ánh xạ trường dữ liệu
                  </Button>
                </div>
              )}
            </Form.List>
          </Card>
        </Col>
      )}
    </Row>
  );
};

/**
 * INDIVIDUAL MAPPING ROW WITH DYNAMIC VALUE TYPE FILTERING AND FORM VALIDATOR
 */
interface MappingRowProps {
  actionName: number;
  mappingFieldName: number;
  fmField: any;
  remove: (index: number) => void;
  targetFields: Field[];
  currentEntityFields: Field[];
  isFieldsLoading: boolean;
}

const MappingRow: React.FC<MappingRowProps> = ({
  actionName,
  mappingFieldName,
  fmField,
  remove,
  targetFields,
  currentEntityFields,
  isFieldsLoading,
}) => {
  const form = Form.useFormInstance();
  
  // Watch target field code selected for this row
  const selectedTargetFieldCode = Form.useWatch(
    ["actions", actionName, "fieldMappingList", mappingFieldName, "targetFieldCode"],
    form
  );

  // Get target type
  const targetField = targetFields.find((f) => f.code === selectedTargetFieldCode);
  const targetType = targetField ? targetField.type : null;

  // Filter current entity's fields by compatibility
  const filteredSourceFields = React.useMemo(() => {
    if (!targetType) return currentEntityFields;
    return currentEntityFields.filter((f) => isTypeCompatible(targetType, f.type));
  }, [targetType, currentEntityFields]);

  return (
    <Space align="baseline" style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
      <Form.Item
        {...fmField}
        name={[fmField.name, "targetFieldCode"]}
        rules={[{ required: true, message: "Chọn trường nhận" }]}
        style={{ marginBottom: 0, width: 260 }}
      >
        <Select
          placeholder="Gán vào trường nhận..."
          loading={isFieldsLoading}
          options={targetFields.map((f) => ({
            value: f.code,
            label: `${f.name} (${f.code}) - [${f.type}]`,
          }))}
          onChange={() => {
            // Reset source field code for this row when target field changes
            const actions = form.getFieldValue("actions") || [];
            if (actions[actionName]?.fieldMappingList?.[mappingFieldName]) {
              actions[actionName].fieldMappingList[mappingFieldName].sourceFieldCode = undefined;
              form.setFieldsValue({ actions });
            }
          }}
        />
      </Form.Item>

      <span style={{ fontWeight: "bold", color: "#718096" }}>← Gán bằng giá trị của ←</span>

      <Form.Item
        {...fmField}
        name={[fmField.name, "sourceFieldCode"]}
        rules={[
          { required: true, message: "Chọn trường nguồn" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || !targetType) return Promise.resolve();
              const srcField = currentEntityFields.find((f) => f.code === value);
              if (srcField && !isTypeCompatible(targetType, srcField.type)) {
                return Promise.reject(
                  new Error(`Kiểu ${srcField.type} không tương thích với kiểu ${targetType}!`)
                );
              }
              return Promise.resolve();
            },
          }),
        ]}
        style={{ marginBottom: 0, width: 260 }}
      >
        <Select
          placeholder={selectedTargetFieldCode ? "Chọn nguồn tương thích..." : "Chọn trường nhận trước..."}
          disabled={!selectedTargetFieldCode}
          options={filteredSourceFields.map((f) => ({
            value: f.code,
            label: `${f.name} (${f.code}) - [${f.type}]`,
          }))}
        />
      </Form.Item>

      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => remove(fmField.name)}
      />
    </Space>
  );
};
