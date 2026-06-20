// File: src/app/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Empty,
  Spin,
  Typography,
  Row,
  Col,
  theme,
  Tabs,
  List,
  Drawer,
  Timeline,
  Descriptions,
  Table,
  Tag,
  Form,
  Input,
  message,
  App as AntdApp,
  Tooltip,
  Image,
  Select,
  InputNumber,
  DatePicker,
  Upload,
  Checkbox,
  TreeSelect,
} from "antd";
import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
  RightOutlined,
  FormOutlined,
  ExpandAltOutlined,
  ShrinkOutlined,
  PaperClipOutlined,
  PictureOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { api } from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTasks, useWorkflowAction, useWorkflowLogs, Task } from "@/hooks/useTasks";
import { useFields, Field } from "@/hooks/useFields";
import { useWorkflowSteps } from "@/hooks/useWorkflows";
import { useUpdateRecord } from "@/hooks/useRecords";
import { useDepartmentTree } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// Helper to parse date values safely
const parseDateValue = (val: any, type: string): Dayjs | undefined => {
  if (!val) return undefined;
  if (type === "TIME") {
    if (typeof val === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(val)) {
      return dayjs(`2026-06-20T${val}`);
    }
  }
  const parsed = dayjs(val);
  return parsed.isValid() ? parsed : undefined;
};

// =================== CONDITION EVALUATOR (showIf / requiredIf) ===================
interface DynamicCondition {
  field: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "IN" | "NOT_IN";
  value: any;
}

function evaluateCondition(condition: DynamicCondition | undefined, formValues: Record<string, any>): boolean {
  if (!condition || !condition.field) return false;
  const actual = formValues[condition.field];
  const target = condition.value;

  switch (condition.operator) {
    case "==": return actual === target || String(actual) === String(target);
    case "!=": return actual !== target && String(actual) !== String(target);
    case ">": return Number(actual) > Number(target);
    case "<": return Number(actual) < Number(target);
    case ">=": return Number(actual) >= Number(target);
    case "<=": return Number(actual) <= Number(target);
    case "IN": return Array.isArray(target) && target.includes(actual);
    case "NOT_IN": return Array.isArray(target) && !target.includes(actual);
    default: return false;
  }
}

// =================== GLOBAL FORMULA ENGINE ===================
function evaluateFormulaString(formula: string, context: Record<string, any>): number {
  try {
    let expression = formula;
    expression = expression.replace(/\{([^}]+)\}/g, (_, code) => {
      const val = context[code];
      return val !== undefined && val !== null ? String(Number(val) || 0) : "0";
    });
    const words = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    const sortedWords = [...new Set(words)].sort((a, b) => b.length - a.length);
    for (const word of sortedWords) {
      if (["SUM", "AVG", "COUNT"].includes(word.toUpperCase())) continue;
      if (context[word] !== undefined && context[word] !== null) {
        const val = context[word];
        const numVal = typeof val === "boolean" ? (val ? 1 : 0) : (Number(val) || 0);
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        expression = expression.replace(regex, String(numVal));
      }
    }
    expression = expression.replace(/[^0-9+\-*/().\s]/g, "");
    if (!expression || expression.trim() === "") return 0;
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && isFinite(result) ? parseFloat(result.toFixed(4)) : 0;
  } catch {
    return 0;
  }
}

