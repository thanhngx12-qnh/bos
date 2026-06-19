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
  theme,
  App,
  Col,
  Row,
  Modal,
  Dropdown,
  Tag,
  Divider,
  Collapse,
  Empty,
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

const COMMON_REGEX_PATTERNS = [
  {
    label: "Số điện thoại VN",
    pattern: "^(0|84)[3|5|7|8|9][0-9]{8}$",
    error: "Số điện thoại Việt Nam không hợp lệ (10 số, bắt đầu bằng 0 hoặc 84)",
  },
  {
    label: "Email chuẩn",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    error: "Địa chỉ Email không đúng định dạng",
  },
  {
    label: "Mã Code (Chữ hoa & số)",
    pattern: "^[A-Z0-9_]+$",
    error: "Chỉ chấp nhận chữ in hoa không dấu, chữ số và gạch dưới (_)",
  },
  {
    label: "Chỉ nhập số",
    pattern: "^[0-9]+$",
    error: "Chỉ cho phép nhập ký tự số",
  },
  {
    label: "Chỉ nhập chữ",
    pattern: "^[a-zA-ZÀ-ỹ\\s]+$",
    error: "Chỉ cho phép nhập ký tự chữ và khoảng trắng",
  },
];


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
  const [activeTab, setActiveTab] = React.useState("toolbox");

  // Đồng bộ hóa dữ liệu từ Canvas trường được chọn lên Inspector để sửa [1]
  useEffect(() => {
    if (selectedField) {
      setActiveTab("inspector");
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
          columns: (selectedField.config?.options?.columns || []).map((col: any) => {
            if (col.type === "SELECT" && Array.isArray(col.choices)) {
              return {
                ...col,
                choices: col.choices.join(", "),
              };
            }
            return col;
          }),
          showIf: selectedField.config?.options?.showIf || { logicalOperator: "AND", rules: [] },
          requiredIf: selectedField.config?.options?.requiredIf || { logicalOperator: "AND", rules: [] },
        },
      });
    } else {
      setActiveTab("toolbox");
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
        activeKey={activeTab}
        onChange={setActiveTab}
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
                  <Input placeholder="Ví dụ: Họ và tên, Email, Số điện thoại..." />
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
                  <InputNumber className="w-full" placeholder="Ví dụ: 1, 2, 3..." />
                </Form.Item>
                <Form.Item name="isRequired" valuePropName="checked">
                  <Checkbox>Bắt buộc nhập (Required)</Checkbox>
                </Form.Item>
                <Form.Item
                  name={["options", "placeholder"]}
                  label="Gợi ý nhập liệu (Placeholder)"
                >
                  <Input placeholder="Ví dụ: Nhập họ và tên..." />
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
                          label="Đó dài tối thiểu"
                        >
                          <InputNumber className="w-full" placeholder="Ví dụ: 2" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name={["options", "maxLength"]}
                          label="Độ dài tối đa"
                        >
                          <InputNumber className="w-full" placeholder="Ví dụ: 255" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      name={["options", "regexPattern"]}
                      label="Biểu thức kiểm tra (Regex Pattern)"
                      extra="Kiểm tra định dạng đầu vào khi người dùng nhập dữ liệu."
                    >
                      <Input placeholder="Ví dụ: ^(0|84)[3|5|7|8|9][0-9]{8}$" />
                    </Form.Item>
                    
                    {/* Hộp gợi ý các mẫu regex hay dùng */}
                    <div style={{ marginBottom: "16px", padding: "8px", background: "#f9f9f9", borderRadius: "6px", border: "1px solid #e8e8e8" }}>
                      <div style={{ marginBottom: "6px" }}>
                        <Text type="secondary" style={{ fontSize: "11px", fontWeight: "bold" }}>
                          Mẫu gợi ý kiểm tra Regex nhanh:
                        </Text>
                      </div>
                      <Space wrap size={[4, 6]}>
                        {COMMON_REGEX_PATTERNS.map((item, idx) => (
                          <Tag
                            key={idx}
                            color="blue"
                            style={{ cursor: "pointer", fontSize: "11px" }}
                            onClick={() => {
                              form.setFieldsValue({
                                options: {
                                  ...form.getFieldValue("options"),
                                  regexPattern: item.pattern,
                                  errorMessage: item.error,
                                },
                              });
                            }}
                          >
                            {item.label}
                          </Tag>
                        ))}
                      </Space>
                    </div>

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
                          <InputNumber className="w-full" placeholder="Ví dụ: 0" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name={["options", "max"]} label="Max">
                          <InputNumber className="w-full" placeholder="Ví dụ: 9999" />
                        </Form.Item>
                      </Col>
                    </Row>
                    {watchedType === "CURRENCY" && (
                      <Form.Item
                        name={["options", "prefix"]}
                        label="Ký hiệu tiền tệ"
                      >
                        <Input placeholder="Ví dụ: VNĐ, $, €..." />
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
                    <Input placeholder="Ví dụ: Lựa chọn 1, Lựa chọn 2, Lựa chọn 3..." />
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
                      <Input placeholder="Ví dụ: project_name, full_name..." />
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
                                  <Input size="small" placeholder="Ví dụ: Tên sản phẩm" />
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
                                  <Input size="small" placeholder="Ví dụ: product_code" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, "type"]}
                                  label="Loại"
                                  rules={[{ required: true, message: "Chọn loại cột" }]}
                                  style={{ marginBottom: 4 }}
                                >
                                  <Select
                                    size="small"
                                    placeholder="Chọn loại cột..."
                                    options={[
                                      { value: "TEXT", label: "Chữ (TEXT)" },
                                      { value: "NUMBER", label: "Số (NUMBER)" },
                                      { value: "DATE", label: "Ngày (DATE)" },
                                      { value: "SELECT", label: "Hộp chọn (SELECT)" },
                                      { value: "CHECKBOX", label: "Đóng mở (CHECKBOX)" },
                                      { value: "STT", label: "Số thứ tự (STT)" },
                                      { value: "FORMULA", label: "Công thức toán (FORMULA)" },
                                    ]}
                                  />
                                </Form.Item>

                                <Form.Item
                                  noStyle
                                  shouldUpdate={(prevValues, currentValues) => {
                                    const prevCol = prevValues?.options?.columns?.[name]?.type;
                                    const currCol = currentValues?.options?.columns?.[name]?.type;
                                    return prevCol !== currCol;
                                  }}
                                >
                                   {({ getFieldValue }) => {
                                     const colType = getFieldValue(["options", "columns", name, "type"]);
                                     const isNumeric = colType === "NUMBER" || colType === "FORMULA";
                                     return (
                                       <>
                                         {colType === "FORMULA" && (
                                           <Form.Item
                                             {...restField}
                                             name={[name, "formula"]}
                                             label="Công thức của cột"
                                             rules={[{ required: true, message: "Nhập công thức cột" }]}
                                             style={{ marginBottom: 4 }}
                                           >
                                             <Input size="small" placeholder="Ví dụ: {don_gia} * {so_luong}" />
                                           </Form.Item>
                                         )}
                                         {colType === "SELECT" && (
                                           <Form.Item
                                             {...restField}
                                             name={[name, "choices"]}
                                             label="Lựa chọn (choices) - Cách nhau bằng dấu phẩy"
                                             rules={[{ required: true, message: "Nhập các lựa chọn" }]}
                                             style={{ marginBottom: 4 }}
                                           >
                                             <Input size="small" placeholder="Ví dụ: Lựa chọn 1, Lựa chọn 2" />
                                           </Form.Item>
                                         )}
                                         {isNumeric && (
                                           <Form.Item
                                             {...restField}
                                             name={[name, "summaryType"]}
                                             label="Hàm tổng hợp chân trang"
                                             style={{ marginBottom: 4 }}
                                             initialValue="NONE"
                                           >
                                             <Select
                                               size="small"
                                               placeholder="Chọn hàm tổng hợp..."
                                               options={[
                                                 { value: "NONE", label: "Không tính" },
                                                 { value: "SUM", label: "Tổng cộng (SUM)" },
                                                 { value: "AVG", label: "Trung bình cộng (AVG)" },
                                                 { value: "MIN", label: "Nhỏ nhất (MIN)" },
                                                 { value: "MAX", label: "Lớn nhất (MAX)" },
                                               ]}
                                             />
                                           </Form.Item>
                                         )}
                                       </>
                                     );
                                   }}
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

                {/* 7. Thiết lập điều kiện showIf (Điều kiện hiển thị) */}
                <Card
                  size="small"
                  title="Điều kiện Hiển thị (showIf)"
                  style={{ marginBottom: "16px", background: "#f9fcfc" }}
                  styles={{ header: { background: "#e6f7ff" } }}
                >
                  <Form.Item
                    name={["options", "showIf", "logicalOperator"]}
                    label="Kết hợp logic"
                    initialValue="AND"
                    style={{ marginBottom: "12px" }}
                  >
                    <Select
                      options={[
                        { value: "AND", label: "Tất cả điều kiện đúng (AND)" },
                        { value: "OR", label: "Chỉ cần 1 điều kiện đúng (OR)" },
                      ]}
                    />
                  </Form.Item>
                  
                  <Form.List name={["options", "showIf", "rules"]}>
                    {(rules, { add, remove }) => (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {rules.map(({ key, name, ...restField }) => (
                          <Card key={key} size="small" style={{ background: "white", border: "1px solid #f0f0f0" }}>
                            <Form.Item
                              {...restField}
                              name={[name, "fieldCode"]}
                              label="Trường kiểm tra"
                              rules={[{ required: true, message: "Chọn trường" }]}
                              style={{ marginBottom: "8px" }}
                            >
                              <Select
                                placeholder="Chọn trường..."
                                options={fields
                                  .filter((f) => f.code !== selectedField?.code)
                                  .map((f) => ({ value: f.code, label: `${f.name} (${f.code})` }))}
                              />
                            </Form.Item>
                            
                            <Form.Item
                              {...restField}
                              name={[name, "operator"]}
                              label="Phép so sánh"
                              rules={[{ required: true }]}
                              style={{ marginBottom: "8px" }}
                            >
                              <Select
                                options={[
                                  { value: "EQUALS", label: "Bằng (=)" },
                                  { value: "NOT_EQUALS", label: "Khác (!=)" },
                                  { value: "CONTAINS", label: "Chứa chuỗi" },
                                  { value: "IS_EMPTY", label: "Bị trống" },
                                  { value: "IS_NOT_EMPTY", label: "Không bị trống" },
                                ]}
                              />
                            </Form.Item>

                            <Form.Item
                              noStyle
                              shouldUpdate={(prevValues, currentValues) => {
                                const prevOp = prevValues?.options?.showIf?.rules?.[name]?.operator;
                                const currOp = currentValues?.options?.showIf?.rules?.[name]?.operator;
                                return prevOp !== currOp;
                              }}
                            >
                              {({ getFieldValue }) => {
                                const op = getFieldValue(["options", "showIf", "rules", name, "operator"]);
                                if (op === "IS_EMPTY" || op === "IS_NOT_EMPTY") return null;
                                return (
                                  <Form.Item
                                    {...restField}
                                    name={[name, "value"]}
                                    label="Giá trị so sánh"
                                    rules={[{ required: true, message: "Nhập giá trị" }]}
                                    style={{ marginBottom: "8px" }}
                                  >
                                    <Input placeholder="Giá trị..." />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>

                            <Button
                              type="text"
                              danger
                              size="small"
                              onClick={() => remove(name)}
                              icon={<MinusCircleOutlined />}
                            >
                              Xóa quy tắc
                            </Button>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add({ fieldCode: "", operator: "EQUALS", value: "" })}
                          block
                          icon={<PlusOutlined />}
                          size="small"
                        >
                          Thêm quy tắc hiển thị
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>

                {/* 8. Thiết lập điều kiện requiredIf (Điều kiện bắt buộc) */}
                <Card
                  size="small"
                  title="Điều kiện Bắt buộc (requiredIf)"
                  style={{ marginBottom: "16px", background: "#fcfaf9" }}
                  styles={{ header: { background: "#fffbe6" } }}
                >
                  <Form.Item
                    name={["options", "requiredIf", "logicalOperator"]}
                    label="Kết hợp logic"
                    initialValue="AND"
                    style={{ marginBottom: "12px" }}
                  >
                    <Select
                      options={[
                        { value: "AND", label: "Tất cả điều kiện đúng (AND)" },
                        { value: "OR", label: "Chỉ cần 1 điều kiện đúng (OR)" },
                      ]}
                    />
                  </Form.Item>
                  
                  <Form.List name={["options", "requiredIf", "rules"]}>
                    {(rules, { add, remove }) => (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {rules.map(({ key, name, ...restField }) => (
                          <Card key={key} size="small" style={{ background: "white", border: "1px solid #f0f0f0" }}>
                            <Form.Item
                              {...restField}
                              name={[name, "fieldCode"]}
                              label="Trường kiểm tra"
                              rules={[{ required: true, message: "Chọn trường" }]}
                              style={{ marginBottom: "8px" }}
                            >
                              <Select
                                placeholder="Chọn trường..."
                                options={fields
                                  .filter((f) => f.code !== selectedField?.code)
                                  .map((f) => ({ value: f.code, label: `${f.name} (${f.code})` }))}
                              />
                            </Form.Item>
                            
                            <Form.Item
                              {...restField}
                              name={[name, "operator"]}
                              label="Phép so sánh"
                              rules={[{ required: true }]}
                              style={{ marginBottom: "8px" }}
                            >
                              <Select
                                options={[
                                  { value: "EQUALS", label: "Bằng (=)" },
                                  { value: "NOT_EQUALS", label: "Khác (!=)" },
                                  { value: "CONTAINS", label: "Chứa chuỗi" },
                                  { value: "IS_EMPTY", label: "Bị trống" },
                                  { value: "IS_NOT_EMPTY", label: "Không bị trống" },
                                ]}
                              />
                            </Form.Item>

                            <Form.Item
                              noStyle
                              shouldUpdate={(prevValues, currentValues) => {
                                const prevOp = prevValues?.options?.requiredIf?.rules?.[name]?.operator;
                                const currOp = currentValues?.options?.requiredIf?.rules?.[name]?.operator;
                                return prevOp !== currOp;
                              }}
                            >
                              {({ getFieldValue }) => {
                                const op = getFieldValue(["options", "requiredIf", "rules", name, "operator"]);
                                if (op === "IS_EMPTY" || op === "IS_NOT_EMPTY") return null;
                                return (
                                  <Form.Item
                                    {...restField}
                                    name={[name, "value"]}
                                    label="Giá trị so sánh"
                                    rules={[{ required: true, message: "Nhập giá trị" }]}
                                    style={{ marginBottom: "8px" }}
                                  >
                                    <Input placeholder="Giá trị..." />
                                  </Form.Item>
                                );
                              }}
                            </Form.Item>

                            <Button
                              type="text"
                              danger
                              size="small"
                              onClick={() => remove(name)}
                              icon={<MinusCircleOutlined />}
                            >
                              Xóa quy tắc
                            </Button>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add({ fieldCode: "", operator: "EQUALS", value: "" })}
                          block
                          icon={<PlusOutlined />}
                          size="small"
                        >
                          Thêm quy tắc bắt buộc
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>

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
