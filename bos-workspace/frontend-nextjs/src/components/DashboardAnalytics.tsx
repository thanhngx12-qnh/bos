// File: src/components/DashboardAnalytics.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Typography,
  Space,
  Empty,
  Spin,
  Alert,
  Tooltip,
} from "antd";
import {
  BarChartOutlined,
  DeploymentUnitOutlined,
  AlertOutlined,
  FormOutlined,
  ClusterOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  useEntitiesSummary,
  useWorkflowsSummary,
  useSpendingByDepartment,
  useTaskAnalytics,
} from "@/hooks/useAnalytics";
import { useEntities } from "@/hooks/useEntities";
import { useFields } from "@/hooks/useFields";

const { Title, Text, Paragraph } = Typography;

export default function DashboardAnalytics() {
  const { data: entitiesSummary = [], isLoading: isEntitiesSumLoading } = useEntitiesSummary();
  const { data: workflowsSummary = [], isLoading: isWfSumLoading } = useWorkflowsSummary();
  const { data: taskAnalytics, isLoading: isTaskAnalyticLoading } = useTaskAnalytics();
  const { data: entitiesData } = useEntities(1, 100);

  const entities = entitiesData?.data || [];

  // State to query department spending dynamically
  const [selectedEntityId, setSelectedEntityId] = useState<number | undefined>(undefined);
  const [selectedAmountField, setSelectedAmountField] = useState<string>("total_amount");

  // Query fields for the selected entity to identify numeric/formula fields
  const { data: fields = [], isLoading: isFieldsLoading } = useFields(selectedEntityId || null);

  const numericFields = useMemo(() => {
    return fields.filter(
      (f) =>
        f.type === "NUMBER" ||
        f.type === "DECIMAL" ||
        f.type === "CURRENCY" ||
        f.type === "FORMULA"
    );
  }, [fields]);

  // Set first entity as default on load if not set
  React.useEffect(() => {
    if (entities.length > 0 && selectedEntityId === undefined) {
      setSelectedEntityId(entities[0].id);
    }
  }, [entities, selectedEntityId]);

  // Set default amount field when entity changes
  React.useEffect(() => {
    if (numericFields.length > 0) {
      // Look for total_amount first, otherwise fallback to the first numeric field
      const totalField = numericFields.find((f) => f.code === "total_amount" || f.code === "total_payment");
      if (totalField) {
        setSelectedAmountField(totalField.code);
      } else {
        setSelectedAmountField(numericFields[0].code);
      }
    } else {
      setSelectedAmountField("total_amount");
    }
  }, [numericFields]);

  // Query spending by department based on selected config
  const { data: spendingData = [], isLoading: isSpendingLoading } = useSpendingByDepartment(
    selectedEntityId,
    selectedAmountField
  );

  // Compute overall totals for metrics cards
  const totalRecords = useMemo(() => {
    return entitiesSummary.reduce((acc, curr) => acc + (curr._count?.records || 0), 0);
  }, [entitiesSummary]);

  const totalInstances = useMemo(() => {
    return workflowsSummary.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [workflowsSummary]);

  const workflowStats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let rejected = 0;
    workflowsSummary.forEach((wf) => {
      if (wf.status === "COMPLETED" || wf.status === "APPROVED") completed += wf.count;
      else if (wf.status === "REJECTED") rejected += wf.count;
      else inProgress += wf.count;
    });
    const total = completed + inProgress + rejected || 1;
    return {
      completed,
      inProgress,
      rejected,
      completedPct: Math.round((completed / total) * 100),
      inProgressPct: Math.round((inProgress / total) * 100),
      rejectedPct: Math.round((rejected / total) * 100),
    };
  }, [workflowsSummary]);

  // Max record count for form utilization charting
  const maxRecordCount = useMemo(() => {
    const counts = entitiesSummary.map((e) => e._count?.records || 0);
    return counts.length > 0 ? Math.max(...counts, 1) : 1;
  }, [entitiesSummary]);

  // Max department spending for budget visualization
  const maxSpending = useMemo(() => {
    const spending = spendingData.map((d) => d.totalSpending || 0);
    return spending.length > 0 ? Math.max(...spending, 1) : 1;
  }, [spendingData]);

  // Formatter for VND currencies
  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  // Process average time SLA statistics
  const avgCompletionTimeStr = useMemo(() => {
    if (!taskAnalytics || !taskAnalytics.statusBreakdown) return "N/A";
    const completedStats = taskAnalytics.statusBreakdown.find((s) => s.status === "COMPLETED");
    if (!completedStats || !completedStats.avgCompletionSeconds) return "N/A";
    
    const minutes = Math.floor(completedStats.avgCompletionSeconds / 60);
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    if (hours < 24) return `${hours} giờ ${remMinutes} phút`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days} ngày ${remHours} giờ`;
  }, [taskAnalytics]);

  return (
    <div style={{ width: "100%" }}>
      {/* 1. TOP METRICS CARDS ROW */}
      <Row gutter={[20, 20]} style={{ marginBottom: "24px" }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: "8px", background: "#f0f5ff", borderLeft: "4px solid #1890ff" }}>
            <Statistic
              title={<span style={{ color: "#4f4f4f", fontWeight: 600 }}>Biểu mẫu Động</span>}
              value={entitiesSummary.length}
              valueStyle={{ color: "#0050b3", fontWeight: 700 }}
              prefix={<FormOutlined style={{ marginRight: 8, color: "#1890ff" }} />}
              loading={isEntitiesSumLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: "8px", background: "#f6ffed", borderLeft: "4px solid #52c41a" }}>
            <Statistic
              title={<span style={{ color: "#4f4f4f", fontWeight: 600 }}>Tổng hồ sơ lưu trữ</span>}
              value={totalRecords}
              valueStyle={{ color: "#237804", fontWeight: 700 }}
              prefix={<ClusterOutlined style={{ marginRight: 8, color: "#52c41a" }} />}
              loading={isEntitiesSumLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: "8px", background: "#fffbe6", borderLeft: "4px solid #faad14" }}>
            <Statistic
              title={<span style={{ color: "#4f4f4f", fontWeight: 600 }}>Lượt chạy Quy trình</span>}
              value={totalInstances}
              valueStyle={{ color: "#d48806", fontWeight: 700 }}
              prefix={<DeploymentUnitOutlined style={{ marginRight: 8, color: "#faad14" }} />}
              loading={isWfSumLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm" style={{ borderRadius: "8px", background: "#fff1f0", borderLeft: "4px solid #ff4d4f" }}>
            <Statistic
              title={<span style={{ color: "#4f4f4f", fontWeight: 600 }}>Nhiệm vụ trễ hạn SLA</span>}
              value={taskAnalytics?.overdueCount || 0}
              valueStyle={{ color: "#cf1322", fontWeight: 700 }}
              prefix={<AlertOutlined style={{ marginRight: 8, color: "#ff4d4f" }} />}
              loading={isTaskAnalyticLoading}
            />
          </Card>
        </Col>
      </Row>

      {/* 2. CHARTS SECTION BLOCK */}
      <Row gutter={[20, 20]} style={{ marginBottom: "24px" }}>
        {/* LEFT COLUMN: SPENDING BY DEPARTMENT */}
        <Col xs={24} lg={14}>
          <Card
            bordered={false}
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "8px" }}>
                <Space>
                  <BarChartOutlined style={{ color: "#1890ff" }} />
                  <span style={{ fontSize: "16px", fontWeight: 600 }}>Báo cáo Tài chính theo Phòng ban</span>
                </Space>
                {/* Custom selectors to dynamically load details */}
                <Space size="small">
                  <Select
                    placeholder="Chọn biểu mẫu..."
                    size="small"
                    style={{ width: 140 }}
                    value={selectedEntityId}
                    onChange={(val) => {
                      setSelectedEntityId(val);
                      setSelectedAmountField("total_amount");
                    }}
                    options={entities.map((e) => ({ value: e.id, label: e.name }))}
                  />
                  <Select
                    placeholder="Chọn trường..."
                    size="small"
                    style={{ width: 130 }}
                    value={selectedAmountField}
                    onChange={setSelectedAmountField}
                    disabled={numericFields.length === 0}
                    options={numericFields.map((f) => ({ value: f.code, label: f.name }))}
                  />
                </Space>
              </div>
            }
            className="shadow-sm"
            style={{ borderRadius: "8px", height: "100%" }}
          >
            {isSpendingLoading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "220px" }}>
                <Spin tip="Đang tải dữ liệu..." />
              </div>
            ) : spendingData.length === 0 ? (
              <Empty description="Không có dữ liệu tài chính cho biểu mẫu và trường được cấu hình." style={{ padding: "40px 0" }} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "8px 0" }}>
                {spendingData.map((dept, index) => {
                  const percent = Math.round((dept.totalSpending / maxSpending) * 100);
                  const barGradients = [
                    "linear-gradient(90deg, #1890ff, #36cfc9)",
                    "linear-gradient(90deg, #722ed1, #b37feb)",
                    "linear-gradient(90deg, #52c41a, #95de64)",
                    "linear-gradient(90deg, #fa8c16, #ffd591)",
                    "linear-gradient(90deg, #f5222d, #ff9c6e)",
                  ];
                  const barColor = barGradients[index % barGradients.length];

                  return (
                    <div key={dept.departmentName} style={{ width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <Text strong style={{ fontSize: "13px" }}>{dept.departmentName}</Text>
                        <Text strong style={{ color: "#0d1b2a", fontSize: "13px" }}>{formatVND(dept.totalSpending)}</Text>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "16px",
                          background: "#f0f2f5",
                          borderRadius: "8px",
                          overflow: "hidden",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: "100%",
                            background: barColor,
                            borderRadius: "8px",
                            transition: "width 0.8s ease-in-out",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* RIGHT COLUMN: WORKFLOW INSTANCES PIE/STATUS CHART */}
        <Col xs={24} lg={10}>
          <Card
            bordered={false}
            title={
              <Space>
                <DeploymentUnitOutlined style={{ color: "#52c41a" }} />
                <span style={{ fontSize: "16px", fontWeight: 600 }}>Tỷ lệ Trạng thái Quy trình</span>
              </Space>
            }
            className="shadow-sm"
            style={{ borderRadius: "8px", height: "100%" }}
          >
            {isWfSumLoading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "220px" }}>
                <Spin tip="Đang phân tích..." />
              </div>
            ) : workflowsSummary.length === 0 ? (
              <Empty description="Chưa có dữ liệu vận hành quy trình." style={{ padding: "40px 0" }} />
            ) : (
              <Row align="middle" justify="center" style={{ minHeight: "200px" }}>
                {/* Animated SVG Donut Chart */}
                <Col span={10}>
                  <div style={{ position: "relative", width: "100px", height: "100px", margin: "auto" }}>
                    <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      {/* Base Background Circle */}
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f0f2f5" strokeWidth="4" />
                      
                      {/* Completed Arc (Green) */}
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#52c41a"
                        strokeWidth="4"
                        strokeDasharray={`${workflowStats.completedPct} ${100 - workflowStats.completedPct}`}
                        strokeDashoffset="0"
                      />

                      {/* In Progress Arc (Blue) */}
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#1890ff"
                        strokeWidth="4"
                        strokeDasharray={`${workflowStats.inProgressPct} ${100 - workflowStats.inProgressPct}`}
                        strokeDashoffset={`-${workflowStats.completedPct}`}
                      />

                      {/* Rejected Arc (Red) */}
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#ff4d4f"
                        strokeWidth="4"
                        strokeDasharray={`${workflowStats.rejectedPct} ${100 - workflowStats.rejectedPct}`}
                        strokeDashoffset={`-${workflowStats.completedPct + workflowStats.inProgressPct}`}
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}
                    >
                      <span style={{ fontSize: "16px", fontWeight: "bold" }}>{totalInstances}</span>
                      <br />
                      <span style={{ fontSize: "8px", color: "#8c8c8c", textTransform: "uppercase" }}>Lượt chạy</span>
                    </div>
                  </div>
                </Col>

                {/* Status Legend list */}
                <Col span={14}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingLeft: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#52c41a" }} />
                      <span style={{ flex: 1, fontSize: "12px" }}>Hoàn tất:</span>
                      <Text strong style={{ fontSize: "12px" }}>{workflowStats.completed} ({workflowStats.completedPct}%)</Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#1890ff" }} />
                      <span style={{ flex: 1, fontSize: "12px" }}>Đang duyệt:</span>
                      <Text strong style={{ fontSize: "12px" }}>{workflowStats.inProgress} ({workflowStats.inProgressPct}%)</Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff4d4f" }} />
                      <span style={{ flex: 1, fontSize: "12px" }}>Bị từ chối:</span>
                      <Text strong style={{ fontSize: "12px" }}>{workflowStats.rejected} ({workflowStats.rejectedPct}%)</Text>
                    </div>
                  </div>
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* 3. UTILIZATION BAR CHART & BOTTLENECK ANALYSIS ROW */}
      <Row gutter={[20, 20]}>
        {/* SUBMISSIONS BY FORM CARD */}
        <Col xs={24} md={12}>
          <Card
            bordered={false}
            title={
              <Space>
                <DashboardOutlined style={{ color: "#fa8c16" }} />
                <span style={{ fontSize: "16px", fontWeight: 600 }}>Tần suất Sử dụng Biểu mẫu</span>
              </Space>
            }
            className="shadow-sm"
            style={{ borderRadius: "8px" }}
          >
            {isEntitiesSumLoading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "150px" }}>
                <Spin tip="Đang tải tần suất..." />
              </div>
            ) : entitiesSummary.length === 0 ? (
              <Empty description="Không có biểu mẫu hoạt động." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {entitiesSummary.map((item) => {
                  const recordCount = item._count?.records || 0;
                  const ratio = Math.round((recordCount / maxRecordCount) * 100);

                  return (
                    <div key={item.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 500 }}>{item.name} ({item.code})</span>
                        <Text strong style={{ fontSize: "12px" }}>{recordCount} phiếu</Text>
                      </div>
                      <div style={{ width: "100%", height: "8px", background: "#f5f5f5", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${ratio}%`, height: "100%", background: "#fa8c16", borderRadius: "4px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* PROCESS BOTTLENECK DETECTOR */}
        <Col xs={24} md={12}>
          <Card
            bordered={false}
            title={
              <Space>
                <WarningOutlined style={{ color: "#ff4d4f" }} />
                <span style={{ fontSize: "16px", fontWeight: 600 }}>Bộ Cảnh báo & Phát hiện Điểm nghẽn SLA</span>
              </Space>
            }
            className="shadow-sm"
            style={{ borderRadius: "8px", height: "100%" }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#fff7e6", padding: "12px", borderRadius: "6px", border: "1px solid #ffd591" }}>
                <ClockCircleOutlined style={{ fontSize: "24px", color: "#fa8c16" }} />
                <div>
                  <Text type="secondary" style={{ fontSize: "11px", display: "block" }}>
                    THỜI GIAN DUYỆT TRUNG BÌNH (SLA)
                  </Text>
                  <Text strong style={{ fontSize: "16px", color: "#d46b08" }}>
                    {avgCompletionTimeStr}
                  </Text>
                </div>
              </div>

              {taskAnalytics && taskAnalytics.overdueCount > 0 ? (
                <Alert
                  message={
                    <span>
                      Hệ thống phát hiện <strong>{taskAnalytics.overdueCount}</strong> nhiệm vụ phê duyệt đang bị **quá hạn xử lý** (SLA Overdue) của trạm duyệt. Vui lòng kiểm tra lộ trình phê duyệt để giải tỏa điểm nghẽn.
                    </span>
                  }
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
                />
              ) : (
                <Alert
                  message="Các nhiệm vụ phê duyệt hiện hành đang hoạt động ổn định trong tầm kiểm soát của thời hạn SLA."
                  type="success"
                  showIcon
                />
              )}

              <Paragraph type="secondary" style={{ fontSize: "12px", margin: 0 }}>
                💡 <em>Lời khuyên tối ưu: Thường xuyên cấu hình thời hạn SLA cho từng bước trong thiết kế luồng quy trình để theo dõi sát hiệu suất và cảnh báo trễ hạn tự động cho nhân sự.</em>
              </Paragraph>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
