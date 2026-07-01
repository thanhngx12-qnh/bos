import React, { useState, useEffect, useRef } from "react";
import { Modal, Input, List, Typography, Empty } from "antd";
import { SearchOutlined, FileTextOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";

const { Text } = Typography;

export default function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<any>(null);

  // Hook tìm kiếm
  const { data: results = [], isLoading } = useSearch(query, 10);

  // Đăng ký hotkey Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Tự động focus ô tìm kiếm khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleResultClick = (item: any) => {
    setIsOpen(false);
    router.push(`/records?entityId=${item.entityId}&recordId=${item.recordId}`);
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          width: "100%",
          maxWidth: 240,
          height: 32,
          backgroundColor: "#f1f5f9",
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          cursor: "pointer",
          userSelect: "none",
          transition: "all 0.2s ease",
          boxSizing: "border-box"
        }}
        className="global-search-trigger"
      >
        <SearchOutlined style={{ color: "#94a3b8", marginRight: 8, fontSize: 13 }} />
        <span style={{ color: "#94a3b8", fontSize: 12, flex: 1 }}>Tìm kiếm hồ sơ...</span>
        <kbd 
          style={{
            fontSize: 10,
            color: "#64748b",
            backgroundColor: "#e2e8f0",
            padding: "2px 5px",
            borderRadius: 3,
            fontFamily: "monospace",
            lineHeight: "1",
            display: "inline-flex",
            alignItems: "center",
            margin: 0,
            height: 18,
            boxSizing: "border-box"
          }}
        >
          ⌘K
        </kbd>
      </div>

      <Modal
        title={null}
        footer={null}
        open={isOpen}
        onCancel={() => setIsOpen(false)}
        closable={false}
        width={600}
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
          <Input
            ref={inputRef}
            placeholder="Gõ từ khóa tìm kiếm (Ví dụ: tên, mã hồ sơ, số cont...)"
            prefix={<SearchOutlined style={{ color: "#bfbfbf", fontSize: 18 }} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            variant="borderless"
            style={{ fontSize: 16 }}
            allowClear
          />
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px" }}>
          {query.trim().length < 2 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#bfbfbf" }}>
              Gõ tối thiểu 2 ký tự để tìm kiếm
            </div>
          ) : isLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#8c8c8c" }}>
              Đang truy vấn dữ liệu...
            </div>
          ) : results.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy hồ sơ phù hợp" style={{ padding: "16px 0" }} />
          ) : (
            <List
              dataSource={results}
              renderItem={(item) => (
                <List.Item
                  onClick={() => handleResultClick(item)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: "none",
                    transition: "background 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                  className="search-result-item"
                >
                  <FileTextOutlined style={{ fontSize: 18, color: "#0050b3", backgroundColor: "#e6f7ff", padding: 8, borderRadius: "50%" }} />
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <Text strong style={{ fontSize: 14 }}>
                      {item.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Mã hồ sơ: {item.searchData?.businessCode || "N/A"} | Chủ hàng: {item.searchData?.chu_hang || "N/A"}
                    </Text>
                  </div>
                </List.Item>
              )}
            />
          )}
        </div>
      </Modal>
    </>
  );
}
