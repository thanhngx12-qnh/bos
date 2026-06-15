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
  Statistic,
  Divider,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  DatabaseOutlined,
  SettingOutlined,
  EyeOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  BarcodeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useEntities } from "@/hooks/useEntities";
import { useFields } from "@/hooks/useFields";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export default function MetadataPage() {
  const router = useRouter();

  // Tải danh sách thực thể từ Backend thông qua TanStack Query
  const {
    entities,
    isLoading: isLoadingEntities,
    createEntity,
    removeEntity,
  } = useEntities();
  const [selectedEntity, setSelectedEntity] = useState<any>(null);

  // Nạp danh sách các Fields thuộc về Thực thể đang chọn
  const { fields, isLoading: isLoadingFields } = useFields(selectedEntity?.id);

  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [entityForm] = Form.useForm();

  // Giải nén mảng danh sách an toàn
  const entityList = Array.isArray(entities)
    ? entities
    : (entities as any)?.data || (entities as any)?.items || [];

  // Tự động chọn thực thể đầu tiên khi tải xong danh sách
  useEffect(() => {
    if (entityList.length > 0 && !selectedEntity) {
      setSelectedEntity(entityList[0]);
    }
  }, [entityList, selectedEntity]);

  const handleCreateEntity = async (values: any) => {
    try {
      await createEntity(values);
      setIsEntityModalOpen(false);
      entityForm.resetFields();
    } catch (e) {
      console.error("[DEBUG-BOS] handleCreateEntity failed:", e);
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

  // Hàm ánh xạ màu sắc trực quan cho từng loại trường dữ liệu (Metadata-Driven Coloring) [2]
  const getFieldTypeTag = (type: string) => {
    switch (type) {
      case "TEXT":
        return <Tag color="blue">TEXT</Tag>;
      case "NUMBER":
        return <Tag color="green">NUMBER</Tag>;
      case "DATE":
        return <Tag color="purple">DATE</Tag>;
      case "DATETIME":
        return <Tag color="magenta">DATETIME</Tag>;
      case "SELECT":
        return <Tag color="orange">SELECT</Tag>;
      case "LOOKUP":
        return <Tag color="gold">LOOKUP</Tag>;
      case "TABLE":
        return <Tag color="cyan">TABLE</Tag>;
      case "FORMULA":
        return <Tag color="geekblue">FORMULA</Tag>;
      default:
        return <Tag color="default">{type}</Tag>;
    }
  };

  // Cột hiển thị danh sách thực thể bên trái
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
          description="Lưu ý: Hành động này sẽ xóa toàn bộ cấu trúc trường liên quan."
          okText="Xóa"
          cancelText="Hủy"
          onConfirm={() => handleDeleteEntity(record.id)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // Cột hiển thị trường dữ liệu chi tiết bên phải
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
      title: "Kiểu dữ liệu",
      dataIndex: "type",
      key: "type",
      render: (type: string) => getFieldTypeTag(type),
    },
    {
      title: "Yêu cầu nhập",
      dataIndex: "isRequired",
      key: "isRequired",
      render: (isRequired: boolean) => (
        <Tag color={isRequired ? "red" : "gray"}>
          {isRequired ? "Bắt buộc" : "Tùy chọn"}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <Title level={3}>Trung tâm Kiến tạo cấu trúc (Metadata Hub)</Title>
        <Paragraph type="secondary">
          Quản lý toàn bộ vòng đời cấu trúc thực thể Low-code. Định nghĩa thực
          thể, gán luồng phê duyệt và theo dõi các trường dữ liệu động.
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* CỘT TRÁI (33%): DANH SÁCH THỰC THỂ */}
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

        {/* CỘT PHẢI (67%): CHI TIẾT THÔNG TIN CHUNG VÀ TRƯỜNG DỮ LIỆU */}
        <Col xs={24} md={16}>
          {selectedEntity ? (
            <Card
              title={
                <Space orientation="vertical" size={2}>
                  <Title level={4} style={{ margin: 0 }}>
                    Thực thể: {selectedEntity.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: "13px" }}>
                    Mã code: <strong>{selectedEntity.code}</strong>
                  </Text>
                </Space>
              }
              // Thanh hành động tập trung cao cấp - Chuyển Workspace làm nút chính (Primary) [1]
              extra={
                <Space>
                  <Button
                    type="primary"
                    icon={<SettingOutlined />}
                    onClick={() =>
                      router.push(`/metadata/builder/${selectedEntity.id}`)
                    }
                  >
                    Vào Không gian thiết kế (Workspace)
                  </Button>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() =>
                      router.push(`/entities/${selectedEntity.id}`)
                    }
                  >
                    Vận hành dữ liệu (Grid)
                  </Button>
                </Space>
              }
              variant="borderless"
              style={{
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                minHeight: "600px",
              }}
            >
              {/* BẢNG CHỈ SỐ THỐNG KÊ CHI TIẾT (ENTITY STATS HUB) [2] */}
              <div
                style={{
                  background: "#fafafa",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "24px",
                }}
              >
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="Tổng số trường"
                      value={fields.length}
                      prefix={
                        <AppstoreOutlined
                          style={{ color: "#1677ff", marginRight: "4px" }}
                        />
                      }
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Quy trình liên kết"
                      value={
                        selectedEntity.workflows?.length > 0
                          ? "Đã kích hoạt"
                          : "Chưa cấu hình"
                      }
                      prefix={
                        <DeploymentUnitOutlined
                          style={{
                            color:
                              selectedEntity.workflows?.length > 0
                                ? "#52c41a"
                                : "#ff4d4f",
                            marginRight: "4px",
                          }}
                        />
                      }
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Định dạng tự sinh mã"
                      value={selectedEntity.autoCodePattern || "N/A"}
                      prefix={
                        <BarcodeOutlined
                          style={{ color: "#fa8c16", marginRight: "4px" }}
                        />
                      }
                    />
                  </Col>
                </Row>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <Text strong>Mô tả chi tiết thực thể: </Text>
                <Text>
                  {selectedEntity.description ||
                    "Chưa có mô tả chi tiết cho thực thể này."}
                </Text>
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div style={{ marginBottom: "12px" }}>
                <Text strong style={{ fontSize: "13px", color: "#595959" }}>
                  DANH SÁCH CẤU TRÚC TRƯỜNG DỮ LIỆU ĐANG HOẠT ĐỘNG
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
        destroyOnHidden // Sử dụng thuộc tính chuẩn v6
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
    </div>
  );
}
