// File: src/app/metadata/[id]/fields/components/ToolboxAndInspector.tsx
"use client";

import React, { useEffect } from "react";
import {
  Card,
  Tabs,
  Space,
  Typography,
  Form,
  Input,
  Checkbox,
  InputNumber,
  Select,
  Button,
  Row,
  Col,
  Empty,
  Divider,
  Collapse,
} from "antd";
import {
  SettingOutlined,
  BuildOutlined,
  FileTextOutlined,
  NumberOutlined,
  UnorderedListOutlined,
  LinkOutlined,
  CalculatorOutlined,
  SaveOutlined,
  MailOutlined,
  PhoneOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PartitionOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  PictureOutlined,
  TableOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import { Field } from "@/hooks/useFields";
import { Entity } from "@/hooks/useEntities";
import FormulaBuilder from "./FormulaBuilder";

const { Text, Paragraph } = Typography;

interface ToolboxAndInspectorProps {
  fields: Field[];
  entities: Entity[];
  selectedField: Field | null;
  onAddQuickField: (type: string) => void;
  onSaveInspector: (values: any) => void;
  isSaving: boolean;
}

export default function ToolboxAndInspector({
  fields,
  entities,
  selectedField,
  onAddQuickField,
  onSaveInspector,
  isSaving,
}: ToolboxAndInspectorProps) {
  const [form] = Form.useForm();
  const watchedType = Form.useWatch("type", form);

  // Đồng bộ hóa dữ liệu từ Canvas trường được chọn lên Inspector để sửa [1]
  useEffect(() => {
    if (selectedField) {
      form.setFieldsValue({
        name: selectedField.name,
        code: selectedField.code,
        type: selectedField.type,
        isRequired: selectedField.config?.isRequired || false,
        orderIndex: selectedField.config?.orderIndex || 0,
        options: {
          placeholder: selectedField.config?.options?.placeholder || "",
          min: selectedField.config?.options?.min,
          max: selectedField.config?.options?.max,
          choices: selectedField.config?.options?.choices
            ? selectedField.config.options.choices.join(", ")
            : "",
          lookupEntityId: selectedField.config?.options?.lookupEntityId,
          displayField: selectedField.config?.options?.displayField || "",
          formula: selectedField.config?.options?.formula || "",
          minLength: selectedField.config?.options?.minLength,
          maxLength: selectedField.config?.options?.maxLength,
          regexPattern: selectedField.config?.options?.regexPattern || "",
          errorMessage: selectedField.config?.options?.errorMessage || "",
          columns: selectedField.config?.options?.columns || [],
        },
      });
    } else {
      form.resetFields();
    }
  }, [selectedField, form]);

  const handleFormulaUpdateInInspector = (newFormula: string) => {
    form.setFieldsValue({
      options: {
        ...form.getFieldValue("options"),
        formula: newFormula,
      },
    });
  };

  // Thiết lập cấu trúc mảng items chuẩn hóa thay thế cho Collapse.Panel bị deprecated [1]
  const collapseItems = [
    {
      key: "van_ban",
      label: (
        <Text strong style={{ color: "#0050b3" }}>
          Văn Bản
        </Text>
      ),
      children: (
        <Space direction="vertical" className="w-full" size="small">
          <Button
            block
            icon={<FileTextOutlined style={{ color: "#1890ff" }} />}
            onClick={() => onAddQuickField("TEXT")}
            style={{ textAlign: "left" }}
          >
            Chuỗi chữ (TEXT)
          </Button>
          <Button
            block
            icon={<MailOutlined style={{ color: "#1890ff" }} />}
            onClick={() => onAddQuickField("EMAIL")}
            style={{ textAlign: "left" }}
          >
            Thư điện tử (EMAIL)
          </Button>
          <Button
            block
            icon={<PhoneOutlined style={{ color: "#1890ff" }} />}
            onClick={() => onAddQuickField("PHONE")}
            style={{ textAlign: "left" }}
          >
            Số điện thoại (PHONE)
          </Button>
          <Button
            block
            icon={<FileTextOutlined style={{ color: "#1890ff" }} />}
            onClick={() => onAddQuickField("TEXTAREA")}
            style={{ textAlign: "left" }}
          >
            Văn bản dài (TEXTAREA)
          </Button>
        </Space>
      ),
    },
    {
      key: "so_lieu",
      label: (
        <Text strong style={{ color: "#52c41a" }}>
          Số liệu
        </Text>
      ),
      children: (
        <Space direction="vertical" className="w-full" size="small">
          <Button
            block
            icon={<NumberOutlined style={{ color: "#52c41a" }} />}
            onClick={() => onAddQuickField("NUMBER")}
            style={{ textAlign: "left" }}
          >
            Số nguyên (NUMBER)
          </Button>
          <Button
            block
            icon={<NumberOutlined style={{ color: "#52c41a" }} />}
            onClick={() => onAddQuickField("DECIMAL")}
            style={{ textAlign: "left" }}
          >
            Số thập phân (DECIMAL)
          </Button>
          <Button
            block
            icon={<NumberOutlined style={{ color: "#52c41a" }} />}
            onClick={() => onAddQuickField("CURRENCY")}
            style={{ textAlign: "left" }}
          >
            Tiền tệ (CURRENCY)
          </Button>
          <Button
            block
            icon={<NumberOutlined style={{ color: "#52c41a" }} />}
            onClick={() => onAddQuickField("PERCENTAGE")}
            style={{ textAlign: "left" }}
          >
            Phần trăm (PERCENTAGE)
          </Button>
        </Space>
      ),
    },
    {
      key: "thoi_gian",
      label: (
        <Text strong style={{ color: "#fa8c16" }}>
          Thời gian
        </Text>
      ),
      children: (
        <Space direction="vertical" className="w-full" size="small">
          <Button
            block
            icon={<CalendarOutlined style={{ color: "#fa8c16" }} />}
            onClick={() => onAddQuickField("DATE")}
            style={{ textAlign: "left" }}
          >
            Ngày (DATE)
          </Button>
          <Button
            block
            icon={<ClockCircleOutlined style={{ color: "#fa8c16" }} />}
            onClick={() => onAddQuickField("TIME")}
            style={{ textAlign: "left" }}
          >
            Giờ (TIME)
          </Button>
          <Button
            block
            icon={<CalendarOutlined style={{ color: "#fa8c16" }} />}
            onClick={() => onAddQuickField("DATETIME")}
            style={{ textAlign: "left" }}
          >
            Ngày & Giờ (DATETIME)
          </Button>
          <Button
            block
            icon={<CalendarOutlined style={{ color: "#fa8c16" }} />}
            onClick={() => onAddQuickField("MONTH_YEAR")}
            style={{ textAlign: "left" }}
          >
            Tháng / Năm (MONTH_YEAR)
          </Button>
        </Space>
      ),
    },
    {
      key: "lua_chon",
      label: (
        <Text strong style={{ color: "#722ed1" }}>
          Lựa chọn & Tổ chức
        </Text>
      ),
      children: (
        <Space direction="vertical" className="w-full" size="small">
          <Button
            block
            icon={<UnorderedListOutlined style={{ color: "#722ed1" }} />}
            onClick={() => onAddQuickField("SELECT")}
            style={{ textAlign: "left" }}
          >
            Chọn một (SELECT)
          </Button>
          <Button
            block
            icon={<UnorderedListOutlined style={{ color: "#722ed1" }} />}
            onClick={() => onAddQuickField("MULTI_SELECT")}
            style={{ textAlign: "left" }}
          >
            Chọn nhiều (MULTI_SELECT)
          </Button>
          <Button
            block
            icon={<UnorderedListOutlined style={{ color: "#722ed1" }} />}
            onClick={() => onAddQuickField("CHECKBOX")}
            style={{ textAlign: "left" }}
          >
            Đóng mở (CHECKBOX/SWITCH)
          </Button>
          <Divider style={{ margin: "4px 0" }} />
          <Button
            block
            icon={<UserOutlined style={{ color: "#eb2f96" }} />}
            onClick={() => onAddQuickField("USER_REF")}
            style={{ textAlign: "left" }}
          >
            Thành viên (USER_REF)
          </Button>
          <Button
            block
            icon={<PartitionOutlined style={{ color: "#eb2f96" }} />}
            onClick={() => onAddQuickField("DEPT_REF")}
            style={{ textAlign: "left" }}
          >
            Phòng ban (DEPT_REF)
          </Button>
          <Button
            block
            icon={<SafetyCertificateOutlined style={{ color: "#eb2f96" }} />}
            onClick={() => onAddQuickField("ROLE_REF")}
            style={{ textAlign: "left" }}
          >
            Vai trò (ROLE_REF)
          </Button>
        </Space>
      ),
    },
    {
      key: "nang_cao",
      label: (
        <Text strong style={{ color: "#fa541c" }}>
          Tệp tin & Nâng cao
        </Text>
      ),
      children: (
        <Space direction="vertical" className="w-full" size="small">
          <Button
            block
            icon={<UploadOutlined style={{ color: "#13c2c2" }} />}
            onClick={() => onAddQuickField("FILE")}
            style={{ textAlign: "left" }}
          >
            Tài liệu đính kèm (FILE)
          </Button>
          <Button
            block
            icon={<PictureOutlined style={{ color: "#13c2c2" }} />}
            onClick={() => onAddQuickField("IMAGE")}
            style={{ textAlign: "left" }}
          >
            Hình ảnh (IMAGE)
          </Button>
          <Divider style={{ margin: "4px 0" }} />
          <Button
            block
            icon={<LinkOutlined style={{ color: "#fa143c" }} />}
            onClick={() => onAddQuickField("LOOKUP")}
            style={{ textAlign: "left" }}
          >
            Liên kết chéo (LOOKUP)
          </Button>
          <Button
            block
            icon={<CalculatorOutlined style={{ color: "#fa541c" }} />}
            onClick={() => onAddQuickField("FORMULA")}
            style={{ textAlign: "left" }}
          >
            Công thức toán (FORMULA)
          </Button>
          <Button
            block
            icon={<TableOutlined style={{ color: "#2f54eb" }} />}
            onClick={() => onAddQuickField("TABLE")}
            style={{ textAlign: "left" }}
          >
            Lưới bảng con (TABLE)
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card className="shadow-sm h-full" styles={{ body: { padding: "16px" } }}>
      <Tabs
        defaultActiveKey="toolbox"
        items={[
          // I. PHÂN KHU THƯ VIỆN KHỐI 20+ KIỂU TRƯỜNG DỰNG CHUẨN V8.1 [1]
          {
            key: "toolbox",
            label: (
              <Space>
                <BuildOutlined />
                Thư viện Khối
              </Space>
            ),
            children: (
              <div style={{ marginTop: "12px" }}>
                {/* Thay thế hoàn toàn children bằng mảng items để loại bỏ warning [1] */}
                <Collapse
                  defaultActiveKey={[
                    "van_ban",
                    "so_lieu",
                    "thoi_gian",
                    "lua_chon",
                    "nang_cao",
                  ]}
                  ghost
                  expandIconPosition="end"
                  items={collapseItems}
                />
              </div>
            ),
          },
          // II. PHÂN KHU INSPECTOR THUỘC TÍNH CHI TIẾT [1]
          {
            key: "inspector",
            label: (
              <Space>
                <SettingOutlined />
                Inspector thuộc tính
              </Space>
            ),
            children: selectedField ? (
              <Form
                form={form}
                layout="vertical"
                onFinish={onSaveInspector}
                style={{ marginTop: "12px" }}
              >
                <div style={{ marginBottom: "16px" }}>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    Đang cấu hình trường:
                  </Text>
                  <div>
                    <Text strong style={{ fontSize: "15px", color: "#0050b3" }}>
                      {selectedField.name}
                    </Text>
                  </div>
                </div>

                <Form.Item
                  name="name"
                  label="Nhãn hiển thị (Label)"
                  rules={[{ required: true, message: "Nhập nhãn trường" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="code"
                  label="Mã trường (Không được sửa)"
                  extra="Mã code cứng bảo vệ toàn vẹn dữ liệu cũ."
                >
                  <Input disabled />
                </Form.Item>
                <Form.Item name="type" label="Kiểu dữ liệu trường">
                  <Input disabled />
                </Form.Item>
                <Form.Item name="orderIndex" label="Thứ tự sắp xếp">
                  <InputNumber className="w-full" />
                </Form.Item>
                <Form.Item name="isRequired" valuePropName="checked">
                  <Checkbox>Bắt buộc nhập (Required)</Checkbox>
                </Form.Item>
                <Form.Item
                  name={["options", "placeholder"]}
                  label="Gợi ý nhập liệu (Placeholder)"
                >
                  <Input />
                </Form.Item>

                {/* 1. options cho nhóm TEXT (TEXT, EMAIL, PHONE, TEXTAREA) */}
                {(watchedType === "TEXT" ||
                  watchedType === "EMAIL" ||
                  watchedType === "PHONE" ||
                  watchedType === "TEXTAREA") && (
                  <>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item
                          name={["options", "minLength"]}
                          label="Độ dài tối thiểu"
                        >
                          <InputNumber className="w-full" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={["options", "maxLength"]}
                          label="Độ dài tối đa"
                        >
                          <InputNumber className="w-full" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      name={["options", "regexPattern"]}
                      label="Biểu thức kiểm tra (Regex Pattern)"
                    >
                      <Input placeholder="Ví dụ: ^[A-Z]+$" />
                    </Form.Item>
                    <Form.Item
                      name={["options", "errorMessage"]}
                      label="Thông báo lỗi Regex"
                    >
                      <Input placeholder="Sai định dạng đầu vào" />
                    </Form.Item>
                  </>
                )}

                {/* 2. options cho nhóm Số học */}
                {(watchedType === "NUMBER" ||
                  watchedType === "DECIMAL" ||
                  watchedType === "CURRENCY" ||
                  watchedType === "PERCENTAGE") && (
                  <>
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name={["options", "min"]} label="Min">
                          <InputNumber className="w-full" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name={["options", "max"]} label="Max">
                          <InputNumber className="w-full" />
                        </Form.Item>
                      </Col>
                    </Row>
                    {watchedType === "CURRENCY" && (
                      <Form.Item
                        name={["options", "prefix"]}
                        label="Ký hiệu tiền tệ"
                      >
                        <Input placeholder="vd: $, VNĐ, €" />
                      </Form.Item>
                    )}
                  </>
                )}

                {/* 3. options cho kiểu SELECT & MULTI_SELECT */}
                {(watchedType === "SELECT" ||
                  watchedType === "MULTI_SELECT") && (
                  <Form.Item
                    name={["options", "choices"]}
                    label="Danh sách lựa chọn (Phân cách dấu phẩy)"
                    extra="Ví dụ: HARDWARE, SOFTWARE, CLOUD"
                    rules={[
                      { required: true, message: "Vui lòng nhập choices" },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                )}

                {/* 4. options cho kiểu LOOKUP */}
                {watchedType === "LOOKUP" && (
                  <>
                    <Form.Item
                      name={["options", "lookupEntityId"]}
                      label="Biểu mẫu liên kết"
                      rules={[{ required: true, message: "Chọn biểu mẫu" }]}
                    >
                      <Select
                        placeholder="Chọn..."
                        options={entities.map((e) => ({
                          value: e.id,
                          label: e.name,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      name={["options", "displayField"]}
                      label="Cột hiển thị nhãn"
                      rules={[{ required: true, message: "Nhập displayField" }]}
                    >
                      <Input placeholder="project_name" />
                    </Form.Item>
                  </>
                )}

                {/* 5. options cho kiểu FORMULA toán học chuyên biệt */}
                {watchedType === "FORMULA" && (
                  <Space
                    direction="vertical"
                    className="w-full"
                    size="middle"
                    style={{ marginBottom: "16px" }}
                  >
                    <Form.Item
                      name={["options", "formula"]}
                      label="Biểu thức Công thức"
                      rules={[
                        { required: true, message: "Vui lòng nhập công thức" },
                      ]}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Ví dụ: {so_luong} * {don_gia}"
                      />
                    </Form.Item>
                    <FormulaBuilder
                      fields={fields}
                      currentFormula={
                        form.getFieldValue(["options", "formula"]) || ""
                      }
                      onFormulaChange={handleFormulaUpdateInInspector}
                    />
                  </Space>
                )}

                {/* 6. options cấu hình Bảng con TABLE (Cực kỳ cao cấp) [1] */}
                {watchedType === "TABLE" && (
                  <Card
                    size="small"
                    title="Thiết kế Cột cho Bảng con"
                    style={{ marginBottom: "16px" }}
                    styles={{ header: { background: "#fafafa" } }}
                  >
                    <Form.List name={["options", "columns"]}>
                      {(columns, { add, remove }) => (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {columns.map(({ key, name, ...restField }) => (
                            <Card
                              size="small"
                              key={key}
                              style={{ background: "#fcfdfd" }}
                            >
                              <Space direction="vertical" className="w-full">
                                <Form.Item
                                  {...restField}
                                  name={[name, "name"]}
                                  label="Tên cột"
                                  rules={[
                                    { required: true, message: "Nhập tên" },
                                  ]}
                                  style={{ marginBottom: 4 }}
                                >
                                  <Input size="small" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, "code"]}
                                  label="Mã cột"
                                  rules={[
                                    { required: true, message: "Nhập mã" },
                                  ]}
                                  style={{ marginBottom: 4 }}
                                >
                                  <Input size="small" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, "type"]}
                                  label="Loại"
                                  rules={[{ required: true }]}
                                  style={{ marginBottom: 4 }}
                                >
                                  <Select
                                    size="small"
                                    options={[
                                      { value: "TEXT", label: "TEXT" },
                                      { value: "NUMBER", label: "NUMBER" },
                                    ]}
                                  />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, "isRequired"]}
                                  valuePropName="checked"
                                  style={{ marginBottom: 0 }}
                                >
                                  <Checkbox>Bắt buộc</Checkbox>
                                </Form.Item>
                                <Button
                                  type="text"
                                  danger
                                  onClick={() => remove(name)}
                                  icon={<MinusCircleOutlined />}
                                  size="small"
                                >
                                  Gỡ cột
                                </Button>
                              </Space>
                            </Card>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() =>
                              add({
                                name: "",
                                code: "",
                                type: "TEXT",
                                isRequired: false,
                              })
                            }
                            block
                            icon={<PlusOutlined />}
                            size="small"
                          >
                            Thêm cột con
                          </Button>
                        </div>
                      )}
                    </Form.List>
                  </Card>
                )}

                <Form.Item style={{ marginTop: "24px" }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    block
                    icon={<SaveOutlined />}
                    loading={isSaving}
                  >
                    Cập nhật Inspector
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <Empty description="Chọn một trường dữ liệu trên Canvas để cấu hình chi tiết Inspector!" />
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
}
