// File: src/components/metadata/SortableCanvasItem.tsx
"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  Space,
  Button,
  Typography,
  Input,
  Select,
  DatePicker,
  Upload,
  Tag,
} from "antd";
import { DragOutlined, DeleteOutlined, StarFilled } from "@ant-design/icons";

const { Text } = Typography;

interface SortableCanvasItemProps {
  field: any;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export default function SortableCanvasItem({
  field,
  isSelected,
  onSelect,
  onDelete,
}: SortableCanvasItemProps) {
  // Đóng gói Sortable cho từng trường trên Canvas
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    marginBottom: "12px",
    border: isSelected ? "2px solid #1677ff" : "1px solid #f0f0f0",
    borderRadius: "8px",
    background: isSelected ? "#f0f5ff" : "#fff",
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.08)" : "none",
  };

  // Render động xem trước giao diện đầu vào (Dynamic Form Preview) không code cứng
  const renderFieldPreview = () => {
    switch (field.type) {
      case "TEXT":
        return <Input placeholder="Xem trước ô nhập văn bản..." disabled />;
      case "NUMBER":
        return (
          <Input
            type="number"
            placeholder="Xem trước ô nhập số..."
            addonAfter={field.options?.prefix}
            disabled
          />
        );
      case "DATE":
        return (
          <DatePicker
            placeholder="Chọn ngày..."
            style={{ width: "100%" }}
            disabled
          />
        );
      case "DATETIME":
        return (
          <DatePicker
            showTime
            placeholder="Chọn ngày & giờ..."
            style={{ width: "100%" }}
            disabled
          />
        );
      case "SELECT":
        return (
          <Select
            placeholder="Chọn giá trị danh sách..."
            mode={field.options?.multiple ? "multiple" : undefined}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "LOOKUP":
        return (
          <Select
            placeholder={`Liên kết tra cứu từ thực thể ID: ${field.options?.lookupEntityId || ""}...`}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "TABLE":
        return (
          <Card
            size="small"
            style={{ background: "#f5f5f5", borderStyle: "dashed" }}
          >
            Lưới bảng con nhập liệu (TABLE)
          </Card>
        );
      case "USER_REF":
        return (
          <Select
            placeholder="Tìm và chọn nhân viên..."
            style={{ width: "100%" }}
            disabled
          />
        );
      case "DEPT_REF":
        return (
          <Select
            placeholder="Tìm và chọn phòng ban..."
            style={{ width: "100%" }}
            disabled
          />
        );
      case "FILE":
        return (
          <Upload disabled>
            <Button disabled>Tải lên tệp tài liệu đính kèm...</Button>
          </Upload>
        );
      case "IMAGE":
        return (
          <Upload disabled listType="picture-card">
            <Button disabled>Tải ảnh lên...</Button>
          </Upload>
        );
      case "FORMULA":
        return (
          <Input
            placeholder={`= ${field.options?.formula || "Chưa định nghĩa công thức"}`}
            style={{ fontFamily: "monospace", background: "#fafafa" }}
            disabled
          />
        );
      default:
        return <Input disabled />;
    }
  };

  return (
    <div ref={setNodeRef} style={style} onClick={onSelect}>
      <div style={{ padding: "16px", display: "flex", gap: "12px" }}>
        {/* DRAG HANDLE CHUYÊN NGHIỆP */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            paddingRight: "4px",
          }}
        >
          <DragOutlined style={{ fontSize: "18px", color: "#bfbfbf" }} />
        </div>

        {/* MAIN PREVIEW CONTENT */}
        <div style={{ flexGrow: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <Space>
              <Text strong style={{ fontSize: "14px" }}>
                {field.name || "Trường chưa đặt tên"}
              </Text>
              {field.isRequired && (
                <StarFilled style={{ color: "#ff4d4f", fontSize: "10px" }} />
              )}
              <Tag color="cyan" style={{ fontSize: "11px" }}>
                {field.code}
              </Tag>
              <Tag color="blue" style={{ fontSize: "11px" }}>
                {field.type}
              </Tag>
            </Space>
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation(); // Ngăn kích hoạt chọn trường khi bấm nút xóa
                onDelete();
              }}
              size="small"
            />
          </div>
          <div style={{ cursor: "pointer" }}>{renderFieldPreview()}</div>
        </div>
      </div>
    </div>
  );
}
