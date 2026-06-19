// File: src/app/metadata/[id]/fields/components/FormulaBuilder.tsx
"use client";

import React from "react";
import { Card, Button, Space, Typography, Tag } from "antd";
import { CalculatorOutlined, CloseOutlined } from "@ant-design/icons";
import { Field } from "@/hooks/useFields";

const { Text, Paragraph } = Typography;

interface FormulaBuilderProps {
  fields: Field[];
  currentFormula: string;
  onFormulaChange: (formula: string) => void;
}

export default function FormulaBuilder({
  fields,
  currentFormula,
  onFormulaChange,
}: FormulaBuilderProps) {
  // Chỉ lấy các trường số hoặc các trường phù hợp để tính toán
  const numericFields = fields.filter(
    (f) => f.type === "NUMBER" || f.type === "FORMULA",
  );

  const insertVariable = (code: string) => {
    onFormulaChange(currentFormula + ` {${code}} `);
  };

  const insertOperator = (op: string) => {
    onFormulaChange(currentFormula + ` ${op} `);
  };

  const clearFormula = () => {
    onFormulaChange("");
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <CalculatorOutlined style={{ color: "#1890ff" }} />{" "}
          <Text strong style={{ fontSize: "13px" }}>
            Formula Builder Helper (Dựng công thức tính toán)
          </Text>
        </Space>
      }
      style={{
        backgroundColor: "#fafafa",
        border: "1px dashed #d9d9d9",
        borderRadius: "6px",
      }}
      styles={{ body: { padding: "12px" } }}
    >
      <Paragraph type="secondary" style={{ fontSize: "11px", margin: 0 }}>
        Chọn các biến số và toán tử để biên dịch biểu thức tự động, tránh nhập
        sai cú pháp [1]:
      </Paragraph>

      {/* Danh sách biến số khả dụng */}
      <div style={{ margin: "12px 0" }}>
        <div style={{ marginBottom: "6px" }}>
          <Text strong style={{ fontSize: "11px" }}>
            Biến số khả dụng:
          </Text>
        </div>
        <Space wrap size={[4, 8]}>
          {numericFields.map((f) => (
            <Tag
              key={f.id}
              color="blue"
              style={{ cursor: "pointer", padding: "2px 8px" }}
              onClick={() => insertVariable(f.code)}
            >
              {f.name} ({f.code})
            </Tag>
          ))}
          {numericFields.length === 0 && (
            <Text type="secondary" style={{ fontSize: "11px" }}>
              Chưa có trường NUMBER nào để làm biến.
            </Text>
          )}
        </Space>
      </div>

      {/* Bàn phím toán tử nhanh */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ marginBottom: "6px" }}>
          <Text strong style={{ fontSize: "11px" }}>
            Toán tử:
          </Text>
        </div>
        <Space size="small">
          {["+", "-", "*", "/"].map((op) => (
            <Button
              key={op}
              size="small"
              onClick={() => insertOperator(op)}
              style={{ fontWeight: "bold" }}
            >
              {op}
            </Button>
          ))}
          <Button
            size="small"
            type="text"
            danger
            icon={<CloseOutlined />}
            onClick={clearFormula}
          >
            Dọn sạch
          </Button>
        </Space>
      </div>
    </Card>
  );
}
