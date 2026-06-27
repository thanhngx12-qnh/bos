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
    nextAssigneeId?: number
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
      }

      setOtpCode("");
      setIsOtpSent(false);
      setMockOtpCode(null);
      setCountdown(0);
      setCanvasDataUrl(null);
      setHasDrawn(false);
      setNextAssigneeId(undefined);

      // Separate templates
      const sigs = signatures.filter((s) => s.type === "DRAW" || s.type === "IMAGE");
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
      nextAssigneeId
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
                      .filter((s) => s.type === "DRAW" || s.type === "IMAGE")
                      .map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.type === "DRAW" ? "Chữ ký tay" : "Ảnh chữ ký"})`,
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
                          border: "1px solid #e2e8f0",
                          padding: "8px",
                          borderRadius: "6px",
                          backgroundColor: "#fafafa",
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
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
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
                            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b" }}>
                              {userName}
                            </div>
                          )}
                          {showRole && (
                            <div style={{ fontSize: "9px", color: "#64748b" }}>{sampleRole}</div>
                          )}
                          {showDept && (
                            <div style={{ fontSize: "9px", color: "#64748b" }}>{sampleDept}</div>
                          )}
                          {showTime && (
                            <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "1px" }}>
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
                          border: "1px solid #e2e8f0",
                          padding: "8px",
                          borderRadius: "6px",
                          backgroundColor: "#fafafa",
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
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
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
                          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#1e293b" }}>
                            {userName}
                          </div>
                        )}
                        {showRole && (
                          <div style={{ fontSize: "9px", color: "#64748b", marginTop: "1px" }}>
                            {sampleRole}
                          </div>
                        )}
                        {showDept && (
                          <div style={{ fontSize: "9px", color: "#64748b" }}>{sampleDept}</div>
                        )}
                        {showTime && (
                          <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "2px" }}>
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
