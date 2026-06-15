// File: src/app/(dashboard)/entities/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  Card,
  Typography,
  Space,
  Input,
  Button,
  Tag,
  Popconfirm,
  Drawer,
  Form,
  InputNumber,
  DatePicker,
  Select,
  Spin,
  Row,
  Col,
  Steps,
  Empty,
  Divider,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined,
  NodeIndexOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { useEntityDetail } from "@/hooks/useEntityDetail";
import { useRecords } from "@/hooks/useRecords";
import { useWorkflow } from "@/hooks/useWorkflow";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EntityDataPage({ params }: PageProps) {
  const { id: entityId } = React.use(params);
  const router = useRouter();

  // States quản trị phân trang & lọc dữ liệu từ Server-side
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(
    undefined,
  );

  // States quản lý Drawer Form nhập liệu & Thu phóng Toàn màn hình (Full Screen)
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false); // Lưu trạng thái Full Screen [2]
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const [recordForm] = Form.useForm();

  // 1. Tải cấu trúc trường thông tin Metadata của thực thể
  const { entity, isLoading: isLoadingEntity } = useEntityDetail(entityId);

  // 2. Tải danh sách bản ghi dữ liệu thực tế (dynamic records) liên quan
  const {
    records,
    meta,
    isLoading: isLoadingRecords,
    createRecord,
    isCreating,
    updateRecord,
    isUpdating,
    removeRecord,
  } = useRecords({
    entityId: Number(entityId),
    page: currentPage,
    limit: pageSize,
    sortBy,
    sortOrder,
    searchQuery,
  });

  // 3. Giải quyết luồng quy trình liên kết độc lập
  const { workflows, isLoadingWorkflows } = useWorkflow(
    undefined,
    undefined,
    Number(entityId),
  );

  const workflowsList = Array.isArray(workflows)
    ? workflows
    : (workflows as any)?.data || (workflows as any)?.items || [];

  const matchedWorkflow = workflowsList.find(
    (w: any) => w.entityId === Number(entityId),
  );
  const workflowId = matchedWorkflow?.id;

  const { workflowDetail } = useWorkflow(
    undefined,
    workflowId,
    Number(entityId),
  );
  const versions = Array.isArray(workflowDetail?.versions)
    ? workflowDetail.versions
    : [];

  const sortedVersions = [...versions].sort(
    (a: any, b: any) => b.version - a.version,
  );
  const activeVersion =
    sortedVersions.find((v: any) => v.status === "PUBLISHED") ||
    sortedVersions[0];
  const activeVersionId = activeVersion?.id;

  const { steps: pipelineSteps } = useWorkflow(
    activeVersionId,
    workflowId,
    Number(entityId),
  );

  // Tự động reset bộ phân trang khi chuyển đổi sang thiết kế thực thể khác
  useEffect(() => {
    setCurrentPage(1);
    setSearchQuery("");
  }, [entityId]);

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 10);

    if (sorter && sorter.field) {
      const fieldCode = Array.isArray(sorter.field)
        ? sorter.field[1]
        : sorter.field;
      setSortBy(fieldCode);
      setSortOrder(
        sorter.order === "ascend"
          ? "asc"
          : sorter.order === "descend"
            ? "desc"
            : undefined,
      );
    } else {
      setSortBy(undefined);
      setSortOrder(undefined);
    }
  };

  // Mở Form tạo mới bản ghi trống
  const handleCreateOpen = () => {
    setEditingRecord(null);
    setIsFullScreen(false); // Reset kích thước Drawer về mặc định
    recordForm.resetFields();
    setIsDrawerOpen(true);
  };

  // Nạp dữ liệu bản ghi cũ và parse ngày tháng dayjs cho Form sửa
  const handleEditOpen = (record: any) => {
    setEditingRecord(record);
    setIsFullScreen(false); // Reset kích thước Drawer về mặc định
    const formValues: Record<string, any> = {};

    (entity?.fields || []).forEach((field: any) => {
      const val = record.data?.[field.code];
      if (field.type === "DATE" && val) {
        formValues[field.code] = dayjs(val);
      } else {
        formValues[field.code] = val;
      }
    });

    recordForm.setFieldsValue(formValues);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await removeRecord(id);
    } catch (e) {}
  };

  // Xử lý gửi Form tạo/sửa bản ghi an toàn
  const handleFormSubmit = async (values: any) => {
    try {
      const formattedData: Record<string, any> = {};

      (entity?.fields || []).forEach((field: any) => {
        const val = values[field.code];
        if (field.type === "DATE" && val) {
          formattedData[field.code] = val.format("YYYY-MM-DD");
        } else {
          formattedData[field.code] = val;
        }
      });

      if (editingRecord) {
        await updateRecord({ id: editingRecord.id, data: formattedData });
      } else {
        await createRecord({ entityId: Number(entityId), data: formattedData });
      }

      setIsDrawerOpen(false);
      recordForm.resetFields();
    } catch (e) {}
  };

  // ĐỒNG BỘ ĐẦU CỘT DỰA TRÊN METADATA (Metadata-Driven Columns) [2]
  const dynamicColumns = (entity?.fields || []).map((field: any) => ({
    title: field.name,
    dataIndex: ["data", field.code],
    key: field.code,
    sorter: true,
    render: (value: any) => {
      if (value === undefined || value === null) {
        return <span style={{ color: "#bfbfbf" }}>-</span>;
      }

      switch (field.type) {
        case "NUMBER":
          return `${Number(value).toLocaleString()} ${field.options?.prefix || ""}`;
        case "DATE":
          return dayjs(value).format("DD/MM/YYYY");
        case "DATETIME":
          return dayjs(value).format("DD/MM/YYYY HH:mm");
        case "SELECT":
          if (field.options?.multiple && Array.isArray(value)) {
            return (
              <Space size={2}>
                {value.map((v: any) => {
                  const choice = (field.options?.choices || []).find(
                    (c: any) => c.value === v,
                  );
                  return (
                    <Tag key={v} color="blue">
                      {choice?.label || v}
                    </Tag>
                  );
                })}
              </Space>
            );
          }
          const choice = (field.options?.choices || []).find(
            (c: any) => c.value === value,
          );
          return <Tag color="blue">{choice?.label || value}</Tag>;
        case "LOOKUP":
          return <Tag color="orange">{value}</Tag>;
        case "FILE":
        case "IMAGE":
          return <Tag color="cyan">Tài liệu đính kèm</Tag>;
        default:
          return String(value);
      }
    },
  }));

  const columns = [
    {
      title: "Mã bản ghi",
      dataIndex: "recordCode",
      key: "recordCode",
      sorter: true,
      render: (code: string, record: any) => (
        <Text strong style={{ color: "#1677ff" }}>
          {code || `#${record.id}`}
        </Text>
      ),
    },
    ...dynamicColumns,
    {
      title: "Hành động",
      key: "actions",
      width: 130,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditOpen(record)}
            size="small"
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa bản ghi này?"
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Sắp xếp và chuyển đổi Steps thành dòng thời gian phê duyệt
  const stepTimelineItems = (pipelineSteps || [])
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
    .map((step: any) => {
      const transitionLabels = (step.transitionsOut || [])
        .map((t: any) => t.conditionLogic?.actionLabel)
        .filter(Boolean);

      return {
        title: (
          <Text strong style={{ fontSize: "13px" }}>
            {step.name}
          </Text>
        ),
        subTitle: (
          <Tag color="blue" style={{ fontSize: "10px", padding: "0 4px" }}>
            {step.stepType}
          </Tag>
        ),
        description: (
          <div style={{ marginTop: "6px" }}>
            {step.permissions?.candidateUsers?.length > 0 && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#8c8c8c",
                  marginBottom: "4px",
                }}
              >
                Phê duyệt bởi: ID [ {step.permissions.candidateUsers.join(", ")}{" "}
                ]
              </div>
            )}
            {transitionLabels.length > 0 && (
              <Space size={4} wrap>
                {transitionLabels.map((lbl: string) => (
                  <Tag
                    key={lbl}
                    color="green"
                    style={{ fontSize: "10px", borderStyle: "dashed" }}
                  >
                    ➔ {lbl}
                  </Tag>
                ))}
              </Space>
            )}
          </div>
        ),
      };
    });

  if (isLoadingEntity) {
    return (
      <div
        style={{
          height: "400px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Space orientation="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">Đang nạp bộ Grid Dữ liệu động...</Text>
        </Space>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <Space size="middle">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/metadata")}
            shape="circle"
          />
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Dữ liệu: {entity?.name}
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Mã code: <strong>{entity?.code}</strong> | Quản trị vận hành dữ
              liệu dựa trên cấu hình Metadata.
            </Paragraph>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleCreateOpen}
        >
          Thêm bản ghi mới
        </Button>
      </div>

      <Card
        variant="borderless"
        style={{
          marginBottom: "16px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
        size="small"
      >
        <Row justify="space-between">
          <Col span={8}>
            <Input
              placeholder={`Tìm kiếm mã bản ghi hoặc dữ liệu...`}
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Card
        variant="borderless"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}
      >
        <Table
          dataSource={records}
          columns={columns}
          rowKey="id"
          loading={isLoadingRecords}
          onChange={handleTableChange}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: meta?.total || 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total) => `Tổng số ${total} bản ghi`,
          }}
        />
      </Card>

      {/* DRAWER NHẬP LIỆU ĐỘNG (DYNAMIC FORM + WORKFLOW TIMELINE + FULL SCREEN MODE) [2] */}
      <Drawer
        title={
          <Space>
            <DatabaseOutlined style={{ color: "#1677ff" }} />
            <span>
              {editingRecord ? "Cập nhật bản ghi" : "Thêm bản ghi mới"}
            </span>
          </Space>
        }
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        width={isFullScreen ? "100vw" : 850} // Thay đổi chiều rộng động dựa trên trạng thái Full Screen [2]
        destroyOnHidden
        // Tích hợp Nút Thu phóng Toàn màn hình vào góc trên bên phải của Drawer Header [2]
        extra={
          <Button
            type="text"
            icon={
              isFullScreen ? (
                <FullscreenExitOutlined style={{ fontSize: "16px" }} />
              ) : (
                <FullscreenOutlined style={{ fontSize: "16px" }} />
              )
            }
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={
              isFullScreen ? "Thu nhỏ giao diện" : "Phóng to toàn màn hình"
            }
          />
        }
      >
        <Form
          form={recordForm}
          layout="vertical"
          onFinish={handleFormSubmit}
          requiredMark={true}
        >
          {/* Tận dụng tối đa Lưới của AntD để co giãn 2 cột mượt mà khi Full Screen [2] */}
          <Row gutter={24}>
            {/* CỘT TRÁI (60%): DYNAMIC FORM RENDERER [2] */}
            <Col
              xs={24}
              lg={isFullScreen ? 16 : 14}
              style={{ borderRight: "1px solid #f0f0f0", paddingRight: "24px" }}
            >
              <Paragraph type="secondary" style={{ marginBottom: "24px" }}>
                Vui lòng điền chi tiết biểu mẫu động được đồng bộ từ cấu trúc
                Metadata.
              </Paragraph>

              {(entity?.fields || []).map((field: any) => {
                const getFieldHelperText = () => {
                  const parts = [];
                  if (field.type === "NUMBER") {
                    if (field.options?.min !== undefined)
                      parts.push(`Tối thiểu: ${field.options.min}`);
                    if (field.options?.max !== undefined)
                      parts.push(`Tối đa: ${field.options.max}`);
                  }
                  if (field.options?.formula) {
                    parts.push(
                      `Hệ thống tính toán tự động: ${field.options.formula}`,
                    );
                  }
                  return parts.length > 0
                    ? parts.join(" | ")
                    : `Kiểu nhập: ${field.type}`;
                };

                const renderFieldInput = () => {
                  switch (field.type) {
                    case "NUMBER":
                      return (
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder={
                            field.options?.min !== undefined ||
                            field.options?.max !== undefined
                              ? `Hỗ trợ giới hạn: ${field.options?.min ?? "N/A"} - ${field.options?.max ?? "N/A"}`
                              : "Nhập giá trị số..."
                          }
                          addonAfter={field.options?.prefix}
                        />
                      );
                    case "DATE":
                      return (
                        <DatePicker
                          style={{ width: "100%" }}
                          format="YYYY-MM-DD"
                          placeholder="Chọn ngày (ví dụ: 15/06/2026)..."
                        />
                      );
                    case "SELECT":
                      return (
                        <Select
                          placeholder="Click chọn các giá trị từ danh sách..."
                          mode={
                            field.options?.multiple ? "multiple" : undefined
                          }
                          style={{ width: "100%" }}
                        >
                          {(field.options?.choices || []).map((choice: any) => (
                            <Option key={choice.value} value={choice.value}>
                              {choice.label}
                            </Option>
                          ))}
                        </Select>
                      );
                    case "FORMULA":
                      return (
                        <Input
                          disabled
                          placeholder={`= ${field.options?.formula || "Chưa cấu hình công thức"}`}
                          style={{
                            background: "#fafafa",
                            fontFamily: "monospace",
                            color: "#1677ff",
                          }}
                        />
                      );
                    default:
                      return <Input placeholder={`Vui lòng nhập văn bản...`} />;
                  }
                };

                return (
                  <Form.Item
                    key={field.code}
                    name={field.code}
                    label={
                      <Space size={4}>
                        <span style={{ fontWeight: "500" }}>{field.name}</span>
                        <Text
                          type="secondary"
                          style={{ fontSize: "11px", fontWeight: "normal" }}
                        >
                          ({field.code})
                        </Text>
                      </Space>
                    }
                    required={field.isRequired}
                    tooltip={
                      field.options?.showIf
                        ? {
                            title: `Trường này tự ẩn hiện khi: ${field.options.showIf.field} ${field.options.showIf.operator} ${field.options.showIf.value}`,
                            icon: <InfoCircleOutlined />,
                          }
                        : undefined
                    }
                    extra={
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#8c8c8c",
                          marginTop: "4px",
                        }}
                      >
                        {getFieldHelperText()}
                      </div>
                    }
                  >
                    {renderFieldInput()}
                  </Form.Item>
                );
              })}
            </Col>

            {/* CỘT PHẢI (40%): SƠ ĐỒ TIẾN TRÌNH LUỒNG PHÊ DUYỆT ĐỘNG (WORKFLOW VIEW) */}
            <Col xs={24} lg={isFullScreen ? 8 : 10}>
              <div
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <NodeIndexOutlined
                  style={{ color: "#1677ff", fontSize: "16px" }}
                />
                <Text strong style={{ fontSize: "14px" }}>
                  Luồng phê duyệt biểu mẫu
                </Text>
              </div>

              <Card
                variant="outlined"
                style={{
                  background: "#fafafa",
                  borderRadius: "8px",
                  maxHeight: "calc(100vh - 220px)",
                  overflowY: "auto",
                }}
                size="small"
              >
                {stepTimelineItems.length > 0 ? (
                  <div style={{ padding: "8px" }}>
                    <div style={{ marginBottom: "16px" }}>
                      <Text type="secondary" style={{ fontSize: "11px" }}>
                        Bản đồ luồng:{" "}
                        <strong style={{ color: "#52c41a" }}>
                          v{activeVersion?.version} ({activeVersion?.status})
                        </strong>
                      </Text>
                    </div>
                    <Steps
                      direction="vertical"
                      size="small"
                      current={0}
                      items={stepTimelineItems}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <Text type="secondary" style={{ fontSize: "12px" }}>
                          Thực thể này chưa được thiết lập luồng phê duyệt
                          Pipeline.
                        </Text>
                      }
                    />
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          <Divider style={{ margin: "16px 0" }} />
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsDrawerOpen(false)}>Hủy bỏ</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isCreating || isUpdating}
              >
                {editingRecord ? "Lưu cập nhật" : "Tạo bản ghi"}
              </Button>
            </Space>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}
