// File: src/app/metadata/[id]/fields/components/DragDropCanvas.tsx
"use client";

import React from "react";
import {
  Card,
  Space,
  Typography,
  Tag,
  Empty,
  Button,
  Radio,
  Row,
  Col,
  Input,
  InputNumber,
  Select,
  DatePicker,
  TimePicker,
  Checkbox,
  Switch,
  Upload,
  Table,
  Spin,
  App,
  Popconfirm,
} from "antd";
import {
  CheckCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  FormOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  UploadOutlined,
  PictureOutlined,
  CalculatorOutlined,
  TableOutlined,
  PlusOutlined,
  NumberOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
} from "@ant-design/icons";
import { Field } from "@/hooks/useFields";
import { useUpdateStep, WorkflowStep } from "@/hooks/useWorkflows";

const { Text } = Typography;

interface DragDropCanvasProps {
  fields: Field[];
  isLoading: boolean;
  selectedField: Field | null;
  setSelectedField: (field: Field | null) => void;
  activeStep: WorkflowStep | null;
  onEditClick: (field: Field) => void;
  onDeleteClick: (field: Field) => void;
  onReorderFields?: (draggedId: number, targetId: number) => void;
  onDropBlock?: (type: string, targetFieldId?: number) => void;
}

export default function DragDropCanvas({
  fields,
  isLoading,
  selectedField,
  setSelectedField,
  activeStep,
  onEditClick,
  onDeleteClick,
  onReorderFields,
  onDropBlock,
}: DragDropCanvasProps) {
  const { message } = App.useApp();
  const updateStepMutation = useUpdateStep();

  // --- QUẢN LÝ KÉO THẢ SẮP XẾP ---
  const [draggedId, setDraggedId] = React.useState<number | null>(null);
  const [dragOverId, setDragOverId] = React.useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);

    const blockType = e.dataTransfer.getData("text/plain");
    if (blockType && draggedId === null) {
      // Thả khối từ Thư viện vào vị trí trường cụ thể
      if (onDropBlock) {
        onDropBlock(blockType, targetId);
      }
    } else if (draggedId !== null && draggedId !== targetId && onReorderFields) {
      // Kéo thả sắp xếp lại
      onReorderFields(draggedId, targetId);
    }
    setDraggedId(null);
  };

  // Đổi quyền trực tiếp lưu thẳng vào Database theo thời gian thực [1]
  const handlePermissionChange = (
    fieldCode: string,
    value: "WRITE" | "READ" | "HIDDEN",
  ) => {
    if (!activeStep) return;

    const updatedPermissions = {
      ...(activeStep.permissions || {}),
      [fieldCode]: value,
    };

    updateStepMutation.mutate(
      {
        id: activeStep.id,
        versionId: activeStep.versionId,
        payload: { permissions: updatedPermissions },
      },
      {
        onSuccess: () => {
          message.success(
            `Đã lưu phân quyền trường "${fieldCode}" là "${value}" thành công!`,
          );
        },
        onError: (err: any) => {
          const errMsg =
            err?.response?.data?.message ||
            "Không thể lưu phân quyền lên máy chủ.";
          message.error(errMsg);
        },
      },
    );
  };

  const renderInputPreview = (field: Field) => {
    const placeholder = field.config?.options?.placeholder || "Nhập dữ liệu...";
    const choices = field.config?.options?.choices || [];
    const selectOptions = choices.map((c: any) => ({ value: c, label: c }));

    switch (field.type) {
      // --- VĂN BẢN --- [1]
      case "EMAIL":
        return (
          <Input
            prefix={<MailOutlined />}
            placeholder={placeholder || "username@bos.com"}
            disabled
          />
        );
      case "PHONE":
        return (
          <Input
            prefix={<PhoneOutlined />}
            placeholder={placeholder || "09XXXXXXXX"}
            disabled
          />
        );
      case "TEXTAREA":
        return <Input.TextArea placeholder={placeholder} rows={3} disabled />;

      // --- SỐ LIỆU --- [1]
      case "NUMBER":
        return (
          <InputNumber
            placeholder={placeholder}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "DECIMAL":
        return (
          <InputNumber
            decimalSeparator="."
            placeholder={placeholder || "0.00"}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "CURRENCY":
        const currencyPrefix = field.config?.options?.prefix || "₫";
        return (
          <InputNumber
            prefix={currencyPrefix}
            placeholder={placeholder || "0"}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "PERCENTAGE":
        return (
          <InputNumber
            suffix="%"
            placeholder={placeholder || "0"}
            style={{ width: "100%" }}
            disabled
          />
        );

      // --- THỜI GIAN --- [1]
      case "DATE":
        return (
          <DatePicker
            placeholder={placeholder}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "TIME":
        return (
          <TimePicker
            placeholder={placeholder}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "DATETIME":
        return (
          <DatePicker
            showTime
            placeholder={placeholder}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "MONTH_YEAR":
        return (
          <DatePicker
            picker="month"
            placeholder={placeholder}
            style={{ width: "100%" }}
            disabled
          />
        );

      // --- LỰA CHỌN --- [1]
      case "SELECT":
        return (
          <Select
            placeholder={placeholder}
            style={{ width: "100%" }}
            options={selectOptions}
            disabled
          />
        );
      case "MULTI_SELECT":
        return (
          <Select
            mode="multiple"
            placeholder={placeholder}
            style={{ width: "100%" }}
            options={selectOptions}
            disabled
          />
        );
      case "CHECKBOX":
        return <Switch checkedChildren="ON" unCheckedChildren="OFF" disabled />;

      // --- TỔ CHỨC --- [1]
      case "USER_REF":
        return (
          <Select
            placeholder="[Chọn thành viên trong hệ thống...]"
            suffixIcon={<UserOutlined />}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "DEPT_REF":
        return (
          <Select
            placeholder="[Chọn phòng ban trực thuộc...]"
            suffixIcon={<PartitionOutlined />}
            style={{ width: "100%" }}
            disabled
          />
        );
      case "ROLE_REF":
        return (
          <Select
            placeholder="[Chọn vai trò phân quyền...]"
            suffixIcon={<SafetyCertificateOutlined />}
            style={{ width: "100%" }}
            disabled
          />
        );

      // --- KẾT NỐI --- [1]
      case "LOOKUP":
        return (
          <Select
            placeholder={`[Liên kết tới thực thể ID: ${field.config?.options?.lookupEntityId || "id"}]`}
            suffixIcon={<LinkOutlined />}
            style={{ width: "100%" }}
            disabled
          />
        );

      // --- TỆP TIN --- [1]
      case "FILE":
        return (
          <Upload disabled>
            <Button icon={<UploadOutlined />}>Đính kèm tài liệu</Button>
          </Upload>
        );
      case "IMAGE":
        return (
          <Upload listType="picture-card" disabled>
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>Tải ảnh</div>
            </div>
          </Upload>
        );

      // --- NÂNG CAO --- [1]
      case "FORMULA":
        return (
          <div
            style={{
              padding: "8px 12px",
              background: "#e6f7ff",
              border: "1px dashed #1890ff",
              borderRadius: "6px",
            }}
          >
            <CalculatorOutlined style={{ color: "#1890ff" }} />{" "}
            <Text type="secondary">
              Tự động tính:{" "}
              {field.config?.options?.formula || "[Chưa lập công thức]"}
            </Text>
          </div>
        );
      case "TABLE":
        const columns = field.config?.options?.columns || [];
        const tableColumns = columns.map((col: any) => ({
          title: (
            <Space size={4}>
              {col.type === "TEXT" && <FileTextOutlined style={{ color: "#1890ff", fontSize: "12px" }} />}
              {col.type === "NUMBER" && <NumberOutlined style={{ color: "#52c41a", fontSize: "12px" }} />}
              {col.type === "DATE" && <CalendarOutlined style={{ color: "#fa8c16", fontSize: "12px" }} />}
              {col.type === "SELECT" && <UnorderedListOutlined style={{ color: "#722ed1", fontSize: "12px" }} />}
              {col.type === "CHECKBOX" && <CheckCircleOutlined style={{ color: "#eb2f96", fontSize: "12px" }} />}
              {col.type === "STT" && <OrderedListOutlined style={{ color: "#13c2c2", fontSize: "12px" }} />}
              {col.type === "FORMULA" && <CalculatorOutlined style={{ color: "#fa541c", fontSize: "12px" }} />}
              <span style={{ fontWeight: 600, fontSize: "13px" }}>{col.name}</span>
              {col.isRequired && <span style={{ color: "#ff4d4f" }}>*</span>}
            </Space>
          ),
          dataIndex: col.code,
          key: col.code,
          render: (value: any, record: any, index: number) => {
            if (col.type === "STT") {
              return <span style={{ fontWeight: "bold", color: "#595959" }}>{index + 1}</span>;
            }
            if (col.type === "FORMULA") {
              return (
                <div
                  style={{
                    padding: "4px 8px",
                    background: "#fffbe6",
                    border: "1px dashed #ffe58f",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "#d46b08",
                    display: "inline-block",
                  }}
                >
                  <CalculatorOutlined /> {col.formula || "fx"}
                </div>
              );
            }
            if (col.type === "CHECKBOX") {
              return <Switch size="small" checked disabled />;
            }
            if (col.type === "SELECT") {
              return (
                <Select
                  size="small"
                  style={{ width: "100%", minWidth: "90px" }}
                  placeholder="Chọn..."
                  disabled
                />
              );
            }
            if (col.type === "DATE") {
              return (
                <DatePicker
                  size="small"
                  style={{ width: "100%", minWidth: "100px" }}
                  placeholder="Chọn ngày..."
                  disabled
                />
              );
            }
            if (col.type === "NUMBER") {
              return (
                <InputNumber
                  size="small"
                  style={{ width: "100%", minWidth: "80px" }}
                  placeholder="Nhập số..."
                  disabled
                />
              );
            }
            return (
              <Input
                size="small"
                style={{ width: "100%", minWidth: "90px" }}
                placeholder="Nhập chữ..."
                disabled
              />
            );
          },
        }));
        return (
          <div
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#ffffff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
            }}
          >
            <Table
              size="small"
              pagination={false}
              columns={
                tableColumns.length > 0
                  ? tableColumns
                  : [{ title: "Lưới bảng con (Hãy thêm cột...)", dataIndex: "empty", render: () => <span style={{ color: "#bfbfbf" }}>Chưa cấu hình cột</span> }]
              }
              dataSource={
                tableColumns.length > 0
                  ? [
                      { key: "1" },
                      { key: "2" },
                    ]
                  : []
              }
              locale={{ emptyText: "Chưa có cột nào được thiết lập. Hãy chỉnh sửa trường để thêm các cột." }}
              summary={() => {
                if (tableColumns.length === 0) return null;
                const hasSummary = columns.some((col: any) => col.summaryType && col.summaryType !== "NONE");
                if (!hasSummary) return null;

                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row style={{ background: "#fafafa" }}>
                      {columns.map((col: any, idx: number) => {
                        let summaryText = "";
                        if (col.summaryType === "SUM") {
                          summaryText = "Σ Tổng: 150";
                        } else if (col.summaryType === "AVG") {
                          summaryText = "μ TB: 75";
                        } else if (col.summaryType === "MIN") {
                          summaryText = "Min: 50";
                        } else if (col.summaryType === "MAX") {
                          summaryText = "Max: 100";
                        }

                        return (
                          <Table.Summary.Cell index={idx} key={col.code}>
                            <span style={{ color: "#1890ff", fontSize: "11px", fontWeight: "bold" }}>
                              {summaryText}
                            </span>
                          </Table.Summary.Cell>
                        );
                      })}
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
            {tableColumns.length > 0 && (
              <div
                style={{
                  padding: "8px",
                  borderTop: "1px solid #f0f0f0",
                  background: "#fafafa",
                  textAlign: "left",
                }}
              >
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  disabled
                  block
                >
                  Thêm dòng mới
                </Button>
              </div>
            )}
          </div>
        );


      case "TEXT":
      default:
        return <Input placeholder={placeholder} disabled />;
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "EMAIL":
        return <MailOutlined style={{ color: "#1890ff" }} />;
      case "PHONE":
        return <PhoneOutlined style={{ color: "#1890ff" }} />;
      case "NUMBER":
      case "DECIMAL":
      case "CURRENCY":
      case "PERCENTAGE":
        return <NumberOutlined style={{ color: "#52c41a" }} />;
      case "DATE":
      case "DATETIME":
      case "MONTH_YEAR":
        return <CalendarOutlined style={{ color: "#fa8c16" }} />;
      case "TIME":
        return <ClockCircleOutlined style={{ color: "#fa8c16" }} />;
      case "SELECT":
      case "MULTI_SELECT":
        return <UnorderedListOutlined style={{ color: "#722ed1" }} />;
      case "USER_REF":
        return <UserOutlined style={{ color: "#eb2f96" }} />;
      case "DEPT_REF":
        return <PartitionOutlined style={{ color: "#eb2f96" }} />;
      case "ROLE_REF":
        return <SafetyCertificateOutlined style={{ color: "#eb2f96" }} />;
      case "LOOKUP":
        return <LinkOutlined style={{ color: "#fa143c" }} />;
      case "FILE":
        return <UploadOutlined style={{ color: "#13c2c2" }} />;
      case "IMAGE":
        return <PictureOutlined style={{ color: "#13c2c2" }} />;
      case "FORMULA":
        return <CalculatorOutlined style={{ color: "#fa541c" }} />;
      case "TABLE":
        return <TableOutlined style={{ color: "#2f54eb" }} />;
      default:
        return <FileTextOutlined style={{ color: "#1890ff" }} />;
    }
  };

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#52c41a" }} />
          <Text strong>Form Canvas Preview (Vùng Thả & Sắp xếp)</Text>
        </Space>
      }
      className="shadow-sm h-full"
      styles={{
        body: {
          padding: "24px",
          backgroundColor: "#fafafa",
          minHeight: "620px",
        },
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const blockType = e.dataTransfer.getData("text/plain");
        if (blockType && draggedId === null) {
          // Thả vào khoảng trống của Canvas
          if (onDropBlock) {
            onDropBlock(blockType);
          }
        }
      }}
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spin />
        </div>
      ) : fields.length > 0 ? (
        <div className="flex flex-col gap-4">
          {[...fields]
            .sort(
              (a, b) =>
                (a.config?.orderIndex || 0) - (b.config?.orderIndex || 0),
            )
            .map((field) => {
              const isSelected = selectedField?.id === field.id;
              const activePermission = activeStep
                ? activeStep.permissions?.[field.code] || "WRITE"
                : null;

              return (
                <Card
                  key={field.id}
                  size="small"
                  bordered={false}
                  className={`shadow-sm group bg-white border ${isSelected ? "border-blue-500" : "border-gray-100 hover:border-blue-300"}`}
                  draggable={!activeStep}
                  onDragStart={(e) => handleDragStart(e, field.id)}
                  onDragOver={(e) => handleDragOver(e, field.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, field.id)}
                  style={{
                    borderRadius: "8px",
                    transition: "all 0.2s",
                    cursor: activeStep ? "pointer" : "grab",
                    opacity: draggedId === field.id ? 0.4 : 1,
                    border: dragOverId === field.id
                      ? "2px dashed #1890ff"
                      : isSelected
                      ? "1px solid #0050b3"
                      : "1px solid #f0f0f0",
                    backgroundColor: dragOverId === field.id ? "#e6f7ff" : "white",
                  }}
                  onClick={() => setSelectedField(field)}
                >
                  <Row align="middle" gutter={16}>
                    <Col span={activeStep ? 14 : 18}>
                      <Space direction="vertical" className="w-full" size={4}>
                        <div>
                          {getFieldIcon(field.type)}
                          <Text
                            strong
                            className="ml-2"
                            style={{ fontSize: "14px" }}
                          >
                            {field.name}{" "}
                            {field.config?.isRequired && <Text type="danger">*</Text>}
                          </Text>
                          <Tag color="blue" style={{ marginLeft: "12px" }}>
                            {field.code}
                          </Tag>
                          <Tag color="purple">{field.type}</Tag>
                        </div>
                        {renderInputPreview(field)}

                        {/* Biểu thị điều kiện hiển thị showIf & requiredIf */}
                        {(field.config?.options?.showIf || field.config?.options?.requiredIf) && (
                          <div style={{ marginTop: "6px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {field.config.options.showIf?.rules?.length > 0 && (
                              <Tag color="cyan" icon={<EyeOutlined />} style={{ fontSize: "11px" }}>
                                showIf: {field.config.options.showIf.logicalOperator || "AND"} (
                                {field.config.options.showIf.rules.map((r: any, idx: number) => (
                                  <span key={idx}>
                                    {idx > 0 ? ` ${field.config.options.showIf.logicalOperator || "AND"} ` : ""}
                                    [{r.fieldCode}] {r.operator} {r.operator !== "IS_EMPTY" && r.operator !== "IS_NOT_EMPTY" ? `'${r.value}'` : ""}
                                  </span>
                                ))}
                                )
                              </Tag>
                            )}
                            {field.config.options.requiredIf?.rules?.length > 0 && (
                              <Tag color="warning" icon={<SafetyCertificateOutlined />} style={{ fontSize: "11px" }}>
                                requiredIf: {field.config.options.requiredIf.logicalOperator || "AND"} (
                                {field.config.options.requiredIf.rules.map((r: any, idx: number) => (
                                  <span key={idx}>
                                    {idx > 0 ? ` ${field.config.options.requiredIf.logicalOperator || "AND"} ` : ""}
                                    [{r.fieldCode}] {r.operator} {r.operator !== "IS_EMPTY" && r.operator !== "IS_NOT_EMPTY" ? `'${r.value}'` : ""}
                                  </span>
                                ))}
                                )
                              </Tag>
                            )}
                          </div>
                        )}
                      </Space>
                    </Col>

                    {/* Điều phối phân quyền động */}
                    {activeStep && (
                      <Col span={6}>
                        <div
                          style={{
                            borderLeft: "1px solid #f0f0f0",
                            paddingLeft: "16px",
                          }}
                        >
                          <div style={{ marginBottom: "6px" }}>
                            <Text type="secondary" style={{ fontSize: "11px" }}>
                              Quyền tại bước duyệt:
                            </Text>
                          </div>
                          <Radio.Group
                            size="small"
                            value={activePermission}
                            disabled={updateStepMutation.isPending}
                            onChange={(e) =>
                              handlePermissionChange(field.code, e.target.value)
                            }
                          >
                            <Radio.Button value="WRITE" title="Cho phép Sửa">
                              <FormOutlined style={{ color: "#52c41a" }} />
                            </Radio.Button>
                            <Radio.Button
                              value="READ"
                              title="Chỉ xem (Readonly)"
                            >
                              <EyeOutlined style={{ color: "#1890ff" }} />
                            </Radio.Button>
                            <Radio.Button value="HIDDEN" title="Ẩn hoàn toàn">
                              <EyeInvisibleOutlined
                                style={{ color: "#ff4d4f" }}
                              />
                            </Radio.Button>
                          </Radio.Group>
                        </div>
                      </Col>
                    )}

                    <Col span={activeStep ? 4 : 6} className="text-right">
                      <Space className="opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          size="small"
                          icon={<EditOutlined style={{ color: "#fa8c16" }} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick(field);
                          }}
                        />

                        {/* THÊM KHAI BÁO IMPORT POPCONFIRM SỬA TRIỆT ĐỂ LỖI REFERENCEERROR */}
                        <Popconfirm
                          title="Xóa trường?"
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            onDeleteClick(field);
                          }}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>
                      </Space>
                    </Col>
                  </Row>
                </Card>
              );
            })}
        </div>
      ) : (
        <Empty description="Form Canvas hiện đang trống. Hãy click vào các khối kiểu dữ liệu ở Toolbar bên phải để bắt đầu thiết kế." />
      )}
    </Card>
  );
}
