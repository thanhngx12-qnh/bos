// File: src/components/ErrorBoundary.tsx
"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Result, Button, Typography, Space } from "antd";
import { ReloadOutlined, BugOutlined } from "@ant-design/icons";

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            padding: "24px",
            background: "#f8fafc",
          }}
        >
          <Result
            status="error"
            icon={<BugOutlined style={{ color: "#ff4d4f" }} />}
            title="Đã xảy ra lỗi không mong muốn"
            subTitle="Hệ thống gặp sự cố khi xử lý yêu cầu. Vui lòng thử tải lại trang hoặc liên hệ quản trị viên nếu lỗi tiếp tục xảy ra."
            extra={
              <Space>
                <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleReload}>
                  Tải lại trang
                </Button>
                <Button onClick={this.handleRetry}>
                  Thử lại
                </Button>
              </Space>
            }
          >
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div style={{ textAlign: "left", marginTop: "16px" }}>
                <Paragraph>
                  <Text strong style={{ color: "#ff4d4f" }}>
                    {this.state.error.toString()}
                  </Text>
                </Paragraph>
                {this.state.errorInfo && (
                  <Paragraph>
                    <pre
                      style={{
                        fontSize: "12px",
                        background: "#1e1e1e",
                        color: "#d4d4d4",
                        padding: "16px",
                        borderRadius: "8px",
                        overflow: "auto",
                        maxHeight: "300px",
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </Paragraph>
                )}
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}
