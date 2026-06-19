// File: src/app/metadata/[id]/fields/components/WorkflowStepsController.tsx
"use client";

import React from "react";
import { Card, Space, Typography, List, Badge, Divider, Spin } from "antd";
import {
  PartitionOutlined,
  SafetyOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useWorkflowSteps, WorkflowStep } from "@/hooks/useWorkflows";

const { Text, Paragraph } = Typography;

interface WorkflowStepsControllerProps {
  versionId: number | null;
  activeStep: WorkflowStep | null;
  setActiveStep: (step: WorkflowStep | null) => void;
}

export default function WorkflowStepsController({
  versionId,
  activeStep,
  setActiveStep,
}: WorkflowStepsControllerProps) {
  // Lấy dữ liệu các Bước duyệt thời gian thực của Quy trình trực tiếp từ database [1]
  const { data: steps = [], isLoading } = useWorkflowSteps(versionId);

  return (
    <Card
      title={
        <Space>
          <PartitionOutlined style={{ color: "#0050b3" }} />{" "}
          <Text strong>Luồng Quy trình & Quy chế Duyệt</Text>
        </Space>
      }
      className="shadow-sm h-full"
      styles={{ body: { padding: "16px" } }}
    >
      <Paragraph
        type="secondary"
        style={{ fontSize: "13px", marginBottom: "16px" }}
      >
        Nhấp chọn một Bước dưới đây để thiết lập phân quyền trực quan `HIỆN /
        SỬA / ẨN` trường ngay trên Canvas ở giữa [1].
      </Paragraph>

      {isLoading ? (
        <div className="flex justify-center items-center py-6">
          <Spin size="small" tip="Đang truy vấn Steps..." />
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
                    </Space>
                  </Space>
                  {isActive && <RightOutlined style={{ color: "#0050b3" }} />}
                </div>
              </List.Item>
            );
          }}
        />
      ) : (
        <div style={{ textAlign: "center", padding: "16px 0" }}>
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Không tìm thấy Bước quy trình liên kết với Biểu mẫu này.
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
    </Card>
  );
}
