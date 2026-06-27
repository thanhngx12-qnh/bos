// File: src/components/DelegationManager.tsx
"use client";

import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Typography,
  Tag,
  Popconfirm,
  App,
  Empty,
  Spin,
  Divider,
  Select,
  DatePicker,
  Switch,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  useDelegations,
  useCreateDelegation,
  useUpdateDelegation,
  useDeleteDelegation,
  Delegation,
} from "@/hooks/useDelegations";
import { useUsers } from "@/hooks/useUsers";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

export default function DelegationManager() {
  const { message } = App.useApp();
  const { data: delegations = [], isLoading, refetch } = useDelegations();
  const { data: usersData, isLoading: isUsersLoading } = useUsers(1, 1000);
  const users = usersData?.data || [];

  const createMutation = useCreateDelegation();
  const updateMutation = useUpdateDelegation();
  const deleteMutation = useDeleteDelegation();

  // State
  const [selectedToUserId, setSelectedToUserId] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const getStatus = (item: Delegation) => {
    const now = dayjs();
    const start = dayjs(item.startDate);
    const end = dayjs(item.endDate);

    if (!item.isActive) {
      return { label: "Tạm dừng", color: "orange", icon: <ClockCircleOutlined /> };
    }
    if (now.isAfter(end)) {
      return { label: "Đã hết hạn", color: "red", icon: <CloseCircleOutlined /> };
    }
    if (now.isBefore(start)) {
      return { label: "Chờ hiệu lực", color: "blue", icon: <ClockCircleOutlined /> };
    }
    return { label: "Đang hoạt động", color: "green", icon: <CheckCircleOutlined /> };
  };

  const handleCreate = () => {
    if (!selectedToUserId) {
      message.warning("Vui lòng chọn nhân sự nhận ủy quyền.");
      return;
    }
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.warning("Vui lòng chọn khoảng thời gian ủy quyền.");
      return;
    }

    createMutation.mutate(
      {
        toUserId: selectedToUserId,
        startDate: dateRange[0].startOf("day").toISOString(),
        endDate: dateRange[1].endOf("day").toISOString(),
      },
      {
        onSuccess: () => {
          message.success("Thiết lập ủy quyền phê duyệt thành công!");
          setSelectedToUserId(undefined);
          setDateRange(null);
          refetch();
        },
        onError: (err: any) => {
          message.error(
            err?.response?.data?.message || "Có lỗi xảy ra khi thiết lập ủy quyền."
          );
        },
      }
    );
  };

  const handleToggleActive = (id: number, checked: boolean) => {
    updateMutation.mutate(
      { id, isActive: checked },
      {
        onSuccess: () => {
          message.success("Cập nhật trạng thái kích hoạt thành công!");
          refetch();
        },
        onError: (err: any) => {
          message.error(
            err?.response?.data?.message || "Có lỗi xảy ra khi cập nhật trạng thái."
          );
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        message.success("Xóa quy tắc ủy quyền thành công!");
        refetch();
      },
      onError: (err: any) => {
        message.error(
          err?.response?.data?.message || "Có lỗi xảy ra khi xóa quy tắc ủy quyền."
        );
      },
    });
  };

  return (
    <Card
      bordered={false}
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: "#1890ff" }} />
          <span style={{ fontSize: "16px", fontWeight: 600 }}>Ủy quyền Phê duyệt Vắng mặt</span>
        </Space>
      }
      className="shadow-sm"
      style={{ borderRadius: "8px", background: "#ffffff" }}
    >
      <Row gutter={[32, 24]}>
        {/* LEFT COLUMN: DELEGATION LIST */}
        <Col xs={24} lg={14}>
          <Title level={5} style={{ marginBottom: "16px", color: "#334155" }}>
            Danh sách quy tắc ủy quyền của tôi
          </Title>

          {isLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <Spin tip="Đang tải danh sách..." />
            </div>
          ) : delegations.length === 0 ? (
            <Empty
              description="Bạn chưa thiết lập bất kỳ quy tắc ủy quyền nào."
              style={{ padding: "30px 0" }}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {delegations.map((item) => {
                const status = getStatus(item);
                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #f1f5f9",
                      background: "#f8fafc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Space direction="vertical" size={4}>
                      <Space size="middle">
                        <Text strong style={{ fontSize: "14px" }}>
                          <UserOutlined style={{ marginRight: 8, color: "#64748b" }} />
                          Ủy quyền cho: {item.toUser?.fullName || `ID ${item.toUserId}`}
                        </Text>
                        <Tag color={status.color} icon={status.icon}>
                          {status.label}
                        </Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: "12px" }}>
                        <CalendarOutlined style={{ marginRight: 8 }} />
                        Thời hạn: {new Date(item.startDate).toLocaleDateString("vi-VN")} - {new Date(item.endDate).toLocaleDateString("vi-VN")}
                      </Text>
                      <Text type="secondary" style={{ fontSize: "11px", display: "block" }}>
                        Email liên lạc: {item.toUser?.email || "-"}
                      </Text>
                    </Space>

                    <Space size="middle">
                      <Space size="small">
                        <Text style={{ fontSize: "13px" }}>Kích hoạt:</Text>
                        <Switch
                          size="small"
                          checked={item.isActive}
                          onChange={(checked) => handleToggleActive(item.id, checked)}
                          disabled={dayjs().isAfter(dayjs(item.endDate))}
                        />
                      </Space>
                      <Popconfirm
                        title="Bạn có chắc chắn muốn xóa quy tắc ủy quyền này không?"
                        onConfirm={() => handleDelete(item.id)}
                        okText="Có"
                        cancelText="Hủy"
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                        />
                      </Popconfirm>
                    </Space>
                  </div>
                );
              })}
            </div>
          )}
        </Col>

        {/* RIGHT COLUMN: CREATE DELEGATION FORM */}
        <Col xs={24} lg={10}>
          <div
            style={{
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #f1f5f9",
              background: "#fafafa",
              height: "100%",
            }}
          >
            <Title level={5} style={{ marginBottom: "16px", color: "#334155" }}>
              Thiết lập ủy quyền mới
            </Title>
            <Paragraph type="secondary" style={{ fontSize: "13px", marginBottom: "20px" }}>
              Chọn nhân sự được ủy quyền duyệt thay và khoảng thời gian bạn vắng mặt. Hệ thống sẽ tự động chuyển tiếp hồ sơ trong thời gian này.
            </Paragraph>

            <Space direction="vertical" size="large" style={{ display: "flex", width: "100%" }}>
              <div>
                <div style={{ marginBottom: "8px" }}>
                  <Text strong style={{ fontSize: "13px" }}>Nhân sự nhận ủy quyền:</Text>
                </div>
                <Select
                  placeholder="Tìm và chọn nhân sự..."
                  style={{ width: "100%" }}
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? "").toLowerCase().includes(input.toLowerCase()) ||
                    String(option?.email ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                  loading={isUsersLoading}
                  value={selectedToUserId}
                  onChange={setSelectedToUserId}
                  options={users.map((u) => ({
                    value: u.id,
                    label: u.fullName,
                    email: u.email,
                  }))}
                />
              </div>

              <div>
                <div style={{ marginBottom: "8px" }}>
                  <Text strong style={{ fontSize: "13px" }}>Thời gian vắng mặt (Từ ngày - Đến ngày):</Text>
                </div>
                <DatePicker.RangePicker
                  style={{ width: "100%" }}
                  value={dateRange}
                  onChange={(val) => setDateRange(val as any)}
                  disabledDate={(current) => current && current.isBefore(dayjs().startOf("day"))}
                />
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={handleCreate}
                loading={createMutation.isPending}
                style={{
                  background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)",
                  border: "none",
                  height: "40px",
                  borderRadius: "6px",
                  boxShadow: "0 4px 10px rgba(24, 144, 255, 0.2)",
                }}
              >
                Kích hoạt ủy quyền
              </Button>
            </Space>
          </div>
        </Col>
      </Row>
    </Card>
  );
}
