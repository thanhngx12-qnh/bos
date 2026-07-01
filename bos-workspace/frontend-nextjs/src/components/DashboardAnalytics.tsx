// File: src/components/DashboardAnalytics.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
  PieChart,
  Pie,
  Legend as RechartsLegend,
} from "recharts";

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

  // SSR hydration guard
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  useEffect(() => {
    if (entities.length > 0 && selectedEntityId === undefined) {
      setSelectedEntityId(entities[0].id);
    }
  }, [entities, selectedEntityId]);

  // Set default amount field when entity changes
  useEffect(() => {
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

  // Recharts formatted data
  const spendingChartData = useMemo(() => {
    return spendingData.map((d) => ({
      name: d.departmentName,
      "Tổng chi tiêu": d.totalSpending,
    }));
  }, [spendingData]);

  const pieData = useMemo(() => {
    return [
      { name: "Hoàn tất", value: workflowStats.completed, color: "#52c41a" },
      { name: "Đang duyệt", value: workflowStats.inProgress, color: "#1890ff" },
      { name: "Bị từ chối", value: workflowStats.rejected, color: "#ff4d4f" },
    ].filter((d) => d.value > 0);
  }, [workflowStats]);

  const utilizationChartData = useMemo(() => {
    return entitiesSummary.map((item) => ({
      name: item.name,
      "Số phiếu": item._count?.records || 0,
    }));
  }, [entitiesSummary]);

  return (
    <div style={{ width: "100%" }} className="bos-animate-fade-in">
      {/* 1. TOP METRICS CARDS ROW */}
      <Row gutter={[20, 20]} style={{ marginBottom: "24px" }}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="bos-stat-card" style={{ background: "#f0f5ff", borderLeft: "4px solid #1890ff" }}>
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
          <Card bordered={false} className="bos-stat-card" style={{ background: "#f6ffed", borderLeft: "4px solid #52c41a" }}>
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
          <Card bordered={false} className="bos-stat-card" style={{ background: "#fffbe6", borderLeft: "4px solid #faad14" }}>
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
          <Card bordered={false} className="bos-stat-card" style={{ background: "#fff1f0", borderLeft: "4px solid #ff4d4f" }}>
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
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
                <Spin tip="Đang tải dữ liệu..." />
              </div>
            ) : spendingData.length === 0 ? (
              <Empty description="Không có dữ liệu tài chính cho biểu mẫu và trường được cấu hình." style={{ padding: "80px 0" }} />
            ) : isMounted ? (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={spendingChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <XAxis type="number" tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} style={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={90} style={{ fontSize: 11, fontWeight: 500 }} />
                    <RechartsTooltip formatter={(value) => formatVND(value as number)} />
                    <Bar dataKey="Tổng chi tiêu" radius={[0, 4, 4, 0]}>
                      {spendingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#1890ff", "#722ed1", "#52c41a", "#fa8c16", "#f5222d"][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 320 }} />
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
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
                <Spin tip="Đang phân tích..." />
              </div>
            ) : workflowsSummary.length === 0 ? (
              <Empty description="Chưa có dữ liệu vận hành quy trình." style={{ padding: "80px 0" }} />
            ) : isMounted ? (
              <div style={{ width: "100%", height: 320, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <RechartsLegend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ textAlign: "center", marginTop: "-20px", fontSize: "12px", color: "#64748b" }}>
                  Tổng lượt chạy quy trình: <strong>{totalInstances}</strong>
                </div>
              </div>
            ) : (
              <div style={{ height: 320 }} />
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
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "220px" }}>
                <Spin tip="Đang tải tần suất..." />
              </div>
            ) : entitiesSummary.length === 0 ? (
              <Empty description="Không có biểu mẫu hoạt động." style={{ padding: "40px 0" }} />
            ) : isMounted ? (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={utilizationChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" style={{ fontSize: 11, fontWeight: 500 }} />
                    <YAxis style={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar dataKey="Số phiếu" fill="#fa8c16" radius={[4, 4, 0, 0]}>
                      {utilizationChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#fa8c16", "#1890ff", "#13c2c2", "#722ed1", "#eb2f96"][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 220 }} />
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
                <span style={{ fontSize: "16px", fontWeight: 600 }}>Bộ Cảnh báo & SLA</span>
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