function preprocessRollups(expression: string, context: Record<string, any>): string {
  const rollupRegex = /(SUM|COUNT|AVG)\(([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\)/gi;
  return expression.replace(
    rollupRegex,
    (match, func, tableCode, columnCode) => {
      const tableData = context[tableCode];
      if (!Array.isArray(tableData) || tableData.length === 0) return "0";
      if (func.toUpperCase() === "COUNT") return String(tableData.length);
      if (columnCode) {
        const values = tableData.map((row) => Number(row[columnCode]) || 0);
        if (func.toUpperCase() === "SUM") return String(values.reduce((a, b) => a + b, 0));
        if (func.toUpperCase() === "AVG") return String(values.reduce((a, b) => a + b, 0) / values.length);
      }
      return "0";
    }
  );
}

function calculateFormFormulas(fields: any[], currentValues: Record<string, any>): Record<string, any> {
  const result = { ...currentValues };
  fields.forEach((field) => {
    if (field.type === "TABLE") {
      const columns = field.config?.options?.columns || [];
      const rows = result[field.code] || [];
      if (Array.isArray(rows) && rows.length > 0) {
        result[field.code] = rows.map((row, idx) => {
          const computedRow = { ...row };
          columns.forEach((col: any) => {
            if (col.type === "STT") computedRow[col.code] = idx + 1;
          });
          for (let pass = 0; pass < 3; pass++) {
            columns.forEach((col: any) => {
              if (col.type === "FORMULA" && col.formula) {
                computedRow[col.code] = evaluateTableFormula(col.formula, computedRow);
              }
            });
          }
          return computedRow;
        });
      }
    }
  });

  const formulaFields = fields.filter((f) => f.type === "FORMULA");
  for (let pass = 0; pass < 3; pass++) {
    formulaFields.forEach((field) => {
      const formula = field.config?.options?.formula;
      if (formula) {
        const preprocessed = preprocessRollups(formula, result);
        const calculated = evaluateFormulaString(preprocessed, result);
        result[field.code] = calculated;
      }
    });
  }
  return result;
}

function evaluateTableFormula(formula: string, rowData: Record<string, any>): number {
  try {
    let expression = formula.replace(/\{([^}]+)\}/g, (_, code) => {
      const val = rowData[code];
      return val !== undefined && val !== null ? String(Number(val) || 0) : "0";
    });
    expression = expression.replace(/[^0-9+\-*/().]/g, "");
    if (!expression || expression.trim() === "") return 0;
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && isFinite(result) ? parseFloat(result.toFixed(4)) : 0;
  } catch {
    return 0;
  }
}

function computeTableRows(rows: any[], columns: any[]): any[] {
  return rows.map((row, idx) => {
    const computed = { ...row };
    columns.forEach((col: any) => {
      if (col.type === "STT") {
        computed[col.code] = idx + 1;
      }
    });
    for (let pass = 0; pass < 3; pass++) {
      columns.forEach((col: any) => {
        if (col.type === "FORMULA" && col.formula) {
          computed[col.code] = evaluateTableFormula(col.formula, computed);
        }
      });
    }
    return computed;
  });
}

function computeSummary(rows: any[], colCode: string, summaryType: string): string {
  if (!summaryType || summaryType === "NONE" || rows.length === 0) return "";
  const values = rows.map((r) => Number(r[colCode]) || 0);
  switch (summaryType) {
    case "SUM": return values.reduce((a, b) => a + b, 0).toLocaleString("vi-VN");
    case "AVG": return (values.reduce((a, b) => a + b, 0) / values.length).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
    case "MIN": return Math.min(...values).toLocaleString("vi-VN");
    case "MAX": return Math.max(...values).toLocaleString("vi-VN");
    default: return "";
  }
}

const SUMMARY_LABELS: Record<string, string> = {
  SUM: "Tổng",
  AVG: "TB",
  MIN: "Min",
  MAX: "Max",
};

// =================== TABLE FIELD COMPONENT ===================
function TableFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: any[];
  onChange: (rows: any[]) => void;
}) {
  const columns = field.config?.options?.columns || [];
  const rows = value || [];
  const computedRows = rows;

  const addRow = () => {
    const newRow: any = { _key: Date.now() };
    columns.forEach((col: any) => {
      if (col.type === "CHECKBOX") newRow[col.code] = false;
      else if (col.type === "STT" || col.type === "FORMULA") {}
      else newRow[col.code] = "";
    });
    const nextRows = [...rows, newRow];
    onChange(computeTableRows(nextRows, columns));
  };

  const removeRow = (idx: number) => {
    const nextRows = rows.filter((_, i) => i !== idx);
    onChange(computeTableRows(nextRows, columns));
  };

  const updateCell = (rowIdx: number, colCode: string, val: any) => {
    const nextRows = rows.map((row, i) => i === rowIdx ? { ...row, [colCode]: val } : row);
    onChange(computeTableRows(nextRows, columns));
  };

  const hasSummary = columns.some((col: any) => col.summaryType && col.summaryType !== "NONE");

  const tableColumns = [
    ...columns.map((col: any) => ({
      title: (
        <Space size={2}>
          {col.type === "FORMULA" && <span style={{ color: "#fa541c", fontSize: 11 }}>fx</span>}
          {col.type === "STT" && <span style={{ color: "#13c2c2", fontSize: 11 }}>#</span>}
          <span style={{ fontWeight: 600, fontSize: 13 }}>{col.name}</span>
          {col.isRequired && <Text type="danger">*</Text>}
        </Space>
      ),
      dataIndex: col.code,
      key: col.code,
      width: col.type === "STT" ? 50 : col.type === "CHECKBOX" ? 60 : undefined,
      render: (_: any, record: any, rowIdx: number) => {
        const computedRow = computedRows[rowIdx] || record;

        if (col.type === "STT") {
          return <Text strong style={{ color: "#595959" }}>{rowIdx + 1}</Text>;
        }

        if (col.type === "FORMULA") {
          const formulaVal = computedRow[col.code];
          return (
            <div style={{
              padding: "2px 8px",
              background: "#fffbe6",
              border: "1px solid #ffe58f",
              borderRadius: 4,
              fontWeight: 600,
              color: "#d46b08",
              textAlign: "right",
              fontSize: 13,
            }}>
              {formulaVal !== undefined ? Number(formulaVal).toLocaleString("vi-VN") : "—"}
            </div>
          );
        }

        if (col.type === "CHECKBOX") {
          return <Checkbox checked={!!record[col.code]} onChange={(e) => updateCell(rowIdx, col.code, e.target.checked)} />;
        }

        if (col.type === "NUMBER") {
          return (
            <InputNumber
              value={record[col.code]}
              onChange={(v) => updateCell(rowIdx, col.code, v)}
              style={{ width: "100%" }}
              size="small"
              formatter={(v) => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v ? Number(v.replace(/,/g, "")) : 0}
            />
          );
        }

        if (col.type === "DATE") {
          const dateVal = record[col.code];
          return (
            <DatePicker
              size="small"
              style={{ width: "100%" }}
              value={dateVal ? dayjs(dateVal) : undefined}
              onChange={(d) => updateCell(rowIdx, col.code, d?.toISOString() || "")}
              format="DD/MM/YYYY"
              placeholder="Chọn..."
            />
          );
        }

        if (col.type === "SELECT") {
          const choices = typeof col.choices === "string"
            ? col.choices.split(",").map((c: string) => ({ value: c.trim(), label: c.trim() }))
            : Array.isArray(col.choices)
            ? col.choices.map((c: any) => typeof c === "string" ? { value: c, label: c } : c)
            : [];
          return (
            <Select
              size="small"
              style={{ width: "100%", minWidth: 90 }}
              value={record[col.code] || undefined}
              onChange={(v) => updateCell(rowIdx, col.code, v)}
              options={choices}
              placeholder="Chọn..."
              allowClear
            />
          );
        }

        return <Input value={record[col.code]} onChange={(e) => updateCell(rowIdx, col.code, e.target.value)} size="small" />;
      },
    })),
    {
      title: "",
      key: "action",
      width: 40,
      render: (_: any, __: any, rowIdx: number) => (
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeRow(rowIdx)} />
      ),
    },
  ];

  return (
    <div>
      <Table
        dataSource={computedRows}
        columns={tableColumns}
        pagination={false}
        size="small"
        bordered
        rowKey={(_, idx) => String(idx ?? 0)}
        locale={{ emptyText: "Chưa có dòng nào. Nhấn + để thêm." }}
        style={{ marginBottom: 8 }}
        footer={hasSummary ? () => (
          <div style={{
            display: "flex",
            gap: 0,
            background: "#f6f8fa",
            borderTop: "2px solid #e8e8e8",
            fontWeight: 600,
            fontSize: 13,
          }}>
            {columns.map((col: any, i: number) => {
              const summary = col.summaryType && col.summaryType !== "NONE"
                ? computeSummary(computedRows, col.code, col.summaryType)
                : "";
              const label = SUMMARY_LABELS[col.summaryType] || "";

              if (col.type === "STT") {
                return (
                  <div key={i} style={{ width: 50, padding: "6px 8px", textAlign: "center", color: "#8c8c8c" }}>
                    Σ
                  </div>
                );
              }

              if (!summary && i === 0) {
                return (
                  <div key={i} style={{ flex: 1, padding: "6px 8px", color: "#8c8c8c" }}>
                    Tổng hợp
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    textAlign: summary ? "right" : "left",
                    color: summary ? "#0050b3" : "transparent",
                    background: summary ? "#e6f4ff" : undefined,
                    borderLeft: i > 0 ? "1px solid #e8e8e8" : undefined,
                  }}
                >
                  {summary ? (
                    <Space size={4}>
                      <Tag color="blue" style={{ fontSize: 10, lineHeight: "14px", padding: "0 4px" }}>{label}</Tag>
                      <span>{summary}</span>
                    </Space>
                  ) : ""}
                </div>
              );
            })}
            <div style={{ width: 40 }} />
          </div>
        ) : undefined}
      />
      <Button type="dashed" icon={<PlusOutlined />} onClick={addRow} block size="small" style={{ borderColor: "#1890ff", color: "#1890ff" }}>
        Thêm dòng
      </Button>
    </div>
  );
}

// =================== LOOKUP FIELD COMPONENT ===================
function LookupField({ field, value, onChange }: { field: Field; value: any; onChange: (val: any) => void; }) {
  const [options, setOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLookup = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/api/v1/records/lookup/${field.id}`);
        setOptions((data || []).map((r: any) => ({ value: r.id, label: r.title || r.businessCode || `#${r.id}` })));
      } catch { setOptions([]); }
      finally { setLoading(false); }
    };
    fetchLookup();
  }, [field.id]);

  return (
    <Select
      value={value}
      onChange={onChange}
      loading={loading}
      showSearch
      allowClear
      placeholder={`Tìm kiếm ${field.name}...`}
      filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
      options={options}
      style={{ width: "100%" }}
    />
  );
}

