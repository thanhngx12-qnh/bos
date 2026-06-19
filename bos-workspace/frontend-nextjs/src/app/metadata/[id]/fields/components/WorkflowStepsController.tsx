// File: src/app/metadata/[id]/fields/components/WorkflowStepsController.tsx
"use client";

import React, { useState } from "react";
import {
  Card,
  Space,
  Typography,
  List,
  Badge,
  Divider,
  Spin,
  Button,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Popconfirm,
  App,
} from "antd";
import {
  PartitionOutlined,
  SafetyOutlined,
  RightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  CloudUploadOutlined,
} from "@ant-design/icons";
import {
  useWorkflowSteps,
  useUpdateStep,
  useCreateWorkflow,
  useCreateStep,
  useDeleteStep,
  useCloneWorkflowVersion,
  useUpdateWorkflowVersionStatus,
  WorkflowStep,
} from "@/hooks/useWorkflows";
import { useRoles } from "@/hooks/useRoles";
import { useUsers } from "@/hooks/useUsers";
import { Field } from "@/hooks/useFields";

const { Text, Paragraph } = Typography;

interface WorkflowStepsControllerProps {
  entityId: number;
  entityName: string;
  workflowId: number | null;
  versionId: number | null;
  selectedVersionId: number | null;
  setSelectedVersionId: (id: number | null) => void;
  versions: any[];
  fields: Field[];
  activeStep: WorkflowStep | null;
  setActiveStep: (step: WorkflowStep | null) => void;
}

