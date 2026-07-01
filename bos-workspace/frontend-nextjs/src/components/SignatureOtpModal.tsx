// File: src/components/SignatureOtpModal.tsx
"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  App,
  Select,
  Radio,
  Checkbox,
  Row,
  Col,
  Divider,
} from "antd";
import {
  EditOutlined,
  MailOutlined,
  KeyOutlined,
  UndoOutlined,
  LayoutOutlined,
  SafetyCertificateOutlined,
  BoldOutlined,
  ItalicOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/axios";
import { useSignatures } from "@/hooks/useSignatures";
import { useStepCandidates } from "@/hooks/useWorkflows";

const { Text, Paragraph } = Typography;

interface SignatureOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    signatureData: string,
    otpCode: string,
    stampData?: string,
    signatureLayout?: string,
    showSignerName?: boolean,
    showSignerRole?: boolean,
    showSignerDept?: boolean,
    showSigningTime?: boolean,
    nextAssigneeId?: number,
    fontFamily?: string,
    fontSize?: number,
    fontBold?: boolean,
    fontItalic?: boolean
  ) => void;
  instanceId: number;
  transitionId: number;
  actionLabel: string;
  confirmLoading: boolean;
  nextStepStepId?: number | null;
}

export default function SignatureOtpModal({
  isOpen,
  onClose,
  onConfirm,
  instanceId,
  transitionId,
  actionLabel,
  confirmLoading,
  nextStepStepId,
}: SignatureOtpModalProps) {
  const { message } = App.useApp();
  const { data: signatures = [] } = useSignatures();

  // Next assignee selection
  const [nextAssigneeId, setNextAssigneeId] = useState<number | undefined>(undefined);
  const { data: stepCandidates = [] } = useStepCandidates(nextStepStepId || null);

  // Signature source state
  const [sigType, setSigType] = useState<"saved" | "draw">("draw"); // Default to draw if no saved ones
  const [selectedSigId, setSelectedSigId] = useState<number | undefined>(undefined);
  const [selectedStampId, setSelectedStampId] = useState<number | undefined>(undefined);

  // Settings states
  const [layout, setLayout] = useState<"vertical" | "horizontal">("vertical");
  const [showName, setShowName] = useState(true);
  const [showRole, setShowRole] = useState(true);
  const [showDept, setShowDept] = useState(true);
  const [showTime, setShowTime] = useState(true);

  // Styling states for accompanying text
  const [textFont, setTextFont] = useState("sans-serif");
  const [textSize, setTextSize] = useState(11);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);

  // Preset states & Interface
  interface SignaturePreset {
    name: string;
    layout: "vertical" | "horizontal";
    showName: boolean;
    showRole: boolean;
    showDept: boolean;
    showTime: boolean;
    textFont: string;
    textSize: number;
    textBold: boolean;
    textItalic: boolean;
  }
  const [presets, setPresets] = useState<SignaturePreset[]>([]);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | undefined>(undefined);
  const [newPresetName, setNewPresetName] = useState("");

  // Canvas states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canvasDataUrl, setCanvasDataUrl] = useState<string | null>(null);

  // OTP States
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [mockOtpCode, setMockOtpCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Drawing coordinates
  const lastX = useRef(0);
  const lastY = useRef(0);

  // User Profile from local storage
  const [userName, setUserName] = useState("Thành viên");

  // Load username and populate defaults on open
  useEffect(() => {
    if (isOpen) {
      if (typeof window !== "undefined") {
        const storedName = localStorage.getItem("bos_user_name");
        if (storedName) setUserName(storedName);

        const storedPresets = localStorage.getItem("bos_signature_presets");
        if (storedPresets) {
          try {
            setPresets(JSON.parse(storedPresets));
          } catch (e) {
            console.error("Failed to parse presets", e);
          }
        } else {
          const defaults: SignaturePreset[] = [
            {
              name: "Chữ ký Ngang - Chỉ tên (Times New Roman 13px)",
              layout: "horizontal",
              showName: true,
              showRole: false,
              showDept: false,
              showTime: false,
              textFont: "Times New Roman",
              textSize: 13,
              textBold: true,
              textItalic: false,
            },
            {
              name: "Chữ ký Dọc - Đầy đủ thông tin (Nghiêng)",
              layout: "vertical",
              showName: true,
              showRole: true,
              showDept: true,
              showTime: true,
              textFont: "sans-serif",
              textSize: 11,
              textBold: false,
              textItalic: true,
            }
          ];
          setPresets(defaults);
          localStorage.setItem("bos_signature_presets", JSON.stringify(defaults));
        }
      }

      setSelectedPresetIndex(undefined);
      setOtpCode("");
      setIsOtpSent(false);
      setMockOtpCode(null);
      setCountdown(0);
      setCanvasDataUrl(null);
      setHasDrawn(false);
      setNextAssigneeId(undefined);

      // Separate templates
      const sigs = signatures.filter((s) => s.type === "DRAW" || s.type === "IMAGE" || s.type === "TEXT");
      const defaultSig = sigs.find((s) => s.isDefault);
      const fallbackSig = sigs[0];

      if (defaultSig) {
        setSelectedSigId(defaultSig.id);
        setSigType("saved");
      } else if (fallbackSig) {
        setSelectedSigId(fallbackSig.id);
        setSigType("saved");
      } else {
        setSigType("draw");
      }

      const firstStamp = signatures.find((s) => s.type === "STAMP");
      if (firstStamp) {
        setSelectedStampId(firstStamp.id);
      } else {
        setSelectedStampId(undefined);
      }
    }
  }, [isOpen, signatures]);

  // Init canvas when sigType changes to "draw"
  useEffect(() => {
    if (isOpen && sigType === "draw" && canvasRef.current) {
      initCanvas();
    }
  }, [isOpen, sigType]);

  // Resend OTP countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#0000ff"; // Blue writing
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
    setCanvasDataUrl(null);
  };

  // Draw handlers
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
    const canvas = canvasRef.current;
    if (canvas) {
      setCanvasDataUrl(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    initCanvas();
  };

  const handleRequestOtp = async () => {
    setSendingOtp(true);
    try {
      const { data } = await api.post(
        `/api/v1/workflows/instances/${instanceId}/otp-request`,
        { transitionId }
      );
      setIsOtpSent(true);
      setCountdown(120);
      if (data.mockCode) {
        setMockOtpCode(data.mockCode);
      }
      message.success(data.message || "Mã OTP đã được gửi đến email của bạn.");
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || "Không thể gửi OTP xác thực lúc này."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = () => {
    let finalSignatureUrl = "";
    if (sigType === "draw") {
      if (!hasDrawn) {
        message.warning("Vui lòng vẽ chữ ký của bạn trước khi duyệt.");
        return;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        finalSignatureUrl = canvas.toDataURL("image/png");
      }
    } else {
      const sigTemplate = signatures.find((s) => s.id === selectedSigId);
      if (!sigTemplate) {
        message.warning("Vui lòng chọn một mẫu chữ ký đã lưu.");
        return;
      }
      finalSignatureUrl = sigTemplate.signatureUrl;
    }

    if (!otpCode || otpCode.length !== 6) {
      message.warning("Vui lòng nhập mã OTP 6 chữ số.");
      return;
    }

    if (nextStepStepId && !nextAssigneeId) {
      message.warning("Vui lòng chọn nhân sự duyệt tiếp theo.");
      return;
    }

    // Get stamp data
    const stampTemplate = signatures.find((s) => s.id === selectedStampId);
    const finalStampUrl = stampTemplate?.signatureUrl || undefined;

    onConfirm(
      finalSignatureUrl,
      otpCode,
      finalStampUrl,
      layout,
      showName,
      showRole,
      showDept,
      showTime,
      nextAssigneeId,
      textFont,
      textSize,
      textBold,
      textItalic
    );
  };

  // Preview properties
  const previewSigImg =
    sigType === "saved"
      ? signatures.find((s) => s.id === selectedSigId)?.signatureUrl
      : canvasDataUrl;

  const previewStampImg = signatures.find((s) => s.id === selectedStampId)?.signatureUrl;

  const sampleRole = "Tổng Giám Đốc";
  const sampleDept = "Ban Điều Hành";
  const sampleTime = new Date().toLocaleString("vi-VN");

  return (
    <Modal
      title={
        <Space>
          <EditOutlined style={{ color: "#1890ff" }} />
          <span>Xác thực Chữ ký số & OTP: {actionLabel}</span>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={confirmLoading}>
          Hủy bỏ
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={confirmLoading}
          disabled={!isOtpSent}
        >
          Ký & Phê duyệt
        </Button>,
      ]}
      width={720}
      destroyOnClose
    >
      <div style={{ marginTop: "12px" }}>
        <Paragraph type="secondary" style={{ fontSize: "13px" }}>
          Hành động <strong>"{actionLabel}"</strong> yêu cầu bạn thực hiện ký số điện tử kèm theo xác thực mã OTP gửi về Email.
        </Paragraph>

        <Row gutter={20}>
          {/* LEFT: CONFIGURATION AND INPUTS */}
          <Col xs={24} md={13}>
            {/* 1. SIGNATURE SELECTION */}
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "6px" }}>
                Hình thức chữ ký:
              </Text>
              <Radio.Group
                value={sigType}
                onChange={(e) => setSigType(e.target.value)}
                optionType="button"
                buttonStyle="solid"
                style={{ marginBottom: "10px" }}
              >
                <Radio.Button value="saved" disabled={signatures.filter(s => s.type !== "STAMP").length === 0}>
                  Dùng chữ ký đã lưu
                </Radio.Button>
                <Radio.Button value="draw">Vẽ chữ ký trực tiếp</Radio.Button>
              </Radio.Group>

              {sigType === "saved" ? (
                <div>
                  <Select
                    placeholder="Chọn mẫu chữ ký..."
                    style={{ width: "100%" }}
                    value={selectedSigId}
                    onChange={setSelectedSigId}
                    options={signatures
                      .filter((s) => s.type === "DRAW" || s.type === "IMAGE" || s.type === "TEXT")
                      .map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.type === "DRAW" ? "Chữ ký tay" : s.type === "TEXT" ? "Chữ ký chữ" : "Ảnh chữ ký"})`,
                      }))}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      Vẽ vào khung dưới đây:
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={clearCanvas}
                      disabled={!hasDrawn}
                    >
                      Xóa nét vẽ
                    </Button>
                  </div>
                  <div
                    style={{
                      border: "1px dashed #d9d9d9",
                      borderRadius: "6px",
                      background: "#ffffff",
                      overflow: "hidden",
                      cursor: "crosshair",
                    }}
                  >
                    <canvas
                      ref={canvasRef}
                      width={350}
                      height={120}
                      onPointerDown={startDrawing}
                      onPointerMove={draw}
                      onPointerUp={stopDrawing}
                      onPointerLeave={stopDrawing}
                      style={{ display: "block", width: "100%", touchAction: "none" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. STAMP SELECTION */}
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "6px" }}>
                Đóng dấu đi kèm (Tùy chọn):
              </Text>
              <Select
                placeholder="Chọn con dấu đỏ..."
                style={{ width: "100%" }}
                value={selectedStampId}
                onChange={setSelectedStampId}
                allowClear
                options={signatures
                  .filter((s) => s.type === "STAMP")
                  .map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
              />
              {signatures.filter((s) => s.type === "STAMP").length === 0 && (
                <Text type="secondary" style={{ fontSize: "11px", display: "block", marginTop: "2px" }}>
                  Chưa có con dấu. Cấu hình tại Cài đặt Hệ thống &gt; Mẫu chữ ký & Con dấu.
                </Text>
              )}
            </div>

            {nextStepStepId && (
              <div style={{ marginBottom: "16px" }}>
                <Text strong style={{ display: "block", marginBottom: "6px" }}>
                  Chọn người duyệt tiếp theo (Bắt buộc):
                </Text>
                <Select
                  placeholder="Chọn nhân sự duyệt tiếp theo..."
                  style={{ width: "100%" }}
                  value={nextAssigneeId}
                  onChange={setNextAssigneeId}
                  options={stepCandidates.map((c: any) => ({
                    value: c.id,
                    label: `${c.fullName} (${c.email})`,
                  }))}
                />
              </div>
            )}

            {/* 3. LAYOUT & DETAILS CONFIG */}
            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "6px" }}>
                Bố cục chữ ký:
              </Text>
              <Radio.Group
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                size="small"
              >
                <Radio value="vertical">Dọc (Tên dưới chữ ký)</Radio>
                <Radio value="horizontal">Ngang (Tên bên phải chữ ký)</Radio>
              </Radio.Group>
            </div>

            <div style={{ marginBottom: "16px", border: "1px solid #f0f0f0", padding: "10px", borderRadius: "6px", background: "#fafafa" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <Text strong style={{ fontSize: "13px" }}>Mẫu cấu hình nhanh:</Text>
              </div>
              <Row gutter={8} align="middle">
                <Col span={18}>
                  <Select
                    placeholder="Chọn mẫu nhanh..."
                    style={{ width: "100%" }}
                    value={selectedPresetIndex}
                    onChange={(idx) => {
                      setSelectedPresetIndex(idx);
                      const p = presets[idx];
                      if (p) {
                        setLayout(p.layout);
                        setShowName(p.showName);
                        setShowRole(p.showRole);
                        setShowDept(p.showDept);
                        setShowTime(p.showTime);
                        setTextFont(p.textFont);
                        setTextSize(p.textSize);
                        setTextBold(p.textBold);
                        setTextItalic(p.textItalic);
                      }
                    }}
                    options={presets.map((p, idx) => ({
                      value: idx,
                      label: p.name,
                    }))}
                    size="small"
                  />
                </Col>
                <Col span={6} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    disabled={selectedPresetIndex === undefined}
                    onClick={() => {
                      if (selectedPresetIndex !== undefined) {
                        const nextPresets = presets.filter((_, idx) => idx !== selectedPresetIndex);
                        setPresets(nextPresets);
                        localStorage.setItem("bos_signature_presets", JSON.stringify(nextPresets));
                        setSelectedPresetIndex(undefined);
                        message.success("Đã xóa mẫu cấu hình.");
                      }
                    }}
                    title="Xóa mẫu cấu hình này"
                  />
                </Col>
              </Row>

              <div style={{ display: "flex", marginTop: "8px", gap: "6px" }}>
                <Input
                  placeholder="Đặt tên mẫu hiện tại..."
                  size="small"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="small"
                  onClick={() => {
                    if (!newPresetName.trim()) {
                      message.warning("Vui lòng nhập tên cho mẫu cấu hình.");
                      return;
                    }
                    const newPreset: SignaturePreset = {
                      name: newPresetName.trim(),
                      layout,
                      showName,
                      showRole,
                      showDept,
                      showTime,
                      textFont,
                      textSize,
                      textBold,
                      textItalic,
                    };
                    const nextPresets = [...presets, newPreset];
                    setPresets(nextPresets);
                    localStorage.setItem("bos_signature_presets", JSON.stringify(nextPresets));
                    setSelectedPresetIndex(nextPresets.length - 1);
                    setNewPresetName("");
                    message.success("Đã lưu mẫu cấu hình mới!");
                  }}
                >
                  Lưu
                </Button>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <Text strong style={{ display: "block", marginBottom: "6px" }}>
                Hiển thị thông tin đi kèm:
              </Text>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Checkbox checked={showName} onChange={(e) => setShowName(e.target.checked)}>
                  Họ và tên ({userName})
                </Checkbox>
                <Checkbox checked={showRole} onChange={(e) => setShowRole(e.target.checked)}>
                  Chức vụ/Vai trò ({sampleRole})
                </Checkbox>
                <Checkbox checked={showDept} onChange={(e) => setShowDept(e.target.checked)}>
                  Phòng ban ({sampleDept})
                </Checkbox>
                <Checkbox checked={showTime} onChange={(e) => setShowTime(e.target.checked)}>
                  Thời điểm ký ({sampleTime.split(" ")[0]})
                </Checkbox>
              </Space>

              <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "10px", marginTop: "10px" }}>
                <Text type="secondary" style={{ fontSize: "12px", display: "block", marginBottom: "6px" }}>
                  Định dạng chữ đi kèm:
                </Text>
                <Row gutter={8} align="middle">
                  <Col span={10}>
                    <Select
                      style={{ width: "100%" }}
                      size="small"
                      value={textFont}
                      onChange={setTextFont}
                      options={[
                        { value: "sans-serif", label: "Sans-serif" },
                        { value: "Times New Roman", label: "Times New Roman" },
                        { value: "Arial", label: "Arial" },
                        { value: "Courier New", label: "Courier" },
                        { value: "Georgia", label: "Georgia" },
                        { value: "Dancing Script", label: "Dancing Script" },
                        { value: "Pacifico", label: "Pacifico" },
                        { value: "Montserrat", label: "Montserrat" },
                      ]}
                    />
                  </Col>
                  <Col span={6}>
                    <Select
                      style={{ width: "100%" }}
                      size="small"
                      value={textSize}
                      onChange={setTextSize}
                      options={[9, 10, 11, 12, 13, 14, 15, 16].map(v => ({ value: v, label: `${v}px` }))}
                    />
                  </Col>
                  <Col span={8} style={{ display: "flex", gap: "4px" }}>
                    <Button
                      type={textBold ? "primary" : "default"}
                      size="small"
                      icon={<BoldOutlined />}
                      onClick={() => setTextBold(!textBold)}
                    />
                    <Button
                      type={textItalic ? "primary" : "default"}
                      size="small"
                      icon={<ItalicOutlined />}
                      onClick={() => setTextItalic(!textItalic)}
                    />
                  </Col>
                </Row>
              </div>
            </div>
          </Col>

          {/* RIGHT: REAL-TIME PREVIEW & OTP INPUT */}
          <Col xs={24} md={11}>
            <div
              style={{
                border: "1px solid #f0f0f0",
                background: "#fcfcfc",
                borderRadius: "8px",
                padding: "12px",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <Text strong style={{ display: "block", marginBottom: "8px", color: "#555" }}>
                  Xem trước thẻ ký số:
                </Text>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "150px",
                    background: "#ffffff",
                    border: "1px solid #e8e8e8",
                    borderRadius: "6px",
                    padding: "16px",
                  }}
                >
                  {previewSigImg ? (
                    layout === "horizontal" ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "8px",
                          fontFamily: "sans-serif",
                          textAlign: "left",
                          lineHeight: "1.3",
                        }}
                      >
                        <div
                          style={{
                            position: "relative",
                            height: "50px",
                            minWidth: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            padding: "2px",
                          }}
                        >
                          <img
                            src={previewSigImg}
                            alt="Signature"
                            style={{ maxHeight: "44px", maxWidth: "96px", display: "block" }}
                          />
                          {previewStampImg && (
                            <img
                              src={previewStampImg}
                              alt="Stamp"
                              style={{
                                position: "absolute",
                                right: "-12px",
                                bottom: "-8px",
                                maxHeight: "48px",
                                maxWidth: "48px",
                                opacity: 0.85,
                                mixBlendMode: "multiply",
                              }}
                            />
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "8px",
                              color: "green",
                              fontFamily: "monospace",
                              fontWeight: "bold",
                              marginBottom: "2px",
                            }}
                          >
                            [ĐÃ KÝ ĐIỆN TỬ]
                          </div>
                          {showName && (
                            <div
                              style={{
                                fontFamily: `"${textFont}", sans-serif`,
                                fontSize: `${textSize}px`,
                                fontWeight: textBold ? "bold" : "normal",
                                fontStyle: textItalic ? "italic" : "normal",
                                color: "#1e293b",
                              }}
                            >
                              {userName}
                            </div>
                          )}
                          {showRole && (
                            <div
                              style={{
                                fontFamily: `"${textFont}", sans-serif`,
                                fontSize: `${Math.max(8, textSize - 2)}px`,
                                fontWeight: textBold ? "bold" : "normal",
                                fontStyle: textItalic ? "italic" : "normal",
                                color: "#64748b",
                              }}
                            >
                              {sampleRole}
                            </div>
                          )}
                          {showDept && (
                            <div
                              style={{
                                fontFamily: `"${textFont}", sans-serif`,
                                fontSize: `${Math.max(8, textSize - 2)}px`,
                                fontWeight: textBold ? "bold" : "normal",
                                fontStyle: textItalic ? "italic" : "normal",
                                color: "#64748b",
                              }}
                            >
                              {sampleDept}
                            </div>
                          )}
                          {showTime && (
                            <div
                              style={{
                                fontFamily: `"${textFont}", sans-serif`,
                                fontSize: `${Math.max(8, textSize - 3)}px`,
                                fontWeight: textBold ? "bold" : "normal",
                                fontStyle: textItalic ? "italic" : "normal",
                                color: "#94a3b8",
                                marginTop: "1px",
                              }}
                            >
                              {sampleTime}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          textAlign: "center",
                          padding: "8px",
                          fontFamily: "sans-serif",
                          minWidth: "130px",
                          lineHeight: "1.3",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "8px",
                            color: "green",
                            fontFamily: "monospace",
                            fontWeight: "bold",
                            marginBottom: "4px",
                          }}
                        >
                          [ĐÃ KÝ ĐIỆN TỬ]
                        </div>
                        <div
                          style={{
                            position: "relative",
                            height: "50px",
                            width: "100px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "transparent",
                            padding: "2px",
                            marginBottom: "4px",
                            marginLeft: "auto",
                            marginRight: "auto",
                          }}
                        >
                          <img
                            src={previewSigImg}
                            alt="Signature"
                            style={{ maxHeight: "44px", maxWidth: "96px", display: "block" }}
                          />
                          {previewStampImg && (
                            <img
                              src={previewStampImg}
                              alt="Stamp"
                              style={{
                                position: "absolute",
                                right: "-12px",
                                bottom: "-8px",
                                maxHeight: "48px",
                                maxWidth: "48px",
                                opacity: 0.85,
                                mixBlendMode: "multiply",
                              }}
                            />
                          )}
                        </div>
                        {showName && (
                          <div
                            style={{
                              fontFamily: `"${textFont}", sans-serif`,
                              fontSize: `${textSize}px`,
                              fontWeight: textBold ? "bold" : "normal",
                              fontStyle: textItalic ? "italic" : "normal",
                              color: "#1e293b",
                            }}
                          >
                            {userName}
                          </div>
                        )}
                        {showRole && (
                          <div
                            style={{
                              fontFamily: `"${textFont}", sans-serif`,
                              fontSize: `${Math.max(8, textSize - 2)}px`,
                              fontWeight: textBold ? "bold" : "normal",
                              fontStyle: textItalic ? "italic" : "normal",
                              color: "#64748b",
                              marginTop: "1px",
                            }}
                          >
                            {sampleRole}
                          </div>
                        )}
                        {showDept && (
                          <div
                            style={{
                              fontFamily: `"${textFont}", sans-serif`,
                              fontSize: `${Math.max(8, textSize - 2)}px`,
                              fontWeight: textBold ? "bold" : "normal",
                              fontStyle: textItalic ? "italic" : "normal",
                              color: "#64748b",
                            }}
                          >
                            {sampleDept}
                          </div>
                        )}
                        {showTime && (
                          <div
                            style={{
                              fontFamily: `"${textFont}", sans-serif`,
                              fontSize: `${Math.max(8, textSize - 3)}px`,
                              fontWeight: textBold ? "bold" : "normal",
                              fontStyle: textItalic ? "italic" : "normal",
                              color: "#94a3b8",
                              marginTop: "2px",
                            }}
                          >
                            {sampleTime}
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      Chưa có hình ảnh chữ ký để xem trước.
                    </Text>
                  )}
                </div>
              </div>

              {/* OTP BLOCK */}
              <div
                style={{
                  background: "#f0f2f5",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                  padding: "10px",
                  marginTop: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <Text strong>
                    Mã OTP qua Email:
                  </Text>
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleRequestOtp}
                    loading={sendingOtp}
                    disabled={countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : "Gửi mã"}
                  </Button>
                </div>

                {isOtpSent ? (
                  <div>
                    <Input
                      prefix={<KeyOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
                      placeholder="Mã 6 số..."
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      size="middle"
                      style={{ fontSize: "14px", letterSpacing: "2px", fontWeight: "bold", textAlign: "center" }}
                    />
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: "11px" }}>
                    Vui lòng bấm gửi mã OTP để bắt đầu xác thực.
                  </Text>
                )}

                {mockOtpCode && (
                  <div style={{ marginTop: "6px", fontSize: "11px", color: "#1890ff" }}>
                    <strong>OTP TEST: </strong> <code style={{ background: "#e6f7ff", padding: "1px 4px", borderRadius: "3px" }}>{mockOtpCode}</code>
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Modal>
  );
}
