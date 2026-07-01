// File: src/app/metadata/[id]/fields/components/VisualWorkflowCanvas.tsx
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Select,
  Input,
  InputNumber,
  Checkbox,
  Divider,
  App,
  Tooltip,
  Row,
  Col,
} from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  FullscreenExitOutlined,
  PlusOutlined,
  PartitionOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  BranchesOutlined,
  InfoCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  WorkflowStep,
  useUpdateStep,
  useCreateTransition,
  useUpdateTransition,
  useDeleteTransition,
  useCreateStep,
  useDeleteStep,
} from "@/hooks/useWorkflows";
import { useRoles } from "@/hooks/useRoles";
import { useUsers } from "@/hooks/useUsers";
import { Field } from "@/hooks/useFields";

const { Text, Title, Paragraph } = Typography;

interface VisualWorkflowCanvasProps {
  entityId: number;
  entityName: string;
  workflowId: number | null;
  versionId: number | null;
  steps: WorkflowStep[];
  fields: Field[];
  activeStep: WorkflowStep | null;
  setActiveStep: (step: WorkflowStep | null) => void;
}

export default function VisualWorkflowCanvas({
  entityId,
  entityName,
  workflowId,
  versionId,
  steps = [],
  fields = [],
  activeStep,
  setActiveStep,
}: VisualWorkflowCanvasProps) {
  const { message, modal } = App.useApp();
  const { data: rolesData } = useRoles(1, 100);
  const roles = rolesData?.data || [];

  const { data: usersData } = useUsers(1, 100);
  const users = usersData?.data || [];

  const updateStepMutation = useUpdateStep();
  const deleteStepMutation = useDeleteStep();
  const createTransitionMutation = useCreateTransition();
  const updateTransitionMutation = useUpdateTransition();
  const deleteTransitionMutation = useDeleteTransition();

  // Tự động liên kết bước mới vào chuỗi quy trình theo orderIndex
  const autoLinkStep = (newStep: any) => {
    if (!versionId || !steps || steps.length === 0) return;

    // Tìm bước liền trước (có orderIndex lớn nhất nhưng nhỏ hơn newStep)
    const sortedPrev = [...steps]
      .filter((s) => s.orderIndex < newStep.orderIndex)
      .sort((a, b) => b.orderIndex - a.orderIndex);
    const prevStep = sortedPrev[0];

    // Tìm bước liền sau (có orderIndex nhỏ nhất nhưng lớn hơn newStep)
    const sortedNext = [...steps]
      .filter((s) => s.orderIndex > newStep.orderIndex)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    const nextStep = sortedNext[0];

    // 1. Tạo liên kết từ bước liền trước tới bước mới
    if (prevStep) {
      createTransitionMutation.mutate({
        versionId,
        fromStepId: prevStep.id,
        toStepId: newStep.id,
        conditionLogic: {},
        autoSkip: false,
      });

      // Nếu có liên kết trực tiếp cũ giữa bước liền trước và bước liền sau, tiến hành xóa
      if (nextStep) {
        const existingTrans = prevStep.transitionsOut?.find(
          (t: any) => t.toStepId === nextStep.id
        );
        if (existingTrans) {
          deleteTransitionMutation.mutate({
            id: existingTrans.id,
            versionId,
          });
        }
      }
    }

    // 2. Tạo liên kết từ bước mới tới bước liền sau
    if (nextStep) {
      createTransitionMutation.mutate({
        versionId,
        fromStepId: newStep.id,
        toStepId: nextStep.id,
        conditionLogic: {},
        autoSkip: false,
      });
    }
  };

  // Canvas Pan & Zoom states
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging node states
  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<number, { x: number; y: number }>>({});

  // Drawing transition line states
  const [drawingFromId, setDrawingFromId] = useState<number | null>(null);
  const [dragLineEnd, setDragLineEnd] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Transition Config Modal
  const [selectedTransition, setSelectedTransition] = useState<any | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState<boolean>(false);
  const [transForm] = Form.useForm();

  // Step Creation / Editing Modals (internalized)
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepForm] = Form.useForm();
  const createStepMutation = useCreateStep();

  const handleOpenAddStepModal = () => {
    setEditingStep(null);
    stepForm.resetFields();
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.orderIndex)) + 1 : 1;
    stepForm.setFieldsValue({
      name: "",
      stepType: "USER_TASK",
      orderIndex: nextOrder,
      approverType: "SINGLE",
      assigneeType: "INITIATOR",
    });
    setIsStepModalOpen(true);
  };

  const handleOpenEditStepModal = (step: WorkflowStep) => {
    setEditingStep(step);
    stepForm.resetFields();

    const stepConfig = step.permissions || {};
    const approverType = stepConfig.approverType || "SINGLE";
    const assigneeExpression = stepConfig.assigneeExpression || "";
    const candidateUsers = stepConfig.candidateUsers || [];
    const chooseApproverDynamically = stepConfig.chooseApproverDynamically || false;

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

    const sla = stepConfig.sla || { value: undefined, unit: "HOURS", overflowAction: "NONE" };

    stepForm.setFieldsValue({
      name: step.name,
      stepType: step.stepType,
      orderIndex: step.orderIndex,
      approverType,
      assigneeType,
      assigneeRoleId,
      assigneeFieldCode,
      assigneeUsers,
      slaValue: sla.value,
      slaUnit: sla.unit || "HOURS",
      slaOverflowAction: sla.overflowAction || "NONE",
      chooseApproverDynamically,
    });
    setIsStepModalOpen(true);
  };

  const handleStepFormSubmit = (values: any) => {
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

    const existingFieldPermissions = editingStep
      ? Object.fromEntries(
          Object.entries(editingStep.permissions || {}).filter(
            ([key]) =>
              key !== "approverType" &&
              key !== "assigneeExpression" &&
              key !== "candidateUsers" &&
              key !== "position" && // preserve coordinates
              key !== "sla" &&
              key !== "chooseApproverDynamically"
          )
        )
      : {};

    const updatedPermissions = {
      ...existingFieldPermissions,
      approverType: values.approverType,
      assigneeExpression,
      candidateUsers,
      chooseApproverDynamically: !!values.chooseApproverDynamically,
      position: editingStep?.permissions?.position || undefined,
      sla: values.slaValue !== undefined && values.slaValue !== null
        ? {
            value: values.slaValue,
            unit: values.slaUnit || "HOURS",
            overflowAction: values.slaOverflowAction || "NONE",
          }
        : undefined,
    };

    const payload = {
      name: values.name,
      stepType: values.stepType,
      orderIndex: values.orderIndex,
      permissions: updatedPermissions,
    };

    if (editingStep) {
      updateStepMutation.mutate(
        {
          id: editingStep.id,
          versionId,
          payload,
        },
        {
          onSuccess: () => {
            message.success(`Cập nhật thông tin bước "${values.name}" thành công!`);
            setIsStepModalOpen(false);
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
            message.error(err?.response?.data?.message || "Lỗi khi cập nhật bước duyệt.");
          },
        }
      );
    } else {
      createStepMutation.mutate(
        {
          versionId,
          name: values.name,
          stepType: values.stepType,
          orderIndex: values.orderIndex,
          permissions: updatedPermissions,
        },
        {
          onSuccess: (newStep: any) => {
            message.success(`Tạo bước duyệt "${values.name}" thành công!`);
            setIsStepModalOpen(false);
            autoLinkStep(newStep);
          },
          onError: (err: any) => {
            message.error(err?.response?.data?.message || "Lỗi khi tạo bước duyệt.");
          },
        }
      );
    }
  };


  // Default dimensions
  const nodeWidth = 240;
  const nodeHeight = 120;

  // Initialize node positions based on index if not set
  useEffect(() => {
    const updatedPositions: Record<number, { x: number; y: number }> = {};
    const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);

    sortedSteps.forEach((step, idx) => {
      // Look inside step.permissions.position
      const savedPos = step.permissions?.position;
      if (savedPos && typeof savedPos.x === "number" && typeof savedPos.y === "number") {
        updatedPositions[step.id] = { x: savedPos.x, y: savedPos.y };
      } else {
        // Horizontal / vertical chain layout fallback
        updatedPositions[step.id] = {
          x: 150 + (idx % 3) * 320,
          y: 80 + Math.floor(idx / 3) * 220,
        };
      }
    });

    setNodePositions(updatedPositions);
  }, [steps]);

  // Handle canvas mouse actions for Panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the background grid, not on nodes or handles
    const target = e.target as HTMLElement;
    if (target.closest(".canvas-node") || target.closest(".node-handle") || target.closest(".transition-label")) {
      return;
    }
    setIsPanning(true);
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      });
    } else if (draggingNodeId !== null && nodePositions[draggingNodeId]) {
      // Calculate coordinates relative to canvas zoom
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;

      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: {
          x: Math.round(rawX - dragOffset.current.x),
          y: Math.round(rawY - dragOffset.current.y),
        },
      }));
    } else if (drawingFromId !== null) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setDragLineEnd({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom,
      });
    }
  };

  const handleCanvasMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
    } else if (draggingNodeId !== null) {
      const stepId = draggingNodeId;
      setDraggingNodeId(null);

      // Save position to DB
      const step = steps.find((s) => s.id === stepId);
      const pos = nodePositions[stepId];
      if (step && pos && versionId) {
        const cleanPermissions = { ...(step.permissions || {}) };
        cleanPermissions.position = { x: pos.x, y: pos.y };

        updateStepMutation.mutate(
          {
            id: stepId,
            versionId,
            payload: { permissions: cleanPermissions },
          },
          {
            onSuccess: () => {
              // Position saved
            },
            onError: () => {
              message.error("Lỗi khi lưu tọa độ bước.");
            },
          }
        );
      }
    } else if (drawingFromId !== null) {
      setDrawingFromId(null);
    }
  };

  // Node Drag events
  const handleNodeMouseDown = (e: React.MouseEvent, stepId: number) => {
    e.stopPropagation();
    const pos = nodePositions[stepId] || { x: 0, y: 0 };
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;

    dragOffset.current = {
      x: clickX - pos.x,
      y: clickY - pos.y,
    };
    setDraggingNodeId(stepId);
    const stepObj = steps.find((s) => s.id === stepId) || null;
    setActiveStep(stepObj);
  };

  // Connection Drawing events
  const handlePortMouseDown = (e: React.MouseEvent, stepId: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const pos = nodePositions[stepId] || { x: 0, y: 0 };
    const portX = pos.x + nodeWidth / 2;
    const portY = pos.y + nodeHeight; // bottom handle

    setDrawingFromId(stepId);
    setDragLineEnd({ x: portX, y: portY });
  };

  const handlePortMouseUp = (e: React.MouseEvent, targetStepId: number) => {
    e.stopPropagation();
    if (drawingFromId !== null && drawingFromId !== targetStepId && versionId) {
      const fromStep = steps.find((s) => s.id === drawingFromId);
      const toStep = steps.find((s) => s.id === targetStepId);

      if (fromStep && toStep) {
        // Create transition via API
        createTransitionMutation.mutate(
          {
            versionId,
            fromStepId: drawingFromId,
            toStepId: targetStepId,
            conditionLogic: {},
            autoSkip: false,
          },
          {
            onSuccess: () => {
              message.success(`Đã tạo liên kết từ bước "${fromStep.name}" đến "${toStep.name}"`);
            },
            onError: (err: any) => {
              message.error(err?.response?.data?.message || "Không thể tạo liên kết này.");
            },
          }
        );
      }
    }
    setDrawingFromId(null);
  };

  // Delete step via API
  const handleDeleteStep = (step: WorkflowStep) => {
    if (!versionId) return;
    deleteStepMutation.mutate(
      { id: step.id, versionId },
      {
        onSuccess: () => {
          message.success(`Đã xóa bước duyệt "${step.name}"!`);
          if (activeStep?.id === step.id) {
            setActiveStep(null);
          }
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message || "Lỗi khi xóa bước.");
        },
      }
    );
  };

  // Delete transition via API
  const handleDeleteTransition = (transId: number) => {
    if (!versionId) return;
    deleteTransitionMutation.mutate(
      { id: transId, versionId },
      {
        onSuccess: () => {
          message.success("Đã xóa liên kết quy trình.");
          setIsTransitionModalOpen(false);
          setSelectedTransition(null);
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message || "Lỗi khi xóa liên kết.");
        },
      }
    );
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(1.5, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 50, y: 50 });
  };

  // Auto layout nodes
  const handleAutoLayout = () => {
    const updatedPositions: Record<number, { x: number; y: number }> = {};
    const sortedSteps = [...steps].sort((a, b) => a.orderIndex - b.orderIndex);

    sortedSteps.forEach((step, idx) => {
      const pos = {
        x: 180 + (idx % 3) * 320,
        y: 80 + Math.floor(idx / 3) * 220,
      };
      updatedPositions[step.id] = pos;

      // Save to database
      if (versionId) {
        const cleanPermissions = { ...(step.permissions || {}) };
        cleanPermissions.position = pos;
        updateStepMutation.mutate({
          id: step.id,
          versionId,
          payload: { permissions: cleanPermissions },
        });
      }
    });

    setNodePositions(updatedPositions);
    message.success("Đã tự động sắp xếp các bước quy trình.");
  };

  // Convert Assignee expression to display label
  const getAssigneeSummary = (step: WorkflowStep) => {
    const stepConfig = step.permissions || {};
    const assigneeExpression = stepConfig.assigneeExpression || "";
    const candidateUsers = stepConfig.candidateUsers || [];

    if (assigneeExpression === "$initiator") return "Người tạo phiếu";
    if (assigneeExpression === "$initiator.manager") return "Quản lý trực tiếp";
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

  // Gather all transitions in the active workflow steps list
  const transitionsList = useMemo(() => {
    const list: any[] = [];
    steps.forEach((step) => {
      const outList = step.transitionsOut || [];
      outList.forEach((t) => {
        list.push({
          ...t,
          fromStepName: step.name,
          toStepName: steps.find((s) => s.id === t.toStepId)?.name || `Bước #${t.toStepId}`,
        });
      });
    });
    return list;
  }, [steps]);

  // Open Transition configuration modal
  const handleOpenTransitionModal = (e: React.MouseEvent, transition: any) => {
    e.stopPropagation();
    setSelectedTransition(transition);

    const logic = transition.conditionLogic || {};
    const hasRules = Array.isArray(logic.rules) && logic.rules.length > 0;
    
    // Default form configuration
    transForm.setFieldsValue({
      autoSkip: transition.autoSkip || false,
      operator: logic.operator || "AND",
      rules: hasRules ? logic.rules : (logic.field ? [logic] : []),
      actionLabel: logic.actionLabel || "",
      requiresSignature: logic.requiresSignature || false,
    });

    setIsTransitionModalOpen(true);
  };

  // Submit transition settings to backend
  const handleTransitionFormSubmit = (values: any) => {
    if (!selectedTransition || !versionId) return;

    let conditionLogic: any = {};
    const rules = (values.rules || []).filter((r: any) => r && r.field);

    if (rules.length === 1) {
      // Single leaf condition logic
      conditionLogic = {
        field: rules[0].field,
        operator: rules[0].operator,
        value: rules[0].value,
        actionLabel: values.actionLabel || "",
        requiresSignature: !!values.requiresSignature,
      };
    } else if (rules.length > 1) {
      // Multiple nested logic rules
      conditionLogic = {
        operator: values.operator || "AND",
        rules: rules.map((r: any) => ({
          field: r.field,
          operator: r.operator,
          value: r.value,
        })),
        actionLabel: values.actionLabel || "",
        requiresSignature: !!values.requiresSignature,
      };
    } else {
      // No condition rules, just action label and signature config
      conditionLogic = {
        actionLabel: values.actionLabel || "",
        requiresSignature: !!values.requiresSignature,
      };
    }

    updateTransitionMutation.mutate(
      {
        id: selectedTransition.id,
        versionId,
        payload: {
          autoSkip: values.autoSkip || false,
          conditionLogic,
        },
      },
      {
        onSuccess: () => {
          message.success("Cập nhật điều kiện chuyển tiếp thành công!");
          setIsTransitionModalOpen(false);
          setSelectedTransition(null);
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message || "Lỗi khi lưu điều kiện rẽ nhánh.");
        },
      }
    );
  };

  // Format transition label showing operators and values
  const getTransitionLabel = (t: any) => {
    const logic = t.conditionLogic || {};
    if (!logic || Object.keys(logic).length === 0) return "Tự do (Không đ/k)";
    
    if (t.autoSkip) return "Tự động duyệt (Auto Skip)";

    if (logic.field) {
      return `${logic.field} ${logic.operator} ${logic.value}`;
    }

    if (Array.isArray(logic.rules) && logic.rules.length > 0) {
      const parts = logic.rules.map((r: any) => `${r.field} ${r.operator} ${r.value}`);
      return parts.join(` ${logic.operator} `);
    }

    return "Cấu hình điều kiện";
  };

  return (
    <div className="workflow-canvas-container">
      <style>{`
        .workflow-canvas-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
          overflow: hidden;
          height: 650px;
        }
        .workflow-canvas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .workflow-canvas-area {
          flex: 1;
          position: relative;
          overflow: hidden;
          user-select: none;
          cursor: grab;
        }
        .workflow-canvas-area:active {
          cursor: grabbing;
        }
        .workflow-node {
          position: absolute;
          display: flex;
          flex-direction: column;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          cursor: grab;
          user-select: none;
          transition: box-shadow 0.25s, border-color 0.25s;
          z-index: 10;
        }
        .workflow-node:active {
          cursor: grabbing;
        }
        .workflow-node.is-active {
          border-color: #1890ff;
          box-shadow: 0 10px 15px -3px rgba(24, 144, 255, 0.25), 0 4px 6px -2px rgba(24, 144, 255, 0.15);
          z-index: 50;
        }
        .node-port-handle {
          position: absolute;
          background-color: #ffffff;
          border-width: 2px;
          border-style: solid;
          border-radius: 9999px;
          cursor: crosshair;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          height: 12px;
          z-index: 30;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .node-port-handle-in {
          border-color: #3b82f6;
          top: -6px;
          left: 50%;
          transform: translateX(-50%);
        }
        .node-port-handle-in:hover {
          background-color: #eff6ff;
        }
        .node-port-handle-out {
          border-color: #f97316;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
        }
        .node-port-handle-out:hover {
          background-color: #fff7ed;
        }
        .workflow-node-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          border-bottom: 1px solid #e2e8f0;
          border-top-left-radius: 11px;
          border-top-right-radius: 11px;
          background-color: #f8fafc;
          transition: background-color 0.2s, border-color 0.2s;
        }
        .workflow-node.is-active .workflow-node-header {
          background-color: #e6f7ff;
          border-color: #91d5ff;
        }
        .workflow-node-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .workflow-node:hover .workflow-node-actions {
          opacity: 1;
        }
        .workflow-node-body {
          flex: 1;
          padding: 12px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .workflow-transition-line {
          cursor: pointer;
          transition: stroke 0.2s, stroke-width 0.2s;
        }
        .workflow-transition-line:hover {
          stroke: #fa8c16 !important;
          stroke-width: 3.5px !important;
        }
        .workflow-transition-label {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid;
          font-size: 10px;
          font-weight: 600;
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          z-index: 20;
          transition: transform 0.1s, box-shadow 0.2s;
        }
        .workflow-transition-label:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>

      {/* Canvas Tool Header bar */}
      <div className="workflow-canvas-header">
        <Space size={16}>
          <PartitionOutlined style={{ color: "#1890ff", fontSize: 18 }} />
          <div>
            <Text strong style={{ fontSize: 15 }}>Sơ đồ Thiết kế Quy trình Phê duyệt</Text>
            <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
              Kéo di chuyển bước, kéo nối cổng Out (Dưới) của bước này tới cổng In (Trên) của bước kia để rẽ nhánh.
            </Paragraph>
          </div>
        </Space>

        <Space>
          {versionId && (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleOpenAddStepModal}
              style={{ background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)", border: "none" }}
            >
              Thêm bước duyệt
            </Button>
          )}
          <Button size="small" icon={<BranchesOutlined />} onClick={handleAutoLayout}>
            Sắp xếp sơ đồ
          </Button>
          <Divider type="vertical" />
          <Tooltip title="Phóng to">
            <Button size="small" icon={<ZoomInOutlined />} onClick={handleZoomIn} />
          </Tooltip>
          <Tooltip title="Thu nhỏ">
            <Button size="small" icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
          </Tooltip>
          <Tooltip title="Đặt lại chế độ xem">
            <Button size="small" icon={<FullscreenExitOutlined />} onClick={handleZoomReset} />
          </Tooltip>
        </Space>
      </div>

      {/* Main Graph Canvas Area */}
      <div
        ref={canvasRef}
        className="workflow-canvas-area"
        style={{
          background: `radial-gradient(circle, #e2e8f0 1.2px, transparent 1.2px)`,
          backgroundSize: "24px 24px",
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundColor: "#f8fafc",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        {/* Render Canvas Inner nodes and SVGs with zoom and pan transform matrix */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            width: "5000px",
            height: "5000px",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          {/* Dynamic SVG Connection Overlay */}
          <svg style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, pointerEvents: "none" }}>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#1890ff" />
              </marker>
              <marker
                id="arrowhead-active"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#fa8c16" />
              </marker>
            </defs>

            {/* Render lines for transitions between steps */}
            {transitionsList.map((t) => {
              const fromPos = nodePositions[t.fromStepId];
              const toPos = nodePositions[t.toStepId];

              if (!fromPos || !toPos) return null;

              // Anchor coordinates (bottom output to top input)
              const startX = fromPos.x + nodeWidth / 2;
              const startY = fromPos.y + nodeHeight;
              const endX = toPos.x + nodeWidth / 2;
              const endY = toPos.y;

              const isConditional = t.conditionLogic && Object.keys(t.conditionLogic).length > 0;
              const strokeColor = isConditional ? "#eab308" : "#1890ff";

              // Draw bezier curve connection paths
              const midY = (startY + endY) / 2;
              const pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

              return (
                <g key={t.id} style={{ pointerEvents: "all" }}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    markerEnd={`url(#arrowhead)`}
                    className="workflow-transition-line"
                  />
                  {/* Subtle invisible thicker curve line for easier click hover trigger */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="10"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => handleOpenTransitionModal(e, t)}
                  />
                </g>
              );
            })}

            {/* Render temporary transition line under drag connection creation */}
            {drawingFromId !== null && nodePositions[drawingFromId] && (
              <path
                d={`M ${nodePositions[drawingFromId].x + nodeWidth / 2} ${
                  nodePositions[drawingFromId].y + nodeHeight
                } C ${nodePositions[drawingFromId].x + nodeWidth / 2} ${
                  (nodePositions[drawingFromId].y + nodeHeight + dragLineEnd.y) / 2
                }, ${dragLineEnd.x} ${
                  (nodePositions[drawingFromId].y + nodeHeight + dragLineEnd.y) / 2
                }, ${dragLineEnd.x} ${dragLineEnd.y}`}
                fill="none"
                stroke="#fa8c16"
                strokeWidth="2"
                strokeDasharray="4"
                markerEnd="url(#arrowhead-active)"
              />
            )}
          </svg>

          {/* Render Connection settings labels centered in bezier curve path paths */}
          {transitionsList.map((t) => {
            const fromPos = nodePositions[t.fromStepId];
            const toPos = nodePositions[t.toStepId];

            if (!fromPos || !toPos) return null;

            // Calculate center position along curves
            const startX = fromPos.x + nodeWidth / 2;
            const startY = fromPos.y + nodeHeight;
            const endX = toPos.x + nodeWidth / 2;
            const endY = toPos.y;
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            const isConditional = t.conditionLogic && Object.keys(t.conditionLogic).length > 0;
            const bgLabel = isConditional ? "#fef9c3" : "#eff6ff";
            const borderLabel = isConditional ? "#fef08a" : "#dbeafe";
            const textLabelColor = isConditional ? "#854d0e" : "#1e40af";

            return (
              <div
                key={`lbl-${t.id}`}
                className="workflow-transition-label"
                style={{
                  left: `${midX}px`,
                  top: `${midY}px`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "all",
                  backgroundColor: bgLabel,
                  borderColor: borderLabel,
                  fontSize: "10px",
                  fontWeight: 600,
                  color: textLabelColor,
                  maxWidth: "180px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  cursor: "pointer",
                  zIndex: 20,
                }}
                onClick={(e) => handleOpenTransitionModal(e, t)}
                title={getTransitionLabel(t)}
              >
                <span>{getTransitionLabel(t)}</span>
                <SettingOutlined style={{ fontSize: "10px", marginLeft: "2px", opacity: 0.6 }} />
              </div>
            );
          })}

          {/* Render individual card workflow nodes */}
          {steps.map((step) => {
            const pos = nodePositions[step.id] || { x: 100, y: 100 };
            const isActive = activeStep?.id === step.id;

            return (
              <div
                key={step.id}
                className={`workflow-node ${isActive ? "is-active" : ""}`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${nodeWidth}px`,
                  height: `${nodeHeight}px`,
                  pointerEvents: "all",
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, step.id)}
              >
                {/* Node connection port markers */}
                {/* Input Neo: Top */}
                <div
                  className="node-port-handle node-port-handle-in"
                  onMouseUp={(e) => handlePortMouseUp(e, step.id)}
                />

                {/* Output Neo: Bottom */}
                <div
                  className="node-port-handle node-port-handle-out"
                  onMouseDown={(e) => handlePortMouseDown(e, step.id)}
                />

                {/* Node Header */}
                <div className="workflow-node-header">
                  <Text strong style={{ fontSize: "12px", color: isActive ? "#0050b3" : "#334155" }} className="truncate">
                    {step.orderIndex}. {step.name}
                  </Text>
                  
                  {/* Operations */}
                  <div className="workflow-node-actions">
                    <EditOutlined
                      style={{ fontSize: "11px", padding: "2px", color: "#1890ff", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditStepModal(step);
                      }}
                    />
                    <DeleteOutlined
                      style={{ fontSize: "11px", padding: "2px", marginLeft: "4px", color: "#ff4d4f", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        modal.confirm({
                          title: `Xóa bước duyệt "${step.name}"?`,
                          content: "Các phân quyền của trường và rẽ nhánh liên quan sẽ bị xóa vĩnh viễn.",
                          okText: "Xóa",
                          okType: "danger",
                          cancelText: "Hủy",
                          onOk: () => handleDeleteStep(step),
                        });
                      }}
                    />
                  </div>
                </div>

                {/* Node Body Details */}
                <div className="workflow-node-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Loại tác vụ</span>
                    <Tag color={step.stepType === "USER_TASK" ? "processing" : "default"} style={{ fontSize: "9px", margin: 0 }}>
                      {step.stepType}
                    </Tag>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", marginTop: "4px" }}>
                    <span style={{ fontSize: "10px", color: "#64748b" }}>Người phê duyệt</span>
                    <Text strong style={{ fontSize: "11px", color: "#1e293b" }} className="truncate">
                      {getAssigneeSummary(step)}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connection condition modal */}
      <Modal
        title={
          <Space>
            <BranchesOutlined style={{ color: "#fa8c16" }} />
            <span>Cài đặt Nhánh chuyển tiếp (Workflow Transition)</span>
          </Space>
        }
        open={isTransitionModalOpen}
        onCancel={() => {
          setIsTransitionModalOpen(false);
          setSelectedTransition(null);
        }}
        onOk={() => transForm.submit()}
        confirmLoading={updateTransitionMutation.isPending}
        destroyOnClose
        width={550}
      >
        {selectedTransition && (
          <Form
            form={transForm}
            layout="vertical"
            onFinish={handleTransitionFormSubmit}
            style={{ marginTop: "16px" }}
          >
            {/* Info header block */}
            <div style={{ padding: "12px", backgroundColor: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "8px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
              <div>
                <span style={{ color: "#64748b" }}>Bước đi: </span>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{selectedTransition.fromStepName}</span>
              </div>
              <div style={{ color: "#3b82f6", fontWeight: "bold" }}>➔</div>
              <div>
                <span style={{ color: "#64748b" }}>Bước đến: </span>
                <span style={{ fontWeight: 600, color: "#1e293b" }}>{selectedTransition.toStepName}</span>
              </div>
            </div>

            <Form.Item name="autoSkip" valuePropName="checked" style={{ marginBottom: "16px" }}>
              <Checkbox>
                Tự động bỏ qua bước này (Auto Skip) nếu thỏa mãn điều kiện logic bên dưới
              </Checkbox>
            </Form.Item>

            <Form.Item
              name="actionLabel"
              label="Nhãn của nút bấm (Tên hành động)"
              extra="Tên nút bấm hiển thị cho người duyệt (ví dụ: 'Phê duyệt', 'Đồng ý', 'Chuyển kế toán'). Để trống mặc định là 'Phê duyệt'."
            >
              <Input placeholder="Ví dụ: Đồng ý, Xác nhận..." />
            </Form.Item>

            <Form.Item
              name="requiresSignature"
              valuePropName="checked"
              style={{ marginBottom: "16px" }}
            >
              <Checkbox>
                Yêu cầu Chữ ký số / Chữ ký điện tử (OTP & Vẽ chữ ký) khi bấm nút này
              </Checkbox>
            </Form.Item>

            <Divider style={{ margin: "12px 0" }}>Điều kiện kích hoạt nhánh</Divider>

            <Paragraph type="secondary" style={{ fontSize: "12px" }}>
              Nếu không thiết lập điều kiện nào bên dưới, nhánh này sẽ luôn hiển thị hoặc được kích hoạt tự do mặc định.
            </Paragraph>

            <Form.Item name="operator" label="Liên kết giữa các dòng điều kiện" initialValue="AND">
              <Select
                options={[
                  { value: "AND", label: "VÀ (AND - Tất cả điều kiện đều phải thỏa mãn)" },
                  { value: "OR", label: "HOẶC (OR - Chỉ cần một điều kiện thỏa mãn)" },
                ]}
              />
            </Form.Item>

            <Form.List name="rules">
              {(fieldsFormList, { add, remove }) => (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {fieldsFormList.map(({ key, name, ...restField }) => (
                    <Space key={key} style={{ display: "flex", marginBottom: 8 }} align="baseline">
                      <Form.Item
                        {...restField}
                        name={[name, "field"]}
                        rules={[{ required: true, message: "Chọn trường" }]}
                        style={{ margin: 0, width: 160 }}
                      >
                        <Select
                          placeholder="Chọn trường..."
                          options={fields.map((f) => ({
                            value: f.code,
                            label: f.name,
                          }))}
                        />
                      </Form.Item>

                      <Form.Item
                        {...restField}
                        name={[name, "operator"]}
                        rules={[{ required: true, message: "Chọn toán tử" }]}
                        style={{ margin: 0, width: 120 }}
                        initialValue="=="
                      >
                        <Select
                          options={[
                            { value: "==", label: "Bằng (==)" },
                            { value: "!=", label: "Khác (!=)" },
                            { value: ">", label: "Lớn hơn (>)" },
                            { value: "<", label: "Nhỏ hơn (<)" },
                            { value: ">=", label: "Lớn hơn hoặc bằng (>=)" },
                            { value: "<=", label: "Nhỏ hơn hoặc bằng (<=)" },
                            { value: "CONTAINS", label: "Chứa từ khóa" },
                            { value: "IS_NOT_NULL", label: "Có giá trị" },
                            { value: "IS_NULL", label: "Để trống" },
                          ]}
                        />
                      </Form.Item>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prevValues, currentValues) => {
                          const prevOp = prevValues.rules?.[name]?.operator;
                          const currOp = currentValues.rules?.[name]?.operator;
                          return prevOp !== currOp;
                        }}
                      >
                        {({ getFieldValue }) => {
                          const op = getFieldValue(["rules", name, "operator"]);
                          if (op === "IS_NULL" || op === "IS_NOT_NULL") return null;
                          return (
                            <Form.Item
                              {...restField}
                              name={[name, "value"]}
                              rules={[{ required: true, message: "Nhập giá trị" }]}
                              style={{ margin: 0, width: 140 }}
                            >
                              <Input placeholder="Giá trị so sánh" />
                            </Form.Item>
                          );
                        }}
                      </Form.Item>

                      <Button type="text" danger onClick={() => remove(name)} icon={<DeleteOutlined />} />
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ marginTop: "4px" }}>
                    Thêm dòng điều kiện mới
                  </Button>
                </div>
              )}
            </Form.List>

            <Divider style={{ margin: "24px 0 12px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button
                type="primary"
                danger
                ghost
                icon={<DeleteOutlined />}
                loading={deleteTransitionMutation.isPending}
                onClick={() => {
                  modal.confirm({
                    title: "Xóa đường nối chuyển tiếp này?",
                    content: "Bản ghi liên kết này sẽ bị xóa khỏi cơ sở dữ liệu.",
                    okText: "Xóa",
                    okType: "danger",
                    cancelText: "Hủy",
                    onOk: () => handleDeleteTransition(selectedTransition.id),
                  });
                }}
              >
                Xóa liên kết này
              </Button>

              <Space>
                <Button
                  onClick={() => {
                    setIsTransitionModalOpen(false);
                    setSelectedTransition(null);
                  }}
                >
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit">
                  Lưu thiết lập
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>

      {/* Modal Thêm mới / Cập nhật Bước duyệt */}
      <Modal
        title={editingStep ? "Cập nhật Bước duyệt" : "Thêm Bước duyệt mới"}
        open={isStepModalOpen}
        onCancel={() => setIsStepModalOpen(false)}
        onOk={() => stepForm.submit()}
        confirmLoading={createStepMutation.isPending || updateStepMutation.isPending}
        destroyOnClose
      >
        <Form
          form={stepForm}
          layout="vertical"
          onFinish={handleStepFormSubmit}
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

          <Form.Item
            name="chooseApproverDynamically"
            valuePropName="checked"
            style={{ marginBottom: "12px" }}
          >
            <Checkbox>Cho phép người gửi/người duyệt trước chọn cụ thể người duyệt tiếp theo</Checkbox>
          </Form.Item>

          <Divider style={{ margin: "12px 0" }} />
          <Text strong style={{ fontSize: "13px", display: "block", marginBottom: "12px" }}>
            Thời hạn xử lý (SLA Limit)
          </Text>
          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="slaValue"
                label="Thời gian tối đa"
              >
                <InputNumber
                  min={1}
                  placeholder="Không giới hạn thời gian"
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                name="slaUnit"
                label="Đơn vị"
                initialValue="HOURS"
              >
                <Select
                  options={[
                    { value: "HOURS", label: "Giờ (Hours)" },
                    { value: "DAYS", label: "Ngày làm việc (Days)" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="slaOverflowAction"
            label="Hành động khi trễ hạn"
            initialValue="NONE"
          >
            <Select
              options={[
                { value: "NONE", label: "Không xử lý (Chỉ gửi cảnh báo)" },
                { value: "AUTO_SKIP", label: "Tự động Phê duyệt (Skip)" },
                { value: "AUTO_REJECT", label: "Tự động Từ chối (Reject)" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
