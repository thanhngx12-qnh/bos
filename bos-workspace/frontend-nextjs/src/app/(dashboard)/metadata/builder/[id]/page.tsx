// File: src/app/(dashboard)/metadata/builder/[id]/page.tsx
"use client";

import React, { useEffect } from "react";
import {
  Tabs,
  Spin,
  Space,
  Typography,
  Card,
  Button,
  Alert,
  Row,
  Col,
} from "antd";
import {
  SettingOutlined,
  DeploymentUnitOutlined,
  BuildOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  DndContext as DndKitContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import { useBuilderStore } from "@/hooks/useBuilderStore";
import { useEntityDetail } from "@/hooks/useEntityDetail";
import { useFields } from "@/hooks/useFields"; // 🛑 IMPORT: Nạp hook lấy cấu trúc trường độc lập [2]
import SettingsTab from "@/components/metadata/SettingsTab";
import Toolbox from "@/components/metadata/Toolbox";
import Canvas from "@/components/metadata/Canvas";
import PropertiesPanel from "@/components/metadata/PropertiesPanel";
import WorkflowTab from "@/components/metadata/WorkflowTab";

const { Title, Text } = Typography;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BuilderPage({ params }: PageProps) {
  const { id: entityId } = React.use(params);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentTenant = localStorage.getItem("tenant_id");
      if (!currentTenant) {
        localStorage.setItem("tenant_id", "1");
      }
    }
  }, []);

  const {
    entity,
    fields,
    addedFields,
    updatedFields,
    deletedFieldIds,
    selectedFieldId,
    isDirty,
    setEntity,
    initializeFields,
    setSelectedFieldId,
    addField,
    removeField,
    reorderFields,
    resetChanges,
    clearStore,
  } = useBuilderStore();

  // 1. Tải thông tin chung của Thực thể
  const {
    entity: fetchedEntity,
    isLoading: isFetchingEntity,
    updateEntity,
    isUpdating,
  } = useEntityDetail(entityId);

  // 🛑 2. CHỐT CHẶN KIẾN TRÚC V8.1: Gọi đồng bộ danh sách trường dữ liệu động và hàm Lưu hàng loạt [2]
  const {
    fields: dbFields,
    isLoading: isLoadingFields,
    syncFields,
    isSyncing,
  } = useFields(Number(entityId));

  // 3. Đồng bộ hóa thông tin Thực thể vào Zustand Store khi tải xong
  useEffect(() => {
    if (fetchedEntity) {
      setEntity(fetchedEntity);
    }
  }, [fetchedEntity, setEntity]);

  // 🛑 4. ĐỒNG BỘ HOÀN HẢO V8.1: Nạp mảng trường dynamic từ DB độc lập vào Zustand Store để thiết kế [2]
  useEffect(() => {
    if (dbFields) {
      initializeFields(dbFields);
    }
  }, [dbFields, initializeFields]);

  useEffect(() => {
    return () => {
      clearStore();
    };
  }, [clearStore]);

  // Cấu hình PointerSensor tối ưu
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const handleAddToolboxItem = (type: string) => {
    const tempCode = `${type.toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;
    addField({
      name: `Trường ${type.toLowerCase()}`,
      code: tempCode,
      type: type,
      isRequired: false,
      sortOrder: fields.length,
      options: {},
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId.startsWith("toolbox_")) {
      const type = activeId.replace("toolbox_", "");
      handleAddToolboxItem(type);
    } else if (activeId !== overId) {
      const oldIndex = fields.findIndex((f) => f.id === activeId);
      const newIndex = fields.findIndex((f) => f.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(fields, oldIndex, newIndex);
        reorderFields(reordered);
      }
    }
  };

  const handleSaveChanges = async () => {
    console.log("[DEBUG-BOS] Bắt đầu đồng bộ danh sách trường dữ liệu...");
    try {
      await syncFields({
        added: addedFields,
        updated: updatedFields,
        deleted: deletedFieldIds,
      });
    } catch (err) {
      console.error("[DEBUG-BOS] Đồng bộ dữ liệu thất bại:", err);
    }
  };

  // Khóa màn hình chờ thông minh: Chỉ mở khóa khi cả Entity và Fields đều nạp xong [2]
  if (isFetchingEntity || isLoadingFields) {
    return (
      <div
        style={{
          height: "400px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Space orientation="vertical" align="center">
          <Spin size="large" />
          <Text type="secondary">
            Đang nạp cấu trúc không gian làm việc BOS Workspace...
          </Text>
        </Space>
      </div>
    );
  }

  const tabItems = [
    {
      key: "form-builder",
      label: (
        <span>
          <BuildOutlined />
          Thiết kế Giao diện (Form Builder)
        </span>
      ),
      children: (
        <DndKitContext sensors={sensors} onDragEnd={handleDragEnd}>
          <Row gutter={16} style={{ marginTop: "12px" }}>
            <Col xs={24} md={6}>
              <Toolbox onAddItem={handleAddToolboxItem} />
            </Col>

            <Col xs={24} md={12}>
              <Canvas
                fields={fields}
                selectedFieldId={selectedFieldId}
                onSelectField={setSelectedFieldId}
                onDeleteField={removeField}
              />
            </Col>

            <Col xs={24} md={6}>
              <PropertiesPanel />
            </Col>
          </Row>
        </DndKitContext>
      ),
    },
    {
      key: "workflow",
      label: (
        <span>
          <DeploymentUnitOutlined />
          Luồng quy trình (Workflow Designer)
        </span>
      ),
      children: (
        <WorkflowTab entityId={Number(entityId)} entity={fetchedEntity} />
      ),
    },
    {
      key: "settings",
      label: (
        <span>
          <SettingOutlined />
          Cấu hình Thực thể (Settings)
        </span>
      ),
      children: (
        <SettingsTab
          entity={fetchedEntity}
          onSave={updateEntity}
          isSaving={isUpdating}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "16px",
          borderBottom: "1px solid #f0f0f0",
          marginBottom: "20px",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Không gian kiến tạo biểu mẫu: {fetchedEntity?.name || "Đang tải..."}
          </Title>
          <Text type="secondary">
            Mã code hệ thống: <strong>{fetchedEntity?.code || "N/A"}</strong>
          </Text>
        </div>
        <Space size="middle">
          {isDirty && (
            <Button onClick={resetChanges} danger disabled={isSyncing}>
              Hoàn tác thay đổi
            </Button>
          )}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSaveChanges}
            disabled={!isDirty}
            loading={isSyncing}
          >
            Lưu thay đổi
          </Button>
        </Space>
      </div>

      {isDirty && (
        <Alert
          message="Bạn đang có các cấu hình giao diện chưa được lưu xuống cơ sở dữ liệu."
          type="info"
          showIcon
          style={{ marginBottom: "20px" }}
        />
      )}

      <Card
        variant="borderless"
        style={{ flexGrow: 1, boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}
      >
        <Tabs defaultActiveKey="form-builder" items={tabItems} />
      </Card>
    </div>
  );
}
