// File: src/app/(dashboard)/metadata/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Typography,
  Popconfirm,
  Empty,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { useEntities } from "@/hooks/useEntities";
import { useFields } from "@/hooks/useFields";
import FieldBuilderModal from "@/components/metadata/FieldBuilderModal";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function MetadataPage() {
  const {
    entities,
    isLoading: isLoadingEntities,
    createEntity,
    removeEntity,
  } = useEntities();
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  const {
    fields,
    isLoading: isLoadingFields,
    createField,
    removeField,
    isCreating: isCreatingField,
  } = useFields(selectedEntity?.id);

  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);

  const [entityForm] = Form.useForm();

  const entityList = Array.isArray(entities)
    ? entities
    : (entities as any)?.data || (entities as any)?.items || [];

  useEffect(() => {
    if (entityList.length > 0 && !selectedEntity) {
      setSelectedEntity(entityList[0]);
    }
  }, [entityList, selectedEntity]);

  const handleCreateEntity = async (values: any) => {
    console.log("[DEBUG-BOS] Form Entity Submitted Raw Values:", values);
    try {
      await createEntity(values);
      setIsEntityModalOpen(false);
      entityForm.resetFields();
    } catch (e) {
      console.error("[DEBUG-BOS] handleCreateEntity try-catch caught:", e);
    }
  };

  const handleCreateField = async (payload: any) => {
    console.log(
      "[DEBUG-BOS] Sending Refactored Payload to CreateField API:",
      payload,
    );
    try {
      await createField(payload);
      setIsFieldModalOpen(false);
    } catch (e) {
      console.error("[DEBUG-BOS] handleCreateField failed:", e);
    }
  };

  const handleDeleteEntity = async (id: number) => {
    try {
      await removeEntity(id);
      if (selectedEntity?.id === id) {
        setSelectedEntity(null);
      }
    } catch (e) {}
  };

  const handleDeleteField = async (id: number) => {
    try {
      await removeField(id);
    } catch (e) {}
  };

  const entityColumns = [
    {
      title: "Tên thực thể",
      key: "name",
      render: (_: any, record: any) => (
        <div
          style={{ cursor: "pointer" }}
          onClick={() => setSelectedEntity(record)}
        >
          <Text
            strong
            style={{
              color: selectedEntity?.id === record.id ? "#1677ff" : "inherit",
            }}
          >
            {record.name}
          </Text>
          <div style={{ fontSize: "12px", color: "#8c8c8c" }}>
            {record.code}
          </div>
        </div>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 80,
      render: (_: any, record: any) => (
        <Popconfirm
          title="Xóa thực thể?"
          description="Lưu ý: Hành động này sẽ xóa toàn bộ các trường dữ liệu liên quan."
          okText="Xóa"
          cancelText="Hủy"
          onConfirm={() => handleDeleteEntity(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const fieldColumns = [
    {
      title: "Tên trường",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <div style={{ fontSize: "11px", color: "#8c8c8c" }}>
            {record.code}
          </div>
        </div>
      ),
    },
    {
      title: "Loại dữ liệu",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: "Yêu cầu",
      dataIndex: "isRequired",
      key: "isRequired",
      render: (isRequired: boolean) => (
        <Tag color={isRequired ? "red" : "gray"}>
          {isRequired ? "Bắt buộc" : "Tùy chọn"}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 80,
      render: (_: any, record: any) => (
        <Popconfirm
          title="Xóa trường dữ liệu?"
          okText="Xóa"
          cancelText="Hủy"
          onConfirm={() => handleDeleteField(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <Title level={3}>Kiến tạo Metadata (Metadata Builder)</Title>
        <Paragraph type="secondary">
          Quản lý toàn bộ vòng đời cấu trúc thực thể. Thêm thực thể mới và thiết
          lập các trường dữ liệu đi kèm để xây dựng ứng dụng của bạn.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI: THỰC THỂ */}
        <Col xs={24} md={8}>
          <Card
            title={
              <Space>
                <DatabaseOutlined style={{ color: "#1677ff" }} />
                <span>Danh sách Thực thể</span>
              </Space>
            }
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setIsEntityModalOpen(true)}
              >
                Thêm thực thể
              </Button>
            }
            variant="borderless"
            style={{
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              minHeight: "600px",
            }}
          >
            <Table
              dataSource={entityList}
              columns={entityColumns}
              rowKey="id"
              pagination={false}
              loading={isLoadingEntities}
              size="middle"
            />
          </Card>
        </Col>

        {/* CỘT PHẢI: TRƯỜNG DỮ LIỆU */}
        <Col xs={24} md={16}>
          {selectedEntity ? (
            <Card
              title={
                <Space orientation="vertical" size={2}>
                  <Title level={4} style={{ margin: 0 }}>
                    Thực thể: {selectedEntity.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: "13px" }}>
                    Mã code: <strong>{selectedEntity.code}</strong>{" "}
                    {selectedEntity.autoCodePattern &&
                      `| Mẫu sinh mã: ${selectedEntity.autoCodePattern}`}
                  </Text>
                </Space>
              }
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setIsFieldModalOpen(true)}
                >
                  Thêm trường dữ liệu
                </Button>
              }
              variant="borderless"
              style={{
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                minHeight: "600px",
              }}
            >
              <div style={{ marginBottom: "20px" }}>
                <Text strong>Mô tả: </Text>
                <Text>
                  {selectedEntity.description ||
                    "Chưa có mô tả chi tiết cho thực thể này."}
                </Text>
              </div>

              <Table
                dataSource={fields}
                columns={fieldColumns}
                rowKey="id"
                loading={isLoadingFields}
                pagination={false}
                size="middle"
              />
            </Card>
          ) : (
            <Card
              variant="borderless"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "600px",
              }}
            >
              <Empty description="Vui lòng chọn hoặc tạo mới một thực thể dữ liệu ở cột bên trái" />
            </Card>
          )}
        </Col>
      </Row>

      {/* MODAL TẠO MỚI THỰC THỂ */}
      <Modal
        title="Thêm Thực thể mới"
        open={isEntityModalOpen}
        onCancel={() => setIsEntityModalOpen(false)}
        footer={null}
        destroyOnHidden // Sử dụng thuộc tính mới của AntD v6 thay cho destroyOnClose
      >
        <Form
          form={entityForm}
          layout="vertical"
          onFinish={handleCreateEntity}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Tên thực thể hiển thị"
            rules={[{ required: true, message: "Vui lòng nhập tên hiển thị!" }]}
          >
            <Input placeholder="ví dụ: Đơn hàng, Hợp đồng lao động" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã Code thực thể (Chữ hoa viết liền không dấu)"
            rules={[
              { required: true, message: "Vui lòng nhập mã code!" },
              {
                pattern: /^[A-Z0-9_]+$/,
                message:
                  "Mã code phải viết hoa, không dấu, ngăn cách bằng gạch dưới (_)",
              },
            ]}
          >
            <Input placeholder="ví dụ: ORDER, CUSTOMER_CONTRACT" />
          </Form.Item>

          <Form.Item
            name="autoCodePattern"
            label="Mẫu tự động sinh mã nghiệp vụ (Tùy chọn)"
            tooltip="Hệ thống hỗ trợ tự tăng số. Ví dụ: PR-{SEQ:4} sẽ sinh mã PR-0001, PR-0002"
          >
            <Input placeholder="ví dụ: HD-{SEQ:4}" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả thực thể">
            <TextArea
              rows={3}
              placeholder="Mô tả ngắn gọn về vai trò của thực thể dữ liệu này"
            />
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsEntityModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit">
                Tạo thực thể
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* COMPONENT THIẾT LẬP DỰA TRÊN TRÌNH XÂY DỰNG TRƯỜNG DỮ LIỆU ĐỘNG */}
      <FieldBuilderModal
        open={isFieldModalOpen}
        onCancel={() => setIsFieldModalOpen(false)}
        onFinish={handleCreateField}
        confirmLoading={isCreatingField}
        selectedEntity={selectedEntity}
        entities={entityList}
      />
    </div>
  );
}
