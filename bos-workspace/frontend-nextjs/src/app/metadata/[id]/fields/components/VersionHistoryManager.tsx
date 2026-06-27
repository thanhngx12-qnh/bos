// File: src/app/metadata/[id]/fields/components/VersionHistoryManager.tsx
"use client";

import React, { useState } from "react";
import {
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Card,
  Popconfirm,
  App,
  Modal,
  Badge,
  Descriptions,
  Empty,
  Tooltip,
} from "antd";
import {
  ClockCircleOutlined,
  RollbackOutlined,
  EyeOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import { useEntityVersions, useRestoreEntityVersion, EntityVersion } from "@/hooks/useEntities";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;

interface VersionHistoryManagerProps {
  entityId: number;
}

export default function VersionHistoryManager({ entityId }: VersionHistoryManagerProps) {
  const { message } = App.useApp();
  
  // Fetch versions list
  const { data: versions = [], isLoading, refetch } = useEntityVersions(entityId);
  const restoreVersionMutation = useRestoreEntityVersion();

  // State to preview snapshot fields
  const [previewVersion, setPreviewVersion] = useState<EntityVersion | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Identify current version (highest version number in the list)
  const latestVersionNumber = versions.length > 0 ? Math.max(...versions.map(v => v.version)) : 0;

  const handleRestore = (version: EntityVersion) => {
    restoreVersionMutation.mutate(
      { entityId, versionId: version.id },
      {
        onSuccess: (newVer) => {
          message.success(`Đã khôi phục thực thể về phiên bản V${version.version} thành công! (Phiên bản hiện tại mới: V${newVer.version})`);
          refetch();
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Lỗi khi khôi phục phiên bản.";
          message.error(errMsg);
        },
      }
    );
  };

  const handlePreview = (version: EntityVersion) => {
    setPreviewVersion(version);
    setIsPreviewOpen(true);
  };

  const columns = [
    {
      title: "Phiên bản",
      dataIndex: "version",
      key: "version",
      width: 120,
      render: (version: number) => {
        const isCurrent = version === latestVersionNumber;
        return (
          <Space>
            <Tag color={isCurrent ? "green" : "blue"} style={{ fontWeight: "bold" }}>
              V{version}
            </Tag>
            {isCurrent && <Badge status="processing" text="Hiện tại" />}
          </Space>
        );
      },
    },
    {
      title: "Mã định danh Snapshot",
      dataIndex: "snapshotHash",
      key: "snapshotHash",
      render: (hash: string) => <Text code>{hash}</Text>,
    },
    {
      title: "Số lượng trường",
      dataIndex: "fieldsSnapshot",
      key: "fieldsCount",
      width: 150,
      render: (fields: any[]) => (
        <Text strong>{Array.isArray(fields) ? fields.length : 0} trường</Text>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm:ss"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 220,
      render: (_: any, record: EntityVersion) => {
        const isCurrent = record.version === latestVersionNumber;
        return (
          <Space size="middle">
            <Button
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            >
              Chi tiết
            </Button>
            <Popconfirm
              title={`Khôi phục về phiên bản V${record.version}?`}
              description="Hành động này sẽ thay thế toàn bộ thiết kế trường hiện tại bằng phiên bản này. Bạn có chắc chắn muốn tiếp tục?"
              onConfirm={() => handleRestore(record)}
              okText="Đồng ý"
              cancelText="Hủy"
              disabled={isCurrent}
            >
              <Button
                type="primary"
                ghost
                danger={!isCurrent}
                icon={<RollbackOutlined />}
                disabled={isCurrent}
                loading={restoreVersionMutation.isPending}
              >
                Khôi phục
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const previewFields = Array.isArray(previewVersion?.fieldsSnapshot)
    ? previewVersion.fieldsSnapshot
    : [];

  const previewColumns = [
    {
      title: "Tên trường",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "Mã trường (Code)",
      dataIndex: "code",
      key: "code",
      render: (code: string) => <Tag color="cyan">{code}</Tag>,
    },
    {
      title: "Kiểu dữ liệu",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Tag color="purple">{type}</Tag>,
    },
    {
      title: "Mô tả / Cấu hình",
      key: "config",
      render: (_: any, record: any) => {
        const desc = record.config?.description || "";
        const isRequired = record.config?.required ? "Bắt buộc" : "Tùy chọn";
        return (
          <Space direction="vertical" size={2}>
            {desc && <Text type="secondary">{desc}</Text>}
            <Tag color={record.config?.required ? "red" : "default"}>{isRequired}</Tag>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <Space>
          <HistoryOutlined style={{ color: "#0050b3" }} />
          <Text strong>Lịch sử các phiên bản thiết kế biểu mẫu</Text>
        </Space>
      }
      className="shadow-sm"
    >
      <Paragraph type="secondary">
        Mỗi khi bạn thêm, sửa, hoặc xóa các trường trong thiết kế, hệ thống sẽ tự động lưu lại một bản chụp (snapshot). Bạn có thể khôi phục thiết kế biểu mẫu về bất kỳ phiên bản nào trước đó.
      </Paragraph>

      <Table
        dataSource={versions}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: <Empty description="Chưa có dữ liệu phiên bản lưu trữ nào cho thực thể này." />,
        }}
      />

      {/* MODAL XEM CHI TIẾT TRƯỜNG TRONG SNAPSHOT */}
      <Modal
        title={
          <Space>
            <ClockCircleOutlined style={{ color: "#1890ff" }} />
            <span>Chi tiết thiết kế phiên bản V{previewVersion?.version}</span>
          </Space>
        }
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsPreviewOpen(false)}>
            Đóng
          </Button>,
          previewVersion && previewVersion.version !== latestVersionNumber && (
            <Popconfirm
              key="restore"
              title={`Khôi phục về phiên bản V${previewVersion.version}?`}
              description="Thay thế cấu hình hiện tại bằng phiên bản này?"
              onConfirm={() => {
                setIsPreviewOpen(false);
                handleRestore(previewVersion);
              }}
              okText="Khôi phục"
              cancelText="Hủy"
            >
              <Button
                type="primary"
                icon={<RollbackOutlined />}
                loading={restoreVersionMutation.isPending}
              >
                Khôi phục phiên bản này
              </Button>
            </Popconfirm>
          ),
        ]}
        width={800}
      >
        {previewVersion && (
          <Space direction="vertical" size="middle" className="w-full" style={{ marginTop: "12px" }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã định danh">{previewVersion.snapshotHash}</Descriptions.Item>
              <Descriptions.Item label="Ngày lưu">{dayjs(previewVersion.createdAt).format("DD/MM/YYYY HH:mm:ss")}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={previewVersion.version === latestVersionNumber ? "green" : "blue"}>
                  {previewVersion.version === latestVersionNumber ? "Bản hiện tại" : "Lịch sử"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng số trường">{previewFields.length}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ margin: "8px 0 0 0" }}>Danh sách trường dữ liệu</Title>
            <Table
              dataSource={previewFields}
              columns={previewColumns}
              rowKey="code"
              pagination={{ pageSize: 5 }}
              size="small"
              bordered
            />
          </Space>
        )}
      </Modal>
    </Card>
  );
}
