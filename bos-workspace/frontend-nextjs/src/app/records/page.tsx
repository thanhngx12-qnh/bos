"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
  Breadcrumb,
  Space,
  Button,
  Spin,
  Typography,
  Row,
  Col,
  Table,
  Tag,
  Input,
  Select,
  Empty,
  Tooltip,
  Card,
  Statistic,
  message,
  Result,
  DatePicker,
  Menu,
  Skeleton,
  Checkbox,
  Popover,
} from "antd";
import dayjs from "dayjs";
import {
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  FormOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FilterOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  DownloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEntities, Entity } from "@/hooks/useEntities";
import { useRecords, useRecordDetail, RecordData } from "@/hooks/useRecords";
import { useFields } from "@/hooks/useFields";
import { api } from "@/lib/axios";
import { useMyTasks } from "@/hooks/useTasks";
import RecordSubmitModal from "./components/RecordSubmitModal";
import RecordDetailDrawer from "./components/RecordDetailDrawer";
import AppShell, { useAppAuth } from "@/components/AppShell";

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: "Nháp", color: "default", icon: <FileTextOutlined /> },
  IN_PROGRESS: { label: "Đang xử lý", color: "processing", icon: <SyncOutlined spin /> },
  APPROVED: { label: "Đã duyệt", color: "success", icon: <CheckCircleOutlined /> },
  COMPLETED: { label: "Đã duyệt", color: "success", icon: <CheckCircleOutlined /> },
  REJECTED: { label: "Từ chối", color: "error", icon: <CloseCircleOutlined /> },
  PENDING: { label: "Chờ duyệt", color: "warning", icon: <ClockCircleOutlined /> },
};

const ResizableTitle = (props: any) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <th
      {...restProps}
      style={{ ...restProps.style, position: 'relative' }}
    >
      {restProps.children}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '10px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 1,
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX;
          const startWidth = width;
          const doDrag = (moveEvent: MouseEvent) => {
            const nextWidth = startWidth + (moveEvent.clientX - startX);
            onResize(nextWidth > 50 ? nextWidth : 50);
          };
          const stopDrag = () => {
            document.removeEventListener('mousemove', doDrag);
            document.removeEventListener('mouseup', stopDrag);
          };
          document.addEventListener('mousemove', doDrag);
          document.addEventListener('mouseup', stopDrag);
        }}
      />
    </th>
  );
};

function RecordsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSuperAdmin, userPermissions, permissionsLoaded } = useAppAuth();

  // State quản lý entity được chọn
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // States cho sắp xếp động và bộ lọc nâng cao theo từng trường
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [customFilters, setCustomFilters] = useState<Record<string, any>>({});
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Modal/Drawer state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RecordData | null>(null);
  const [editingRecord, setEditingRecord] = useState<RecordData | null>(null);

  // States for column visibility & column resizes
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  // Lấy entityId từ URL param nếu có
  useEffect(() => {
    const eid = searchParams.get("entityId");
    if (eid) setSelectedEntityId(Number(eid));
  }, [searchParams]);

  // Lấy recordId từ URL param để mở trực tiếp chi tiết hồ sơ
  const urlRecordId = searchParams.get("recordId");
  const recordDetailQuery = useRecordDetail(urlRecordId ? Number(urlRecordId) : null);

  useEffect(() => {
    if (recordDetailQuery.data) {
      setSelectedEntityId(recordDetailQuery.data.entityId);
      setDetailRecord(recordDetailQuery.data);
    }
  }, [recordDetailQuery.data]);

  // Data
  const { data: entitiesData, isLoading: isEntitiesLoading } = useEntities(1, 100);
  const entities = entitiesData?.data || [];

  // Tự động chọn biểu mẫu đầu tiên khi mới tải trang nếu chưa có lựa chọn
  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      const eid = searchParams.get("entityId");
      if (eid) {
        setSelectedEntityId(Number(eid));
      } else {
        setSelectedEntityId(entities[0].id);
      }
    }
  }, [entities, selectedEntityId, searchParams]);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedEntityId) || null,
    [entities, selectedEntityId]
  );

  // Tải các trường động của biểu mẫu đang chọn
  const { data: fields = [] } = useFields(selectedEntityId);

  // Gộp bộ lọc trạng thái và các bộ lọc động theo các trường custom
  const filtersStr = useMemo(() => {
    const activeFilters = { ...customFilters };
    if (statusFilter) {
      activeFilters.status = statusFilter;
    }
    return Object.keys(activeFilters).length > 0 ? JSON.stringify(activeFilters) : "";
  }, [customFilters, statusFilter]);

  const {
    data: recordsData,
    isLoading: isRecordsLoading,
    refetch: refetchRecords,
  } = useRecords(selectedEntityId, page, 10, searchQuery, filtersStr, sortBy, sortOrder);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    if (!selectedEntityId || !selectedEntity) return;
    setIsExporting(true);
    try {
      const { data } = await api.get("/api/v1/records", {
        params: {
          entityId: selectedEntityId,
          page: 1,
          limit: 1000,
          sortBy: "id",
          sortOrder: "desc",
          searchQuery: searchQuery || undefined,
          filters: filtersStr || undefined,
        },
      });

      const recordsToExport = data.data || [];
      if (recordsToExport.length === 0) {
        message.warning("Không có hồ sơ nào để xuất.");
        setIsExporting(false);
        return;
      }

      const baseHeaders = ["Tiêu đề", "Mã số OPS", "Trạng thái", "Ngày tạo"];
      const dynamicHeaders = fields.map((f: any) => f.name);
      const csvHeaders = [...baseHeaders, ...dynamicHeaders];

      const csvRows = [
        csvHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(",")
      ];

      for (const record of recordsToExport) {
        const rowData = [
          record.title || "",
          record.businessCode || "",
          record.status === "APPROVED" ? "Đã duyệt" : record.status === "REJECTED" ? "Từ chối" : "Chờ duyệt",
          dayjs(record.createdAt).format("DD/MM/YYYY HH:mm"),
        ];

        for (const field of fields) {
          const val = record.data?.[field.code];
          let valStr = "";
          if (val !== undefined && val !== null) {
            if (typeof val === "object") {
              valStr = JSON.stringify(val);
            } else {
              valStr = String(val);
            }
          }
          rowData.push(valStr);
        }

        csvRows.push(rowData.map(v => `"${v.replace(/"/g, '""')}"`).join(","));
      }

      const csvString = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${selectedEntity.name.replace(/\s+/g, "_")}_Export_${dayjs().format("YYYYMMDD_HHmmss")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("Xuất file CSV thành công!");
    } catch (err: any) {
      console.error(err);
      message.error("Lỗi xuất file: " + (err.message || "Đã xảy ra lỗi."));
    } finally {
      setIsExporting(false);
    }
  };

  const { data: tasksData } = useMyTasks("PENDING", 1, 5);

  // Tổng hợp thống kê
  const records = recordsData?.data || [];
  const totalRecords = recordsData?.total || 0;
  const statsApproved = records.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length;
  const statsPending = records.filter((r) => r.status === "IN_PROGRESS" || r.status === "PENDING").length;
  const statsRejected = records.filter((r) => r.status === "REJECTED").length;

  const allAvailableColumns = useMemo(() => {
    const list = [
      { key: "businessCode", label: "Mã Hồ sơ" },
      { key: "title", label: "Tiêu đề Hồ sơ" },
    ];
    fields
      .filter((f) => f.type !== "TABLE" && f.type !== "FILE" && f.type !== "IMAGE")
      .forEach((field) => {
        list.push({ key: field.code, label: field.name });
      });
    list.push({ key: "status", label: "Trạng thái" });
    list.push({ key: "createdAt", label: "Ngày nộp" });
    return list;
  }, [fields]);

  useEffect(() => {
    if (allAvailableColumns.length > 0) {
      setVisibleColumns(allAvailableColumns.map(col => col.key));
    }
  }, [allAvailableColumns]);

  const components = useMemo(() => ({
    header: {
      cell: ResizableTitle,
    },
  }), []);

  // Tạo cấu trúc cột động dựa trên thiết kế biểu mẫu (Metadata Entity Fields)
  const columns = useMemo(() => {
    const baseColumns = [
      {
        title: "Mã Hồ sơ",
        dataIndex: "businessCode",
        key: "businessCode",
        width: columnWidths["businessCode"] || 140,
        sorter: true,
        sortOrder: (sortBy === "businessCode" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (code: string) => (
          <Tag color="blue" style={{ fontWeight: 600, fontSize: 13 }}>{code}</Tag>
        ),
      },
      {
        title: "Tiêu đề Hồ sơ",
        dataIndex: "title",
        key: "title",
        width: columnWidths["title"] || 250,
        ellipsis: true,
        sorter: true,
        sortOrder: (sortBy === "title" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (title: string, record: RecordData) => (
          <Text strong style={{ cursor: "pointer" }} onClick={() => setDetailRecord(record)}>
            {title || <Text type="secondary" italic>(Chưa có tiêu đề)</Text>}
          </Text>
        ),
      },
    ];

    // Tạo các cột động cho các trường custom (không hiển thị các trường phức tạp như TABLE hoặc FILE để giữ bảng gọn gàng)
    const customColumns = fields
      .filter((f) => f.type !== "TABLE" && f.type !== "FILE" && f.type !== "IMAGE")
      .map((field) => ({
        title: field.name,
        dataIndex: ["data", field.code],
        key: field.code,
        width: columnWidths[field.code] || 150,
        sorter: true,
        sortOrder: (sortBy === field.code ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (val: any) => {
          if (val === undefined || val === null || val === "") return "-";
          if (field.type === "CHECKBOX") {
            return val === true || val === "true" ? "☑ Có" : "☐ Không";
          }
          if (field.type === "DATE") {
            return new Date(val).toLocaleDateString("vi-VN");
          }
          if (field.type === "DATETIME") {
            return new Date(val).toLocaleString("vi-VN");
          }
          if (field.type === "CURRENCY") {
            return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
          }
          if (Array.isArray(val)) {
            return val.join(", ");
          }
          if (typeof val === "object") {
            return JSON.stringify(val);
          }
          return String(val);
        },
      }));

    const endColumns = [
      {
        title: "Trạng thái",
        dataIndex: "status",
        key: "status",
        width: columnWidths["status"] || 140,
        sorter: true,
        sortOrder: (sortBy === "status" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (status: string) => {
          const s = STATUS_MAP[status] || { label: status, color: "default", icon: null };
          return (
            <Tag icon={s.icon} color={s.color} style={{ borderRadius: 12, padding: "2px 10px" }}>
              {s.label}
            </Tag>
          );
        },
      },
      {
        title: "Ngày nộp",
        dataIndex: "createdAt",
        key: "createdAt",
        width: columnWidths["createdAt"] || 160,
        sorter: true,
        sortOrder: (sortBy === "createdAt" ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (date: string) => (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {new Date(date).toLocaleString("vi-VN")}
          </Text>
        ),
      },
    ];

    const allCols = [...baseColumns, ...customColumns, ...endColumns];
    const filtered = allCols.filter(col => visibleColumns.length === 0 || visibleColumns.includes(col.key));

    filtered.push({
      title: "Hành động",
      key: "actions",
      width: columnWidths["actions"] || 120,
      align: "center" as const,
      render: (_: any, record: RecordData) => {
        const canEdit = record.status === "DRAFT" || record.status === "REJECTED";
        return (
          <Space onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => setDetailRecord(record)}
                style={{ color: "#1890ff" }}
              />
            </Tooltip>
            {canEdit && (
              <Tooltip title="Sửa & Trình ký lại">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setEditingRecord(record);
                    setSubmitModalOpen(true);
                  }}
                  style={{ color: "#faad14" }}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    } as any);

    return filtered.map((col: any) => ({
      ...col,
      onHeaderCell: (column: any) => ({
        width: column.width,
        onResize: (width: number) => {
          setColumnWidths(prev => ({ ...prev, [column.key]: width }));
        },
      }),
    }));
  }, [fields, sortBy, sortOrder, visibleColumns, columnWidths]);


  if (permissionsLoaded && !isSuperAdmin && !userPermissions.records?.includes("READ")) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập Hồ sơ & Biểu mẫu."
          extra={<Button type="primary" onClick={() => router.push("/")}>Quay lại Trang chủ</Button>}
        />
      </div>
    );
  }

  const columnToggleContent = (
    <div style={{ padding: "4px 0" }}>
      <div style={{ fontWeight: 600, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #f0f0f0" }}>
        Ẩn / Hiện Cột
      </div>
      <Space direction="vertical" style={{ width: "100%" }}>
        {allAvailableColumns.map((col) => (
          <Checkbox
            key={col.key}
            checked={visibleColumns.includes(col.key)}
            onChange={(e) => {
              const checked = e.target.checked;
              setVisibleColumns(prev =>
                checked ? [...prev, col.key] : prev.filter(k => k !== col.key)
              );
            }}
          >
            {col.label}
          </Checkbox>
        ))}
      </Space>
    </div>
  );

  return (
    <div className="bos-page-content">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* Page Header */}
        <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100">
          <div>
            <Breadcrumb
              items={[
                { title: "Trang chủ" },
                { title: "Hồ sơ & Biểu mẫu" },
                ...(selectedEntity ? [{ title: selectedEntity.name }] : []),
              ]}
            />
            <Title level={2} style={{ margin: "8px 0 0 0" }}>
              {selectedEntity ? selectedEntity.name : "Quản lý Hồ sơ"}
            </Title>
            <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
              {selectedEntity
                ? `Danh sách và quản lý hồ sơ cho biểu mẫu: ${selectedEntity.code}`
                : "Chọn một biểu mẫu bên trái để xem và nộp hồ sơ."}
            </Paragraph>
          </div>
          {selectedEntity && (
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingRecord(null);
                setSubmitModalOpen(true);
              }}
              style={{
                background: "linear-gradient(135deg, #0050b3 0%, #1890ff 100%)",
                border: "none",
                boxShadow: "0 4px 12px rgba(0,80,179,0.3)",
              }}
            >
              Nộp hồ sơ mới
            </Button>
          )}
        </div>

        <Row gutter={[20, 20]}>
          {/* Left Panel: Entity Selector */}
          <Col xs={24} md={6}>
            <Card
              title={
                <Space>
                  <FolderOpenOutlined style={{ color: "#0050b3" }} />
                  <span>Loại Biểu mẫu</span>
                </Space>
              }
              bordered={false}
              className="shadow-sm"
              style={{ borderRadius: 8, height: "100%" }}
              bodyStyle={{ padding: "8px 0" }}
            >
              {isEntitiesLoading ? (
                <div style={{ padding: "16px" }}>
                  <Skeleton active paragraph={{ rows: 5 }} title={false} />
                </div>
              ) : entities.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: "24px 0" }}
                  description={
                    <div style={{ textAlign: "center" }}>
                      <Paragraph type="secondary" style={{ fontSize: "13px", margin: "0 0 8px 0" }}>
                        Chưa có biểu mẫu nào được tạo.
                      </Paragraph>
                      <Button
                        type="link"
                        onClick={() => router.push("/metadata")}
                        style={{ padding: 0, fontSize: "13px", fontWeight: 500 }}
                      >
                        Tạo biểu mẫu mới
                      </Button>
                    </div>
                  }
                />
              ) : (
                <Menu
                  mode="inline"
                  selectedKeys={selectedEntityId ? [String(selectedEntityId)] : []}
                  onClick={({ key }) => {
                    setSelectedEntityId(Number(key));
                    setPage(1);
                    setSearchQuery("");
                    setStatusFilter("");
                  }}
                  style={{ border: "none" }}
                  items={entities.map((e) => ({
                    key: String(e.id),
                    icon: <FormOutlined />,
                    label: (
                      <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
                        <Text strong style={{ fontSize: 13 }}>{e.name}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{e.code}</Text>
                      </Space>
                    ),
                  }))}
                />
              )}
            </Card>
          </Col>

          {/* Right Panel: Records List */}
          <Col xs={24} md={18}>
            {!selectedEntityId ? (
              <Card bordered={false} className="shadow-sm" style={{ borderRadius: 8 }}>
                <Empty
                  image={<FormOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
                  description={
                    <Space direction="vertical" size={4}>
                      <Text strong style={{ fontSize: 16, color: "#595959" }}>
                        Chọn Biểu mẫu để bắt đầu
                      </Text>
                      <Text type="secondary">
                        Chọn một loại biểu mẫu từ danh sách bên trái để xem hồ sơ và nộp mới.
                      </Text>
                    </Space>
                  }
                  style={{ padding: "60px 0" }}
                />
              </Card>
            ) : (
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                {/* Stats */}
                <Row gutter={[12, 12]}>
                  <Col xs={8}>
                    <Card
                      bordered={false}
                      className="shadow-sm"
                      style={{ borderLeft: "4px solid #1890ff", borderRadius: 8 }}
                      bodyStyle={{ padding: "12px 16px" }}
                    >
                      <Statistic
                        title={<Text type="secondary" style={{ fontSize: 12 }}>Đang xử lý</Text>}
                        value={statsPending}
                        valueStyle={{ color: "#1890ff", fontSize: 24 }}
                        prefix={<SyncOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={8}>
                    <Card
                      bordered={false}
                      className="shadow-sm"
                      style={{ borderLeft: "4px solid #52c41a", borderRadius: 8 }}
                      bodyStyle={{ padding: "12px 16px" }}
                    >
                      <Statistic
                        title={<Text type="secondary" style={{ fontSize: 12 }}>Đã phê duyệt</Text>}
                        value={statsApproved}
                        valueStyle={{ color: "#52c41a", fontSize: 24 }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={8}>
                    <Card
                      bordered={false}
                      className="shadow-sm"
                      style={{ borderLeft: "4px solid #ff4d4f", borderRadius: 8 }}
                      bodyStyle={{ padding: "12px 16px" }}
                    >
                      <Statistic
                        title={<Text type="secondary" style={{ fontSize: 12 }}>Từ chối</Text>}
                        value={statsRejected}
                        valueStyle={{ color: "#ff4d4f", fontSize: 24 }}
                        prefix={<CloseCircleOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Toolbar */}
                <Card
                  bordered={false}
                  className="shadow-sm"
                  style={{ borderRadius: 8 }}
                  bodyStyle={{ padding: "16px 24px" }}
                >
                  <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm kiếm theo mã hồ sơ, tiêu đề..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPage(1);
                        }}
                        allowClear
                        prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                        style={{ maxWidth: 360 }}
                      />
                    </Col>
                    <Col>
                      <Space>
                        <Select
                          placeholder={
                            <Space>
                              <FilterOutlined />
                              Trạng thái
                            </Space>
                          }
                          allowClear
                          value={statusFilter || undefined}
                          onChange={(val) => {
                            setStatusFilter(val || "");
                            setPage(1);
                          }}
                          style={{ width: 160 }}
                          options={[
                            { value: "DRAFT", label: "Nháp" },
                            { value: "IN_PROGRESS", label: "Đang xử lý" },
                            { value: "APPROVED", label: "Đã duyệt" },
                            { value: "REJECTED", label: "Từ chối" },
                          ]}
                        />
                        <Button
                          icon={<FilterOutlined />}
                          type={isFilterPanelOpen ? "primary" : "default"}
                          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        >
                          Bộ lọc nâng cao
                        </Button>
                        <Tooltip title="Làm mới">
                          <Button icon={<ReloadOutlined />} onClick={() => refetchRecords()} />
                        </Tooltip>
                        <Popover
                          content={columnToggleContent}
                          trigger="click"
                          placement="bottomRight"
                        >
                          <Button icon={<SettingOutlined />}>Hiển thị cột</Button>
                        </Popover>
                        <Button 
                          icon={<DownloadOutlined />} 
                          onClick={handleExportCSV} 
                          loading={isExporting}
                        >
                          Xuất dữ liệu
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => {
                            setEditingRecord(null);
                            setSubmitModalOpen(true);
                          }}
                        >
                          Nộp hồ sơ mới
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  {/* Advanced Filter Panel for Entity Custom Fields */}
                  {isFilterPanelOpen && fields.length > 0 && (
                    <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px dashed #e8e8e8" }}>
                      <Row gutter={[16, 12]}>
                        {fields
                          .filter((f) => f.type !== "TABLE" && f.type !== "FILE" && f.type !== "IMAGE")
                          .map((field) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={field.code}>
                              <div style={{ marginBottom: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{field.name}</Text>
                              </div>
                              {field.type === "CHECKBOX" ? (
                                <Select
                                  placeholder="Tất cả"
                                  allowClear
                                  style={{ width: "100%" }}
                                  value={customFilters[field.code]}
                                  onChange={(val) => {
                                    const newFilters = { ...customFilters };
                                    if (val !== undefined && val !== null) {
                                      newFilters[field.code] = val;
                                    } else {
                                      delete newFilters[field.code];
                                    }
                                    setCustomFilters(newFilters);
                                    setPage(1);
                                  }}
                                  options={[
                                    { value: "true", label: "Có" },
                                    { value: "false", label: "Không" },
                                  ]}
                                />
                              ) : field.type === "SELECT" || field.type === "MULTI_SELECT" ? (
                                <Select
                                  placeholder={`Chọn ${field.name}...`}
                                  allowClear
                                  style={{ width: "100%" }}
                                  value={customFilters[field.code]}
                                  onChange={(val) => {
                                    const newFilters = { ...customFilters };
                                    if (val) {
                                      newFilters[field.code] = val;
                                    } else {
                                      delete newFilters[field.code];
                                    }
                                    setCustomFilters(newFilters);
                                    setPage(1);
                                  }}
                                  options={(field.config?.options?.choices || []).map((c: string) => ({
                                    value: c,
                                    label: c,
                                  }))}
                                />
                              ) : field.type === "DATE" || field.type === "DATETIME" ? (
                                <DatePicker
                                  placeholder={`Chọn ngày...`}
                                  style={{ width: "100%" }}
                                  value={customFilters[field.code] ? dayjs(customFilters[field.code]) : null}
                                  onChange={(date) => {
                                    const dateStr = date ? date.format("YYYY-MM-DD") : undefined;
                                    const newFilters = { ...customFilters };
                                    if (dateStr) {
                                      newFilters[field.code] = dateStr;
                                    } else {
                                      delete newFilters[field.code];
                                    }
                                    setCustomFilters(newFilters);
                                    setPage(1);
                                  }}
                                />
                              ) : (
                                <Input
                                  placeholder={`Nhập ${field.name}...`}
                                  allowClear
                                  value={customFilters[field.code] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const newFilters = { ...customFilters };
                                    if (val) {
                                      newFilters[field.code] = val;
                                    } else {
                                      delete newFilters[field.code];
                                    }
                                    setCustomFilters(newFilters);
                                    setPage(1);
                                  }}
                                />
                              )}
                            </Col>
                          ))}
                        <Col span={24} style={{ textAlign: "right", marginTop: 8 }}>
                          <Button
                            type="link"
                            danger
                            onClick={() => {
                              setCustomFilters({});
                              setPage(1);
                            }}
                          >
                            Xóa bộ lọc nâng cao
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  )}
                </Card>

                {/* Table */}
                <Card
                  bordered={false}
                  className="shadow-sm"
                  style={{ borderRadius: 8 }}
                  bodyStyle={{ padding: 0 }}
                >
                  <Table
                    dataSource={records}
                    columns={columns}
                    rowKey="id"
                    loading={isRecordsLoading}
                    components={components}
                    scroll={{ x: "max-content" }}
                    onChange={(pagination, filters, sorter: any) => {
                      if (sorter && sorter.field) {
                        const fieldCode = Array.isArray(sorter.field) ? sorter.field[1] : sorter.field;
                        setSortBy(fieldCode);
                        setSortOrder(sorter.order === "ascend" ? "asc" : "desc");
                      } else {
                        setSortBy("id");
                        setSortOrder("desc");
                      }
                    }}
                    pagination={{
                      current: page,
                      pageSize: 10,
                      total: totalRecords,
                      onChange: (p) => setPage(p),
                      showSizeChanger: false,
                      showTotal: (total) => `Tổng ${total} hồ sơ`,
                    }}
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          style={{ padding: "32px 0" }}
                          description={
                            <div style={{ textAlign: "center" }}>
                              <Paragraph type="secondary" style={{ fontSize: "14px", margin: "0 0 12px 0" }}>
                                Chưa có hồ sơ nào được ghi nhận cho loại biểu mẫu này.
                              </Paragraph>
                              <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setSubmitModalOpen(true)}
                                style={{ borderRadius: "6px" }}
                              >
                                Nộp hồ sơ mới
                              </Button>
                            </div>
                          }
                        />
                      ),
                    }}
                    onRow={(record) => ({
                      onClick: () => setDetailRecord(record),
                      style: { cursor: "pointer" },
                    })}
                    rowClassName={(_, index) =>
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }
                  />
                </Card>
              </Space>
            )}
          </Col>
        </Row>

        {/* Modal Nộp hồ sơ */}
        {selectedEntity && (
          <RecordSubmitModal
            open={submitModalOpen}
            entity={selectedEntity}
            record={editingRecord}
            onClose={() => {
              setSubmitModalOpen(false);
              setEditingRecord(null);
            }}
            onSuccess={() => {
              setSubmitModalOpen(false);
              setEditingRecord(null);
              refetchRecords();
            }}
          />
        )}

        {/* Drawer Chi tiết */}
        {detailRecord && (
          <RecordDetailDrawer
            record={detailRecord}
            open={!!detailRecord}
            onClose={() => setDetailRecord(null)}
          />
        )}
      </Space>
    </div>
  );
}

export default function RecordsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "40px", background: "#f8fafc", minHeight: "100vh" }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    }>
      <AppShell>
        <RecordsContent />
      </AppShell>
    </Suspense>
  );
}
