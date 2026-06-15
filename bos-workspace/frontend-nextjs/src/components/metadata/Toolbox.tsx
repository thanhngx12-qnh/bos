// File: src/components/metadata/Toolbox.tsx
"use client";

import React from "react";
import { useDraggable } from "@ant-design/core"; // Bám sát dnd-kit core
import { useDraggable as useDndDraggable } from "@dnd-kit/core";
import { Card, Space, Typography } from "antd";
import {
  EditOutlined,
  NumberOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  TableOutlined,
  UserOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  PictureOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface ToolboxItem {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  category: string;
}

const TOOLBOX_ITEMS: ToolboxItem[] = [
  // Nhóm Cơ bản
  {
    type: "TEXT",
    label: "Văn bản (TEXT)",
    icon: <EditOutlined />,
    color: "#1890ff",
    category: "Cơ bản",
  },
  {
    type: "NUMBER",
    label: "Số học (NUMBER)",
    icon: <NumberOutlined />,
    color: "#52c41a",
    category: "Cơ bản",
  },
  {
    type: "DATE",
    label: "Ngày (DATE)",
    icon: <CalendarOutlined />,
    color: "#722ed1",
    category: "Cơ bản",
  },
  {
    type: "DATETIME",
    label: "Ngày & Giờ (DATETIME)",
    icon: <CalendarOutlined />,
    color: "#eb2f96",
    category: "Cơ bản",
  },
  // Nhóm lựa chọn
  {
    type: "SELECT",
    label: "Hộp chọn (SELECT)",
    icon: <UnorderedListOutlined />,
    color: "#fa8c16",
    category: "Lựa chọn",
  },
  // Nhóm Nâng cao
  {
    type: "LOOKUP",
    label: "Tra cứu (LOOKUP)",
    icon: <LinkOutlined />,
    color: "#faad14",
    category: "Nâng cao",
  },
  {
    type: "TABLE",
    label: "Bảng con (TABLE)",
    icon: <TableOutlined />,
    color: "#13c2c2",
    category: "Nâng cao",
  },
  // Nhóm Hệ thống / Tổ chức
  {
    type: "USER_REF",
    label: "Nhân viên (USER_REF)",
    icon: <UserOutlined />,
    color: "#2f54eb",
    category: "Tổ chức",
  },
  {
    type: "DEPT_REF",
    label: "Phòng ban (DEPT_REF)",
    icon: <DeploymentUnitOutlined />,
    color: "#a0d911",
    category: "Tổ chức",
  },
  // Nhóm Tệp tin
  {
    type: "FILE",
    label: "Tài liệu (FILE)",
    icon: <FileTextOutlined />,
    color: "#fa541c",
    category: "Tệp tin",
  },
  {
    type: "IMAGE",
    label: "Hình ảnh (IMAGE)",
    icon: <PictureOutlined />,
    color: "#f5222d",
    category: "Tệp tin",
  },
  // Nhóm Tự động
  {
    type: "FORMULA",
    label: "Công thức (FORMULA)",
    icon: <CalculatorOutlined />,
    color: "#13c2c2",
    category: "Tự động",
  },
];

interface ToolboxProps {
  onAddItem: (type: string) => void;
}

export default function Toolbox({ onAddItem }: ToolboxProps) {
  // Gom nhóm các công cụ hiển thị
  const categories = Array.from(
    new Set(TOOLBOX_ITEMS.map((item) => item.category)),
  );

  return (
    <Card
      title="Hộp công cụ trường (Toolbox)"
      size="small"
      variant="outlined"
      style={{
        borderRadius: "8px",
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto",
      }}
    >
      {/* Thay direction bằng orientation theo chuẩn AntD v6 */}
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <Text type="secondary" style={{ fontSize: "12px" }}>
          💡 Bạn có thể <strong>Bấm chọn</strong> để thêm nhanh, hoặc{" "}
          <strong>Kéo thả</strong> trực tiếp vào Canvas ở giữa.
        </Text>

        {categories.map((category) => (
          <div key={category}>
            <div
              style={{
                marginBottom: "8px",
                borderLeft: "3px solid #1677ff",
                paddingLeft: "8px",
              }}
            >
              <Text strong style={{ fontSize: "12px", color: "#595959" }}>
                {category.toUpperCase()}
              </Text>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {TOOLBOX_ITEMS.filter((item) => item.category === category).map(
                (item) => (
                  <DraggableToolboxButton
                    key={item.type}
                    item={item}
                    onClick={() => onAddItem(item.type)}
                  />
                ),
              )}
            </div>
          </div>
        ))}
      </Space>
    </Card>
  );
}

function DraggableToolboxButton({
  item,
  onClick,
}: {
  item: ToolboxItem;
  onClick: () => void;
}) {
  // Khai báo Draggable từ dnd-kit
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDndDraggable({
      id: `toolbox_${item.type}`,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 9999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
      {...listeners}
      {...attributes}
      onClick={onClick}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 12px",
          border: "1px solid #d9d9d9",
          borderRadius: "6px",
          background: "#fff",
          transition: "all 0.2s",
          gap: "10px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#1677ff";
          e.currentTarget.style.background = "#f6ffed";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#d9d9d9";
          e.currentTarget.style.background = "#fff";
        }}
      >
        <span
          style={{
            color: item.color,
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {item.icon}
        </span>
        <Text style={{ fontSize: "13px", fontWeight: "500" }}>
          {item.label}
        </Text>
      </div>
    </div>
  );
}
