// File: src/app/records/components/RecordDetailDrawer.tsx
"use client";

import React, { useMemo, useState, useEffect } from "react";
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
  Image,
  message,
  Tooltip,
  Dropdown,
  Modal,
  Steps,
  Tabs,
  Avatar,
} from "antd";
import { api } from "@/lib/axios";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  MessageOutlined,
  ExportOutlined,
  ExpandAltOutlined,
  ShrinkOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import { RecordData, useRecordRevisions } from "@/hooks/useRecords";
import { useFields, Field } from "@/hooks/useFields";
import { useRecordWorkflowLogs } from "@/hooks/useTasks";
import { useDepartmentTree } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import { usePrintTemplates } from "@/hooks/usePrintTemplates";
import { useRecordWorkflowProgress } from "@/hooks/useWorkflows";

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
function evaluateFormulaString(
  formula: string,
  context: Record<string, any>,
): number {
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
        const numVal =
          typeof val === "boolean" ? (val ? 1 : 0) : Number(val) || 0;
        const regex = new RegExp(`\\b${word}\\b`, "g");
        expression = expression.replace(regex, String(numVal));
      }
    }
    // Simple math eval
    expression = expression.replace(/[^0-9+\-*/().\s]/g, "");
    if (!expression || expression.trim() === "") return 0;
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && isFinite(result)
      ? parseFloat(result.toFixed(4))
      : 0;
  } catch {
    return 0;
  }
}