export default function DashboardPortal() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // State quản lý Tenant và User động
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");

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
    }
  }, [router]);

  const tenantQuery = useTenantDetail(tenantId);
  const activeTenantName = tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : "Đang tải thông tin doanh nghiệp...";

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem("bos_token");
    localStorage.removeItem("bos_tenant_id");
    localStorage.removeItem("bos_user_name");
    router.push("/auth/login");
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "tenants") router.push("/metadata");
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

  // State Tabs và Drawer phê duyệt
  const [activeTab, setActiveTab] = useState<"PENDING" | "COMPLETED">("PENDING");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState("");
  const [drawerFullscreen, setDrawerFullscreen] = useState(false);

  const [taskForm] = Form.useForm();
  const updateRecordMutation = useUpdateRecord();

  // Gọi APIs lấy danh sách nhiệm vụ của tôi
  const { data: tasksData, isLoading: isTasksLoading, refetch: refetchTasks } = useMyTasks(
    activeTab,
    page,
    5
  );

  // Hook lấy danh sách fields của thực thể liên đới với task đang chọn
  const recordEntityId = selectedTask?.instance?.record?.entityId || null;
  const { data: entityFields = [], isLoading: isFieldsLoading } = useFields(recordEntityId);

  // Hook lấy danh sách bước duyệt để resolve transitions đi ra của bước hiện tại
  const workflowVersionId = selectedTask?.instance?.versionId || null;
  const { data: workflowSteps = [] } = useWorkflowSteps(workflowVersionId);

  // Hook lấy Audit Logs lịch sử của lượt chạy quy trình đang chọn
  const selectedInstanceId = selectedTask?.instanceId || null;
  const { data: auditLogs = [], isLoading: isLogsLoading } = useWorkflowLogs(selectedInstanceId);

  // Mutations thực thi duyệt/bác hồ sơ
  const workflowActionMutation = useWorkflowAction();

  // Gọi các hooks lấy dữ liệu phòng ban, thành viên, vai trò cho các reference fields
  const { data: deptTree = [] } = useDepartmentTree();
  const { data: usersData } = useUsers(1, 100);
  const { data: rolesData } = useRoles(1, 100);

  const userOptions = useMemo(() => {
    const list = usersData?.data || [];
    return list.map((u: any) => ({ value: u.id, label: `${u.fullName} (${u.email})` }));
  }, [usersData]);

  const roleOptions = useMemo(() => {
    const list = rolesData?.data || [];
    return list.map((r: any) => ({ value: r.id, label: r.name }));
  }, [rolesData]);

  // Load dữ liệu record hiện tại vào taskForm khi mở drawer
  useEffect(() => {
    if (selectedTask) {
      const record = selectedTask.instance?.record;
      if (record) {
        const initialValues: Record<string, any> = {};
        entityFields.forEach((f) => {
          const rawVal = record.data?.[f.code];
          if (rawVal !== undefined && rawVal !== null) {
            if (f.type === "DATE" || f.type === "DATETIME" || f.type === "TIME" || f.type === "MONTH_YEAR") {
              const parsed = parseDateValue(rawVal, f.type);
              initialValues[f.code] = parsed || null;
            } else if (f.type === "FILE" || f.type === "IMAGE") {
              if (Array.isArray(rawVal)) {
                initialValues[f.code] = rawVal.map((file: any, index: number) => ({
                  uid: file.uid || String(index),
                  name: file.name,
                  status: "done",
                  url: file.url || "",
                  id: file.id,
                }));
              } else {
                initialValues[f.code] = [];
              }
            } else {
              initialValues[f.code] = rawVal;
            }
          }
        });
        taskForm.setFieldsValue(initialValues);
      }
    } else {
      taskForm.resetFields();
    }
  }, [selectedTask, entityFields, taskForm]);

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    const computedValues = calculateFormFormulas(entityFields, allValues);
    taskForm.setFieldsValue(computedValues);
  };

  // Xác định trạm hiện tại và các nút bấm phê duyệt động
  const currentStep = selectedTask ? workflowSteps.find((s) => s.id === selectedTask.stepId) : null;
  const transitions = currentStep?.transitionsOut || [];

  const handleActionClick = async (transitionId: number, actionLabel: string) => {
    if (!selectedTask || !selectedTask.instance?.record) return;
    const hideLoading = message.loading(`Đang thực thi: ${actionLabel}...`, 0);
    try {
      // 1. Kiểm tra xem có trường nào có quyền WRITE hay không để cập nhật
      const hasWriteFields = entityFields.some((f) => {
        const perm = selectedTask.status === "PENDING" ? (currentStep?.permissions?.[f.code] || "READ") : "READ";
        return perm === "WRITE";
      });

      if (hasWriteFields && selectedTask.status === "PENDING") {
        const values = await taskForm.validateFields();
        const fieldMap = new Map(entityFields.map((f) => [f.code, f]));
        const updatedData: Record<string, any> = {};

        for (const [key, val] of Object.entries(values)) {
          if (val === undefined || val === null) continue;
          const fieldDef = fieldMap.get(key);
          const fieldType = fieldDef?.type;

          // FILE / IMAGE
          if (fieldType === "FILE" || fieldType === "IMAGE") {
            if (Array.isArray(val)) {
              updatedData[key] = val.map((f: any) => ({
                name: f.name || f.fileName || String(f),
                uid: f.uid || String(Math.random()),
                size: f.size,
                type: f.type,
                id: f.id || f.response?.id || f.response?.data?.id,
                url: f.url || f.response?.url || f.response?.data?.url,
              }));
            } else {
              updatedData[key] = [];
            }
            continue;
          }

          // Dayjs object (DATE, DATETIME, TIME, MONTH_YEAR)
          if (typeof val === "object" && val !== null) {
            if ("$d" in val || (typeof (val as any).toISOString === "function" && typeof (val as any).format === "function")) {
              updatedData[key] = (val as any).toISOString();
              continue;
            }
            updatedData[key] = val;
            continue;
          }

          updatedData[key] = val;
        }

        // Gọi API cập nhật Record
        await updateRecordMutation.mutateAsync({
          id: selectedTask.instance.record.id,
          entityId: selectedTask.instance.record.entityId,
          payload: {
            data: {
              ...(selectedTask.instance.record.data || {}),
              ...updatedData,
            },
          },
        });
      }

      // 2. Chuyển bước duyệt quy trình
      await workflowActionMutation.mutateAsync({
        instanceId: selectedTask.instanceId,
        transitionId,
        comment: comment || `Đã thực hiện hành động: ${actionLabel}`,
      });

      message.success(`Đã xử lý thành công hành động: ${actionLabel}`);
      setSelectedTask(null);
      setComment("");
      refetchTasks();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi thực thi phê duyệt.");
    } finally {
      hideLoading();
    }
  };

  // Helper render ô nhập liệu dựa trên kiểu dữ liệu của trường (khi có quyền WRITE)
  const renderFieldInput = (field: Field) => {
    const { options } = field.config || {};
    const rules: any[] = [];
    if (field.config?.isRequired) {
      rules.push({ required: true, message: `${field.name} là bắt buộc` });
    }
    if (options?.regex || options?.regexPattern) {
      const pattern = options.regex || options.regexPattern;
      rules.push({
        validator: (_: any, value: any) => {
          if (value === undefined || value === null || value === "") return Promise.resolve();
          try {
            const reg = new RegExp(pattern);
            if (!reg.test(String(value))) {
              return Promise.reject(options.regexError || options.errorMessage || `${field.name} không đúng định dạng`);
            }
          } catch {}
          return Promise.resolve();
        }
      });
    }
    if (options?.minLength) {
      rules.push({
        validator: (_: any, value: any) => {
          if (value === undefined || value === null || value === "") return Promise.resolve();
          if (String(value).length < options.minLength) {
            return Promise.reject(`${field.name} cần tối thiểu ${options.minLength} ký tự`);
          }
          return Promise.resolve();
        }
      });
    }
    if (options?.maxLength) {
      rules.push({
        validator: (_: any, value: any) => {
          if (value === undefined || value === null || value === "") return Promise.resolve();
          if (String(value).length > options.maxLength) {
            return Promise.reject(`${field.name} tối đa ${options.maxLength} ký tự`);
          }
          return Promise.resolve();
        }
      });
    }

    const selectOpts = Array.isArray(options?.choices)
      ? options.choices.map((o: any) => typeof o === "string" ? { value: o, label: o } : o)
      : Array.isArray(options?.selectOptions)
      ? options.selectOptions.map((o: any) => typeof o === "string" ? { value: o, label: o } : o)
      : Array.isArray(options?.options)
      ? options.options.map((o: any) => typeof o === "string" ? { value: o, label: o } : o)
      : [];

    const customUploadRequest = async ({ file, onSuccess, onError, onProgress }: any) => {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedTask?.instance?.record?.id) {
        formData.append("recordId", String(selectedTask.instance.record.id));
      }
      try {
        const response = await api.post("/api/v1/attachments/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: ({ total, loaded }) => {
            if (total) {
              onProgress({ percent: Math.round((loaded / total) * 100) });
            }
          },
        });
        onSuccess(response.data, file);
      } catch (err: any) {
        onError(err);
        message.error(`Lỗi tải lên tệp ${file.name}: ${err?.response?.data?.message || err.message}`);
      }
    };

    switch (field.type) {
      case "TEXT":
        return (
          <Form.Item name={field.code} rules={rules} validateTrigger={["onChange", "onBlur"]} style={{ marginBottom: 0 }}>
            <Input placeholder={options?.placeholder || `Nhập ${field.name}...`} maxLength={options?.maxLength} showCount={!!options?.maxLength} />
          </Form.Item>
        );
      case "EMAIL":
        return (
          <Form.Item
            name={field.code}
            rules={[
              ...rules,
              {
                validator: (_: any, value: any) => {
                  if (value === undefined || value === null || value === "") return Promise.resolve();
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(String(value))) return Promise.reject("Email không đúng định dạng");
                  return Promise.resolve();
                }
              }
            ]}
            validateTrigger={["onChange", "onBlur"]}
            style={{ marginBottom: 0 }}
          >
            <Input type="email" placeholder={options?.placeholder || "user@example.com"} maxLength={options?.maxLength} />
          </Form.Item>
        );
      case "PHONE":
        return (
          <Form.Item
            name={field.code}
            rules={[
              ...rules,
              {
                validator: (_: any, value: any) => {
                  if (value === undefined || value === null || value === "") return Promise.resolve();
                  if (!options?.regex && !options?.regexPattern) {
                    const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
                    if (!phoneRegex.test(String(value))) return Promise.reject(options?.errorMessage || "Số điện thoại không đúng định dạng VN");
                  }
                  return Promise.resolve();
                }
              }
            ]}
            validateTrigger={["onChange", "onBlur"]}
            style={{ marginBottom: 0 }}
          >
            <Input type="tel" placeholder={options?.placeholder || "VD: 0901234567"} maxLength={options?.maxLength || 11} />
          </Form.Item>
        );
      case "TEXTAREA":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <TextArea rows={3} placeholder={options?.placeholder || `Nhập ${field.name}...`} maxLength={options?.maxLength} showCount={!!options?.maxLength} />
          </Form.Item>
        );
      case "NUMBER":
        return (
          <Form.Item name={field.code} rules={rules} validateTrigger={["onChange", "onBlur"]} style={{ marginBottom: 0 }}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={`Nhập ${field.name}...`}
              min={options?.min !== undefined ? options.min : undefined}
              max={options?.max !== undefined ? options.max : undefined}
              precision={0}
              formatter={(v) => v !== undefined && v !== null ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v ? Number(v.replace(/,/g, "")) : 0}
            />
          </Form.Item>
        );
      case "DECIMAL":
        return (
          <Form.Item name={field.code} rules={rules} validateTrigger={["onChange", "onBlur"]} style={{ marginBottom: 0 }}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder={options?.placeholder || `Nhập ${field.name}...`}
              min={options?.min !== undefined ? options.min : undefined}
              max={options?.max !== undefined ? options.max : undefined}
              step={options?.step || 0.01}
              precision={2}
              formatter={(v) => v !== undefined && v !== null ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v ? Number(v.replace(/,/g, "")) : 0}
            />
          </Form.Item>
        );
      case "CURRENCY":
        return (
          <Form.Item name={field.code} rules={rules} validateTrigger={["onChange", "onBlur"]} style={{ marginBottom: 0 }}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder="0"
              min={options?.min !== undefined ? options.min : 0}
              addonBefore={options?.prefix || "VNĐ"}
              formatter={(v) => v !== undefined && v !== null ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v ? Number(v.replace(/,/g, "")) : 0}
            />
          </Form.Item>
        );
      case "PERCENTAGE":
        return (
          <Form.Item name={field.code} rules={rules} validateTrigger={["onChange", "onBlur"]} style={{ marginBottom: 0 }}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder="0"
              min={options?.min !== undefined ? options.min : 0}
              max={options?.max !== undefined ? options.max : 100}
              precision={2}
              addonAfter="%"
              formatter={(v) => v !== undefined && v !== null ? String(v) : ""}
              parser={(v) => v ? Number(v) : 0}
            />
          </Form.Item>
        );
      case "DATE":
        return (
          <Form.Item
            name={field.code}
            rules={rules}
            validateTrigger={["onChange"]}
            getValueFromEvent={(date: Dayjs | null) => date?.toISOString() || null}
            getValueProps={(value) => ({ value: parseDateValue(value, "DATE") })}
            style={{ marginBottom: 0 }}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày..." />
          </Form.Item>
        );
      case "TIME":
        return (
          <Form.Item
            name={field.code}
            rules={rules}
            validateTrigger={["onChange"]}
            getValueFromEvent={(date: Dayjs | null) => date?.toISOString() || null}
            getValueProps={(value) => ({ value: parseDateValue(value, "TIME") })}
            style={{ marginBottom: 0 }}
          >
            <DatePicker.TimePicker style={{ width: "100%" }} format="HH:mm" placeholder="Chọn giờ..." minuteStep={5} changeOnScroll needConfirm={false} />
          </Form.Item>
        );
      case "DATETIME":
        return (
          <Form.Item
            name={field.code}
            rules={rules}
            validateTrigger={["onChange"]}
            getValueFromEvent={(date: Dayjs | null) => date?.toISOString() || null}
            getValueProps={(value) => ({ value: parseDateValue(value, "DATETIME") })}
            style={{ marginBottom: 0 }}
          >
            <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" placeholder="Chọn ngày và giờ..." />
          </Form.Item>
        );
      case "MONTH_YEAR":
        return (
          <Form.Item
            name={field.code}
            rules={rules}
            validateTrigger={["onChange"]}
            getValueFromEvent={(date: Dayjs | null) => date ? date.format("YYYY-MM") : null}
            getValueProps={(value) => ({ value: parseDateValue(value, "MONTH_YEAR") })}
            style={{ marginBottom: 0 }}
          >
            <DatePicker picker="month" style={{ width: "100%" }} format="MM/YYYY" placeholder="Chọn tháng/năm..." />
          </Form.Item>
        );
      case "SELECT":
      case "MULTI_SELECT":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <Select
              placeholder={`Chọn ${field.name}...`}
              allowClear
              mode={field.type === "MULTI_SELECT" || options?.multiple ? "multiple" : undefined}
              options={selectOpts}
              showSearch
              filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        );
      case "CHECKBOX":
        return (
          <Form.Item name={field.code} valuePropName="checked" style={{ marginBottom: 0 }}>
            <Checkbox>{options?.checkboxLabel || field.name}</Checkbox>
          </Form.Item>
        );
      case "LOOKUP":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <LookupField field={field} value={taskForm.getFieldValue(field.code)} onChange={(val: any) => taskForm.setFieldValue(field.code, val)} />
          </Form.Item>
        );
      case "TABLE":
        return (
          <Form.Item name={field.code} style={{ marginBottom: 0 }}>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }: any) => (
                <TableFieldEditor
                  field={field}
                  value={getFieldValue(field.code) || []}
                  onChange={(rows: any) => {
                    setFieldValue(field.code, rows);
                    const currentValues = taskForm.getFieldsValue();
                    currentValues[field.code] = rows;
                    const computedValues = calculateFormFormulas(entityFields, currentValues);
                    taskForm.setFieldsValue(computedValues);
                  }}
                />
              )}
            </Form.Item>
          </Form.Item>
        );
      case "FORMULA":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <InputNumber
              style={{
                width: "100%",
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                fontWeight: 600,
                color: "#d46b08",
              }}
              readOnly
              placeholder="Tự động tính toán..."
              formatter={(v) => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v ? Number(v.replace(/,/g, "")) : 0}
            />
          </Form.Item>
        );
      case "DEPT_REF":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <TreeSelect
              style={{ width: "100%" }}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              placeholder={options?.placeholder || `Chọn ${field.name}...`}
              allowClear
              treeData={deptTree.map(function mapNode(node: any): any {
                return {
                  value: node.id,
                  title: node.name,
                  children: node.children ? node.children.map(mapNode) : undefined
                };
              })}
            />
          </Form.Item>
        );
      case "USER_REF":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <Select
              placeholder={options?.placeholder || `Chọn ${field.name}...`}
              allowClear
              showSearch
              options={userOptions}
              filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        );
      case "ROLE_REF":
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <Select placeholder={options?.placeholder || `Chọn ${field.name}...`} allowClear options={roleOptions} />
          </Form.Item>
        );
      case "FILE":
        return (
          <Form.Item
            name={field.code}
            rules={rules}
            valuePropName="fileList"
            getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
            style={{ marginBottom: 0 }}
          >
            <Upload
              listType="text"
              multiple={options?.multiple !== false}
              accept={options?.accept || ".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt"}
              customRequest={customUploadRequest}
              beforeUpload={(file) => {
                const maxSize = options?.maxSize || 10;
                if (file.size / 1024 / 1024 > maxSize) {
                  message.error(`Tệp không được vượt quá ${maxSize}MB!`);
                  return Upload.LIST_IGNORE;
                }
                return true;
              }}
              maxCount={options?.maxFiles || 5}
            >
              <Button icon={<PaperClipOutlined />} style={{ width: "100%", textAlign: "left" }}>
                Chọn tệp đính kèm{options?.accept ? ` (${options.accept})` : " (PDF, Word...)"}...
              </Button>
            </Upload>
          </Form.Item>
        );
      case "IMAGE":
        return (
          <Form.Item
            name={field.code}
            rules={rules}
            valuePropName="fileList"
            getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
            style={{ marginBottom: 0 }}
          >
            <Upload
              listType="picture-card"
              multiple={options?.multiple !== false}
              accept={options?.accept || ".jpg,.jpeg,.png,.webp,.gif"}
              customRequest={customUploadRequest}
              beforeUpload={(file) => {
                const maxSize = options?.maxSize || 5;
                if (file.size / 1024 / 1024 > maxSize) {
                  message.error(`Ảnh không được vượt quá ${maxSize}MB!`);
                  return Upload.LIST_IGNORE;
                }
                return true;
              }}
              maxCount={options?.maxFiles || 5}
            >
              <div style={{ padding: "8px 0" }}>
                <PictureOutlined style={{ fontSize: 24, color: "#8c8c8c" }} />
                <div style={{ marginTop: 8, color: "#8c8c8c", fontSize: 12 }}>Tải ảnh</div>
              </div>
            </Upload>
          </Form.Item>
        );
      default:
        return (
          <Form.Item name={field.code} rules={rules} style={{ marginBottom: 0 }}>
            <Input placeholder={`Nhập ${field.name}...`} />
          </Form.Item>
        );
    }
  };

  // Helper render định dạng các trường dữ liệu động của Record
  const FilePreviewLink = ({ file, recordId }: { file: any; recordId?: number }) => {
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
      if (file.id && !isNaN(Number(file.id))) {
        setLoading(true);
        try {
          const { data } = await api.get(`/api/v1/attachments/${file.id}/view`);
          if (data?.presignedUrl) {
            window.open(data.presignedUrl, "_blank");
          } else {
            message.error("Không tìm thấy đường dẫn tải tệp.");
          }
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Lỗi khi lấy link tải tệp.");
        } finally {
          setLoading(false);
        }
      } else if (recordId && file.name) {
        setLoading(true);
        try {
          const { data } = await api.get(`/api/v1/attachments/view-by-name?recordId=${recordId}&fileName=${encodeURIComponent(file.name)}`);
          if (data?.presignedUrl) {
            window.open(data.presignedUrl, "_blank");
          } else {
            message.error("Không tìm thấy đường dẫn tải tệp.");
          }
        } catch (err: any) {
          message.error(err?.response?.data?.message || "Lỗi khi lấy link tải tệp.");
        } finally {
          setLoading(false);
        }
      } else if (file.url) {
        window.open(file.url, "_blank");
      } else {
        message.warning("Tệp không có thông tin tải xuống.");
      }
    };

    return (
      <Button
        type="link"
        size="small"
        loading={loading}
        onClick={handleDownload}
        style={{ padding: 0, height: "auto", display: "inline-flex", alignItems: "center" }}
      >
        {file.name || "Tải xuống"}
      </Button>
    );
  };

  const ImagePreview = ({ file, recordId }: { file: any; recordId?: number }) => {
    const [url, setUrl] = useState<string>("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const fetchUrl = async () => {
        if (file.id && !isNaN(Number(file.id))) {
          setLoading(true);
          try {
            const { data } = await api.get(`/api/v1/attachments/${file.id}/view`);
            if (data?.presignedUrl) {
              setUrl(data.presignedUrl);
            }
          } catch {
            // fallback
          } finally {
            setLoading(false);
          }
        } else if (recordId && file.name) {
          setLoading(true);
          try {
            const { data } = await api.get(`/api/v1/attachments/view-by-name?recordId=${recordId}&fileName=${encodeURIComponent(file.name)}`);
            if (data?.presignedUrl) {
              setUrl(data.presignedUrl);
            }
          } catch {
            // fallback
          } finally {
            setLoading(false);
          }
        } else if (file.url) {
          setUrl(file.url);
        }
      };
      fetchUrl();
    }, [file, recordId]);

    if (loading) return <Spin size="small" style={{ marginRight: 8 }} />;
    if (!url) return <Tag color="red">{file.name || "Ảnh lỗi"}</Tag>;

    return (
      <Image
        src={url}
        alt={file.name}
        width={60}
        height={60}
        style={{ objectFit: "cover", borderRadius: 6, border: "1px solid #d9d9d9" }}
      />
    );
  };


  const renderFieldValue = (field: Field, val: any, recordId?: number) => {
    if (val === undefined || val === null || val === "") {
      return <Text type="secondary" style={{ fontStyle: "italic" }}>-</Text>;
    }
    if (field.type === "CHECKBOX") {
      return val ? <Tag color="green">Có</Tag> : <Tag color="default">Không</Tag>;
    }
    if (field.type === "SELECT" || field.type === "MULTI_SELECT") {
      if (Array.isArray(val)) {
        return (
          <Space wrap size={[0, 4]}>
            {val.map((v) => (
              <Tag color="geekblue" key={v}>{v}</Tag>
            ))}
          </Space>
        );
      }
      return <Tag color="geekblue">{String(val)}</Tag>;
    }
    if (field.type === "FILE") {
      const files = Array.isArray(val) ? val : [];
      if (files.length === 0) return <Text type="secondary" italic>—</Text>;
      return (
        <Space direction="vertical" size={4}>
          {files.map((f: any, i: number) => (
            <Space key={i} size={4}>
              <span>📎</span>
              <FilePreviewLink file={f} recordId={recordId} />
            </Space>
          ))}
        </Space>
      );
    }
    if (field.type === "IMAGE") {
      const imgs = Array.isArray(val) ? val : [];
      if (imgs.length === 0) return <Text type="secondary" italic>—</Text>;
      return (
        <Space wrap size={[8, 8]}>
          {imgs.map((f: any, i: number) => (
            <ImagePreview key={i} file={f} recordId={recordId} />
          ))}
        </Space>
      );
    }
    if (field.type === "TABLE") {
      const columns = field.config?.options?.columns || [];
      const tableColumns = columns.map((col: any) => ({
        title: col.name,
        dataIndex: col.code,
        key: col.code,
        render: (cellVal: any) => {
          if (col.type === "CHECKBOX") {
            return cellVal ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>;
          }
          return cellVal !== undefined && cellVal !== null ? String(cellVal) : "-";
        },
      }));
      const dataList = Array.isArray(val) ? val : [];
      return (
        <div style={{ marginTop: "4px" }}>
          <Table
            dataSource={dataList}
            columns={tableColumns}
            pagination={false}
            size="small"
            bordered
            rowKey={(_, index) => (index !== undefined ? index.toString() : "0")}
            style={{ width: "100%" }}
          />
        </div>
      );
    }
    return <Text style={{ fontWeight: 500 }}>{String(val)}</Text>;
  };

  return (
    <AntdApp>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Sider Navigation */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
          style={{ borderRight: "1px solid #f0f0f0" }}
        >
          <div className="flex items-center justify-center py-4 border-b border-gray-100" style={{ minHeight: "64px" }}>
            <Title level={4} style={{ margin: 0, color: "#0050b3" }}>
              {collapsed ? "BOS" : "BOS Platform"}
            </Title>
          </div>
          <Menu
            theme="light"
            selectedKeys={["dashboard"]}
            mode="inline"
            onClick={handleMenuClick}
            items={[
              { key: "dashboard", icon: <DashboardOutlined />, label: "Bảng tổng quan" },
              { key: "organization", icon: <PartitionOutlined />, label: "Cơ cấu Tổ chức" },
              { key: "metadata", icon: <BuildOutlined />, label: "Biểu mẫu Động" },
              { key: "workflow", icon: <DeploymentUnitOutlined />, label: "Luồng Quy trình" },
              { key: "records", icon: <FormOutlined />, label: "Hồ sơ & Biểu mẫu" },
              ...(tenantId === null ? [{ key: "tenants", icon: <GlobalOutlined />, label: "Quản trị SaaS Tenant" }] : []),
            ]}
          />
        </Sider>

        {/* Main Layout Area */}
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
            <Space size="middle">
              <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading}>
                <Space>
                  <Text strong>{activeTenantName}</Text>
                </Space>
              </Button>
            </Space>

            {/* Công cụ góc phải */}
            <Space size="large">
              <Badge count={tasksData?.total || 0} overflowCount={99}>
                <Button type="text" shape="circle" icon={<BellOutlined />} />
              </Badge>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#0050b3" }} />
                  <div className="hidden md:block">
                    <Text strong>{userName}</Text>
                  </div>
                </Space>
              </Dropdown>
            </Space>
          </Header>

          {/* Content Section */}
          <Content style={{ margin: "24px 24px 0", overflow: "initial" }}>
            <Space direction="vertical" size="large" className="w-full">
              {/* Page Header Tiêu Chuẩn */}
              <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100">
                <div>
                  <Breadcrumb
                    items={[
                      { title: "Trang chủ" },
                      { title: "Bảng tổng quan" },
                    ]}
                  />
                  <Title level={2} style={{ margin: "8px 0 0 0" }}>Bảng điều khiển Trung tâm</Title>
                  <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                    Hệ thống Động hóa Doanh nghiệp đa ngành Low-Code - Trạng thái hệ thống tổng quan.
                  </Paragraph>
                </div>
                <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => router.push("/metadata")}>
                  Thiết kế Biểu mẫu Động
                </Button>
              </div>

              {/* KPI Metrics row */}
              <Row gutter={[20, 20]}>
                <Col xs={24} md={8}>
                  <Card bordered={false} className="shadow-sm bg-gradient-to-br from-blue-50 to-white" style={{ borderLeft: "4px solid #1890ff", borderRadius: "8px" }}>
                    <Space direction="vertical">
                      <Text type="secondary" strong>Nhiệm vụ Chờ phê duyệt</Text>
                      <Title level={2} style={{ margin: 0, color: "#0050b3" }}>
                        {isTasksLoading ? <Spin size="small" /> : (activeTab === "PENDING" ? tasksData?.total || 0 : "N/A")}
                      </Title>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} className="shadow-sm" style={{ borderLeft: "4px solid #52c41a", borderRadius: "8px" }}>
                    <Space direction="vertical">
                      <Text type="secondary" strong>Nhiệm vụ Đã hoàn thành</Text>
                      <Title level={2} style={{ margin: 0, color: "#237804" }}>
                        {isTasksLoading ? <Spin size="small" /> : (activeTab === "COMPLETED" ? tasksData?.total || 0 : "N/A")}
                      </Title>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} className="shadow-sm" style={{ borderLeft: "4px solid #faad14", borderRadius: "8px" }}>
                    <Space direction="vertical">
                      <Text type="secondary" strong>Đơn vị / Phòng ban</Text>
                      <Title level={2} style={{ margin: 0, color: "#d48806" }}>
                        1
                      </Title>
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* TRUNG TÂM PHÊ DUYỆT (APPROVALS CENTER) */}
              <Card
                bordered={false}
                className="shadow-sm"
                title={
                  <Space>
                    <DeploymentUnitOutlined style={{ color: "#0050b3", fontSize: "18px" }} />
                    <span style={{ fontSize: "16px", fontWeight: 600 }}>Trung tâm Phê duyệt & Lịch trình Công việc</span>
                  </Space>
                }
                style={{ borderRadius: "8px" }}
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => {
                    setActiveTab(key as any);
                    setPage(1);
                  }}
                  items={[
                    {
                      key: "PENDING",
                      label: (
                        <span>
                          Chờ tôi xử lý{" "}
                          {activeTab === "PENDING" && tasksData?.total ? (
                            <Badge count={tasksData?.total || 0} style={{ backgroundColor: "#ff4d4f", marginLeft: "4px" }} />
                          ) : null}
                        </span>
                      ),
                    },
                    {
                      key: "COMPLETED",
                      label: "Lịch sử xử lý",
                    },
                  ]}
                />

                {isTasksLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Spin tip="Đang tải danh sách nhiệm vụ..." />
                  </div>
                ) : (tasksData?.data?.length || 0) === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={`Bạn không có nhiệm vụ nào trong danh sách ${activeTab === "PENDING" ? "chờ xử lý" : "đã hoàn thành"}.`}
                  />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={tasksData?.data || []}
                    pagination={{
                      current: page,
                      pageSize: 5,
                      total: tasksData?.total || 0,
                      onChange: (p) => setPage(p),
                    }}
                    renderItem={(task) => {
                      const record = task.instance?.record;
                      const instanceStatus = task.instance?.status;
                      const isRejected = instanceStatus === "REJECTED" || record?.status === "REJECTED";
                      const isApproved = instanceStatus === "COMPLETED" || record?.status === "COMPLETED" || record?.status === "APPROVED";
                      const isPending = task.status === "PENDING" && !isRejected && !isApproved;

                      // Avatar background/color theo trạng thái
                      const avatarBg = isPending ? "#e6f7ff" : isRejected ? "#fff1f0" : "#f6ffed";
                      const avatarColor = isPending ? "#1890ff" : isRejected ? "#ff4d4f" : "#52c41a";
                      const avatarIcon = isPending ? <ClockCircleOutlined /> : isRejected ? <CloseCircleOutlined /> : <CheckCircleOutlined />;

                      return (
                        <List.Item
                          actions={[
                            isRejected && (
                              <Tag color="error" icon={<CloseCircleOutlined />} key="rejected-tag">
                                Đã từ chối
                              </Tag>
                            ),
                            <Button
                              type="primary"
                              ghost
                              icon={<RightOutlined />}
                              onClick={() => setSelectedTask(task)}
                              key="action"
                              danger={isRejected}
                            >
                              {isPending ? "Xử lý hồ sơ" : "Xem chi tiết"}
                            </Button>,
                          ].filter(Boolean)}
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: "16px 24px",
                            transition: "background-color 0.2s",
                            background: isRejected ? "#fff9f9" : undefined,
                          }}
                          className="hover:bg-slate-50"
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                icon={avatarIcon}
                                style={{ backgroundColor: avatarBg, color: avatarColor }}
                              />
                            }
                            title={
                              <Space>
                                <Text strong style={{ fontSize: "14px" }}>
                                  {record?.title || record?.businessCode || "Hồ sơ không tên"}
                                </Text>
                                <Tag color="blue">{record?.businessCode}</Tag>
                                {isRejected && (
                                  <Tag color="red" style={{ marginLeft: 4 }}>Từ chối</Tag>
                                )}
                                {isApproved && (
                                  <Tag color="green" style={{ marginLeft: 4 }}>Đã duyệt</Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={2}>
                                <div>
                                  <Text type="secondary">Trạng thái: </Text>
                                  <Text strong style={{ color: isPending ? "#1890ff" : isRejected ? "#ff4d4f" : "#52c41a" }}>
                                    {isPending ? "Chờ xử lý" : isRejected ? "Hồ sơ bị từ chối" : "Đã phê duyệt"}
                                  </Text>
                                </div>
                                <Text type="secondary" style={{ fontSize: "12px" }}>
                                  Thời gian nhận: {new Date(task.createdAt).toLocaleString("vi-VN")}
                                </Text>
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                )}
              </Card>
            </Space>
          </Content>
        </Layout>

        <Drawer
          title={
            <Space>
              <FileTextOutlined style={{ color: "#1890ff" }} />
              <span>
                {selectedTask?.status === "PENDING" ? "Xử lý duyệt hồ sơ: " : "Nhật ký hồ sơ: "}
                <strong>{selectedTask?.instance?.record?.title || selectedTask?.instance?.record?.businessCode}</strong>
              </span>
            </Space>
          }
          width={drawerFullscreen ? "100vw" : 720}
          onClose={() => {
            setSelectedTask(null);
            setComment("");
            setDrawerFullscreen(false);
          }}
          open={!!selectedTask}
          extra={
            <Space>
              <Tooltip title={drawerFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}>
                <Button
                  type="text"
                  size="small"
                  icon={drawerFullscreen ? <ShrinkOutlined /> : <ExpandAltOutlined />}
                  onClick={() => setDrawerFullscreen((prev) => !prev)}
                  style={{ color: "#595959", marginRight: 16 }}
                />
              </Tooltip>
              {(() => {
                const ist = selectedTask?.instance?.status;
                const recStatus = selectedTask?.instance?.record?.status;
                const selIsRejected = ist === "REJECTED" || recStatus === "REJECTED";
                const selIsApproved = ist === "COMPLETED" || recStatus === "COMPLETED" || recStatus === "APPROVED";
                if (selIsRejected) return <Tag color="error" icon={<CloseCircleOutlined />}>Hồ sơ bị Từ chối</Tag>;
                if (selIsApproved) return <Tag color="success" icon={<CheckCircleOutlined />}>Đã phê duyệt thành công</Tag>;
                return null;
              })()}
            </Space>
          }
        >
          {selectedTask && (
            <Space direction="vertical" size="large" className="w-full">
              {/* PHÂN KHU 1: THÔNG TIN BẢN GHI DỮ LIỆU ĐỘNG */}
              <Card size="small" title="Chi tiết Dữ liệu hồ sơ" headStyle={{ background: "#fafafa" }}>
                {isFieldsLoading ? (
                  <Spin tip="Đang đọc cấu hình biểu mẫu..." />
                ) : (
                  <Form form={taskForm} layout="vertical" onValuesChange={handleFormValuesChange}>
                    <Descriptions bordered column={1} size="small" labelStyle={{ width: "180px", fontWeight: "bold" }}>
                      <Descriptions.Item label="Mã hồ sơ">
                        <Tag color="cyan">{selectedTask.instance?.record?.businessCode}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="Tiêu đề hồ sơ">
                        <Text strong>{selectedTask.instance?.record?.title}</Text>
                      </Descriptions.Item>
                      {/* Render động các fields trong biểu mẫu */}
                      {entityFields.map((field) => {
                        const value = selectedTask.instance?.record?.data?.[field.code];
                        const permission = selectedTask.status === "PENDING"
                          ? (currentStep?.permissions?.[field.code] || "READ")
                          : "READ";

                        if (permission === "HIDDEN") {
                          return null;
                        }

                        return (
                          <Descriptions.Item key={field.id} label={field.name}>
                            {permission === "WRITE" ? (
                              renderFieldInput(field)
                            ) : (
                              renderFieldValue(field, value, selectedTask?.instance?.record?.id)
                            )}
                          </Descriptions.Item>
                        );
                      })}
                    </Descriptions>
                  </Form>
                )}
              </Card>

              {/* PHÂN KHU 2: NHẬT KÝ DUYỆT (TIMELINE LOGS) */}
              <Card size="small" title="Lịch sử Lộ trình phê duyệt" headStyle={{ background: "#fafafa" }}>
                {isLogsLoading ? (
                  <Spin tip="Đang tải nhật ký..." />
                ) : auditLogs.length === 0 ? (
                  <Empty description="Chưa có nhật ký hoạt động nào." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Timeline
                    mode="left"
                    style={{ marginTop: "16px" }}
                    items={auditLogs.map((log) => {
                      let color = "blue";
                      let icon = <ClockCircleOutlined />;
                      const normalizedAction = log.action.toLowerCase();
                      if (log.action === "START") {
                        color = "gray";
                        icon = <FileTextOutlined />;
                      } else if (
                        normalizedAction.includes("từ chối") ||
                        normalizedAction.includes("bác bỏ") ||
                        normalizedAction.includes("không phê duyệt") ||
                        normalizedAction.includes("reject")
                      ) {
                        color = "red";
                        icon = <CloseCircleOutlined />;
                      } else if (
                        normalizedAction.includes("duyệt") ||
                        normalizedAction.includes("đồng ý") ||
                        normalizedAction.includes("approve")
                      ) {
                        color = "green";
                        icon = <CheckCircleOutlined />;
                      }
                      return {
                        color,
                        dot: icon,
                        children: (
                          <div style={{ paddingBottom: "12px" }}>
                            <div className="flex justify-between items-center">
                              <Text strong style={{ fontSize: "14px" }}>
                                {log.action === "START" ? "Khởi động" : log.action}
                              </Text>
                              <Text type="secondary" style={{ fontSize: "12px" }}>
                                {new Date(log.createdAt).toLocaleString("vi-VN")}
                              </Text>
                            </div>
                            <div>
                              <Text type="secondary">Thực hiện bởi: </Text>
                              <Text strong>{log.user?.fullName || "Hệ thống"}</Text>
                            </div>
                            {log.comment && (
                              <div style={{ marginTop: "4px", background: "#f5f5f5", padding: "6px 12px", borderRadius: "4px" }}>
                                <MessageOutlined style={{ marginRight: "6px", color: "#8c8c8c" }} />
                                <Text italic type="secondary">{log.comment}</Text>
                              </div>
                            )}
                          </div>
                        ),
                      };
                    })}
                  />
                )}
              </Card>

              {/* PHÂN KHU 3: PANEL PHÊ DUYỆT (HÀNH ĐỘNG DUYỆT ĐỘNG) */}
              {selectedTask.status === "PENDING" && (
                <Card size="small" title="Ý kiến & Thực thi phê duyệt" headStyle={{ background: "#e6f7ff" }}>
                  <Form layout="vertical">
                    <Form.Item label="Nội dung ý kiến phản hồi (Comment):" required>
                      <TextArea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Nhập nội dung phản hồi, nhận xét hoặc lý do từ chối..."
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      {transitions.length === 0 ? (
                        <div className="text-center py-4 bg-gray-50 rounded border border-dashed">
                          <Text type="secondary" italic>Quy trình tại trạm này chưa được cấu hình nút rẽ nhánh tiếp theo.</Text>
                        </div>
                      ) : (
                        <Space wrap size="middle" style={{ width: "100%", justifyContent: "flex-end" }}>
                          {transitions.map((trans: any) => {
                            const actionLabel = trans.conditionLogic?.actionLabel || "Tiếp tục";
                            const isReject =
                              actionLabel.toLowerCase().includes("từ chối") ||
                              actionLabel.toLowerCase().includes("bác") ||
                              actionLabel.toLowerCase().includes("reject");
                            const isApprove =
                              actionLabel.toLowerCase().includes("duyệt") ||
                              actionLabel.toLowerCase().includes("đồng ý") ||
                              actionLabel.toLowerCase().includes("approve");

                            let btnType: "primary" | "default" | "dashed" = "default";
                            let btnDanger = false;
                            let btnStyle = {};

                            if (isApprove) {
                              btnType = "primary";
                              btnStyle = { backgroundColor: "#52c41a", borderColor: "#52c41a" };
                            } else if (isReject) {
                              btnType = "primary";
                              btnDanger = true;
                            } else {
                              btnType = "primary";
                            }

                            return (
                              <Button
                                key={trans.id}
                                type={btnType}
                                danger={btnDanger}
                                style={btnStyle}
                                loading={workflowActionMutation.isPending}
                                onClick={() => handleActionClick(trans.id, actionLabel)}
                              >
                                {actionLabel}
                              </Button>
                            );
                          })}
                        </Space>
                      )}
                    </Form.Item>
                  </Form>
                </Card>
              )}
            </Space>
          )}
        </Drawer>
      </Layout>
    </AntdApp>
  );
}
