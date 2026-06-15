// File: src/components/metadata/PropertiesPanel.tsx
"use client";

import React, { useEffect, useRef } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Empty,
} from "antd";
import {
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { useBuilderStore } from "@/hooks/useBuilderStore";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function PropertiesPanel() {
  const [form] = Form.useForm();

  // Lấy dữ liệu thực thể và các trường từ Zustand Store
  const { selectedFieldId, fields, updateField, entities } = useBuilderStore();

  // Tìm trường thông tin đang được người dùng click chọn trên Canvas
  const selectedField = fields.find((f) => f.id === selectedFieldId);

  // Danh sách các trường khác trên Canvas dùng để tham chiếu chéo (loại bỏ trường hiện tại)
  const otherFields = fields.filter((f) => f.id !== selectedFieldId);

  // Khắc phục mảng rỗng cho thực thể liên kết (LOOKUP)
  const entityList = Array.isArray(entities)
    ? entities
    : (entities as any)?.data || (entities as any)?.items || [];

  // 🛑 CHỐT CHẶN UX: Tránh vòng lặp vô hạn làm mất ký tự/nhảy con trỏ chuột khi người dùng đang gõ
  const lastLoadedFieldIdRef = useRef<string | number | null>(null);

  // Đồng bộ hóa dữ liệu từ Canvas Store vào Form thuộc tính
  useEffect(() => {
    if (selectedField) {
      // CHỈ setFieldsValue khi thực sự chuyển đổi sang click một trường hoàn toàn khác trên Canvas
      if (lastLoadedFieldIdRef.current !== selectedField.id) {
        lastLoadedFieldIdRef.current = selectedField.id;

        form.setFieldsValue({
          name: selectedField.name,
          code: selectedField.code,
          isRequired: !!selectedField.isRequired,

          // SELECT Options
          selectMultiple: !!selectedField.options?.multiple,
          selectChoices: selectedField.options?.choices || [],

          // NUMBER Options
          numMin: selectedField.options?.min,
          numMax: selectedField.options?.max,
          numPrefix: selectedField.options?.prefix,

          // LOOKUP Options
          lookupEntityId: selectedField.options?.lookupEntityId,
          lookupDisplayField: selectedField.options?.displayField,

          // FORMULA Options
          formulaExpression: selectedField.options?.formula,

          // RULE BUILDER: Đồng bộ điều kiện hiển thị (showIf)
          hasShowIf: !!selectedField.options?.showIf,
          showIfField: selectedField.options?.showIf?.field,
          showIfOperator: selectedField.options?.showIf?.operator || "==",
          showIfValue: selectedField.options?.showIf?.value,

          // RULE BUILDER: Đồng bộ điều kiện bắt buộc (requiredIf)
          hasRequiredIf: !!selectedField.options?.requiredIf,
          requiredIfField: selectedField.options?.requiredIf?.field,
          requiredIfOperator:
            selectedField.options?.requiredIf?.operator || "==",
          requiredIfValue: selectedField.options?.requiredIf?.value,
        });
      }
    } else {
      lastLoadedFieldIdRef.current = null;
    }
  }, [selectedField, form]);

  if (!selectedField) {
    return (
      <Card
        title="Thuộc tính trường (Properties)"
        size="small"
        variant="outlined"
        style={{ borderRadius: "8px", minHeight: "calc(100vh - 200px)" }}
      >
        <div style={{ paddingTop: "150px", textAlign: "center" }}>
          <Empty description="Chọn một trường thông tin trên Canvas để bắt đầu cấu hình" />
        </div>
      </Card>
    );
  }

  // Lắng nghe thay đổi giá trị trên Form để ghi đè tức thì vào Zustand Store
  const handleValuesChange = (changedValues: any, allValues: any) => {
    const { name, code, isRequired, ...configValues } = allValues;

    // 1. Bảo toàn tất cả các options cũ đã lưu trong DB để tránh mất mát dữ liệu
    const optionsPayload: Record<string, any> = {
      ...(selectedField.options || {}),
    };

    // 2. Biên soạn Options đặc thù theo từng Type đúng chuẩn Backend Architect yêu cầu
    switch (selectedField.type) {
      case "SELECT":
        optionsPayload.multiple = !!configValues.selectMultiple;
        optionsPayload.choices = configValues.selectChoices || [];
        break;

      case "NUMBER":
        optionsPayload.min = configValues.numMin ?? null;
        optionsPayload.max = configValues.numMax ?? null;
        optionsPayload.prefix = configValues.numPrefix || "";
        break;

      case "LOOKUP":
        optionsPayload.lookupEntityId = configValues.lookupEntityId;
        optionsPayload.displayField = configValues.lookupDisplayField;
        break;

      case "FORMULA":
        optionsPayload.formula = configValues.formulaExpression;
        break;
    }

    // 3. Tự động gom cấu hình trực quan của Rule Builder ẩn/hiện (showIf) lồng vào options
    if (configValues.hasShowIf && configValues.showIfField) {
      optionsPayload.showIf = {
        field: configValues.showIfField,
        operator: configValues.showIfOperator,
        value: configValues.showIfValue,
      };
    } else {
      // TRIỆT ĐỂ: Xóa bỏ hoàn toàn key showIf ra khỏi object khi người dùng gạt công tắc Tắt
      delete optionsPayload.showIf;
    }

    // 4. Tự động gom cấu hình trực quan của Rule Builder bắt buộc (requiredIf) lồng vào options
    if (configValues.hasRequiredIf && configValues.requiredIfField) {
      optionsPayload.requiredIf = {
        field: configValues.requiredIfField,
        operator: configValues.requiredIfOperator,
        value: configValues.requiredIfValue,
      };
    } else {
      // TRIỆT ĐỂ: Xóa bỏ hoàn toàn key requiredIf ra khỏi object khi người dùng gạt công tắc Tắt
      delete optionsPayload.requiredIf;
    }

    // 5. Kích hoạt cập nhật Canvas Store ngay tức thì
    updateField(selectedField.id, {
      name,
      code,
      isRequired: !!isRequired,
      options: optionsPayload,
    });
  };

  return (
    <Card
      title={
        <Space>
          <SettingOutlined style={{ color: "#1677ff" }} />
          <span>Thuộc tính: {selectedField.name || "Trường mới"}</span>
        </Space>
      }
      size="small"
      variant="outlined"
      style={{
        borderRadius: "8px",
        maxHeight: "calc(100vh - 200px)",
        overflowY: "auto",
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onValuesChange={handleValuesChange}
      >
        {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
        <div style={{ marginBottom: "16px" }}>
          <Text strong style={{ fontSize: "12px", color: "#8c8c8c" }}>
            THÔNG TIN CHUNG
          </Text>
        </div>

        <Form.Item
          name="name"
          label="Tên hiển thị (Label)"
          rules={[{ required: true, message: "Vui lòng nhập nhãn hiển thị!" }]}
        >
          <Input placeholder="ví dụ: Số điện thoại khách hàng" />
        </Form.Item>

        <Form.Item
          name="code"
          label="Mã trường (Code)"
          rules={[
            { required: true, message: "Nhập mã định danh trường!" },
            {
              pattern: /^[a-z0-9_]+$/,
              message: "Chỉ chứa chữ thường không dấu và gạch dưới",
            },
          ]}
        >
          <Input placeholder="ví dụ: customer_phone" />
        </Form.Item>

        <Form.Item
          name="isRequired"
          label="Bắt buộc nhập tĩnh (isRequired)"
          valuePropName="checked"
        >
          <Switch checkedChildren="Bắt buộc" unCheckedChildren="Không" />
        </Form.Item>

        <Divider style={{ margin: "16px 0" }} />

        {/* PHẦN 2: CẤU HÌNH ĐẶC THÙ THEO LOẠI TRƯỜNG */}
        <div style={{ marginBottom: "16px" }}>
          <Text strong style={{ fontSize: "12px", color: "#8c8c8c" }}>
            CẤU HÌNH THEO LOẠI [{selectedField.type}]
          </Text>
        </div>

        {/* Cấu hình SELECT */}
        {selectedField.type === "SELECT" && (
          <Space orientation="vertical" style={{ width: "100%" }} size="middle">
            <Form.Item
              name="selectMultiple"
              label="Chế độ chọn"
              valuePropName="checked"
              style={{ marginBottom: 8 }}
            >
              <Switch
                checkedChildren="Chọn nhiều (Multiple)"
                unCheckedChildren="Chọn một (Single)"
              />
            </Form.Item>

            <Form.Item label="Danh sách các Tùy chọn" required>
              <Form.List name="selectChoices">
                {(choices, { add, remove }) => (
                  <>
                    {choices.map((choice) => (
                      <Space
                        key={choice.key}
                        style={{ display: "flex", marginBottom: 8 }}
                        align="baseline"
                      >
                        <Form.Item
                          {...choice}
                          name={[choice.name, "label"]}
                          rules={[{ required: true, message: "Nhập Label!" }]}
                          noStyle
                        >
                          <Input
                            placeholder="Label (ví dụ: Hoạt động)"
                            style={{ width: "100px" }}
                          />
                        </Form.Item>
                        <Form.Item
                          {...choice}
                          name={[choice.name, "value"]}
                          rules={[{ required: true, message: "Nhập Value!" }]}
                          noStyle
                        >
                          <Input
                            placeholder="Value (ví dụ: active)"
                            style={{ width: "100px" }}
                          />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          onClick={() => remove(choice.name)}
                          icon={<DeleteOutlined />}
                        />
                      </Space>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add()}
                      block
                      icon={<PlusOutlined />}
                      style={{ marginTop: "8px" }}
                    >
                      Thêm dòng chọn
                    </Button>
                  </>
                )}
              </Form.List>
            </Form.Item>
          </Space>
        )}

        {/* Cấu hình NUMBER */}
        {selectedField.type === "NUMBER" && (
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item name="numMin" label="Tối thiểu (Min)">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="numMax" label="Tối đa (Max)">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="numPrefix" label="Ký hiệu (Prefix)">
                <Input placeholder="ví dụ: VNĐ, %" />
              </Form.Item>
            </Col>
          </Row>
        )}

        {/* Cấu hình LOOKUP */}
        {selectedField.type === "LOOKUP" && (
          <Space orientation="vertical" style={{ width: "100%" }} size="small">
            <Form.Item
              name="lookupEntityId"
              label="Thực thể đích liên kết"
              rules={[{ required: true, message: "Chọn thực thể liên kết!" }]}
            >
              <Select placeholder="Chọn thực thể...">
                {entityList.map((e: any) => (
                  <Option key={e.id} value={e.id}>
                    {e.name} ({e.code})
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="lookupDisplayField"
              label="Mã trường hiển thị đại diện"
              rules={[{ required: true, message: "Nhập trường hiển thị!" }]}
            >
              <Input placeholder="ví dụ: code hoặc name" />
            </Form.Item>
          </Space>
        )}

        {/* Cấu hình FORMULA */}
        {selectedField.type === "FORMULA" && (
          <Form.Item
            name="formulaExpression"
            label="Biểu thức tính toán công thức"
            rules={[{ required: true, message: "Nhập biểu thức công thức!" }]}
          >
            <TextArea
              rows={3}
              placeholder="ví dụ: quantity * price_unit"
              style={{ fontFamily: "monospace" }}
            />
          </Form.Item>
        )}

        {/* Các kiểu dữ liệu thuần khác */}
        {[
          "TEXT",
          "DATE",
          "DATETIME",
          "TABLE",
          "USER_REF",
          "DEPT_REF",
          "FILE",
          "IMAGE",
        ].includes(selectedField.type) && (
          <div
            style={{
              textAlign: "center",
              padding: "8px 0",
              border: "1px dashed #e8e8e8",
              borderRadius: "4px",
              background: "#fafafa",
              marginBottom: "16px",
            }}
          >
            <Text type="secondary" style={{ fontSize: "12px" }}>
              Không có tùy chọn mở rộng cho kiểu [{selectedField.type}].
            </Text>
          </div>
        )}

        <Divider style={{ margin: "16px 0" }} />

        {/* PHẦN 3: 🛑 DYNAMIC RULE BUILDER (ZERO-JSON) */}
        <div style={{ marginBottom: "16px" }}>
          <Text strong style={{ fontSize: "12px", color: "#8c8c8c" }}>
            LOGIC ĐỘNG (RULE BUILDER)
          </Text>
        </div>

        {/* A. RULE BUILDER CHO SHOWIF */}
        <Card
          size="small"
          title={
            <Space>
              <EyeOutlined style={{ color: "#1677ff" }} />{" "}
              <span style={{ fontSize: "13px" }}>
                Ẩn / Hiện thông minh (showIf)
              </span>
            </Space>
          }
          style={{ marginBottom: "12px", background: "#fafafa" }}
        >
          <Form.Item
            name="hasShowIf"
            valuePropName="checked"
            style={{ marginBottom: 8 }}
          >
            <Switch
              checkedChildren="Đã kích hoạt"
              unCheckedChildren="Tắt điều kiện"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.hasShowIf !== curr.hasShowIf}
          >
            {({ getFieldValue }) => {
              if (!getFieldValue("hasShowIf")) return null;
              return (
                <Space
                  orientation="vertical"
                  style={{ width: "100%" }}
                  size="small"
                >
                  <Form.Item
                    name="showIfField"
                    label="Khi trường..."
                    rules={[{ required: true, message: "Chọn trường!" }]}
                    style={{ marginBottom: "8px" }}
                  >
                    <Select placeholder="Chọn trường điều kiện">
                      {otherFields.map((f: any) => (
                        <Option key={f.id} value={f.code}>
                          {f.name} ({f.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={10}>
                      <Form.Item
                        name="showIfOperator"
                        label="Toán tử"
                        style={{ marginBottom: 0 }}
                      >
                        <Select>
                          <Option value="==">bằng (==)</Option>
                          <Option value="!=">khác (!=)</Option>
                          <Option value=">">lớn hơn (&gt;)</Option>
                          <Option value="<">nhỏ hơn (&lt;)</Option>
                          <Option value=">=">lớn hơn hoặc bằng (&gt;=)</Option>
                          <Option value="<=">nhỏ hơn hoặc bằng (&lt;=)</Option>
                          <Option value="IN">trong tập (IN)</Option>
                          <Option value="NOT_IN">ngoài tập (NOT_IN)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item
                        name="showIfValue"
                        label="Giá trị so sánh"
                        rules={[{ required: true, message: "Nhập giá trị!" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="ví dụ: active, IT..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </Space>
              );
            }}
          </Form.Item>
        </Card>

        {/* B. RULE BUILDER CHO REQUIREDIF */}
        <Card
          size="small"
          title={
            <Space>
              <SafetyCertificateOutlined style={{ color: "#ff4d4f" }} />{" "}
              <span style={{ fontSize: "13px" }}>
                Bắt buộc nhập động (requiredIf)
              </span>
            </Space>
          }
          style={{ background: "#fafafa" }}
        >
          <Form.Item
            name="hasRequiredIf"
            valuePropName="checked"
            style={{ marginBottom: 8 }}
          >
            <Switch
              checkedChildren="Đã kích hoạt"
              unCheckedChildren="Tắt điều kiện"
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.hasRequiredIf !== curr.hasRequiredIf
            }
          >
            {({ getFieldValue }) => {
              if (!getFieldValue("hasRequiredIf")) return null;
              return (
                <Space
                  orientation="vertical"
                  style={{ width: "100%" }}
                  size="small"
                >
                  <Form.Item
                    name="requiredIfField"
                    label="Khi trường..."
                    rules={[{ required: true, message: "Chọn trường!" }]}
                    style={{ marginBottom: "8px" }}
                  >
                    <Select placeholder="Chọn trường điều kiện">
                      {otherFields.map((f: any) => (
                        <Option key={f.id} value={f.code}>
                          {f.name} ({f.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Row gutter={8}>
                    <Col span={10}>
                      <Form.Item
                        name="requiredIfOperator"
                        label="Toán tử"
                        style={{ marginBottom: 0 }}
                      >
                        <Select>
                          <Option value="==">bằng (==)</Option>
                          <Option value="!=">khác (!=)</Option>
                          <Option value=">">lớn hơn (&gt;)</Option>
                          <Option value="<">nhỏ hơn (&lt;)</Option>
                          <Option value=">=">lớn hơn hoặc bằng (&gt;=)</Option>
                          <Option value="<=">nhỏ hơn hoặc bằng (&lt;=)</Option>
                          <Option value="IN">trong tập (IN)</Option>
                          <Option value="NOT_IN">ngoài tập (NOT_IN)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item
                        name="requiredIfValue"
                        label="Giá trị so sánh"
                        rules={[{ required: true, message: "Nhập giá trị!" }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Input placeholder="ví dụ: pending, true..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </Space>
              );
            }}
          </Form.Item>
        </Card>
      </Form>
    </Card>
  );
}