function preprocessRollups(
  expression: string,
  context: Record<string, any>,
): string {
  const rollupRegex =
    /(SUM|COUNT|AVG)\(([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\)/gi;
  return expression.replace(
    rollupRegex,
    (match, func, tableCode, columnCode) => {
      const tableData = context[tableCode];
      if (!Array.isArray(tableData) || tableData.length === 0) return "0";
      if (func.toUpperCase() === "COUNT") return String(tableData.length);
      if (columnCode) {
        const values = tableData.map((row) => Number(row[columnCode]) || 0);
        if (func.toUpperCase() === "SUM")
          return String(values.reduce((a, b) => a + b, 0));
        if (func.toUpperCase() === "AVG")
          return String(values.reduce((a, b) => a + b, 0) / values.length);
      }
      return "0";
    },
  );
}

function calculateFormFormulas(
  fields: any[],
  currentValues: Record<string, any>,
): Record<string, any> {
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
                computedRow[col.code] = evaluateTableFormula(
                  col.formula,
                  computedRow,
                );
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
      const formula = field.config?.options?.formula || field.config?.formula;
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
function evaluateTableFormula(
  formula: string,
  rowData: Record<string, any>,
): number {
  try {
    let expression = formula.replace(/\{([^}]+)\}/g, (_, code) => {
      const val = rowData[code];
      return val !== undefined && val !== null ? String(Number(val) || 0) : "0";
    });
    expression = expression.replace(/[^0-9+\-*/().]/g, "");
    if (!expression || expression.trim() === "") return 0;
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && isFinite(result)
      ? parseFloat(result.toFixed(4))
      : 0;
  } catch {
    return 0;
  }
}

function computeSummary(
  rows: any[],
  colCode: string,
  summaryType: string,
): string {
  if (!summaryType || summaryType === "NONE" || rows.length === 0) return "";
  const values = rows.map((r) => Number(r[colCode]) || 0);
  switch (summaryType) {
    case "SUM":
      return values.reduce((a, b) => a + b, 0).toLocaleString("vi-VN");
    case "AVG":
      return (values.reduce((a, b) => a + b, 0) / values.length).toLocaleString(
        "vi-VN",
        { maximumFractionDigits: 2 },
      );
    case "MIN":
      return Math.min(...values).toLocaleString("vi-VN");
    case "MAX":
      return Math.max(...values).toLocaleString("vi-VN");
    default:
      return "";
  }
}

const SUMMARY_LABELS: Record<string, string> = {
  SUM: "Tổng",
  AVG: "TB",
  MIN: "Min",
  MAX: "Max",
};

function FilePreviewLink({ file, recordId }: { file: any; recordId?: number }) {
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
        message.error(
          err?.response?.data?.message || "Lỗi khi lấy link tải tệp.",
        );
      } finally {
        setLoading(false);
      }
    } else if (recordId && file.name) {
      setLoading(true);
      try {
        const { data } = await api.get(
          `/api/v1/attachments/view-by-name?recordId=${recordId}&fileName=${encodeURIComponent(file.name)}`,
        );
        if (data?.presignedUrl) {
          window.open(data.presignedUrl, "_blank");
        } else {
          message.error("Không tìm thấy đường dẫn tải tệp.");
        }
      } catch (err: any) {
        message.error(
          err?.response?.data?.message || "Lỗi khi lấy link tải tệp.",
        );
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
      style={{
        padding: 0,
        height: "auto",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {file.name || "Tải xuống"}
    </Button>
  );
}

function ImagePreview({ file, recordId }: { file: any; recordId?: number }) {
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
          const { data } = await api.get(
            `/api/v1/attachments/view-by-name?recordId=${recordId}&fileName=${encodeURIComponent(file.name)}`,
          );
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
      style={{
        objectFit: "cover",
        borderRadius: 6,
        border: "1px solid #d9d9d9",
      }}
    />
  );
}

function renderFieldValue(
  field: Field,
  val: any,
  findDeptName?: (id: number) => string,
  findUserName?: (id: number) => string,
  findRoleName?: (id: number) => string,
  recordId?: number,
) {
  if (val === undefined || val === null || val === "") {
    return (
      <Text type="secondary" italic>
        —
      </Text>
    );
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

  if (field.type === "DATETIME") {
    try {
      return (
        <Text>
          {new Date(val).toLocaleString("vi-VN", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </Text>
      );
    } catch {
      return <Text>{String(val)}</Text>;
    }
  }

  if (field.type === "TIME") {
    try {
      // TIME stored as ISO or HH:mm string
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return (
          <Text>
            {d.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        );
      }
      return <Text>{String(val)}</Text>;
    } catch {
      return <Text>{String(val)}</Text>;
    }
  }

  if (field.type === "MONTH_YEAR") {
    try {
      const d = new Date(val + "-01");
      if (!isNaN(d.getTime())) {
        return (
          <Text>
            {d.toLocaleDateString("vi-VN", {
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
        );
      }
      return <Text>{String(val)}</Text>;
    } catch {
      return <Text>{String(val)}</Text>;
    }
  }

  if (
    field.type === "NUMBER" ||
    field.type === "DECIMAL" ||
    field.type === "FORMULA"
  ) {
    return (
      <Text strong style={{ color: "#0050b3" }}>
        {Number(val).toLocaleString("vi-VN")}
      </Text>
    );
  }

  if (field.type === "CURRENCY") {
    const prefix = field.config?.options?.prefix || "VNĐ";
    return (
      <Text strong style={{ color: "#389e0d" }}>
        {Number(val).toLocaleString("vi-VN")} {prefix}
      </Text>
    );
  }

  if (field.type === "PERCENTAGE") {
    return (
      <Text strong style={{ color: "#722ed1" }}>
        {Number(val).toLocaleString("vi-VN")}%
      </Text>
    );
  }

  if (field.type === "FILE") {
    const files = Array.isArray(val) ? val : [];
    if (files.length === 0)
      return (
        <Text type="secondary" italic>
          —
        </Text>
      );
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
    if (imgs.length === 0)
      return (
        <Text type="secondary" italic>
          —
        </Text>
      );
    return (
      <Space wrap size={[8, 8]}>
        {imgs.map((f: any, i: number) => (
          <ImagePreview key={i} file={f} recordId={recordId} />
        ))}
      </Space>
    );
  }

  if (field.type === "SELECT" || field.type === "MULTI_SELECT") {
    if (Array.isArray(val)) {
      return (
        <Space wrap size={[4, 4]}>
          {val.map((v, i) => (
            <Tag color="geekblue" key={i}>
              {v}
            </Tag>
          ))}
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
      render: (cellVal: any, _r: any, index: number) => {
        if (col.type === "STT")
          return (
            <Text strong style={{ color: "#595959" }}>
              {index + 1}
            </Text>
          );
        if (col.type === "FORMULA")
          return (
            <div
              style={{
                padding: "2px 8px",
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                borderRadius: 4,
                fontWeight: 600,
                color: "#d46b08",
                textAlign: "right" as const,
                fontSize: 13,
                display: "inline-block",
              }}
            >
              {cellVal !== undefined && cellVal !== null
                ? Number(cellVal).toLocaleString("vi-VN")
                : "—"}
            </div>
          );
        if (col.type === "CHECKBOX")
          return cellVal ? <Tag color="green">✓</Tag> : <Tag>✗</Tag>;
        if (col.type === "NUMBER")
          return cellVal !== undefined && cellVal !== null && cellVal !== ""
            ? Number(cellVal).toLocaleString("vi-VN")
            : "—";
        return cellVal !== undefined && cellVal !== null
          ? String(cellVal)
          : "—";
      },
    }));
    const hasSummary = columns.some(
      (col: any) => col.summaryType && col.summaryType !== "NONE",
    );
    if (dataList.length === 0)
      return (
        <Text type="secondary" italic>
          Không có dữ liệu
        </Text>
      );
    return (
      <Table
        dataSource={dataList}
        columns={tableColumns}
        pagination={false}
        size="small"
        bordered
        rowKey={(_, index) => String(index ?? 0)}
        style={{ width: "100%", marginTop: 4 }}
        footer={
          hasSummary
            ? () => (
                <div
                  style={{
                    display: "flex",
                    gap: 0,
                    background: "#f6f8fa",
                    borderTop: "2px solid #e8e8e8",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {columns.map((col: any, i: number) => {
                    const summary =
                      col.summaryType && col.summaryType !== "NONE"
                        ? computeSummary(dataList, col.code, col.summaryType)
                        : "";
                    const lbl = SUMMARY_LABELS[col.summaryType] || "";
                    if (col.type === "STT")
                      return (
                        <div
                          key={i}
                          style={{
                            width: 50,
                            padding: "6px 8px",
                            textAlign: "center" as const,
                            color: "#8c8c8c",
                          }}
                        >
                          Σ
                        </div>
                      );
                    if (!summary && i === 0)
                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            color: "#8c8c8c",
                          }}
                        >
                          Tổng hợp
                        </div>
                      );
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          padding: "6px 8px",
                          textAlign: summary
                            ? ("right" as const)
                            : ("left" as const),
                          color: summary ? "#0050b3" : "transparent",
                          background: summary ? "#e6f4ff" : undefined,
                          borderLeft: i > 0 ? "1px solid #e8e8e8" : undefined,
                        }}
                      >
                        {summary ? (
                          <Space size={4}>
                            <Tag
                              color="blue"
                              style={{
                                fontSize: 10,
                                lineHeight: "14px",
                                padding: "0 4px",
                              }}
                            >
                              {lbl}
                            </Tag>
                            <span>{summary}</span>
                          </Space>
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            : undefined
        }
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

export default function RecordDetailDrawer({
  record,
  open,
  onClose,
}: RecordDetailDrawerProps) {
  const [fullscreen, setFullscreen] = useState(false);

  const handleClose = () => {
    setFullscreen(false);
    onClose();
  };

  const { data: fields = [], isLoading: isFieldsLoading } = useFields(
    record?.entityId || null,
  );
  const { data: auditLogs = [], isLoading: isLogsLoading } =
    useRecordWorkflowLogs(record?.id || null);
  const { data: progressData, isLoading: isProgressLoading } =
    useRecordWorkflowProgress(record?.id || null);
  const { data: revisions = [], isLoading: isRevisionsLoading } =
    useRecordRevisions(record?.id || null);
  const status = record
    ? STATUS_MAP[record.status] || { label: record.status, color: "default" }
    : null;

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

  const renderRevisionDiff = (revision: any) => {
    const patches = revision.patchData || {};
    const changedKeys = Object.keys(patches);

    if (changedKeys.length === 0) {
      return (
        <Text type="secondary" italic>
          Không có thay đổi dữ liệu nào.
        </Text>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {changedKeys.map((key) => {
          const field = fields.find((f) => f.code === key);
          const label = field ? field.name : key;
          const { old: oldVal, new: newVal } = patches[key];

          return (
            <div
              key={key}
              style={{
                borderBottom: "1px solid #f0f0f0",
                paddingBottom: "8px",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "#595959",
                  marginBottom: "4px",
                }}
              >
                {label}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    background: "#fff1f0",
                    border: "1px solid #ffa39e",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    textDecoration: "line-through",
                    color: "#cf1322",
                    fontSize: "12px",
                  }}
                >
                  {oldVal === undefined || oldVal === null || oldVal === "" ? (
                    <Text
                      type="secondary"
                      italic
                      style={{ textDecoration: "none", color: "#bfbfbf" }}
                    >
                      (trống)
                    </Text>
                  ) : field ? (
                    renderFieldValue(
                      field,
                      oldVal,
                      findDeptName,
                      findUserName,
                      findRoleName,
                      record?.id || 0,
                    )
                  ) : (
                    String(oldVal)
                  )}
                </div>
                <span style={{ color: "#bfbfbf" }}>➔</span>
                <div
                  style={{
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    color: "#389e0d",
                    fontSize: "12px",
                  }}
                >
                  {newVal === undefined || newVal === null || newVal === "" ? (
                    <Text type="secondary" italic style={{ color: "#bfbfbf" }}>
                      (trống)
                    </Text>
                  ) : field ? (
                    renderFieldValue(
                      field,
                      newVal,
                      findDeptName,
                      findUserName,
                      findRoleName,
                      record?.id || 0,
                    )
                  ) : (
                    String(newVal)
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const sortedFields = [...fields].sort(
    (a, b) => (a.config?.orderIndex || 0) - (b.config?.orderIndex || 0),
  );

  const computedData = useMemo(() => {
    if (!record?.data) return {};
    return calculateFormFormulas(fields, record.data);
  }, [record, fields]);

  // Queries & state for print templates integration
  const { data: printTemplates = [] } = usePrintTemplates(record?.entityId || null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState("");
  const [printLoading, setPrintLoading] = useState(false);

  const handlePrintClick = async (templateId: number) => {
    if (!record) return;
    setPrintLoading(true);
    try {
      const { data } = await api.get(`/api/v1/print-templates/${templateId}/render/${record.id}`);
      if (data?.renderedHtml) {
        setRenderedHtml(data.renderedHtml);
        setIsPreviewModalOpen(true);
      } else {
        message.error("Không thể biên dịch mẫu in.");
      }
    } catch (err: any) {
      message.error("Lỗi khi kết xuất dữ liệu mẫu in.");
    } finally {
      setPrintLoading(false);
    }
  };

  const printHtml = (htmlContent: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.write(htmlContent);
      doc.close();
      
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      width={fullscreen ? "100vw" : 680}
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
        <Space>
          {printTemplates.length > 0 && (
            <Dropdown
              menu={{
                items: printTemplates.map((t) => ({
                  key: String(t.id),
                  label: t.name,
                  icon: <PrinterOutlined />,
                })),
                onClick: (info) => handlePrintClick(Number(info.key)),
              }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Button icon={<PrinterOutlined />} loading={printLoading}>
                In hồ sơ
              </Button>
            </Dropdown>
          )}
          <Tooltip title={fullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}>
            <Button
              type="text"
              size="small"
              icon={fullscreen ? <ShrinkOutlined /> : <ExpandAltOutlined />}
              onClick={() => setFullscreen((prev) => !prev)}
              style={{ color: "#595959", marginRight: 16 }}
            />
          </Tooltip>
          {status && (
            <Tag
              color={status.color}
              style={{ fontSize: 13, padding: "4px 12px" }}
            >
              {status.label}
            </Tag>
          )}
        </Space>
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
        <Tabs
          defaultActiveKey="detail"
          type="line"
          size="middle"
          items={[
            {
              key: "detail",
              label: (
                <span>
                  <FileTextOutlined style={{ marginRight: "6px" }} />
                  Thông tin Hồ sơ
                </span>
              ),
              children: (
                <Space direction="vertical" size="large" className="w-full" style={{ marginTop: "16px" }}>
                  {/* Metadata */}
                  <Card
                    size="small"
                    title="Thông tin Hồ sơ"
                    bordered={false}
                    style={{ background: "#fafafa", borderRadius: 8 }}
                  >
                    <Descriptions
                      column={2}
                      size="small"
                      labelStyle={{ fontWeight: 600, color: "#595959" }}
                    >
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
                      <Empty
                        description="Không có thông tin trường dữ liệu"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    ) : (
                      <Descriptions
                        bordered
                        column={1}
                        size="small"
                        labelStyle={{
                          width: 200,
                          fontWeight: 600,
                          background: "#fafafa",
                        }}
                      >
                        {sortedFields.map((field) => (
                          <Descriptions.Item key={field.id} label={field.name}>
                            {renderFieldValue(
                              field,
                              computedData?.[field.code],
                              findDeptName,
                              findUserName,
                              findRoleName,
                              record.id,
                            )}
                          </Descriptions.Item>
                        ))}
                      </Descriptions>
                    )}
                  </Card>

                  {/* Lộ trình & Tiến độ phê duyệt */}
                  {progressData?.hasWorkflow && (
                    <Card
                      size="small"
                      title={
                        <Space>
                          <SyncOutlined style={{ color: "#1890ff" }} />
                          <span>Tiến độ Lộ trình phê duyệt</span>
                        </Space>
                      }
                      bordered={false}
                      style={{ borderRadius: 8 }}
                      headStyle={{ background: "#fafafa" }}
                    >
                      {isProgressLoading ? (
                        <div className="flex justify-center py-8">
                          <Spin tip="Đang tải lộ trình phê duyệt..." />
                        </div>
                      ) : (
                        <div style={{ padding: "8px 12px 0 12px" }}>
                          <Steps
                            direction="vertical"
                            size="small"
                            current={progressData.steps?.findIndex(s => s.status === 'PENDING' || s.status === 'REJECTED') ?? 0}
                            items={progressData.steps?.map((step) => {
                              let status: 'wait' | 'process' | 'finish' | 'error' = 'wait';
                              if (step.status === 'COMPLETED') status = 'finish';
                              else if (step.status === 'PENDING') status = 'process';
                              else if (step.status === 'REJECTED') status = 'error';
                              else status = 'wait';

                              const title = (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                  <span style={{ fontWeight: 600, fontSize: "14px", color: status === 'finish' ? '#389e0d' : status === 'process' ? '#096dd9' : status === 'error' ? '#cf1322' : '#595959' }}>
                                    {step.name}
                                  </span>
                                  <Space size={4}>
                                    {step.status === 'COMPLETED' && (
                                      <Tag color="success" style={{ margin: 0 }}>Đã duyệt</Tag>
                                    )}
                                    {step.status === 'PENDING' && (
                                      <Tag color="processing" style={{ margin: 0 }} icon={<SyncOutlined spin />}>Đang chờ duyệt</Tag>
                                    )}
                                    {step.status === 'REJECTED' && (
                                      <Tag color="error" style={{ margin: 0 }}>Từ chối</Tag>
                                    )}
                                    {step.status === 'FUTURE' && (
                                      <Tag color="default" style={{ margin: 0 }}>Chưa đến lượt</Tag>
                                    )}
                                  </Space>
                                </div>
                              );

                              const description = (
                                <div style={{ marginTop: 4, marginBottom: 8 }}>
                                  {/* Phê duyệt bởi */}
                                  {step.status === 'COMPLETED' && step.logs && step.logs.map((log: any) => {
                                    if (log.action === 'START') return null;
                                    return (
                                      <div key={log.id} style={{ fontSize: "12px", color: '#595959', margin: '4px 0' }}>
                                        <span>Phê duyệt bởi: </span>
                                        <Text strong>{log.user?.fullName || "Hệ thống"}</Text>
                                        <span style={{ margin: '0 8px', color: '#bfbfbf' }}>|</span>
                                        <span style={{ color: '#8c8c8c' }}>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                                        {log.comment && (
                                          <div style={{ fontStyle: 'italic', color: '#8c8c8c', marginTop: 2 }}>
                                            "{log.comment}"
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Chờ duyệt bởi ai */}
                                  {step.status === 'PENDING' && (
                                    <div style={{ marginTop: 4 }}>
                                      {step.tasks && step.tasks.length > 0 ? (
                                        <div>
                                          <div style={{ fontSize: "12px", color: '#595959', marginBottom: 4 }}>
                                            Đang chờ xử lý bởi:
                                          </div>
                                          <Space wrap size={[4, 4]}>
                                            {step.tasks.map((task: any) => (
                                              <Tooltip key={task.id} title={task.assigneeEmail || "Không có email"}>
                                                <Tag color="blue" style={{ fontSize: "11px", padding: "1px 6px" }}>
                                                  👤 {task.assigneeName}
                                                </Tag>
                                              </Tooltip>
                                            ))}
                                          </Space>
                                          {step.tasks[0]?.estimatedCompletionTime && (
                                            <div style={{ marginTop: 4, fontSize: "11px", color: '#fa8c16' }}>
                                              🕒 Hạn chót dự kiến: {new Date(step.tasks[0].estimatedCompletionTime).toLocaleString("vi-VN")}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <Text type="secondary" italic style={{ fontSize: "12px" }}>
                                          Không có nhiệm vụ chờ xử lý hoặc hệ thống đang tự động xử lý.
                                        </Text>
                                      )}
                                    </div>
                                  )}

                                  {step.status === 'FUTURE' && (
                                    <div style={{ fontSize: "11px", color: '#8c8c8c', fontStyle: 'italic' }}>
                                      Chưa kích hoạt
                                    </div>
                                  )}
                                </div>
                              );

                              return {
                                title,
                                description,
                                status,
                              };
                            })}
                          />
                        </div>
                      )}
                    </Card>
                  )}

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
                      <Empty
                        description="Chưa có nhật ký hoạt động nào cho hồ sơ này."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ padding: "16px 0" }}
                      />
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
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
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
                                  <div
                                    style={{
                                      marginTop: "4px",
                                      background: "#f5f5f5",
                                      padding: "6px 12px",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    <MessageOutlined
                                      style={{ marginRight: "6px", color: "#8c8c8c" }}
                                    />
                                    <Text italic type="secondary">
                                      {log.comment}
                                    </Text>
                                  </div>
                                )}
                                {log.snapshot?.signature && (
                                  <div style={{ marginTop: "8px" }}>
                                    {log.snapshot.signature.startsWith("data:image/") ? (
                                      (() => {
                                        const layout = log.snapshot.layout || "vertical";
                                        const isHorizontal = layout === "horizontal";
                                        const showName = log.snapshot.showSignerName !== false;
                                        const showRole = log.snapshot.showSignerRole !== false;
                                        const showDept = log.snapshot.showSignerDept !== false;
                                        const showTime = log.snapshot.showSigningTime !== false;

                                        if (isHorizontal) {
                                          return (
                                            <div
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                border: "1px solid #e2e8f0",
                                                padding: "8px",
                                                borderRadius: "6px",
                                                backgroundColor: "#fafafa",
                                                fontFamily: "sans-serif",
                                                textAlign: "left",
                                                lineHeight: "1.3",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  position: "relative",
                                                  height: "44px",
                                                  minWidth: "90px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  background: "#ffffff",
                                                  border: "1px solid #cbd5e1",
                                                  borderRadius: "4px",
                                                  padding: "2px",
                                                }}
                                              >
                                                <img
                                                  src={log.snapshot.signature}
                                                  alt="Signature"
                                                  style={{ maxHeight: "38px", maxWidth: "86px", display: "block" }}
                                                />
                                                {log.snapshot.stamp && (
                                                  <img
                                                    src={log.snapshot.stamp}
                                                    alt="Stamp"
                                                    style={{
                                                      position: "absolute",
                                                      right: "-10px",
                                                      bottom: "-6px",
                                                      maxHeight: "40px",
                                                      maxWidth: "40px",
                                                      opacity: 0.85,
                                                      mixBlendMode: "multiply",
                                                    }}
                                                  />
                                                )}
                                              </div>
                                              <div>
                                                <div
                                                  style={{
                                                    fontSize: "8px",
                                                    color: "green",
                                                    fontFamily: "monospace",
                                                    fontWeight: "bold",
                                                    marginBottom: "2px",
                                                  }}
                                                >
                                                  [ĐÃ KÝ ĐIỆN TỬ]
                                                </div>
                                                {showName && (
                                                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b" }}>
                                                    {log.snapshot.signerName || log.user?.fullName}
                                                  </div>
                                                )}
                                                {showRole && log.snapshot.signerRole && (
                                                  <div style={{ fontSize: "9px", color: "#64748b" }}>{log.snapshot.signerRole}</div>
                                                )}
                                                {showDept && log.snapshot.signerDept && (
                                                  <div style={{ fontSize: "9px", color: "#64748b" }}>{log.snapshot.signerDept}</div>
                                                )}
                                                {showTime && log.snapshot.signingTime && (
                                                  <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "1px" }}>
                                                    {log.snapshot.signingTime}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div
                                              style={{
                                                display: "inline-flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                textAlign: "center",
                                                border: "1px solid #e2e8f0",
                                                padding: "8px",
                                                borderRadius: "6px",
                                                backgroundColor: "#fafafa",
                                                fontFamily: "sans-serif",
                                                minWidth: "120px",
                                                lineHeight: "1.3",
                                              }}
                                            >
                                              <div
                                                style={{
                                                  fontSize: "8px",
                                                  color: "green",
                                                  fontFamily: "monospace",
                                                  fontWeight: "bold",
                                                  marginBottom: "4px",
                                                }}
                                              >
                                                [ĐÃ KÝ ĐIỆN TỬ]
                                              </div>
                                              <div
                                                style={{
                                                  position: "relative",
                                                  height: "44px",
                                                  width: "90px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  background: "#ffffff",
                                                  border: "1px solid #cbd5e1",
                                                  borderRadius: "4px",
                                                  padding: "2px",
                                                  marginBottom: "4px",
                                                  marginLeft: "auto",
                                                  marginRight: "auto",
                                                }}
                                              >
                                                <img
                                                  src={log.snapshot.signature}
                                                  alt="Signature"
                                                  style={{ maxHeight: "38px", maxWidth: "86px", display: "block" }}
                                                />
                                                {log.snapshot.stamp && (
                                                  <img
                                                    src={log.snapshot.stamp}
                                                    alt="Stamp"
                                                    style={{
                                                      position: "absolute",
                                                      right: "-10px",
                                                      bottom: "-6px",
                                                      maxHeight: "40px",
                                                      maxWidth: "40px",
                                                      opacity: 0.85,
                                                      mixBlendMode: "multiply",
                                                    }}
                                                  />
                                                )}
                                              </div>
                                              {showName && (
                                                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b" }}>
                                                  {log.snapshot.signerName || log.user?.fullName}
                                                </div>
                                              )}
                                              {showRole && log.snapshot.signerRole && (
                                                <div style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>
                                                  {log.snapshot.signerRole}
                                                </div>
                                              )}
                                              {showDept && log.snapshot.signerDept && (
                                                <div style={{ fontSize: "9px", color: "#64748b" }}>{log.snapshot.signerDept}</div>
                                              )}
                                              {showTime && log.snapshot.signingTime && (
                                                <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "2px" }}>
                                                  {log.snapshot.signingTime}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }
                                      })()
                                    ) : (
                                      <Tag color="purple">{log.snapshot.signature}</Tag>
                                    )}
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
              ),
            },
            {
              key: "history",
              label: (
                <span>
                  <ClockCircleOutlined style={{ marginRight: "6px" }} />
                  Lịch sử chỉnh sửa
                </span>
              ),
              children: (
                <div style={{ marginTop: "16px" }}>
                  {isRevisionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spin tip="Đang tải lịch sử chỉnh sửa..." />
                    </div>
                  ) : revisions.length === 0 ? (
                    <Empty
                      description="Không có lịch sử chỉnh sửa nào cho hồ sơ này."
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "32px 0" }}
                    />
                  ) : (
                    <Timeline
                      mode="left"
                      items={revisions.map((rev) => ({
                        color: "blue",
                        children: (
                          <div style={{ paddingBottom: "16px" }}>
                            <Card
                              size="small"
                              title={
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Space>
                                    <Avatar size="small" style={{ backgroundColor: "#1890ff" }}>
                                      {(rev.user?.fullName || "U").charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Text strong>{rev.user?.fullName || "Thành viên"}</Text>
                                    <Text type="secondary" style={{ fontSize: "12px", fontWeight: "normal" }}>
                                      ({rev.user?.email || ""})
                                    </Text>
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: "12px", fontWeight: "normal" }}>
                                    {new Date(rev.createdAt).toLocaleString("vi-VN")}
                                  </Text>
                                </div>
                              }
                              style={{ borderRadius: 8, border: "1px solid #f0f0f0" }}
                              bodyStyle={{ padding: "12px 16px" }}
                            >
                              {renderRevisionDiff(rev)}
                            </Card>
                          </div>
                        ),
                      }))}
                    />
                  )}
                </div>
              ),
            }
          ]}
        />
      )}

      {/* Modal Xem trước mẫu in */}
      <Modal
        title="Xem trước tài liệu in"
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        width={850}
        destroyOnClose
        okText="In ngay"
        cancelText="Đóng"
        onOk={() => printHtml(renderedHtml)}
        bodyStyle={{ padding: "20px", background: "#f0f2f5" }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            borderRadius: "4px",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
        />
      </Modal>
    </Drawer>
  );
}
