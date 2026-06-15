// File: src/app/(dashboard)/page.tsx
"use client";

import React from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Divider,
  Tag,
  Spin,
} from "antd";
import {
  DatabaseOutlined,
  DeploymentUnitOutlined,
  TeamOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useEntities } from "@/hooks/useEntities";

const { Title, Paragraph, Text } = Typography;

export default function DashboardPage() {
  const { data: entities, isLoading } = useEntities();

  // Phòng vệ cực hạn: Đảm bảo dữ liệu luôn là mảng thực sự
  const entityList = Array.isArray(entities)
    ? entities
    : (entities as any)?.data && Array.isArray((entities as any).data)
      ? (entities as any).data
      : (entities as any)?.items && Array.isArray((entities as any).items)
        ? (entities as any).items
        : [];

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <Title level={3}>Bảng điều khiển hệ thống</Title>
        <Paragraph type="secondary">
          Tổng quan cấu trúc dữ liệu, quy trình làm việc và nhật ký vận hành
          doanh nghiệp dựa trên cấu hình Metadata.
        </Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
          >
            <Statistic
              title="Thực thể Dữ liệu (Entities)"
              value={entityList.length}
              prefix={<DatabaseOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
          >
            <Statistic
              title="Quy trình kích hoạt"
              value={3}
              prefix={<DeploymentUnitOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
          >
            <Statistic
              title="Thành viên Hệ thống"
              value={5}
              prefix={<TeamOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            variant="borderless"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
          >
            <Statistic
              title="Nhật ký Vận hành"
              value={150}
              prefix={<AuditOutlined style={{ color: "#ff4d4f" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title="Danh sách các Thực thể đang hoạt động"
            variant="borderless"
          >
            {isLoading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin tip="Đang tải danh sách thực thể..." />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {entityList.map((entity: any) => {
                  if (!entity) return null;
                  return (
                    <div
                      key={entity.id || entity.code}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px",
                        borderBottom: "1px solid #f0f0f0",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "15px" }}>
                          {entity.name || entity.displayName || entity.code}
                        </div>
                        <div
                          style={{
                            color: "#8c8c8c",
                            fontSize: "13px",
                            marginTop: "4px",
                          }}
                        >
                          {entity.description ||
                            "Chưa có mô tả cho thực thể này."}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <Tag color="blue">{entity.code}</Tag>
                        <span style={{ fontSize: "13px", color: "#595959" }}>
                          {(entity.fields || []).length} trường dữ liệu
                        </span>
                      </div>
                    </div>
                  );
                })}
                {entityList.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px" }}>
                    <Text type="secondary">
                      Chưa có thực thể dữ liệu nào được cấu hình.
                    </Text>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Vận hành Low-Code" variant="borderless">
            <Paragraph>
              Nền tảng aPaaS BOS hoạt động dựa trên triết lý **Metadata-Driven
              UI**. Bạn có thể thêm trường dữ liệu hoặc thay đổi luồng duyệt quy
              trình mà không cần viết một dòng code nào.
            </Paragraph>
            <ul>
              <li>
                Thiết lập thực thể tại <strong>Kiến tạo Metadata</strong>
              </li>
              <li>
                Tạo luồng duyệt tại <strong>Quy trình (Workflow)</strong>
              </li>
              <li>
                Kiểm tra hệ thống tại <strong>Nhật ký hệ thống</strong>
              </li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
