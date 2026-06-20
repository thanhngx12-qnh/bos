// File: src/app/records/components/RecordDetailDrawer.tsx
"use client";

import React, { useMemo } from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Typography,
  Space,
  Table,
  Spin,
  Empty,
  Card,
  Divider,
  Timeline,
  Button,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  MessageOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import { RecordData } from "@/hooks/useRecords";
import { useFields, Field } from "@/hooks/useFields";
import { useRecordWorkflowLogs } from "@/hooks/useTasks";
import { useDepartmentTree } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";

const { Text, Title } = Typography;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "default" },
  IN_PROGRESS: { label: "Đang xử lý", color: "processing" },
  APPROVED: { label: "Đã phê duyệt", color: "success" },
  COMPLETED: { label: "Đã phê duyệt", color: "success" },
  REJECTED: { label: "Bị từ chối", color: "error" },
  PENDING: { label: "Chờ duyệt", color: "warning" },
};

// =================== GLOBAL FORMULA ENGINE ===================
function evaluateFormulaString(formula: string, context: Record<string, any>): number {
  try {
    let expression = formula;
    // Replace {field_code} with actual values
    expression = expression.replace(/\{([^}]+)\}/g, (_, code) => {
      const val = context[code];
      return val !== undefined && val !== null ? String(Number(val) || 0) : "0";
    });
    // Replace raw field names (words)
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
    // Simple math eval
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
  
  // 1. Calculate TABLE cell formulas first
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

  // 2. Calculate global FORMULA fields
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

// =================== TABLE FORMULA EVALUATOR ===================
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

function renderFieldValue(
  field: Field,
  val: any,
  findDeptName?: (id: number) => string,
  findUserName?: (id: number) => string,
  findRoleName?: (id: number) => string
) {
  if (val === undefined || val === null || val === "") {
    return <Text type="secondary" italic>—</Text>;
  }

  if (field.type === "DEPT_REF") {
    const deptId = Number(val);
    const deptName = findDeptName ? findDeptName(deptId) : `Phòng ban #${val}`;
    return <Tag color="cyan">{deptName}</Tag>;
  }

  if (field.type === "USER_REF") {
    const userId = Number(val);
    const userName = findUserName ? findUserName(userId) : `Người dùng #${val}`;
    return <Tag color="blue">{userName}</Tag>;
  }

  if (field.type === "ROLE_REF") {
    const roleId = Number(val);
    const roleName = findRoleName ? findRoleName(roleId) : `Vai trò #${val}`;
    return <Tag color="purple">{roleName}</Tag>;
  }

  if (field.type === "CHECKBOX") {
    return val ? <Tag color="green">Có</Tag> : <Tag color="default">Không</Tag>;
  }

  if (field.type === "DATE") {
    try {
      return <Text>{new Date(val).toLocaleDateString("vi-VN")}</Text>;
    } catch {
      return <Text>{String(val)}</Text>;
    }
  }

  if (field.type === "NUMBER") {
    return (
      <Text strong style={{ color: "#0050b3" }}>
        {Number(val).toLocaleString("vi-VN")}
      </Text>
    );
  }

  if (field.type === "SELECT" || field.type === "MULTI_SELECT") {
    if (Array.isArray(val)) {
      return (
        <Space wrap size={[4, 4]}>
          {val.map((v, i) => <Tag color="geekblue" key={i}>{v}</Tag>)}
        </Space>
      );
    }
    return <Tag color="geekblue">{String(val)}</Tag>;
  }

  if (field.type === "TABLE") {
    const columns = field.config?.options?.columns || [];
    const dataList = Array.isArray(val) ? val : [];

    const tableColumns = columns.map((col: any) => ({
      title: col.name,
      dataIndex: col.code,
      key: col.code,
      width: col.type === "STT" ? 50 : undefined,
      render: (cellVal: any, record: any, index: number) => {
        if (col.type === "STT") {
          return <Text strong style={{ color: "#595959" }}>{index + 1}</Text>;
        }
        if (col.type === "FORMULA") {
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
              display: "inline-block",
            }}>
              {cellVal !== undefined && cellVal !== null ? Number(cellVal).toLocaleString("vi-VN") : "—"}
            </div>
          );
        }
        if (col.type === "CHECKBOX") return cellVal ? <Tag color="green">✓</Tag> : <Tag>✗</Tag>;
        if (col.type === "NUMBER") return cellVal !== undefined && cellVal !== null && cellVal !== "" ? Number(cellVal).toLocaleString("vi-VN") : "—";
        return cellVal !== undefined && cellVal !== null ? String(cellVal) : "—";
      },
    }));

    const hasSummary = columns.some((col: any) => col.summaryType && col.summaryType !== "NONE");

    if (dataList.length === 0) return <Text type="secondary" italic>Không có dữ liệu</Text>;
    return (
      <Table
        dataSource={dataList}
        columns={tableColumns}
        pagination={false}
        size="small"
        bordered
        rowKey={(_, index) => String(index ?? 0)}
        style={{ width: "100%", marginTop: 4 }}
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
                ? computeSummary(dataList, col.code, col.summaryType)
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
          </div>
        ) : undefined}
      />
    );
  }

  return <Text>{String(val)}</Text>;
}

