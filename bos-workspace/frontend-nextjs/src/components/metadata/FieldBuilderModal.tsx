// File: src/components/metadata/FieldBuilderModal.tsx
"use client";

import React from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  Button,
  Space,
  Card,
  Typography,
  Divider,
  Row,
  Col,
} from "antd";
import {
  SettingOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface FieldBuilderModalProps {
  open: boolean;
  onCancel: () => void;
  onFinish: (values: any) => Promise<void>;
  confirmLoading: boolean;
  selectedEntity: any;
  entities: any[];
}

export default function FieldBuilderModal({
  open,
  onCancel,
  onFinish,
  confirmLoading,
  selectedEntity,
  entities,
}: FieldBuilderModalProps) {
  const [form] = Form.useForm();

  // Khắc phục mảng rỗng phòng vệ cho danh sách thực thể liên kết (LOOKUP)
  const entityList = Array.isArray(entities)
    ? entities
    : (entities as any)?.data || (entities as any)?.items || [];

  // Lọc bỏ thực thể hiện tại khỏi danh sách liên kết LOOKUP chéo
  const lookupEntities = entityList.filter(
    (e: any) => e.id !== selectedEntity?.id,
  );

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();

      const { name, code, type, isRequired, ...configValues } = values;

      // Gom toàn bộ thuộc tính động thành Object 'options' khớp chuẩn 100 Backend
      let optionsPayload: Record<string, any> = {};

      switch (type) {
        case "SELECT":
          optionsPayload = {
            multiple: !!configValues.selectMultiple,
            choices: configValues.selectChoices || [],
          };
          break;

        case "NUMBER":
          optionsPayload = {
            min: configValues.numMin ?? null,
            max: configValues.numMax ?? null,
            prefix: configValues.numPrefix || "",
          };
          break;

        case "LOOKUP":
          optionsPayload = {
            lookupEntityId: configValues.lookupEntityId,
            displayField: configValues.lookupDisplayField,
          };
          break;

        case "FORMULA":
          optionsPayload = {
            formula: configValues.formulaExpression,
          };
          break;

        default:
          optionsPayload = {};
          break;
      }

      const payload = {
        entityId: selectedEntity.id,
        name,
        code,
        type,
        isRequired: !!isRequired,
        options: optionsPayload, // Gửi chuẩn trường 'options' xuống Backend
      };

      await onFinish(payload);
      form.resetFields();
    } catch (error) {
      console.warn(
        "[BOS-DEBUG] Form validation failed or submit error:",
        error,
      );
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined style={{ color: "#1677ff" }} />
          <span>Thiết lập Trường dữ liệu cho: {selectedEntity?.name}</span>
        </Space>
      }
      open={open}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleFormSubmit}
      confirmLoading={confirmLoading}
      width={600}
      destroyOnHidden // Sử dụng thuộc tính mới của AntD v6 thay cho destroyOnClose
      okText="Lưu cấu hình"
      cancelText="Hủy bỏ"
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ isRequired: false, selectMultiple: false }}
        style={{ marginTop: "16px" }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Tên trường hiển thị"
              rules={[{ required: true, message: "Nhập tên trường hiển thị!" }]}
            >
              <Input placeholder="ví dụ: Giá bán, Hạn thanh toán" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="code"
              label="Mã trường (snake_case)"
              rules={[
                { required: true, message: "Nhập mã trường dữ liệu!" },
                {
                  pattern: /^[a-z0-9_]+$/,
                  message: "Chỉ chứa chữ thường, số, và dấu gạch dưới (_)",
                },
              ]}
            >
              <Input placeholder="ví dụ: unit_price, payment_deadline" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="type"
              label="Kiểu dữ liệu (Field Type)"
              rules={[
                { required: true, message: "Vui lòng chọn kiểu dữ liệu!" },
              ]}
            >
              <Select placeholder="Chọn kiểu dữ liệu phù hợp">
                <Select.OptGroup label="Cơ bản">
                  <Option value="TEXT">Văn bản ngắn (TEXT)</Option>
                  <Option value="NUMBER">Số học (NUMBER)</Option>
                  <Option value="DATE">Ngày (DATE)</Option>
                  <Option value="DATETIME">Ngày & Giờ (DATETIME)</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Lựa chọn">
                  <Option value="SELECT">Hộp chọn danh sách (SELECT)</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Nâng cao">
                  <Option value="LOOKUP">Tra cứu liên kết (LOOKUP)</Option>
                  <Option value="TABLE">Bảng con lồng nhau (TABLE)</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Tổ chức / Nhân sự">
                  <Option value="USER_REF">Chọn Nhân viên (USER_REF)</Option>
                  <Option value="DEPT_REF">Chọn Phòng ban (DEPT_REF)</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Tệp tin">
                  <Option value="FILE">Tài liệu đính kèm (FILE)</Option>
                  <Option value="IMAGE">Hình ảnh (IMAGE)</Option>
                </Select.OptGroup>
                <Select.OptGroup label="Tính toán">
                  <Option value="FORMULA">Công thức động (FORMULA)</Option>
                </Select.OptGroup>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="isRequired"
              label="Thuộc tính bắt buộc"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Bắt buộc"
                unCheckedChildren="Không bắt buộc"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "12px 0" }} />

        {/* DYNAMIC CONFIG RENDERING */}
        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.type !== curr.type}
        >
          {({ getFieldValue }) => {
            const currentType = getFieldValue("type");

            if (!currentType) return null;

            return (
              <Card
                title={
                  <Space style={{ fontSize: "13px" }}>
                    <InfoCircleOutlined style={{ color: "#1677ff" }} />
                    <Text strong>
                      Cấu hình chuyên sâu cho kiểu [{currentType}]
                    </Text>
                  </Space>
                }
                size="small"
                style={{ background: "#fafafa", border: "1px solid #f0f0f0" }}
              >
                {/* 1. SELECT */}
                {currentType === "SELECT" && (
                  <Space
                    orientation="vertical"
                    style={{ width: "100%" }}
                    size="middle"
                  >
                    <Form.Item
                      name="selectMultiple"
                      label="Chế độ chọn dữ liệu"
                      valuePropName="checked"
                      style={{ marginBottom: 8 }}
                    >
                      <Switch
                        checkedChildren="Cho phép chọn nhiều giá trị"
                        unCheckedChildren="Chỉ chọn một giá trị"
                      />
                    </Form.Item>

                    <Form.Item label="Danh sách tùy chọn lựa chọn" required>
                      <Form.List
                        name="selectChoices"
                        rules={[
                          {
                            validator: async (_, names) => {
                              if (!names || names.length < 1) {
                                return Promise.reject(
                                  new Error(
                                    "Phải có ít nhất 1 tùy chọn lựa chọn!",
                                  ),
                                );
                              }
                            },
                          },
                        ]}
                      >
                        {(choices, { add, remove }, { errors }) => (
                          <>
                            {choices.map((choice, index) => (
                              <Space
                                key={choice.key}
                                style={{ display: "flex", marginBottom: 8 }}
                                align="baseline"
                              >
                                <Form.Item
                                  {...choice}
                                  name={[choice.name, "label"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: "Nhập nhãn hiển thị!",
                                    },
                                  ]}
                                  noStyle
                                >
                                  <Input
                                    placeholder="Nhãn (ví dụ: Miền Bắc)"
                                    style={{ width: 210 }}
                                  />
                                </Form.Item>
                                <Form.Item
                                  {...choice}
                                  name={[choice.name, "value"]}
                                  rules={[
                                    {
                                      required: true,
                                      message: "Nhập giá trị lưu!",
                                    },
                                  ]}
                                  noStyle
                                >
                                  <Input
                                    placeholder="Mã lưu (ví dụ: mien_bac)"
                                    style={{ width: 210 }}
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
                            <Form.Item style={{ marginBottom: 0 }}>
                              <Button
                                type="dashed"
                                onClick={() => add()}
                                block
                                icon={<PlusOutlined />}
                                style={{ marginTop: 8 }}
                              >
                                Thêm dòng tùy chọn
                              </Button>
                              <Form.ErrorList errors={errors} />
                            </Form.Item>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                  </Space>
                )}

                {/* 2. NUMBER */}
                {currentType === "NUMBER" && (
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="numMin" label="Giá trị tối thiểu">
                        <InputNumber
                          placeholder="min"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="numMax" label="Giá trị tối đa">
                        <InputNumber
                          placeholder="max"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="numPrefix"
                        label="Đơn vị tiền tệ / Ký tự"
                      >
                        <Input
                          placeholder="ví dụ: VNĐ, %, Kg"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* 3. LOOKUP */}
                {currentType === "LOOKUP" && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="lookupEntityId"
                        label="Liên kết tới Thực thể (Entity)"
                        rules={[
                          {
                            required: true,
                            message: "Chọn thực thể liên kết!",
                          },
                        ]}
                      >
                        <Select placeholder="Chọn thực thể đích">
                          {lookupEntities.map((entity: any) => (
                            <Option key={entity.id} value={entity.id}>
                              {entity.name} ({entity.code})
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="lookupDisplayField"
                        label="Trường hiển thị đại diện"
                        rules={[
                          {
                            required: true,
                            message: "Nhập mã trường hiển thị!",
                          },
                        ]}
                        tooltip="Nhập mã code của trường thuộc thực thể đích dùng làm nhãn đại diện hiển thị (ví dụ: code, name, phone...)"
                      >
                        <Input placeholder="ví dụ: code hoặc name" />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {/* 4. FORMULA */}
                {currentType === "FORMULA" && (
                  <Form.Item
                    name="formulaExpression"
                    label="Biểu thức tính toán động (Formula Expression)"
                    rules={[
                      {
                        required: true,
                        message: "Nhập biểu thức công thức tính toán!",
                      },
                    ]}
                    tooltip="Sử dụng mã code các trường khác trong thực thể để tính toán. Ví dụ: unit_price * quantity"
                  >
                    <TextArea
                      rows={3}
                      placeholder="ví dụ: unit_price * quantity * 1.1 hoặc formula_value"
                      style={{ fontFamily: "monospace" }}
                    />
                  </Form.Item>
                )}

                {/* CÁC LOẠI TRƯỜNG KHÔNG CẦN OPTIONS */}
                {[
                  "TEXT",
                  "DATE",
                  "DATETIME",
                  "TABLE",
                  "USER_REF",
                  "DEPT_REF",
                  "FILE",
                  "IMAGE",
                ].includes(currentType) && (
                  <div style={{ textAlign: "center", padding: "12px 0" }}>
                    <Text type="secondary">
                      Loại trường dữ liệu chuẩn. Không yêu cầu tùy chọn mở rộng.
                    </Text>
                  </div>
                )}
              </Card>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
}
