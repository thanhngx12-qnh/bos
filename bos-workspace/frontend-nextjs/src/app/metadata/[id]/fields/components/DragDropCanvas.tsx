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
}

export default function DragDropCanvas({
  fields,
  isLoading,
  selectedField,
  setSelectedField,
  activeStep,
  onEditClick,
  onDeleteClick,
}: DragDropCanvasProps) {
  const { message } = App.useApp();
  const updateStepMutation = useUpdateStep();

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
    const selectOptions = choices.map((c) => ({ value: c, label: c }));

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
          title: `${col.name} (${col.type})`,
          dataIndex: col.code,
          key: col.code,
        }));
        return (
          <div
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: "6px",
              overflow: "hidden",
            }}
          >
            <Table
              size="small"
              pagination={false}
              columns={
                tableColumns.length > 0
                  ? tableColumns
                  : [{ title: "Cấu hình lưới bảng con", dataIndex: "empty" }]
              }
              dataSource={[]}
              locale={{ emptyText: "Lưới bảng nhập liệu con (TABLE GRID)" }}
            />
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
                  style={{
                    borderRadius: "8px",
                    transition: "all 0.2s",
                    cursor: "pointer",
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
                            {field.config?.isRequired && <Text danger>*</Text>}
                          </Text>
                          <Tag color="blue" style={{ marginLeft: "12px" }}>
                            {field.code}
                          </Tag>
                          <Tag color="purple">{field.type}</Tag>
                        </div>
                        {renderInputPreview(field)}
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