interface RecordDetailDrawerProps {
  record: RecordData | null;
  open: boolean;
  onClose: () => void;
}

export default function RecordDetailDrawer({ record, open, onClose }: RecordDetailDrawerProps) {
  const { data: fields = [], isLoading: isFieldsLoading } = useFields(record?.entityId || null);
  const { data: auditLogs = [], isLoading: isLogsLoading } = useRecordWorkflowLogs(record?.id || null);
  const status = record ? STATUS_MAP[record.status] || { label: record.status, color: "default" } : null;

  const { data: deptTree = [] } = useDepartmentTree();
  const { data: usersData } = useUsers(1, 100);
  const { data: rolesData } = useRoles(1, 100);

  const findDeptName = (id: number): string => {
    const search = (nodes: any[]): string => {
      for (const n of nodes) {
        if (n.id === id) return n.name;
        if (n.children) {
          const res = search(n.children);
          if (res) return res;
        }
      }
      return "";
    };
    return search(deptTree) || `Phòng ban #${id}`;
  };

  const findUserName = (id: number): string => {
    const list = usersData?.data || [];
    const u = list.find((x: any) => x.id === id);
    return u ? u.fullName : `Người dùng #${id}`;
  };

  const findRoleName = (id: number): string => {
    const list = rolesData?.data || [];
    const r = list.find((x: any) => x.id === id);
    return r ? r.name : `Vai trò #${id}`;
  };

  const sortedFields = [...fields].sort(
    (a, b) => (a.config?.orderIndex || 0) - (b.config?.orderIndex || 0)
  );

  const computedData = useMemo(() => {
    if (!record?.data) return {};
    return calculateFormFormulas(fields, record.data);
  }, [record, fields]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={680}
      title={
        <Space>
          <FileTextOutlined style={{ color: "#1890ff", fontSize: 18 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {record?.title || record?.businessCode || "Chi tiết Hồ sơ"}
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", fontWeight: 400 }}>
              Mã hồ sơ:{" "}
              <Tag color="blue" style={{ marginLeft: 4 }}>
                {record?.businessCode}
              </Tag>
            </div>
          </div>
        </Space>
      }
      extra={
        status && (
          <Tag color={status.color} style={{ fontSize: 13, padding: "4px 12px" }}>
            {status.label}
          </Tag>
        )
      }
      styles={{
        body: { padding: 24 },
        header: {
          background: "linear-gradient(to right, #f0f5ff, #fff)",
          borderBottom: "1px solid #f0f0f0",
        },
      }}
    >
      {record && (
        <Space direction="vertical" size="large" className="w-full">
          {/* Metadata */}
          <Card size="small" title="Thông tin Hồ sơ" bordered={false} style={{ background: "#fafafa", borderRadius: 8 }}>
            <Descriptions column={2} size="small" labelStyle={{ fontWeight: 600, color: "#595959" }}>
              <Descriptions.Item label="Mã hồ sơ">
                <Tag color="blue">{record.businessCode}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {status && <Tag color={status.color}>{status.label}</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày nộp">
                {new Date(record.createdAt).toLocaleString("vi-VN")}
              </Descriptions.Item>
              <Descriptions.Item label="Cập nhật lần cuối">
                {new Date(record.updatedAt).toLocaleString("vi-VN")}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Dynamic Fields */}
          <Card
            size="small"
            title="Nội dung Hồ sơ"
            bordered={false}
            style={{ borderRadius: 8 }}
            headStyle={{ background: "#fafafa" }}
          >
            {isFieldsLoading ? (
              <div className="flex justify-center py-8">
                <Spin tip="Đang tải cấu hình biểu mẫu..." />
              </div>
            ) : sortedFields.length === 0 ? (
              <Empty description="Không có thông tin trường dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Descriptions
                bordered
                column={1}
                size="small"
                labelStyle={{ width: 200, fontWeight: 600, background: "#fafafa" }}
              >
                {sortedFields.map((field) => (
                  <Descriptions.Item key={field.id} label={field.name}>
                    {renderFieldValue(field, computedData?.[field.code], findDeptName, findUserName, findRoleName)}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}
          </Card>

          {/* Timeline Lịch sử phê duyệt */}
          <Card
            size="small"
            title={
              <Space>
                <ClockCircleOutlined style={{ color: "#1890ff" }} />
                <span>Lịch sử Lộ trình phê duyệt</span>
              </Space>
            }
            bordered={false}
            style={{ borderRadius: 8 }}
            headStyle={{ background: "#fafafa" }}
          >
            {isLogsLoading ? (
              <div className="flex justify-center py-8">
                <Spin tip="Đang tải lịch sử phê duyệt..." />
              </div>
            ) : auditLogs.length === 0 ? (
              <Empty description="Chưa có nhật ký hoạt động nào cho hồ sơ này." image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: "16px 0" }} />
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        </Space>
      )}
    </Drawer>
  );
}
