// File: src/components/SignatureManager.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Input,
  Radio,
  Space,
  Typography,
  Tag,
  Popconfirm,
  App,
  Empty,
  Spin,
  Divider,
} from "antd";
import {
  UndoOutlined,
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  useSignatures,
  useCreateSignature,
  useSetDefaultSignature,
  useDeleteSignature,
} from "@/hooks/useSignatures";

const { Title, Text, Paragraph } = Typography;

export default function SignatureManager() {
  const { message } = App.useApp();
  const { data: signatures = [], isLoading, refetch } = useSignatures();
  const createMutation = useCreateSignature();
  const setDefaultMutation = useSetDefaultSignature();
  const deleteMutation = useDeleteSignature();

  // State
  const [name, setName] = useState("");
  const [type, setType] = useState<"DRAW" | "IMAGE" | "STAMP">("DRAW");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // Initialize Canvas
  useEffect(() => {
    if (type === "DRAW" && canvasRef.current) {
      initCanvas();
    }
  }, [type]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#0000ff"; // Blue color for natural handwriting
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastX.current = e.clientX - rect.left;
    lastY.current = e.clientY - rect.top;
    setIsDrawing(true);
    e.preventDefault();
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastX.current = currentX;
    lastY.current = currentY;
    setHasDrawn(true);
    e.preventDefault();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng tải lên tệp ảnh hợp lệ (PNG, JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) {
      message.warning("Vui lòng nhập tên cho mẫu chữ ký/con dấu.");
      return;
    }

    let signatureUrl = "";
    if (type === "DRAW") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        message.warning("Vui lòng vẽ chữ ký của bạn trước khi lưu.");
        return;
      }
      signatureUrl = canvas.toDataURL("image/png");
    } else {
      if (!fileBase64) {
        message.warning("Vui lòng tải lên hình ảnh chữ ký/con dấu của bạn.");
        return;
      }
      signatureUrl = fileBase64;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        type,
        signatureUrl,
      },
      {
        onSuccess: () => {
          message.success("Lưu mẫu chữ ký/con dấu thành công!");
          setName("");
          setFileBase64(null);
          setFileName("");
          if (type === "DRAW") {
            initCanvas();
          }
          refetch();
        },
        onError: (err: any) => {
          message.error(
            err?.response?.data?.message || "Có lỗi xảy ra khi lưu mẫu chữ ký."
          );
        },
      }
    );
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id, {
      onSuccess: () => {
        message.success("Đặt làm mặc định thành công!");
        refetch();
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        message.success("Xóa mẫu chữ ký thành công!");
        refetch();
      },
    });
  };

  const getTypeLabel = (t: "DRAW" | "IMAGE" | "STAMP") => {
    switch (t) {
      case "DRAW":
        return <Tag color="blue">Ký tay điện tử</Tag>;
      case "IMAGE":
        return <Tag color="purple">Ảnh chữ ký</Tag>;
      case "STAMP":
        return <Tag color="red">Con dấu đỏ</Tag>;
    }
  };

  return (
    <Card bordered={false} className="shadow-sm">
      <Row gutter={[24, 24]}>
        {/* LEFT COLUMN: LIST OF EXISTING TEMPLATES */}
        <Col xs={24} lg={12}>
          <div style={{ marginBottom: "16px" }}>
            <Title level={4} style={{ margin: 0 }}>
              Danh sách Mẫu chữ ký & Con dấu
            </Title>
            <Paragraph type="secondary" style={{ fontSize: "13px", marginTop: "4px" }}>
              Danh sách các mẫu chữ ký cá nhân và con dấu cơ quan được cấu hình sẵn để ký duyệt hồ sơ.
            </Paragraph>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <Spin tip="Đang tải dữ liệu..." />
            </div>
          ) : signatures.length === 0 ? (
            <Empty
              description="Bạn chưa cấu hình mẫu chữ ký/con dấu nào."
              style={{ padding: "40px 0" }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {signatures.map((sig) => (
                <Col span={24} key={sig.id}>
                  <Card
                    hoverable
                    size="small"
                    style={{
                      border: sig.isDefault ? "1px solid #1890ff" : "1px solid #f0f0f0",
                      background: sig.isDefault ? "#e6f7ff" : "#ffffff",
                    }}
                    bodyStyle={{ padding: "12px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <Space>
                          <Text strong style={{ fontSize: "14px" }}>
                            {sig.name}
                          </Text>
                          {sig.isDefault && (
                            <Tag color="processing" icon={<CheckCircleOutlined />}>
                              Mặc định
                            </Tag>
                          )}
                        </Space>
                        <div style={{ marginTop: "4px" }}>{getTypeLabel(sig.type)}</div>
                      </div>
                      <Space>
                        {!sig.isDefault && sig.type !== "STAMP" && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => handleSetDefault(sig.id)}
                            loading={setDefaultMutation.isPending}
                          >
                            Mặc định
                          </Button>
                        )}
                        <Popconfirm
                          title="Bạn muốn xóa mẫu chữ ký/con dấu này?"
                          onConfirm={() => handleDelete(sig.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button
                            type="link"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            loading={deleteMutation.isPending}
                          >
                            Xóa
                          </Button>
                        </Popconfirm>
                      </Space>
                    </div>

                    <Divider style={{ margin: "8px 0" }} />

                    <div
                      style={{
                        height: "100px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ffffff",
                        border: "1px dashed #e8e8e8",
                        borderRadius: "4px",
                        padding: "8px",
                      }}
                    >
                      <img
                        src={sig.signatureUrl}
                        alt={sig.name}
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>

        {/* RIGHT COLUMN: ADD NEW TEMPLATES */}
        <Col xs={24} lg={12}>
          <div style={{ marginBottom: "16px" }}>
            <Title level={4} style={{ margin: 0 }}>
              Cấu hình mẫu chữ ký mới
            </Title>
            <Paragraph type="secondary" style={{ fontSize: "13px", marginTop: "4px" }}>
              Tạo mới mẫu chữ ký tay điện tử hoặc tải lên tệp ảnh chữ ký, con dấu đỏ của bạn.
            </Paragraph>
          </div>

          <Space direction="vertical" size="middle" className="w-full" style={{ display: "flex" }}>
            <div>
              <Text strong style={{ display: "block", marginBottom: "6px" }}>
                Tên mẫu chữ ký / con dấu:
              </Text>
              <Input
                placeholder="Ví dụ: Chữ ký chính, Chữ ký nháy, Con dấu công ty..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
            </div>

            <div>
              <Text strong style={{ display: "block", marginBottom: "6px" }}>
                Hình thức cấu hình:
              </Text>
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <Radio.Button value="DRAW">Vẽ tay chữ ký</Radio.Button>
                <Radio.Button value="IMAGE">Tải ảnh chữ ký</Radio.Button>
                <Radio.Button value="STAMP">Tải ảnh con dấu</Radio.Button>
              </Radio.Group>
            </div>

            {type === "DRAW" ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <Text strong>Khung vẽ chữ ký tay:</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={initCanvas}
                    disabled={!hasDrawn}
                  >
                    Vẽ lại
                  </Button>
                </div>
                <div
                  style={{
                    border: "2px dashed #bfbfbf",
                    borderRadius: "8px",
                    overflow: "hidden",
                    cursor: "crosshair",
                    background: "#ffffff",
                  }}
                >
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={180}
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    style={{ display: "block", width: "100%", touchAction: "none" }}
                  />
                </div>
                <Paragraph type="secondary" style={{ fontSize: "11px", marginTop: "4px" }}>
                  Mẹo: Dùng chuột hoặc bút vẽ/màn hình cảm ứng vẽ vào khung trên.
                </Paragraph>
              </div>
            ) : (
              <div>
                <Text strong style={{ display: "block", marginBottom: "6px" }}>
                  Tải lên tệp ảnh (Hỗ trợ PNG nền trong suốt để đè tối ưu):
                </Text>
                <div
                  style={{
                    border: "2px dashed #bfbfbf",
                    borderRadius: "8px",
                    padding: "20px",
                    textAlign: "center",
                    background: "#fafafa",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={() => document.getElementById("sig-file-upload")?.click()}
                >
                  <input
                    id="sig-file-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                  <UploadOutlined style={{ fontSize: "24px", color: "#8c8c8c", marginBottom: "8px" }} />
                  <div>
                    {fileName ? (
                      <Text strong color="success">
                        ✓ {fileName}
                      </Text>
                    ) : (
                      <Text type="secondary">
                        Bấm hoặc Kéo thả tệp ảnh vào đây để chọn tệp.
                      </Text>
                    )}
                  </div>
                </div>

                {fileBase64 && (
                  <div style={{ marginTop: "16px" }}>
                    <Text strong style={{ display: "block", marginBottom: "6px" }}>
                      Xem trước hình ảnh:
                    </Text>
                    <div
                      style={{
                        height: "120px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#ffffff",
                        border: "1px solid #f0f0f0",
                        borderRadius: "4px",
                        padding: "8px",
                      }}
                    >
                      <img
                        src={fileBase64}
                        alt="Preview"
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={createMutation.isPending}
              block
              size="large"
              style={{ marginTop: "12px" }}
            >
              Lưu cấu hình
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
