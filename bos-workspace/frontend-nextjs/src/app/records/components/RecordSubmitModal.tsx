// File: src/app/records/components/RecordSubmitModal.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Checkbox,
  Button,
  Space,
  Typography,
  Spin,
  Alert,
  Table,
  Tooltip,
  Tag,
  Row,
  Col,
  message,
  TreeSelect,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useFields, Field } from "@/hooks/useFields";
import { useCreateRecord, useUpdateRecord, RecordData } from "@/hooks/useRecords";
import { useWorkflows } from "@/hooks/useWorkflows";
import { useDepartmentTree } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import { Entity } from "@/hooks/useEntities";
import { api } from "@/lib/axios";

const { Text } = Typography;
const { TextArea } = Input;

interface RecordSubmitModalProps {
  open: boolean;
  entity: Entity;
  record?: RecordData | null;
  onClose: () => void;
  onSuccess: () => void;
}

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
    // Replace {field_code} with actual values
    let expression = formula.replace(/\{([^}]+)\}/g, (_, code) => {
      const val = rowData[code];
      return val !== undefined && val !== null ? String(Number(val) || 0) : "0";
    });
    // Simple math eval: only allow numbers, operators, parentheses, dots
    expression = expression.replace(/[^0-9+\-*/().]/g, "");
    if (!expression || expression.trim() === "") return 0;
    // Safe evaluation using Function constructor (no access to global scope)
    const result = new Function(`"use strict"; return (${expression});`)();
    return typeof result === "number" && isFinite(result) ? parseFloat(result.toFixed(4)) : 0;
  } catch {
    return 0;
  }
}

