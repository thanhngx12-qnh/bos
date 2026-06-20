// File: src/app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Dropdown,
  Space,
  Card,
  Button,
  Badge,
  Empty,
  Spin,
  Typography,
  Row,
  Col,
  theme,
  Tabs,
  List,
  Drawer,
  Timeline,
  Descriptions,
  Table,
  Tag,
  Form,
  Input,
  message,
  App as AntdApp
} from "antd";
import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  ArrowRightOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
  RightOutlined,
  FormOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTasks, useWorkflowAction, useWorkflowLogs, Task } from "@/hooks/useTasks";
import { useFields, Field } from "@/hooks/useFields";
import { useWorkflowSteps } from "@/hooks/useWorkflows";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

export default function DashboardPortal() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // State quản lý Tenant và User động
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bos_token");
      if (!token) {
        router.push("/auth/login");
        return;
      }
      const storedTenantId = localStorage.getItem("bos_tenant_id");
      const storedUserName = localStorage.getItem("bos_user_name");
      if (storedTenantId) {
        setTenantId(Number(storedTenantId));
      }
      if (storedUserName) {
        setUserName(storedUserName);
      }
    }
  }, [router]);

  const tenantQuery = useTenantDetail(tenantId);
  const activeTenantName = tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : "Đang tải thông tin doanh nghiệp...";

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem("bos_token");
    localStorage.removeItem("bos_tenant_id");
    localStorage.removeItem("bos_user_name");
    router.push("/auth/login");
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "tenants") router.push("/metadata");
  };

  const userMenu = {
    items: [
      { key: "profile", label: "Thông tin cá nhân" },
      { key: "security", label: "Thiết lập bảo mật" },
      { type: "divider" as const },
      { key: "logout", label: "Đăng xuất hệ thống", danger: true },
    ],
    onClick: (info: any) => {
      if (info.key === "logout") {
        handleLogout();
      }
    },
  };

  // State Tabs và Drawer phê duyệt
  const [activeTab, setActiveTab] = useState<"PENDING" | "COMPLETED">("PENDING");
  const [page, setPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [comment, setComment] = useState("");

  // Gọi APIs lấy danh sách nhiệm vụ của tôi
  const { data: tasksData, isLoading: isTasksLoading, refetch: refetchTasks } = useMyTasks(
    activeTab,
    page,
    5
  );

  // Hook lấy danh sách fields của thực thể liên đới với task đang chọn
  const recordEntityId = selectedTask?.instance?.record?.entityId || null;
  const { data: entityFields = [], isLoading: isFieldsLoading } = useFields(recordEntityId);

  // Hook lấy danh sách bước duyệt để resolve transitions đi ra của bước hiện tại
  const workflowVersionId = selectedTask?.instance?.versionId || null;
  const { data: workflowSteps = [] } = useWorkflowSteps(workflowVersionId);

  // Hook lấy Audit Logs lịch sử của lượt chạy quy trình đang chọn
  const selectedInstanceId = selectedTask?.instanceId || null;
  const { data: auditLogs = [], isLoading: isLogsLoading } = useWorkflowLogs(selectedInstanceId);

  // Mutations thực thi duyệt/bác hồ sơ
  const workflowActionMutation = useWorkflowAction();

  // Xác định trạm hiện tại và các nút bấm phê duyệt động
  const currentStep = selectedTask ? workflowSteps.find((s) => s.id === selectedTask.stepId) : null;
  const transitions = currentStep?.transitionsOut || [];

  const handleActionClick = async (transitionId: number, actionLabel: string) => {
    if (!selectedTask) return;
    const hideLoading = message.loading(`Đang thực thi: ${actionLabel}...`, 0);
    try {
      await workflowActionMutation.mutateAsync({
        instanceId: selectedTask.instanceId,
        transitionId,
        comment: comment || `Đã thực hiện hành động: ${actionLabel}`,
      });
      message.success(`Đã xử lý thành công hành động: ${actionLabel}`);
      setSelectedTask(null);
      setComment("");
      refetchTasks();
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Có lỗi xảy ra khi thực thi phê duyệt.");
    } finally {
      hideLoading();
    }
  };

  // Helper render định dạng các trường dữ liệu động của Record
  const renderFieldValue = (field: Field, val: any) => {
    if (val === undefined || val === null || val === "") {
      return <Text type="secondary" style={{ fontStyle: "italic" }}>-</Text>;
    }
    if (field.type === "CHECKBOX") {
      return val ? <Tag color="green">Có</Tag> : <Tag color="default">Không</Tag>;
    }
    if (field.type === "SELECT") {
      if (Array.isArray(val)) {
        return (
          <Space wrap size={[0, 4]}>
            {val.map((v) => (
              <Tag color="geekblue" key={v}>{v}</Tag>
            ))}
          </Space>
        );
      }
      return <Tag color="geekblue">{String(val)}</Tag>;
    }
    if (field.type === "TABLE") {
      const columns = field.config?.options?.columns || [];
      const tableColumns = columns.map((col: any) => ({
        title: col.name,
        dataIndex: col.code,
        key: col.code,
        render: (cellVal: any) => {
          if (col.type === "CHECKBOX") {
            return cellVal ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>;
          }
          return cellVal !== undefined && cellVal !== null ? String(cellVal) : "-";
        },
      }));
      const dataList = Array.isArray(val) ? val : [];
      return (
        <div style={{ marginTop: "4px" }}>
          <Table
            dataSource={dataList}
            columns={tableColumns}
            pagination={false}
            size="small"
            bordered
            rowKey={(_, index) => (index !== undefined ? index.toString() : "0")}
            style={{ width: "100%" }}
          />
        </div>
      );
    }
    return <Text style={{ fontWeight: 500 }}>{String(val)}</Text>;
  };

  return (
    <AntdApp>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Sider Navigation */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
          style={{ borderRight: "1px solid #f0f0f0" }}
        >
          <div className="flex items-center justify-center py-4 border-b border-gray-100" style={{ minHeight: "64px" }}>
            <Title level={4} style={{ margin: 0, color: "#0050b3" }}>
              {collapsed ? "BOS" : "BOS Platform"}
            </Title>
          </div>
          <Menu
            theme="light"
            selectedKeys={["dashboard"]}
            mode="inline"
            onClick={handleMenuClick}
            items={[
              { key: "dashboard", icon: <DashboardOutlined />, label: "Bảng tổng quan" },
              { key: "organization", icon: <PartitionOutlined />, label: "Cơ cấu Tổ chức" },
              { key: "metadata", icon: <BuildOutlined />, label: "Biểu mẫu Động" },
              { key: "workflow", icon: <DeploymentUnitOutlined />, label: "Luồng Quy trình" },
              { key: "records", icon: <FormOutlined />, label: "Hồ sơ & Biểu mẫu" },
              ...(tenantId === null ? [{ key: "tenants", icon: <GlobalOutlined />, label: "Quản trị SaaS Tenant" }] : []),
            ]}
          />
        </Sider>

        {/* Main Layout Area */}
        <Layout>
          {/* Header Section */}
          <Header
            style={{
              padding: "0 24px",
              background: colorBgContainer,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Space size="middle">
              <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading}>
                <Space>
                  <Text strong>{activeTenantName}</Text>
                </Space>
              </Button>
            </Space>

            {/* Công cụ góc phải */}
            <Space size="large">
              <Badge count={tasksData?.total || 0} overflowCount={99}>
                <Button type="text" shape="circle" icon={<BellOutlined />} />
              </Badge>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Space style={{ cursor: "pointer" }}>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#0050b3" }} />
                  <div className="hidden md:block">
                    <Text strong>{userName}</Text>
                  </div>
                </Space>
              </Dropdown>
            </Space>
          </Header>

          {/* Content Section */}
          <Content style={{ margin: "24px 24px 0", overflow: "initial" }}>
            <Space direction="vertical" size="large" className="w-full">
              {/* Page Header Tiêu Chuẩn */}
              <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100">
                <div>
                  <Breadcrumb
                    items={[
                      { title: "Trang chủ" },
                      { title: "Bảng tổng quan" },
                    ]}
                  />
                  <Title level={2} style={{ margin: "8px 0 0 0" }}>Bảng điều khiển Trung tâm</Title>
                  <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                    Hệ thống Động hóa Doanh nghiệp đa ngành Low-Code - Trạng thái hệ thống tổng quan.
                  </Paragraph>
                </div>
                <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={() => router.push("/metadata")}>
                  Thiết kế Biểu mẫu Động
                </Button>
              </div>

              {/* KPI Metrics row */}
              <Row gutter={[20, 20]}>
                <Col xs={24} md={8}>
                  <Card bordered={false} className="shadow-sm bg-gradient-to-br from-blue-50 to-white" style={{ borderLeft: "4px solid #1890ff", borderRadius: "8px" }}>
                    <Space direction="vertical">
                      <Text type="secondary" strong>Nhiệm vụ Chờ phê duyệt</Text>
                      <Title level={2} style={{ margin: 0, color: "#0050b3" }}>
                        {isTasksLoading ? <Spin size="small" /> : (activeTab === "PENDING" ? tasksData?.total || 0 : "N/A")}
                      </Title>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} className="shadow-sm" style={{ borderLeft: "4px solid #52c41a", borderRadius: "8px" }}>
                    <Space direction="vertical">
                      <Text type="secondary" strong>Nhiệm vụ Đã hoàn thành</Text>
                      <Title level={2} style={{ margin: 0, color: "#237804" }}>
                        {isTasksLoading ? <Spin size="small" /> : (activeTab === "COMPLETED" ? tasksData?.total || 0 : "N/A")}
                      </Title>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card bordered={false} className="shadow-sm" style={{ borderLeft: "4px solid #faad14", borderRadius: "8px" }}>
                    <Space direction="vertical">
                      <Text type="secondary" strong>Đơn vị / Phòng ban</Text>
                      <Title level={2} style={{ margin: 0, color: "#d48806" }}>
                        1
                      </Title>
                    </Space>
                  </Card>
                </Col>
              </Row>

              {/* TRUNG TÂM PHÊ DUYỆT (APPROVALS CENTER) */}
              <Card
                bordered={false}
                className="shadow-sm"
                title={
                  <Space>
                    <DeploymentUnitOutlined style={{ color: "#0050b3", fontSize: "18px" }} />
                    <span style={{ fontSize: "16px", fontWeight: 600 }}>Trung tâm Phê duyệt & Lịch trình Công việc</span>
                  </Space>
                }
                style={{ borderRadius: "8px" }}
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={(key) => {
                    setActiveTab(key as any);
                    setPage(1);
                  }}
                  items={[
                    {
                      key: "PENDING",
                      label: (
                        <span>
                          Chờ tôi xử lý{" "}
                          {activeTab === "PENDING" && tasksData?.total ? (
                            <Badge count={tasksData?.total || 0} style={{ backgroundColor: "#ff4d4f", marginLeft: "4px" }} />
                          ) : null}
                        </span>
                      ),
                    },
                    {
                      key: "COMPLETED",
                      label: "Lịch sử xử lý",
                    },
                  ]}
                />

                {isTasksLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Spin tip="Đang tải danh sách nhiệm vụ..." />
                  </div>
                ) : (tasksData?.data?.length || 0) === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={`Bạn không có nhiệm vụ nào trong danh sách ${activeTab === "PENDING" ? "chờ xử lý" : "đã hoàn thành"}.`}
                  />
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={tasksData?.data || []}
                    pagination={{
                      current: page,
                      pageSize: 5,
                      total: tasksData?.total || 0,
                      onChange: (p) => setPage(p),
                    }}
                    renderItem={(task) => {
                      const record = task.instance?.record;
                      const instanceStatus = task.instance?.status;
                      const isRejected = instanceStatus === "REJECTED" || record?.status === "REJECTED";
                      const isApproved = instanceStatus === "COMPLETED" || record?.status === "COMPLETED" || record?.status === "APPROVED";
                      const isPending = task.status === "PENDING" && !isRejected && !isApproved;

                      // Avatar background/color theo trạng thái
                      const avatarBg = isPending ? "#e6f7ff" : isRejected ? "#fff1f0" : "#f6ffed";
                      const avatarColor = isPending ? "#1890ff" : isRejected ? "#ff4d4f" : "#52c41a";
                      const avatarIcon = isPending ? <ClockCircleOutlined /> : isRejected ? <CloseCircleOutlined /> : <CheckCircleOutlined />;

                      return (
                        <List.Item
                          actions={[
                            isRejected && (
                              <Tag color="error" icon={<CloseCircleOutlined />} key="rejected-tag">
                                Đã từ chối
                              </Tag>
                            ),
                            <Button
                              type="primary"
                              ghost
                              icon={<RightOutlined />}
                              onClick={() => setSelectedTask(task)}
                              key="action"
                              danger={isRejected}
                            >
                              {isPending ? "Xử lý hồ sơ" : "Xem chi tiết"}
                            </Button>,
                          ].filter(Boolean)}
                          style={{
                            borderBottom: "1px solid #f0f0f0",
                            padding: "16px 24px",
                            transition: "background-color 0.2s",
                            background: isRejected ? "#fff9f9" : undefined,
                          }}
                          className="hover:bg-slate-50"
                        >
                          <List.Item.Meta
                            avatar={
                              <Avatar
                                icon={avatarIcon}
                                style={{ backgroundColor: avatarBg, color: avatarColor }}
                              />
                            }
                            title={
                              <Space>
                                <Text strong style={{ fontSize: "14px" }}>
                                  {record?.title || record?.businessCode || "Hồ sơ không tên"}
                                </Text>
                                <Tag color="blue">{record?.businessCode}</Tag>
                                {isRejected && (
                                  <Tag color="red" style={{ marginLeft: 4 }}>Từ chối</Tag>
                                )}
                                {isApproved && (
                                  <Tag color="green" style={{ marginLeft: 4 }}>Đã duyệt</Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Space direction="vertical" size={2}>
                                <div>
                                  <Text type="secondary">Trạng thái: </Text>
                                  <Text strong style={{ color: isPending ? "#1890ff" : isRejected ? "#ff4d4f" : "#52c41a" }}>
                                    {isPending ? "Chờ xử lý" : isRejected ? "Hồ sơ bị từ chối" : "Đã phê duyệt"}
                                  </Text>
                                </div>
                                <Text type="secondary" style={{ fontSize: "12px" }}>
                                  Thời gian nhận: {new Date(task.createdAt).toLocaleString("vi-VN")}
                                </Text>
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                )}
              </Card>
            </Space>
          </Content>
        </Layout>

        {/* DRAWER CHI TIẾT VÀ XỬ LÝ NHIỆM VỤ */}
        <Drawer
          title={
            <Space>
              <FileTextOutlined style={{ color: "#1890ff" }} />
              <span>
                {selectedTask?.status === "PENDING" ? "Xử lý duyệt hồ sơ: " : "Nhật ký hồ sơ: "}
                <strong>{selectedTask?.instance?.record?.title || selectedTask?.instance?.record?.businessCode}</strong>
              </span>
            </Space>
          }
          width={720}
          onClose={() => {
            setSelectedTask(null);
            setComment("");
          }}
          open={!!selectedTask}
          extra={(() => {
            const ist = selectedTask?.instance?.status;
            const recStatus = selectedTask?.instance?.record?.status;
            const selIsRejected = ist === "REJECTED" || recStatus === "REJECTED";
            const selIsApproved = ist === "COMPLETED" || recStatus === "COMPLETED" || recStatus === "APPROVED";
            if (selIsRejected) return <Tag color="error" icon={<CloseCircleOutlined />}>Hồ sơ bị Từ chối</Tag>;
            if (selIsApproved) return <Tag color="success" icon={<CheckCircleOutlined />}>Đã phê duyệt thành công</Tag>;
            return null;
          })()}
        >
          {selectedTask && (
            <Space direction="vertical" size="large" className="w-full">
              {/* PHÂN KHU 1: THÔNG TIN BẢN GHI DỮ LIỆU ĐỘNG */}
              <Card size="small" title="Chi tiết Dữ liệu hồ sơ" headStyle={{ background: "#fafafa" }}>
                {isFieldsLoading ? (
                  <Spin tip="Đang đọc cấu hình biểu mẫu..." />
                ) : (
                  <Descriptions bordered column={1} size="small" labelStyle={{ width: "180px", fontWeight: "bold" }}>
                    <Descriptions.Item label="Mã hồ sơ">
                      <Tag color="cyan">{selectedTask.instance?.record?.businessCode}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Tiêu đề hồ sơ">
                      <Text strong>{selectedTask.instance?.record?.title}</Text>
                    </Descriptions.Item>
                    {/* Render động các fields trong biểu mẫu */}
                    {entityFields.map((field) => {
                      const value = selectedTask.instance?.record?.data?.[field.code];
                      return (
                        <Descriptions.Item key={field.id} label={field.name}>
                          {renderFieldValue(field, value)}
                        </Descriptions.Item>
                      );
                    })}
                  </Descriptions>
                )}
              </Card>

              {/* PHÂN KHU 2: NHẬT KÝ DUYỆT (TIMELINE LOGS) */}
              <Card size="small" title="Lịch sử Lộ trình phê duyệt" headStyle={{ background: "#fafafa" }}>
                {isLogsLoading ? (
                  <Spin tip="Đang tải nhật ký..." />
                ) : auditLogs.length === 0 ? (
                  <Empty description="Chưa có nhật ký hoạt động nào." image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                            <div className="flex justify-between items-center">
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
                              <div style={{ marginTop: "4px", background: "#f5f5f5", padding: "6px 12px", borderRadius: "4px" }}>
                                <MessageOutlined style={{ marginRight: "6px", color: "#8c8c8c" }} />
                                <Text italic type="secondary">{log.comment}</Text>
                              </div>
                            )}
                          </div>
                        ),
                      };
                    })}
                  />
                )}
              </Card>

              {/* PHÂN KHU 3: PANEL PHÊ DUYỆT (HÀNH ĐỘNG DUYỆT ĐỘNG) */}
              {selectedTask.status === "PENDING" && (
                <Card size="small" title="Ý kiến & Thực thi phê duyệt" headStyle={{ background: "#e6f7ff" }}>
                  <Form layout="vertical">
                    <Form.Item label="Nội dung ý kiến phản hồi (Comment):" required>
                      <TextArea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Nhập nội dung phản hồi, nhận xét hoặc lý do từ chối..."
                      />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0 }}>
                      {transitions.length === 0 ? (
                        <div className="text-center py-4 bg-gray-50 rounded border border-dashed">
                          <Text type="secondary" italic>Quy trình tại trạm này chưa được cấu hình nút rẽ nhánh tiếp theo.</Text>
                        </div>
                      ) : (
                        <Space wrap size="middle" style={{ width: "100%", justifyContent: "flex-end" }}>
                          {transitions.map((trans: any) => {
                            const actionLabel = trans.conditionLogic?.actionLabel || "Tiếp tục";
                            const isReject =
                              actionLabel.toLowerCase().includes("từ chối") ||
                              actionLabel.toLowerCase().includes("bác") ||
                              actionLabel.toLowerCase().includes("reject");
                            const isApprove =
                              actionLabel.toLowerCase().includes("duyệt") ||
                              actionLabel.toLowerCase().includes("đồng ý") ||
                              actionLabel.toLowerCase().includes("approve");

                            let btnType: "primary" | "default" | "dashed" = "default";
                            let btnDanger = false;
                            let btnStyle = {};

                            if (isApprove) {
                              btnType = "primary";
                              btnStyle = { backgroundColor: "#52c41a", borderColor: "#52c41a" };
                            } else if (isReject) {
                              btnType = "primary";
                              btnDanger = true;
                            } else {
                              btnType = "primary";
                            }

                            return (
                              <Button
                                key={trans.id}
                                type={btnType}
                                danger={btnDanger}
                                style={btnStyle}
                                loading={workflowActionMutation.isPending}
                                onClick={() => handleActionClick(trans.id, actionLabel)}
                              >
                                {actionLabel}
                              </Button>
                            );
                          })}
                        </Space>
                      )}
                    </Form.Item>
                  </Form>
                </Card>
              )}
            </Space>
          )}
        </Drawer>
      </Layout>
    </AntdApp>
  );
}