export default function WorkflowStepsController({
  entityId,
  entityName,
  workflowId,
  versionId,
  selectedVersionId,
  setSelectedVersionId,
  versions,
  fields,
  activeStep,
  setActiveStep,
}: WorkflowStepsControllerProps) {
  // Lấy dữ liệu các Bước duyệt từ database [1]
  const { data: steps = [], isLoading } = useWorkflowSteps(versionId);

  // Gọi APIs lấy Roles & Users từ Database [1]
  const { data: rolesData } = useRoles(1, 100);
  const roles = rolesData?.data || [];

  const { data: usersData } = useUsers(1, 100);
  const users = usersData?.data || [];

  // Các mutations xử lý API [1]
  const createWorkflowMutation = useCreateWorkflow();
  const createStepMutation = useCreateStep();
  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const cloneVersionMutation = useCloneWorkflowVersion();
  const updateVersionStatusMutation = useUpdateWorkflowVersionStatus();

  const { message } = App.useApp();
  const [form] = Form.useForm();

  // Trạng thái Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

  const currentVersion = versions.find((v) => v.id === selectedVersionId);

  // Khởi tạo quy trình mới nếu chưa có [1]
  const handleCreateWorkflow = () => {
    createWorkflowMutation.mutate(
      {
        entityId,
        name: `Quy trình ${entityName || "Biểu mẫu"}`,
        description: `Quy trình tự động hóa cho biểu mẫu ${entityName || ""}`,
      },
      {
        onSuccess: () => {
          message.success("Khởi tạo Quy trình & Version 1 DRAFT thành công!");
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Không thể khởi tạo Quy trình.";
          message.error(errMsg);
        },
      }
    );
  };

  // Nhân bản phiên bản quy trình [1]
  const handleCloneVersion = () => {
    if (!workflowId || !selectedVersionId) return;
    cloneVersionMutation.mutate(
      { workflowId, versionId: selectedVersionId },
      {
        onSuccess: (newVersion) => {
          message.success(`Đã nhân bản thành phiên bản v${newVersion.version} mới (DRAFT)!`);
          setSelectedVersionId(newVersion.id);
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Lỗi khi nhân bản phiên bản.";
          message.error(errMsg);
        },
      }
    );
  };

  // Xuất bản phiên bản quy trình [1]
  const handlePublishVersion = () => {
    if (!workflowId || !selectedVersionId) return;
    updateVersionStatusMutation.mutate(
      { workflowId, versionId: selectedVersionId, status: "PUBLISHED" },
      {
        onSuccess: () => {
          message.success("Đã xuất bản phiên bản này thành công!");
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Lỗi khi xuất bản phiên bản.";
          message.error(errMsg);
        },
      }
    );
  };

  // Mở modal tạo bước duyệt mới
  const handleOpenAddStepModal = () => {
    setEditingStep(null);
    form.resetFields();
    // Tính toán orderIndex tiếp theo
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.orderIndex)) + 1 : 1;
    form.setFieldsValue({
      name: "",
      stepType: "USER_TASK",
      orderIndex: nextOrder,
      approverType: "SINGLE",
      assigneeType: "INITIATOR",
    });
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa bước duyệt
  const handleOpenEditStepModal = (step: WorkflowStep) => {
    setEditingStep(step);
    form.resetFields();

    const stepConfig = step.permissions || {};
    const approverType = stepConfig.approverType || "SINGLE";
    const assigneeExpression = stepConfig.assigneeExpression || "";
    const candidateUsers = stepConfig.candidateUsers || [];

    let assigneeType = "INITIATOR";
    let assigneeRoleId = undefined;
    let assigneeFieldCode = undefined;
    let assigneeUsers = undefined;

    if (assigneeExpression === "$initiator") {
      assigneeType = "INITIATOR";
    } else if (assigneeExpression === "$initiator.manager") {
      assigneeType = "MANAGER";
    } else if (assigneeExpression.startsWith("$role:")) {
      assigneeType = "ROLE";
      assigneeRoleId = parseInt(assigneeExpression.split(":")[1], 10);
    } else if (assigneeExpression.startsWith("$record.data.")) {
      assigneeType = "FIELD";
      assigneeFieldCode = assigneeExpression.split(".")[2];
    } else if (candidateUsers.length > 0) {
      assigneeType = "CUSTOM_USERS";
      assigneeUsers = candidateUsers;
    }

    form.setFieldsValue({
      name: step.name,
      stepType: step.stepType,
      orderIndex: step.orderIndex,
      approverType,
      assigneeType,
      assigneeRoleId,
      assigneeFieldCode,
      assigneeUsers,
    });
    setIsModalOpen(true);
  };

  // Xóa bước duyệt [1]
  const handleDeleteStep = (step: WorkflowStep) => {
    if (!versionId) return;
    deleteStepMutation.mutate(
      { id: step.id, versionId },
      {
        onSuccess: () => {
          message.success(`Đã gỡ bỏ bước duyệt "${step.name}"!`);
          if (activeStep?.id === step.id) {
            setActiveStep(null);
          }
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Không thể xóa bước duyệt.";
          message.error(errMsg);
        },
      }
    );
  };

  // Submit modal form
  const handleFormSubmit = (values: any) => {
    if (!versionId) return;

    let assigneeExpression = "";
    let candidateUsers: number[] = [];

    if (values.assigneeType === "INITIATOR") {
      assigneeExpression = "$initiator";
    } else if (values.assigneeType === "MANAGER") {
      assigneeExpression = "$initiator.manager";
    } else if (values.assigneeType === "ROLE") {
      assigneeExpression = `$role:${values.assigneeRoleId}`;
    } else if (values.assigneeType === "FIELD") {
      assigneeExpression = `$record.data.${values.assigneeFieldCode}`;
    } else if (values.assigneeType === "CUSTOM_USERS") {
      candidateUsers = values.assigneeUsers || [];
    }

    // Giữ lại cấu hình phân quyền các trường cũ
    const existingFieldPermissions = editingStep
      ? Object.fromEntries(
          Object.entries(editingStep.permissions || {}).filter(
            ([key]) =>
              key !== "approverType" &&
              key !== "assigneeExpression" &&
              key !== "candidateUsers"
          )
        )
      : {};

    const updatedPermissions = {
      ...existingFieldPermissions,
      approverType: values.approverType,
      assigneeExpression,
      candidateUsers,
    };

    const payload = {
      name: values.name,
      stepType: values.stepType,
      orderIndex: values.orderIndex,
      permissions: updatedPermissions,
    };

    if (editingStep) {
      // Cập nhật bước duyệt
      updateStepMutation.mutate(
        {
          id: editingStep.id,
          versionId,
          payload,
        },
        {
          onSuccess: () => {
            message.success(`Cập nhật thông tin bước "${values.name}" thành công!`);
            setIsModalOpen(false);
            if (activeStep?.id === editingStep.id) {
              setActiveStep({
                ...activeStep,
                name: values.name,
                stepType: values.stepType,
                orderIndex: values.orderIndex,
                permissions: updatedPermissions,
              });
            }
            setEditingStep(null);
          },
          onError: (err: any) => {
            const errMsg = err?.response?.data?.message || "Lỗi khi cập nhật bước duyệt.";
            message.error(errMsg);
          },
        }
      );
    } else {
      // Tạo bước duyệt mới
      createStepMutation.mutate(
        {
          versionId,
          name: values.name,
          stepType: values.stepType,
          orderIndex: values.orderIndex,
          permissions: updatedPermissions,
        },
        {
          onSuccess: () => {
            message.success(`Tạo bước duyệt "${values.name}" thành công!`);
            setIsModalOpen(false);
          },
          onError: (err: any) => {
            const errMsg = err?.response?.data?.message || "Lỗi khi tạo bước duyệt.";
            message.error(errMsg);
          },
        }
      );
    }
  };

  // Tóm tắt thông tin người duyệt của bước duyệt
  const getAssigneeSummary = (step: WorkflowStep) => {
    const stepConfig = step.permissions || {};
    const assigneeExpression = stepConfig.assigneeExpression || "";
    const candidateUsers = stepConfig.candidateUsers || [];

    if (assigneeExpression === "$initiator") {
      return "Người tạo phiếu";
    }
    if (assigneeExpression === "$initiator.manager") {
      return "Quản lý trực tiếp";
    }
    if (assigneeExpression.startsWith("$role:")) {
      const rId = parseInt(assigneeExpression.split(":")[1], 10);
      const r = roles.find((role) => role.id === rId);
      return `Vai trò: ${r ? r.name : `Role #${rId}`}`;
    }
    if (assigneeExpression.startsWith("$record.data.")) {
      const fCode = assigneeExpression.split(".")[2];
      const f = fields.find((field) => field.code === fCode);
      return `Trường: ${f ? f.name : fCode}`;
    }
    if (candidateUsers.length > 0) {
      if (candidateUsers.length === 1) {
        const u = users.find((user) => user.id === candidateUsers[0]);
        return u ? u.fullName : `User #${candidateUsers[0]}`;
      }
      return `${candidateUsers.length} tài khoản`;
    }
    return "Chưa cấu hình";
  };

  return (
    <Card
      title={
        <Space>
          <PartitionOutlined style={{ color: "#0050b3" }} />
          <Text strong>Luồng Quy trình & Phân Quyền</Text>
        </Space>
      }
      extra={
        versionId && (
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={handleOpenAddStepModal}
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Thêm bước
          </Button>
        )
      }
      className="shadow-sm h-full"
      styles={{ body: { padding: "16px" } }}
    >
      {/* Bộ điều khiển Phiên bản Quy trình */}
      {versionId && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px",
            background: "#fafafa",
            borderRadius: "8px",
            border: "1px solid #f0f0f0",
          }}
        >
          <Space direction="vertical" style={{ width: "100%" }} size={8}>
            <div className="flex justify-between items-center">
              <Text strong style={{ fontSize: "12px" }}>
                Phiên bản Quy trình:
              </Text>
              {currentVersion && (
                <Badge
                  status={currentVersion.status === "PUBLISHED" ? "success" : "warning"}
                  text={currentVersion.status}
                  style={{ fontSize: "11px" }}
                />
              )}
            </div>
            <div className="flex gap-2 w-full">
              <Select
                value={selectedVersionId}
                onChange={(val) => setSelectedVersionId(val)}
                style={{ flex: 1 }}
                options={versions.map((v) => ({
                  value: v.id,
                  label: `v${v.version} (${v.status})`,
                }))}
              />
              <Button
                type="default"
                icon={<CopyOutlined />}
                loading={cloneVersionMutation.isPending}
                onClick={handleCloneVersion}
                title="Nhân bản phiên bản thành nháp mới"
              />
              {currentVersion?.status === "DRAFT" && (
                <Popconfirm
                  title="Xuất bản phiên bản này?"
                  description="Phiên bản này sẽ trở thành phiên bản chạy chính thức."
                  onConfirm={handlePublishVersion}
                  okText="Xuất bản"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    icon={<CloudUploadOutlined />}
                    loading={updateVersionStatusMutation.isPending}
                    title="Xuất bản (Publish)"
                    style={{ background: "#52c41a", borderColor: "#52c41a" }}
                  />
                </Popconfirm>
              )}
            </div>
          </Space>
        </div>
      )}

      <Paragraph
        type="secondary"
        style={{ fontSize: "13px", marginBottom: "16px" }}
      >
        Nhấp chọn một Bước dưới đây để thiết lập phân quyền trực quan `HIỆN /
        SỬA / ẨN` trường ngay trên Canvas ở giữa [1].
      </Paragraph>

      {isLoading ? (
        <div className="flex justify-center items-center py-6">
          <Spin size="small" tip="Đang tải..." />
        </div>
      ) : versionId === null ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "12px" }}>
            Biểu mẫu này chưa được liên kết với Quy trình duyệt nào.
          </Text>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            loading={createWorkflowMutation.isPending}
            onClick={handleCreateWorkflow}
            style={{
              background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
              border: "none",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(24, 144, 255, 0.2)",
            }}
          >
            Khởi tạo Quy trình
          </Button>
        </div>
      ) : steps.length > 0 ? (
        <List
          dataSource={[...steps].sort((a, b) => a.orderIndex - b.orderIndex)}
          renderItem={(step) => {
            const isActive = activeStep?.id === step.id;
            return (
              <List.Item
                onClick={() => setActiveStep(isActive ? null : step)}
                style={{
                  cursor: "pointer",
                  borderRadius: "6px",
                  padding: "12px",
                  marginBottom: "8px",
                  backgroundColor: isActive ? "#e6f7ff" : "transparent",
                  border: isActive ? "1px solid #91d5ff" : "1px solid #f0f0f0",
                  transition: "all 0.2s",
                }}
                className="hover:bg-slate-50"
              >
                <div className="flex justify-between items-center w-full">
                  <Space direction="vertical" size={2}>
                    <Text
                      strong={isActive}
                      style={{ color: isActive ? "#0050b3" : "inherit" }}
                    >
                      {step.orderIndex}. {step.name}
                    </Text>
                    <Space style={{ fontSize: "11px" }}>
                      <Badge
                        status={
                          step.stepType === "USER_TASK"
                            ? "processing"
                            : "default"
                        }
                      />
                      <Text type="secondary">{step.stepType}</Text>
                      <Divider type="vertical" style={{ margin: "0 4px" }} />
                      <Text type="secondary" italic>
                        {getAssigneeSummary(step)}
                      </Text>
                    </Space>
                  </Space>
                  <Space size={4} onClick={(e) => e.stopPropagation()}>
                    {isActive ? (
                      <>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined style={{ color: "#1890ff", fontSize: "12px" }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditStepModal(step);
                          }}
                        />
                        <Popconfirm
                          title="Xóa bước duyệt này?"
                          description="Các phân quyền & rẽ nhánh liên quan sẽ bị xóa bỏ."
                          onConfirm={() => handleDeleteStep(step)}
                          onCancel={(e) => e?.stopPropagation()}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined style={{ fontSize: "12px" }} />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </>
                    ) : (
                      <RightOutlined style={{ color: "#bfbfbf", fontSize: "10px" }} />
                    )}
                  </Space>
                </div>
              </List.Item>
            );
          }}
        />
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Không tìm thấy Bước quy trình nào. Vui lòng bấm "Thêm bước".
          </Text>
        </div>
      )}

      <Divider style={{ margin: "16px 0" }} />
      <Space align="start">
        <SafetyOutlined style={{ color: "#fa8c16", marginTop: "4px" }} />
        <Text type="secondary" style={{ fontSize: "12px" }}>
          Mô hình Step-level RBAC tự động áp dụng khi khởi chạy Lượt quy trình
          (Workflow Instance) [1].
        </Text>
      </Space>

      {/* Modal Thêm mới / Cập nhật Bước duyệt */}
      <Modal
        title={editingStep ? "Cập nhật Bước duyệt" : "Thêm Bước duyệt mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createStepMutation.isPending || updateStepMutation.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: "16px" }}
        >
          <Form.Item
            name="name"
            label="Tên bước duyệt"
            rules={[{ required: true, message: "Vui lòng nhập tên bước duyệt" }]}
          >
            <Input placeholder="Ví dụ: Kế toán trưởng phê duyệt" />
          </Form.Item>

          <Form.Item
            name="stepType"
            label="Loại bước"
            initialValue="USER_TASK"
          >
            <Select
              options={[
                { value: "USER_TASK", label: "USER_TASK (Người dùng phê duyệt)" },
                { value: "SYSTEM_TASK", label: "SYSTEM_TASK (Hệ thống tự động)" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="orderIndex"
            label="Thứ tự hiển thị (orderIndex)"
            rules={[{ required: true, message: "Vui lòng nhập thứ tự hiển thị" }]}
          >
            <InputNumber min={1} className="w-full" style={{ width: "100%" }} />
          </Form.Item>

          <Divider style={{ margin: "12px 0" }} />
          <Text strong style={{ fontSize: "13px", display: "block", marginBottom: "12px" }}>
            Phân quyền Người duyệt (Step-Level RBAC)
          </Text>

          <Form.Item
            name="approverType"
            label="Kiểu duyệt"
            initialValue="SINGLE"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "SINGLE", label: "Cá nhân duyệt (SINGLE - Chỉ cần 1 người duyệt)" },
                { value: "ALL_OF", label: "Đồng thuận (ALL_OF - Tất cả người được giao đều phải duyệt)" },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="assigneeType"
            label="Hình thức chỉ định người duyệt"
            initialValue="INITIATOR"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "INITIATOR", label: "Người khởi tạo phiếu ($initiator)" },
                { value: "MANAGER", label: "Quản lý của người khởi tạo ($initiator.manager)" },
                { value: "ROLE", label: "Theo vai trò / chức danh ($role:ID)" },
                { value: "FIELD", label: "Theo trường trên biểu mẫu ($record.data.field)" },
                { value: "CUSTOM_USERS", label: "Chỉ định tài khoản nhân viên cụ thể" },
              ]}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.assigneeType !== currentValues.assigneeType}
          >
            {({ getFieldValue }) => {
              const assigneeType = getFieldValue("assigneeType");
              if (assigneeType === "ROLE") {
                return (
                  <Form.Item
                    name="assigneeRoleId"
                    label="Chọn Vai trò người duyệt"
                    rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
                  >
                    <Select
                      placeholder="Chọn vai trò..."
                      options={roles.map((r) => ({
                        value: r.id,
                        label: r.name,
                      }))}
                    />
                  </Form.Item>
                );
              }
              if (assigneeType === "FIELD") {
                return (
                  <Form.Item
                    name="assigneeFieldCode"
                    label="Chọn Trường chứa người duyệt"
                    rules={[{ required: true, message: "Vui lòng chọn trường biểu mẫu" }]}
                  >
                    <Select
                      placeholder="Chọn trường dữ liệu..."
                      options={fields.map((f) => ({
                        value: f.code,
                        label: `${f.name} (${f.code})`,
                      }))}
                    />
                  </Form.Item>
                );
              }
              if (assigneeType === "CUSTOM_USERS") {
                return (
                  <Form.Item
                    name="assigneeUsers"
                    label="Chọn tài khoản người duyệt"
                    rules={[{ required: true, message: "Vui lòng chọn ít nhất 1 nhân viên" }]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="Chọn nhân viên..."
                      options={users.map((u) => ({
                        value: u.id,
                        label: `${u.fullName} (${u.email})`,
                      }))}
                    />
                  </Form.Item>
                );
              }
              return null;
            }}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