function computeTableRows(rows: any[], columns: any[]): any[] {
  return rows.map((row, idx) => {
    const computed = { ...row };
    // STT
    columns.forEach((col: any) => {
      if (col.type === "STT") {
        computed[col.code] = idx + 1;
      }
    });
    // FORMULA - có thể phụ thuộc vào nhau, nên chạy nhiều vòng
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
  const columns: any[] = field.config?.options?.columns || [];
  const rows = value || [];

  // Sử dụng trực tiếp rows đã được tính toán từ trước (được lưu trong form state)
  const computedRows = rows;

  const addRow = () => {
    const newRow: any = { _key: Date.now() };
    columns.forEach((col: any) => {
      if (col.type === "CHECKBOX") newRow[col.code] = false;
      else if (col.type === "STT" || col.type === "FORMULA") { /* auto-computed */ }
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

  // Check if footer row is needed
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

        // STT - auto number
        if (col.type === "STT") {
          return <Text strong style={{ color: "#595959" }}>{rowIdx + 1}</Text>;
        }

        // FORMULA - display computed value (readonly)
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

        // CHECKBOX
        if (col.type === "CHECKBOX") {
          return <Checkbox checked={!!record[col.code]} onChange={(e) => updateCell(rowIdx, col.code, e.target.checked)} />;
        }

        // NUMBER
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

        // DATE
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

        // SELECT
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

        // TEXT (default)
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

// =================== SINGLE FIELD RENDERER ===================
function FieldRenderer({
  field,
  allFields,
  form,
  deptTree,
  userOptions,
  roleOptions,
}: {
  field: Field;
  allFields: Field[];
  form: any;
  deptTree: any[];
  userOptions: any[];
  roleOptions: any[];
}) {
  // Watch toàn bộ giá trị form để re-evaluate showIf / requiredIf
  const allValues = Form.useWatch([], form) || {};
  const { options } = field.config || {};

  // === SHOW IF ===
  const showIfCondition = options?.showIf as DynamicCondition | undefined;
  if (showIfCondition && showIfCondition.field) {
    const shouldShow = evaluateCondition(showIfCondition, allValues);
    if (!shouldShow) return null;
  }

  // === REQUIRED (static + dynamic) ===
  let isRequired = !!field.config?.isRequired;
  const requiredIfCondition = options?.requiredIf as DynamicCondition | undefined;
  if (!isRequired && requiredIfCondition && requiredIfCondition.field) {
    isRequired = evaluateCondition(requiredIfCondition, allValues);
  }

  // Build rules
  const rules: any[] = [];
  if (isRequired) {
    rules.push({ required: true, message: `${field.name} là bắt buộc` });
  }
  if (options?.regex || options?.regexPattern) {
    const pattern = options.regex || options.regexPattern;
    rules.push({
      pattern: new RegExp(pattern),
      message: options.regexError || options.errorMessage || `${field.name} không đúng định dạng`,
    });
  }
  if (options?.minLength) {
    rules.push({ min: options.minLength, message: `${field.name} cần tối thiểu ${options.minLength} ký tự` });
  }
  if (options?.maxLength) {
    rules.push({ max: options.maxLength, message: `${field.name} tối đa ${options.maxLength} ký tự` });
  }

  // Build select options
  const selectOpts = Array.isArray(options?.choices)
    ? options.choices.map((o: any) => typeof o === "string" ? { value: o, label: o } : o)
    : Array.isArray(options?.selectOptions)
    ? options.selectOptions.map((o: any) => typeof o === "string" ? { value: o, label: o } : o)
    : Array.isArray(options?.options)
    ? options.options.map((o: any) => typeof o === "string" ? { value: o, label: o } : o)
    : [];

  // Label with tooltip
  const label = (
    <Space size={4}>
      {field.name}
      {(options?.helpText || options?.tooltip) && (
        <Tooltip title={options.helpText || options.tooltip}>
          <InfoCircleOutlined style={{ color: "#8c8c8c", fontSize: 12 }} />
        </Tooltip>
      )}
      {requiredIfCondition && isRequired && (
        <Tag color="orange" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>
          điều kiện
        </Tag>
      )}
    </Space>
  );

  // Column span
  const colSpan = field.type === "TEXTAREA" || field.type === "TABLE" ? 24 : 12;

  switch (field.type) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <Input
              placeholder={options?.placeholder || `Nhập ${field.name}...`}
              maxLength={options?.maxLength}
              showCount={!!options?.maxLength}
            />
          </Form.Item>
        </Col>
      );

    case "TEXTAREA":
      return (
        <Col xs={24} md={24} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <TextArea
              rows={3}
              placeholder={options?.placeholder || `Nhập ${field.name}...`}
              maxLength={options?.maxLength}
              showCount={!!options?.maxLength}
            />
          </Form.Item>
        </Col>
      );

    case "NUMBER":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <InputNumber
              style={{ width: "100%" }}
              placeholder="Nhập số..."
              min={options?.min}
              max={options?.max}
              formatter={(v) => v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : ""}
              parser={(v) => v ? Number(v.replace(/,/g, "")) : 0}
            />
          </Form.Item>
        </Col>
      );

    case "DATE":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item
            name={field.code}
            label={label}
            rules={rules}
            getValueFromEvent={(date) => date?.toISOString() || null}
            getValueProps={(value) => ({ value: value ? dayjs(value) : undefined })}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" placeholder="Chọn ngày..." />
          </Form.Item>
        </Col>
      );

    case "SELECT":
    case "MULTI_SELECT":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <Select
              placeholder={`Chọn ${field.name}...`}
              allowClear
              mode={field.type === "MULTI_SELECT" || options?.multiple ? "multiple" : undefined}
              options={selectOpts}
              showSearch
              filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Col>
      );

    case "CHECKBOX":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} valuePropName="checked" label={label}>
            <Checkbox>{options?.checkboxLabel || field.name}</Checkbox>
          </Form.Item>
        </Col>
      );

    case "LOOKUP":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <LookupField
              field={field}
              value={form.getFieldValue(field.code)}
              onChange={(val: any) => form.setFieldValue(field.code, val)}
            />
          </Form.Item>
        </Col>
      );

    case "TABLE":
      return (
        <Col xs={24} md={24} key={field.id}>
          <Form.Item name={field.code} label={label}>
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue, setFieldValue }: any) => (
                <TableFieldEditor
                  field={field}
                  value={getFieldValue(field.code) || []}
                  onChange={(rows: any) => {
                    setFieldValue(field.code, rows);
                    const currentValues = form.getFieldsValue();
                    currentValues[field.code] = rows;
                    const computedValues = calculateFormFormulas(allFields, currentValues);
                    form.setFieldsValue(computedValues);
                  }}
                />
              )}
            </Form.Item>
          </Form.Item>
        </Col>
      );

    case "FORMULA":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
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
        </Col>
      );

    case "DEPT_REF":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
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
        </Col>
      );

    case "USER_REF":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <Select
              placeholder={options?.placeholder || `Chọn ${field.name}...`}
              allowClear
              showSearch
              options={userOptions}
              filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Col>
      );

    case "ROLE_REF":
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <Select
              placeholder={options?.placeholder || `Chọn ${field.name}...`}
              allowClear
              options={roleOptions}
            />
          </Form.Item>
        </Col>
      );

    default:
      return (
        <Col xs={24} md={colSpan} key={field.id}>
          <Form.Item name={field.code} label={label} rules={rules}>
            <Input placeholder={`Nhập ${field.name}...`} />
          </Form.Item>
        </Col>
      );
  }
}

