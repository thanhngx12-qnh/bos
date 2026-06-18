// File: src/components/metadata/WorkflowTab.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react"; // 🛑 IMPORT: useMemo [2]
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Radio,
  Typography,
  Popconfirm,
  Empty,
  Badge,
  Spin,
  Alert,
  InputNumber,
  Divider,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  SafetyCertificateOutlined,
  CopyOutlined,
  LockOutlined,
  FolderAddOutlined,
} from "@ant-design/icons";
import { useWorkflow } from "@/hooks/useWorkflow";
import { useBuilderStore } from "@/hooks/useBuilderStore";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface WorkflowTabProps {
  entityId: number;
  entity: any;
}

export default function WorkflowTab({ entityId, entity }: WorkflowTabProps) {
  const { fields } = useBuilderStore();

  const [activeVersionId, setActiveVersionId] = useState<number | undefined>(
    undefined,
  );
  const [hasNoWorkflow, setHasNoWorkflow] = useState<boolean>(false);

  // Gọi useWorkflow lần 1 để lấy danh sách workflows
  const { workflows, isLoadingWorkflows, createWorkflow, isCreatingWorkflow } =
    useWorkflow(activeVersionId, undefined, entityId);

  const workflowsList = Array.isArray(workflows)
    ? workflows
    : (workflows as any)?.data || (workflows as any)?.items || [];

  const matchedWorkflow = workflowsList.find(
    (w: any) => w.entityId === entityId,
  );
  const workflowId = matchedWorkflow?.id;

  // Gọi useWorkflow lần 2 có nạp đầy đủ ID thực tế để bóc tách versions, steps & triggers mutations
  const {
    workflowDetail: activeWorkflowDetail,
    isLoadingWorkflowDetail,
    steps: pipelineSteps,
    isLoading: isLoadingPipelineReal,
    createStep,
    updateStep,
    removeStep,
    createTransition,
    removeTransition,
    cloneVersion,
    isCloning,
    updateVersionStatus,
    isUpdatingStatus,
  } = useWorkflow(activeVersionId, workflowId, entityId);

  // 🛑 CHỐT CHẶN PHÒNG VỆ: Ổn định hóa mảng versions bằng useMemo [2]
  const versions = useMemo(() => {
    return Array.isArray(activeWorkflowDetail?.versions)
      ? activeWorkflowDetail.versions
      : [];
  }, [activeWorkflowDetail?.versions]);

  // 🛑 CHỐT CHẶN PHÒNG VỆ: Khóa chuỗi băm phiên bản để useEffect so sánh giá trị nguyên thủy [2]
  const versionsHash = useMemo(() => {
    return versions.map((v: any) => v.id).join(",");
  }, [versions]);

  useEffect(() => {
    if (!isLoadingWorkflows) {
      if (workflowId && versions.length > 0) {
        const sortedVersions = [...versions].sort(
          (a: any, b: any) => b.version - a.version,
        );
        if (
          activeVersionId === undefined ||
          !versions.some((v: any) => v.id === activeVersionId)
        ) {
          setActiveVersionId(sortedVersions[0].id);
        }

        // CHỐT CHẶN AN TOÀN: Chỉ cập nhật State khi giá trị thực sự thay đổi [2]
        if (hasNoWorkflow) {
          setHasNoWorkflow(false);
        }
      } else if (!workflowId) {
        if (!hasNoWorkflow) {
          setHasNoWorkflow(true);
        }
      }
    }
  }, [
    workflowId,
    versionsHash,
    activeVersionId,
    isLoadingWorkflows,
    hasNoWorkflow,
  ]);

  // States quản lý Modal
  const [isStepModalOpen, setIsEntityModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isRbacModalOpen, setIsRbacModalOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<any>(null);

  // Forms
  const [stepForm] = Form.useForm();
  const [transitionForm] = Form.useForm();
  const [rbacForm] = Form.useForm();

  const selectedVersion = versions.find((v: any) => v.id === activeVersionId);
  const status = selectedVersion?.status || "DRAFT";
  const isDraft = status === "DRAFT";

  const handleCreateFirstWorkflow = async () => {
    try {
      await createWorkflow({
        entityId: Number(entityId),
        name: `Luồng quy trình ${entity?.name || "mới"}`,
      });
    } catch (e) {
      console.error(
        "[DEBUG-BOS] Khởi tạo luồng quy trình đầu tiên thất bại:",
        e,
      );
    }
  };

  const handleCreateStep = async (values: any) => {
    try {
      const payload = {
        versionId: activeVersionId,
        name: values.name,
        stepType: values.stepType,
        orderIndex: Number(values.orderIndex || 0),
        permissions: {
          approverType: values.approverType || "SINGLE",
          candidateUsers: values.candidateUsers || [],
        },
      };
      await createStep(payload);
      setIsEntityModalOpen(false);
      stepForm.resetFields();
    } catch (e) {}
  };

  const handleCreateTransition = async (values: any) => {
    try {
      const payload = {
        fromStepId: values.fromStepId,
        toStepId: values.toStepId,
        autoSkip: !!values.autoSkip,
        conditionLogic: {
          actionLabel: values.actionLabel,
          requiresSignature: !!values.requiresSignature,
          rules: values.hasCondition
            ? {
                field: values.ruleField,
                operator: values.ruleOperator,
                value: values.ruleValue,
              }
            : undefined,
        },
      };
      await createTransition(payload);
      setIsTransitionModalOpen(false);
      transitionForm.resetFields();
    } catch (e) {}
  };

  const handleSaveRbac = async (values: any) => {
    try {
      const rbacPermissions = {
        approverType: activeStep?.permissions?.approverType || "SINGLE",
        candidateUsers: activeStep?.permissions?.candidateUsers || [],
        ...values,
      };

      await updateStep({
        id: activeStep.id,
        data: {
          ...activeStep,
          permissions: rbacPermissions,
        },
      });
      setIsRbacModalOpen(false);
    } catch (e) {}
  };

  const handleCloneVersion = async () => {
    try {
      const newVersion = await cloneVersion({
        wId: Number(workflowId),
        vId: Number(activeVersionId),
      });
      if (newVersion?.id) {
        setActiveVersionId(newVersion.id);
      }
    } catch (e) {}
  };

  const handlePublishVersion = async () => {
    try {
      await updateVersionStatus({
        wId: Number(workflowId),
        vId: Number(activeVersionId),
        status: "PUBLISHED",
      });
    } catch (e) {}
  };

  const handleArchiveVersion = async () => {
    try {
      await updateVersionStatus({
        wId: Number(workflowId),
        vId: Number(activeVersionId),
        status: "ARCHIVED",
      });
    } catch (e) {}
  };

  const getStatusTag = (vStatus: string) => {
    switch (vStatus) {
      case "DRAFT":
        return (
          <Tag color="orange" style={{ fontWeight: "500" }}>
            DRAFT (Bản nháp)
          </Tag>
        );
      case "PUBLISHED":
        return (
          <Tag color="green" style={{ fontWeight: "500" }}>
            PUBLISHED (Phát hành)
          </Tag>
        );
      case "ARCHIVED":
        return (
          <Tag color="red" style={{ fontWeight: "500" }}>
            ARCHIVED (Lưu trữ)
          </Tag>
        );
      default:
        return <Tag color="gray">{vStatus}</Tag>;
    }
  };

  if (hasNoWorkflow) {
    return (
      <Card
        variant="outlined"
        style={{
          textAlign: "center",
          padding: "60px 0",
          background: "#fafafa",
          borderRadius: "8px",
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space
              orientation="vertical"
              size="small"
              style={{ marginBottom: "16px" }}
            >
              <Title level={4} style={{ margin: 0 }}>
                Thực thể này chưa cấu hình Luồng quy trình
              </Title>
              <Text type="secondary">
                Hệ điều hành BOS vận hành biểu mẫu theo Workflow. Hãy khởi tạo
                phiên bản quy trình nháp đầu tiên để tiếp tục thiết kế.
              </Text>
            </Space>
          }
        >
          <Button
            type="primary"
            icon={<FolderAddOutlined />}
            size="large"
            onClick={handleCreateFirstWorkflow}
            loading={isCreatingWorkflow}
          >
            Khởi tạo quy trình nháp đầu tiên
          </Button>
        </Empty>
      </Card>
    );
  }

  const stepColumns = [
    {
      title: "Thứ tự",
      dataIndex: "orderIndex",
      key: "orderIndex",
      width: 80,
      render: (index: number) => <Badge count={index} color="blue" />,
    },
    {
      title: "Tên bước duyệt",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: "11px", color: "#8c8c8c" }}>
            Kiểu: {record.stepType}
          </div>
        </div>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 180,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => {
              setActiveStep(record);
              const initialRbacValues: Record<string, string> = {};
              fields.forEach((field) => {
                initialRbacValues[field.code] =
                  record.permissions?.[field.code] || "WRITE";
              });
              rbacForm.setFieldsValue(initialRbacValues);
              setIsRbacModalOpen(true);
            }}
          >
            {isDraft ? "RBAC (Sửa)" : "Quyền (Xem)"}
          </Button>
          {isDraft && (
            <Popconfirm
              title="Xóa bước duyệt này?"
              onConfirm={() => removeStep(record.id)}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const allTransitions = (pipelineSteps || []).reduce(
    (acc: any[], step: any) => {
      if (Array.isArray(step.transitionsOut)) {
        step.transitionsOut.forEach((t: any) => {
          acc.push({
            ...t,
            fromStepName: step.name,
            toStepName:
              (pipelineSteps || []).find((s: any) => s.id === t.toStepId)
                ?.name || "Chưa xác định",
          });
        });
      }
      return acc;
    },
    [],
  );

  const transitionColumns = [
    {
      title: "Tên nút bấm",
      key: "actionLabel",
      render: (_: any, record: any) => (
        <div>
          <Text strong>
            {record.conditionLogic?.actionLabel || "Chuyển tiếp"}
          </Text>
          {record.conditionLogic?.requiresSignature && (
            <Tag color="gold" style={{ fontSize: "10px", marginLeft: "6px" }}>
              Chữ ký số
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Sơ đồ luồng",
      key: "flow",
      render: (_: any, record: any) => (
        <Space>
          <Tag color="blue">{record.fromStepName}</Tag>
          <ArrowRightOutlined style={{ color: "#8c8c8c" }} />
          <Tag color="green">{record.toStepName}</Tag>
        </Space>
      ),
    },
    {
      title: "Ràng buộc",
      key: "rule",
      render: (_: any, record: any) => {
        const rule = record.conditionLogic?.rules;
        if (!rule)
          return (
            <Text type="secondary" style={{ fontSize: "12px" }}>
              Không có
            </Text>
          );
        return (
          <Tag color="purple">
            {rule.field} {rule.operator} {rule.value}
          </Tag>
        );
      },
    },
    ...(isDraft
      ? [
          {
            title: "Hành động",
            key: "actions",
            width: 80,
            render: (_: any, record: any) => (
              <Popconfirm
                title="Xóa đường rẽ nhánh này?"
                onConfirm={() => removeTransition(record.id)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                />
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  if (
    isLoadingWorkflows ||
    (workflowId && isLoadingWorkflowDetail && activeVersionId === undefined)
  ) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Space orientation="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Đang nạp cấu trúc phiên bản quy trình...</Text>
        </Space>
      </div>
    );
  }

  return (
    <div>
      {/* HEADER QUẢN LÝ PHIÊN BẢN (VERSIONING CONTROL HEADER) */}
      <Card
        variant="outlined"
        style={{
          marginBottom: "20px",
          background: "#fafafa",
          borderRadius: "8px",
        }}
        size="small"
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="middle">
              <Text strong style={{ fontSize: "14px" }}>
                Cấu hình Phiên bản:
              </Text>
              <Select
                value={activeVersionId}
                onChange={(val) => setActiveVersionId(val)}
                style={{ width: 180 }}
                options={versions.map((v: any) => ({
                  value: v.id,
                  label: `Phiên bản v${v.version}`,
                }))}
              />
              {getStatusTag(status)}
              {!isDraft && (
                <Tag icon={<LockOutlined />} color="default">
                  Quy trình bị khóa chỉnh sửa
                </Tag>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              {isDraft ? (
                <Button
                  type="primary"
                  icon={<SafetyCertificateOutlined />}
                  onClick={handlePublishVersion}
                  loading={isUpdatingStatus}
                >
                  Phát hành quy trình (Publish)
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  onClick={handleCloneVersion}
                  loading={isCloning}
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
                >
                  Tạo bản nháp mới (Clone để sửa)
                </Button>
              )}
              {status === "PUBLISHED" && (
                <Button
                  danger
                  onClick={handleArchiveVersion}
                  loading={isUpdatingStatus}
                >
                  Ngừng hoạt động (Archive)
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {!isDraft && (
        <Alert
          message={<strong>Lớp bảo mật Quy trình:</strong>}
          description="Để bảo toàn dữ liệu lịch sử phê duyệt của doanh nghiệp, bạn không thể trực tiếp thay đổi Steps hoặc Transitions của phiên bản đã hoạt động hoặc lưu trữ. Vui lòng bấm nút 'Tạo bản nháp mới (Clone để sửa)' ở phía trên để sửa đổi cấu hình an toàn."
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: "20px" }}
        />
      )}

      {/* CHỈ THỊ CHUNG & HÀNH ĐỘNG DRAFT */}
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            Sơ đồ luồng quy trình Pipeline
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Định nghĩa các bước phê duyệt, nút bấm chuyển tiếp và phân quyền
            biểu mẫu tương ứng cho từng bước duyệt [1].
          </Paragraph>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsEntityModalOpen(true)}
            disabled={!isDraft} // Khóa cứng nút thêm step nếu không phải nháp [2]
          >
            Thêm bước duyệt (Step)
          </Button>
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => setIsTransitionModalOpen(true)}
            disabled={!isDraft || (pipelineSteps || []).length < 2} // Khóa cứng nút thêm transition nếu không phải nháp [2]
          >
            Thêm đường rẽ nhánh (Transition)
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* BẢN ĐỒ STEPS BÊN TRÁI */}
        <Col xs={24} lg={11}>
          <Card
            title="Danh sách các Bước duyệt (Steps)"
            variant="outlined"
            style={{ minHeight: "500px" }}
          >
            <Table
              dataSource={pipelineSteps}
              columns={stepColumns}
              rowKey="id"
              pagination={false}
              loading={isLoadingPipelineReal}
              size="middle"
            />
          </Card>
        </Col>

        {/* TRANSITIONS BÊN PHẢI */}
        <Col xs={24} lg={13}>
          <Card
            title="Đường nối chuyển tiếp (Transitions)"
            variant="outlined"
            style={{ minHeight: "500px" }}
          >
            <Table
              dataSource={allTransitions}
              columns={transitionColumns}
              rowKey="id"
              pagination={false}
              loading={isLoadingPipelineReal}
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {/* MODAL TẠO BƯỚC DUYỆT (STEP) */}
      <Modal
        title="Tạo Bước duyệt mới"
        open={isStepModalOpen}
        onCancel={() => setIsEntityModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={stepForm}
          layout="vertical"
          onFinish={handleCreateStep}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Tên bước duyệt"
            rules={[{ required: true, message: "Nhập tên bước!" }]}
          >
            <Input placeholder="ví dụ: Trưởng phòng phê duyệt" />
          </Form.Item>

          <Form.Item
            name="stepType"
            label="Kiểu tác vụ bước duyệt"
            rules={[{ required: true, message: "Chọn tác vụ!" }]}
            initialValue="USER_TASK"
          >
            <Select>
              <Option value="USER_TASK">Tác vụ người dùng (USER_TASK)</Option>
              <Option value="SYSTEM_TASK">
                Hệ thống xử lý tự động (SYSTEM_TASK)
              </Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="approverType"
                label="Hình thức duyệt"
                initialValue="SINGLE"
              >
                <Select>
                  <Option value="SINGLE">Chỉ cần 1 người duyệt (SINGLE)</Option>
                  <Option value="ALL_OF">Tất cả cùng duyệt (ALL_OF)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="orderIndex"
                label="Thứ tự sắp xếp (orderIndex)"
                rules={[{ required: true, message: "Nhập số thứ tự!" }]}
              >
                <InputNumber style={{ width: "100%" }} placeholder="ví dụ: 1" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="candidateUsers"
            label="Thành viên phụ trách phê duyệt (Mảng ID)"
          >
            <Select mode="multiple" placeholder="Chọn hoặc nhập ID nhân viên">
              <Option value={1}>ID: 1 (Admin)</Option>
              <Option value={2}>ID: 2 (Manager)</Option>
              <Option value={3}>ID: 3 (Staff)</Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsEntityModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Tạo bước duyệt
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL TẠO ĐƯỜNG NỐI RẼ NHÁNH (TRANSITION) */}
      <Modal
        title="Tạo đường nối rẽ nhánh"
        open={isTransitionModalOpen}
        onCancel={() => setIsTransitionModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={transitionForm}
          layout="vertical"
          onFinish={handleCreateTransition}
          requiredMark={false}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fromStepId"
                label="Bước bắt đầu (From Step)"
                rules={[{ required: true, message: "Chọn bước đi!" }]}
              >
                <Select placeholder="Chọn bước xuất phát">
                  {pipelineSteps.map((s: any) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="toStepId"
                label="Bước đích tới (To Step)"
                rules={[{ required: true, message: "Chọn bước đích!" }]}
              >
                <Select placeholder="Chọn bước đích đến">
                  {pipelineSteps.map((s: any) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="actionLabel"
            label="Tên nút bấm hiển thị"
            rules={[{ required: true, message: "Nhập tên nút bấm!" }]}
          >
            <Input placeholder="ví dụ: Đồng ý phê duyệt, Từ chối chuyển tiếp" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="requiresSignature"
                label="Bắt buộc ký điện tử (Signature)"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="autoSkip"
                label="Tự động chuyển bước (autoSkip)"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0" }} />

          <Form.Item
            name="hasCondition"
            label="Kích hoạt điều kiện rẽ nhánh tự động"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch
              checkedChildren="Đã bật"
              unCheckedChildren="Không điều kiện"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.hasCondition !== curr.hasCondition
            }
          >
            {({ getFieldValue }) => {
              if (!getFieldValue("hasCondition")) return null;
              return (
                <Card
                  size="small"
                  style={{ background: "#fafafa", borderStyle: "dashed" }}
                >
                  <Form.Item
                    name="ruleField"
                    label="Điều kiện dựa trên trường:"
                    rules={[{ required: true, message: "Chọn trường!" }]}
                    style={{ marginBottom: "8px" }}
                  >
                    <Select placeholder="Chọn trường thông tin">
                      {fields.map((f: any) => (
                        <Option key={f.id} value={f.code}>
                          {f.name} ({f.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={10}>
                      <Form.Item
                        name="ruleOperator"
                        label="Toán tử"
                        style={{ marginBottom: 0 }}
                        initialValue="=="
                      >
                        <Select>
                          <Option value="==">bằng (==)</Option>
                          <Option value="!=">khác (!=)</Option>
                          <Option value=">">lớn hơn (&gt;)</Option>
                          <Option value="<">nhỏ hơn (&lt;)</Option>
                          <Option value=">=">lớn hơn hoặc bằng (&gt;=)</Option>
                          <Option value="<=">nhỏ hơn hoặc bằng (&lt;=)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item
                        name="ruleValue"
                        label="Giá trị so sánh"
                        rules={[{ required: true, message: "Nhập giá trị!" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="ví dụ: 20000000" />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>
              );
            }}
          </Form.Item>

          <Form.Item
            style={{ textAlign: "right", marginBottom: 0, marginTop: "20px" }}
          >
            <Space>
              <Button onClick={() => setIsTransitionModalOpen(false)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit">
                Tạo rẽ nhánh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL STEP-LEVEL RBAC (Khóa Radio khi không phải DRAFT) [2] */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: "#1677ff" }} />
            <span>Phân quyền trường tại bước: {activeStep?.name}</span>
          </Space>
        }
        open={isRbacModalOpen}
        onCancel={() => setIsRbacModalOpen(false)}
        onOk={() => {
          if (isDraft) {
            rbacForm.submit();
          } else {
            setIsRbacModalOpen(false);
          }
        }}
        width={650}
        destroyOnHidden
        okText={isDraft ? "Lưu phân quyền" : "Đóng (Chỉ xem)"}
        cancelText={isDraft ? "Hủy bỏ" : "Đóng"}
      >
        <Paragraph type="secondary">
          {isDraft
            ? "Cấu hình quyền thao tác của biểu mẫu đối với người phụ trách duyệt tại bước này."
            : "Đang xem quyền ở chế độ ĐÃ PHÁT HÀNH. Mọi quyền thiết lập bị khóa chỉnh sửa."}
        </Paragraph>

        <Form form={rbacForm} layout="vertical" onFinish={handleSaveRbac}>
          {fields.length === 0 ? (
            <Empty description="Form Canvas hiện chưa được thiết lập trường nào. Vui lòng thiết kế Form trước." />
          ) : (
            <div
              style={{
                maxHeight: "400px",
                overflowY: "auto",
                paddingRight: "8px",
              }}
            >
              {fields.map((field) => (
                <div
                  key={field.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 16px",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div>
                    <Text strong>{field.name}</Text>
                    <div style={{ fontSize: "11px", color: "#8c8c8c" }}>
                      {field.code} ({field.type})
                    </div>
                  </div>

                  {/* VÔ HIỆU HÓA RADIO GROUP BẰNG CỜ isDraft ĐỂ BẢO VỆ DỮ LIỆU [2] */}
                  <Form.Item
                    name={field.code}
                    style={{ marginBottom: 0 }}
                    initialValue="WRITE"
                  >
                    <Radio.Group
                      buttonStyle="solid"
                      size="small"
                      disabled={!isDraft}
                    >
                      <Radio.Button value="WRITE" style={{ color: "#52c41a" }}>
                        WRITE (Ghi)
                      </Radio.Button>
                      <Radio.Button value="READ" style={{ color: "#1890ff" }}>
                        READ (Xem)
                      </Radio.Button>
                      <Radio.Button value="HIDDEN" style={{ color: "#f5222d" }}>
                        HIDDEN (Ẩn)
                      </Radio.Button>
                    </Radio.Group>
                  </Form.Item>
                </div>
              ))}
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
