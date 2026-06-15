// File: src/components/metadata/SettingsTab.tsx
"use client";

import React, { useEffect } from "react";
import { Form, Input, Button, Card, Row, Col, Typography, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import {
  UpdateEntityRequest,
  EntityDetailResponse,
} from "@/hooks/useEntityDetail";

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

interface SettingsTabProps {
  entity: EntityDetailResponse | undefined;
  onSave: (values: UpdateEntityRequest) => Promise<any>;
  isSaving: boolean;
}

export default function SettingsTab({
  entity,
  onSave,
  isSaving,
}: SettingsTabProps) {
  const [form] = Form.useForm();

  // Tự động nạp dữ liệu thật từ Backend vào Form khi tải xong
  useEffect(() => {
    if (entity) {
      form.setFieldsValue({
        name: entity.name,
        code: entity.code,
        autoCodePattern: entity.autoCodePattern,
        description: entity.description,
      });
    }
  }, [entity, form]);

  const onFinish = async (values: any) => {
    await onSave(values);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "12px 0" }}>
      <div style={{ marginBottom: "24px" }}>
        <Title level={4} style={{ margin: 0 }}>
          Cấu hình Thực thể (Entity Settings)
        </Title>
        <Paragraph type="secondary">
          Thay đổi các thuộc tính định danh cơ bản và cấu hình SEQ sinh mã định
          danh nghiệp vụ cho biểu mẫu của doanh nghiệp.
        </Paragraph>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
      >
        <Card
          variant="outlined"
          style={{ marginBottom: "24px", borderRadius: "8px" }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên thực thể hiển thị"
                rules={[
                  { required: true, message: "Nhập tên hiển thị thực thể!" },
                ]}
              >
                <Input
                  size="large"
                  placeholder="ví dụ: Đề xuất mua sắm, Hóa đơn"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã Code thực thể (Khóa duy nhất)"
                tooltip="Mã Code dùng làm định danh bảng cơ sở dữ liệu trên Backend. Không cho phép sửa đổi trực tiếp để tránh lỗi liên kết khóa ngoại."
              >
                <Input
                  size="large"
                  disabled
                  style={{ background: "#f5f5f5", color: "#8c8c8c" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="autoCodePattern"
            label="Mẫu tự động sinh mã nghiệp vụ (autoCodePattern)"
            tooltip="Quy định cách hệ thống tự động tạo mã tăng dần cho từng bản ghi dữ liệu. Ví dụ: PR-{SEQ:4} sẽ sinh PR-0001, PR-0002..."
          >
            <Input size="large" placeholder="ví dụ: ORDER-{SEQ:5}" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chi tiết">
            <TextArea
              rows={4}
              placeholder="Mô tả nghiệp vụ chi tiết của thực thể dữ liệu này..."
            />
          </Form.Item>
        </Card>

        <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            size="large"
            loading={isSaving}
          >
            Lưu cài đặt thực thể
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
