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
  Select,
} from "antd";
import {
  UndoOutlined,
  SaveOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  BoldOutlined,
  ItalicOutlined,
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
  const [type, setType] = useState<"DRAW" | "IMAGE" | "STAMP" | "TEXT">("DRAW");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  // States cho chữ ký văn bản (TEXT)
  const [textVal, setTextVal] = useState("");
  const [textFont, setTextFont] = useState("Dancing Script");
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(true);
  const [textColor, setTextColor] = useState("#0000ff");

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

  const convertTextToImage = (
    text: string,
    font: string,
    isBold: boolean,
    isItalic: boolean,
    color: string
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 500;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Set font style
    const styleString = `${isItalic ? "italic " : ""}${isBold ? "bold " : ""}56px "${font}", cursive, sans-serif`;
    ctx.font = styleString;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw text in the center
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    return canvas.toDataURL("image/png");
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
    } else if (type === "TEXT") {
      if (!textVal.trim()) {
        message.warning("Vui lòng nhập nội dung chữ ký văn bản.");
        return;
      }
      signatureUrl = convertTextToImage(textVal.trim(), textFont, textBold, textItalic, textColor);
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
          setTextVal("");
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

  const getTypeLabel = (t: "DRAW" | "IMAGE" | "STAMP" | "TEXT") => {
    switch (t) {
      case "DRAW":
        return <Tag color="blue">Ký tay điện tử</Tag>;
      case "TEXT":
        return <Tag color="orange">Ký chữ viết</Tag>;
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
                <Radio.Button value="TEXT">Tạo chữ ký chữ</Radio.Button>
                <Radio.Button value="IMAGE">Tải ảnh chữ ký</Radio.Button>
                <Radio.Button value="STAMP">Tải ảnh con dấu</Radio.Button>
              </Radio.Group>
            </div>

            {type === "DRAW" && (
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
            )}

            {type === "TEXT" && (
              <div>
                <link
                  rel="stylesheet"
                  href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&family=Pacifico&family=Great+Vibes&family=Mrs+Saint+Delafield&family=Yellowtail&family=Montserrat:ital,wght@0,400;0,700;1,400&display=swap"
                />
                <Text strong style={{ display: "block", marginBottom: "6px" }}>
                  Nhập nội dung chữ ký:
                </Text>
                <Input
                  placeholder="Nhập tên chữ ký (Ví dụ: Nguyễn Văn A)"
                  value={textVal}
                  onChange={(e) => {
                    setTextVal(e.target.value);
                    if (!name) {
                      setName(`Chữ ký ${e.target.value}`);
                    }
                  }}
                  style={{ marginBottom: "12px" }}
                />

                <Row gutter={[12, 12]} style={{ marginBottom: "12px" }}>
                  <Col span={12}>
                    <Text strong style={{ display: "block", marginBottom: "6px", fontSize: "12px" }}>
                      Font chữ:
                    </Text>
                    <Select
                      className="w-full"
                      value={textFont}
                      onChange={setTextFont}
                      options={[
                        { value: "Dancing Script", label: "Cursive (Dancing Script)" },
                        { value: "Pacifico", label: "Friendly (Pacifico)" },
                        { value: "Great Vibes", label: "Elegant (Great Vibes)" },
                        { value: "Mrs Saint Delafield", label: "Handwriting (Mrs Saint)" },
                        { value: "Yellowtail", label: "Brush (Yellowtail)" },
                        { value: "Montserrat", label: "Sans-Serif (Montserrat)" },
                      ]}
                    />
                  </Col>
                  <Col span={12}>
                    <Text strong style={{ display: "block", marginBottom: "6px", fontSize: "12px" }}>
                      Màu sắc:
                    </Text>
                    <Select
                      className="w-full"
                      value={textColor}
                      onChange={setTextColor}
                      options={[
                        { value: "#0000ff", label: "Xanh nước biển (Mặc định)" },
                        { value: "#000000", label: "Đen lịch sự" },
                        { value: "#ff0000", label: "Đỏ ký duyệt" },
                        { value: "#2e7d32", label: "Xanh lá cây" },
                      ]}
                    />
                  </Col>
                </Row>

                <div style={{ marginBottom: "12px" }}>
                  <Text strong style={{ display: "block", marginBottom: "6px", fontSize: "12px" }}>
                    Định dạng chữ:
                  </Text>
                  <Space>
                    <Button
                      type={textBold ? "primary" : "default"}
                      icon={<BoldOutlined />}
                      onClick={() => setTextBold(!textBold)}
                    >
                      In đậm
                    </Button>
                    <Button
                      type={textItalic ? "primary" : "default"}
                      icon={<ItalicOutlined />}
                      onClick={() => setTextItalic(!textItalic)}
                    >
                      In nghiêng
                    </Button>
                  </Space>
                </div>

                <div>
                  <Text strong style={{ display: "block", marginBottom: "6px" }}>
                    Xem trước chữ ký:
                  </Text>
                  <div
                    style={{
                      height: "140px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fdfdfd",
                      border: "2px dashed #d9d9d9",
                      borderRadius: "8px",
                      padding: "16px",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: `"${textFont}", cursive, sans-serif`,
                        fontSize: "40px",
                        color: textColor,
                        fontWeight: textBold ? "bold" : "normal",
                        fontStyle: textItalic ? "italic" : "normal",
                        whiteSpace: "nowrap",
                        userSelect: "none",
                      }}
                    >
                      {textVal || "Mẫu chữ ký"}
                    </span>
                  </div>
                  <Paragraph type="secondary" style={{ fontSize: "11px", marginTop: "4px" }}>
                    Hình ảnh chữ ký sẽ được lưu với nền trong suốt (không có viền dashed ở trên).
                  </Paragraph>
                </div>
              </div>
            )}

            {(type === "IMAGE" || type === "STAMP") && (
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
                      <Text strong style={{ color: "#52c41a" }}>
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
