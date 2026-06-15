// File: src/components/metadata/Canvas.tsx
"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card, Empty } from "antd";
import SortableCanvasItem from "./SortableCanvasItem";

interface CanvasProps {
  fields: any[];
  selectedFieldId: string | number | null;
  onSelectField: (id: string | number) => void;
  onDeleteField: (id: string | number) => void;
}

export default function Canvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
}: CanvasProps) {
  // Đóng gói vùng Droppable của dnd-kit
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas_droppable",
  });

  return (
    <Card
      title="Khung thiết kế biểu mẫu (Form Canvas)"
      size="small"
      variant="outlined"
      style={{
        borderRadius: "8px",
        minHeight: "calc(100vh - 200px)",
        background: isOver ? "#f6ffed" : "#fafafa",
        border: isOver ? "2px dashed #52c41a" : "1px dashed #d9d9d9",
        transition: "all 0.3s",
      }}
    >
      <div ref={setNodeRef} style={{ minHeight: "560px" }}>
        {fields.length === 0 ? (
          <div style={{ paddingTop: "150px", textAlign: "center" }}>
            <Empty description="Thả các trường nghiệp vụ hoặc Click chọn từ Hộp công cụ bên trái để bắt đầu thiết kế" />
          </div>
        ) : (
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {fields.map((field) => (
              <SortableCanvasItem
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </Card>
  );
}