// =================== MAIN MODAL ===================
export default function RecordSubmitModal({
  open,
  entity,
  record,
  onClose,
  onSuccess,
}: RecordSubmitModalProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { data: fields = [], isLoading: isFieldsLoading } = useFields(entity?.id || null);
  const { data: workflowsData } = useWorkflows(entity?.id || null);
  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();

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

  // Load data for editing
  useEffect(() => {
    if (open) {
      if (record) {
        const initialValues: Record<string, any> = { title: record.title };
        fields.forEach((f) => {
          const rawVal = record.data?.[f.code];
          if (rawVal !== undefined && rawVal !== null) {
            if (f.type === "DATE") {
              initialValues[f.code] = dayjs(rawVal);
            } else {
              initialValues[f.code] = rawVal;
            }
          }
        });
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
        // Set default values from fields configurations (using initValue or fallback defaultValue)
        const defaultValues: Record<string, any> = {};
        fields.forEach((f) => {
          const defVal = f.config?.options?.initValue !== undefined ? f.config?.options?.initValue : f.config?.options?.defaultValue;
          if (defVal !== undefined && defVal !== null && defVal !== "") {
            if (f.type === "DATE" || f.type === "DATETIME" || f.type === "MONTH_YEAR") {
              defaultValues[f.code] = dayjs(defVal);
            } else if (f.type === "NUMBER" || f.type === "DECIMAL" || f.type === "CURRENCY" || f.type === "PERCENTAGE") {
              defaultValues[f.code] = Number(defVal);
            } else if (f.type === "CHECKBOX") {
              defaultValues[f.code] = defVal === "true" || defVal === true;
            } else if (f.type === "USER_REF" || f.type === "DEPT_REF" || f.type === "ROLE_REF") {
              defaultValues[f.code] = isNaN(Number(defVal)) ? defVal : Number(defVal);
            } else if (f.type === "MULTI_SELECT" && typeof defVal === "string") {
              defaultValues[f.code] = defVal.split(",").map((s) => s.trim()).filter(Boolean);
            } else {
              defaultValues[f.code] = defVal;
            }
          }
        });
        form.setFieldsValue(defaultValues);
      }
    }
  }, [open, record, fields, form]);

  // Tìm workflow version PUBLISHED cho entity này
  const activeWorkflow = useMemo(() => {
    const workflows = workflowsData?.data || [];
    for (const wf of workflows) {
      const published = wf.versions?.find((v) => v.status === "PUBLISHED");
      if (published) return { workflowId: wf.id, versionId: published.id, name: wf.name };
    }
    return null;
  }, [workflowsData]);

  const handleValuesChange = (_: any, allValues: any) => {
    const computedValues = calculateFormFormulas(fields, allValues);
    form.setFieldsValue(computedValues);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();

      // Làm sạch giá trị
      const cleanData: Record<string, any> = {};
      for (const [key, val] of Object.entries(values)) {
        if (val === undefined || val === null) continue;
        if (typeof val === "object" && val && "$d" in val) {
          cleanData[key] = (val as any).toISOString();
        } else {
          cleanData[key] = val;
        }
      }

      // 1. Tạo hoặc cập nhật Record
      let targetRecordId = record?.id;
      const { title, ...dataFields } = cleanData;
      if (record) {
        await updateRecord.mutateAsync({
          id: record.id,
          entityId: entity.id,
          payload: {
            title: typeof title === "string" ? title : undefined,
            data: dataFields,
          },
        });
      } else {
        const newRecord = await createRecord.mutateAsync({
          entityId: entity.id,
          title: typeof title === "string" ? title : undefined,
          data: dataFields,
        });
        targetRecordId = newRecord.id;
      }

      // 2. Tự động kích hoạt workflow nếu có version PUBLISHED
      if (activeWorkflow && targetRecordId) {
        try {
          await api.post("/api/v1/workflows/instances/start", {
            recordId: targetRecordId,
            versionId: activeWorkflow.versionId,
          });
          message.success(
            record
              ? `Đã cập nhật hồ sơ và gửi trình ký lại quy trình "${activeWorkflow.name}" thành công!`
              : `Đã nộp hồ sơ và kích hoạt quy trình "${activeWorkflow.name}" thành công! Hồ sơ đang chờ phê duyệt.`
          );
        } catch (wfErr: any) {
          // Record đã tạo/sửa nhưng workflow fail
          message.warning(
            `Hồ sơ đã được lưu nhưng chưa kích hoạt được quy trình: ${wfErr?.response?.data?.message || "Lỗi không xác định"}. Bạn có thể trình ký thủ công sau.`
          );
        }
      } else {
        message.success(record ? "Đã cập nhật hồ sơ thành công!" : "Đã lưu hồ sơ thành công!");
      }

      form.resetFields();
      onSuccess();
    } catch (err: any) {
      if (err?.errorFields) {
        message.warning("Vui lòng điền đầy đủ các trường bắt buộc và sửa các lỗi nhập liệu!");
        return;
      }
      message.error(
        err?.response?.data?.message || "Có lỗi xảy ra khi nộp hồ sơ. Vui lòng thử lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // Sắp xếp fields
  const sortedFields = [...fields].sort(
    (a, b) => (a.config?.orderIndex || 0) - (b.config?.orderIndex || 0)
  );

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={720}
      title={
        <Space>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #0050b3, #1890ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <SendOutlined style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{record ? "Chỉnh sửa & Trình ký lại" : "Nộp hồ sơ mới"}</div>
            <div style={{ fontWeight: 400, fontSize: 12, color: "#8c8c8c" }}>
              Biểu mẫu: <Tag color="blue" style={{ marginLeft: 4 }}>{entity?.name}</Tag>
              <Tag color="cyan">{entity?.code}</Tag>
            </div>
          </div>
        </Space>
      }
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {activeWorkflow ? (
              <Space size={4}>
                <ThunderboltOutlined style={{ color: "#52c41a" }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Quy trình: <Text strong style={{ fontSize: 12, color: "#52c41a" }}>{activeWorkflow.name}</Text>
                </Text>
              </Space>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠ Chưa có quy trình phê duyệt
              </Text>
            )}
          </div>
          <Space>
            <Button onClick={handleClose}>Hủy bỏ</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              onClick={handleSubmit}
              style={{
                background: "linear-gradient(135deg, #0050b3, #1890ff)",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,80,179,0.3)",
              }}
            >
              {record ? (activeWorkflow ? "Cập nhật & Trình ký lại" : "Lưu thay đổi") : (activeWorkflow ? "Nộp & Trình ký" : "Lưu hồ sơ")}
            </Button>
          </Space>
        </div>
      }
      destroyOnClose
      styles={{
        body: { maxHeight: "70vh", overflowY: "auto", padding: "24px" },
        header: {
          borderBottom: "1px solid #f0f0f0",
          padding: "20px 24px",
          background: "linear-gradient(to right, #f0f5ff, #fff)",
        },
      }}
    >
      {isFieldsLoading ? (
        <div className="flex justify-center items-center py-16">
          <Spin tip="Đang tải cấu hình biểu mẫu..." size="large" />
        </div>
      ) : sortedFields.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          message="Biểu mẫu chưa có trường dữ liệu nào"
          description={`Biểu mẫu "${entity?.name}" chưa được thiết kế. Vui lòng vào Thiết kế Biểu mẫu để thêm trường.`}
          action={
            <Button size="small" onClick={() => window.open(`/metadata/${entity?.id}/fields`, "_blank")}>
              Thiết kế ngay
            </Button>
          }
        />
      ) : (
        <Form form={form} layout="vertical" requiredMark="optional" scrollToFirstError onValuesChange={handleValuesChange}>
          {activeWorkflow ? (
            <Alert
              type="info"
              showIcon
              message={`Sau khi nộp, hồ sơ sẽ tự động được gửi qua quy trình "${activeWorkflow.name}" để phê duyệt.`}
              style={{ marginBottom: 20, borderRadius: 8 }}
              closable
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Biểu mẫu này chưa có quy trình phê duyệt. Hồ sơ sẽ được lưu ở trạng thái Nháp (DRAFT)."
              style={{ marginBottom: 20, borderRadius: 8 }}
              closable
            />
          )}

          <Row gutter={[16, 0]}>
            {entity?.titlePattern ? (
              <Col span={24}>
                <Form.Item label="Tiêu đề hồ sơ">
                  <Input
                    value={`Tự động sinh theo mẫu: ${entity.titlePattern}`}
                    disabled
                    style={{ background: "#f5f5f5", color: "#8c8c8c", fontWeight: 500 }}
                  />
                </Form.Item>
              </Col>
            ) : (
              <Col span={24}>
                <Form.Item
                  name="title"
                  label="Tiêu đề hồ sơ"
                  rules={[{ required: true, message: "Vui lòng nhập tiêu đề hồ sơ" }]}
                >
                  <Input placeholder="Nhập tiêu đề hồ sơ..." />
                </Form.Item>
              </Col>
            )}
            {sortedFields.map((field) => (
              <FieldRenderer
                key={field.id}
                field={field}
                allFields={sortedFields}
                form={form}
                deptTree={deptTree}
                userOptions={userOptions}
                roleOptions={roleOptions}
              />
            ))}
          </Row>
        </Form>
      )}
    </Modal>
  );
}
