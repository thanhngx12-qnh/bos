// File: src/app/metadata/[id]/fields/components/PrintTemplateManager.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Space,
  Drawer,
  Form,
  Input,
  Tabs,
  Upload,
  Typography,
  Card,
  Row,
  Col,
  Divider,
  Empty,
  Tooltip,
  App,
  Select,
  Tag,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UploadOutlined,
  FileTextOutlined,
  CodeOutlined,
  BgColorsOutlined,
  TableOutlined,
  FormatPainterOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  Html5Outlined,
  FontColorsOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  LineOutlined,
  ScissorOutlined,
  ShrinkOutlined,
  ExpandAltOutlined,
} from "@ant-design/icons";
import {
  usePrintTemplates,
  useCreatePrintTemplate,
  useUpdatePrintTemplate,
  useDeletePrintTemplate,
  PrintTemplate,
} from "@/hooks/usePrintTemplates";
import { Field } from "@/hooks/useFields";

const { Title, Paragraph, Text } = Typography;

interface PrintTemplateManagerProps {
  entityId: number;
  fields: Field[];
}

export default function PrintTemplateManager({
  entityId,
  fields,
}: PrintTemplateManagerProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrintTemplate | null>(null);
  const [activeEditorTab, setActiveEditorTab] = useState<string>("wysiwyg");

  // WYSIWYG internal HTML state
  const [wysiwygHtml, setWysiwygHtml] = useState<string>("");
  const wysiwygRef = useRef<HTMLDivElement>(null);
  const [drawerFullscreen, setDrawerFullscreen] = useState(false);

  // Range & selection preservation refs for dropdowns (e.g., Font Colors, Font Names)
  const savedRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0);
    }
  };

  const restoreSelection = () => {
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  };

  const starterTemplates = [
    {
      key: "standard_table",
      name: "1. Phiếu chi tiết dạng bảng (Standard Grid)",
      html: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; background: #ffffff; color: #2d3748; line-height: 1.6;">
  <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #3182ce; padding-bottom: 12px;">
    <h2 style="color: #2b6cb0; margin: 0;">PHIẾU IN HỒ SƠ YÊU CẦU</h2>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #718096;">Mã hồ sơ: <strong>{{record.id}}</strong> | Ngày lập: <strong>{{record.date}}</strong></p>
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
    <thead>
      <tr style="background-color: #ebf8ff; color: #2b6cb0;">
        <th style="border: 1px solid #cbd5e0; padding: 10px; text-align: left; width: 35%;">Trường thông tin</th>
        <th style="border: 1px solid #cbd5e0; padding: 10px; text-align: left;">Giá trị dữ liệu</th>
      </tr>
    </thead>
    <tbody>
      ${fields
        .filter((f) => f.type !== "TABLE")
        .map(
          (f) => `<tr>
        <td style="border: 1px solid #cbd5e0; padding: 8px; font-weight: bold; background-color: #f7fafc;">${f.name}</td>
        <td style="border: 1px solid #cbd5e0; padding: 8px;">{{data.${f.code}}}</td>
      </tr>`
        )
        .join("\n      ")}
    </tbody>
  </table>
  
  <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    <h4 style="margin: 0 0 10px 0; color: #4a5568;">Lịch sử phê duyệt (Workflow Logs)</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background-color: #f7fafc;">
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Bước duyệt</th>
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Người duyệt</th>
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Ý kiến phản hồi</th>
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left; width: 25%;">Chữ ký</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].step}}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].user}}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].comment}}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].signature}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
      `.trim(),
    },
    {
      key: "formal_decision",
      name: "2. Quyết định / Công văn trang trọng (Formal Document)",
      html: `
<div style="font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff; color: #000000; line-height: 1.5; font-size: 16px;">
  <table style="width: 100%; border: none; margin-bottom: 20px;">
    <tr>
      <td style="width: 40%; text-align: center; vertical-align: top;">
        <span style="font-size: 14px; font-weight: bold;">TÊN TỔ CHỨC DOANH NGHIỆP</span><br>
        <span style="font-size: 13px; text-decoration: underline;">Mã số: {{record.id}}</span>
      </td>
      <td style="width: 60%; text-align: center; vertical-align: top;">
        <span style="font-size: 14px; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br>
        <span style="font-size: 13px; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span>
      </td>
    </tr>
  </table>

  <div style="text-align: center; margin: 30px 0 20px 0;">
    <h3 style="margin: 0; font-size: 20px; font-weight: bold; text-transform: uppercase;">QUYẾT ĐỊNH</h3>
    <p style="margin: 5px 0; font-style: italic;">(V/v phê duyệt nội dung hồ sơ)</p>
  </div>

  <div style="margin-bottom: 20px;">
    <p><strong>Căn cứ:</strong> Điều lệ hoạt động của doanh nghiệp và quy chế phê duyệt nội bộ.</p>
    <p><strong>Xét nhu cầu thực tế:</strong> Quy trình liên quan được phê duyệt vào ngày {{record.date}}.</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h4 style="margin: 0 0 10px 0; font-weight: bold;">QUYẾT ĐỊNH:</h4>
    <p><strong>Điều 1:</strong> Thông qua nội dung biểu mẫu với các chi tiết dữ liệu sau:</p>
    <ul style="padding-left: 20px;">
      ${fields
        .filter((f) => f.type !== "TABLE")
        .slice(0, 5)
        .map((f) => `<li><strong>${f.name}:</strong> {{data.${f.code}}}</li>`)
        .join("\n      ")}
    </ul>
    <p><strong>Điều 2:</strong> Quyết định này có hiệu lực kể từ ngày ký.</p>
  </div>

  <table style="width: 100%; border: none; margin-top: 50px;">
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <span style="font-style: italic;">Nơi nhận:</span><br>
        <span style="font-size: 13px; display: block; text-align: left; padding-left: 40px;">- Như Điều 1;<br>- Lưu HS.</span>
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <span style="font-weight: bold; text-transform: uppercase;">Người phê duyệt chính</span><br>
        <span style="font-size: 13px; font-style: italic;">(Ký, ghi rõ họ tên)</span>
        <div style="margin-top: 20px; min-height: 60px; font-weight: bold; color: #c53030;">
          {{approvals[0].signature}}
        </div>
        <div style="font-weight: bold;">{{approvals[0].user}}</div>
      </td>
    </tr>
  </table>
</div>
      `.trim(),
    },
    {
      key: "commercial_invoice",
      name: "3. Hóa đơn / Phiếu thu chi (Commercial Receipt)",
      html: `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; background: #ffffff; color: #333333; line-height: 1.4; border: 2px solid #e2e8f0; border-radius: 8px;">
  <table style="width: 100%; border-bottom: 2px dashed #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
    <tr>
      <td style="vertical-align: top;">
        <h2 style="margin: 0; color: #1a365d;">PHÂN HỆ HÓA ĐƠN & PHIẾU CHI</h2>
        <p style="margin: 4px 0; font-size: 13px; color: #718096;">Địa chỉ: Khu Công Nghệ Cao, Quận 9, TP. HCM</p>
      </td>
      <td style="text-align: right; vertical-align: top;">
        <span style="font-size: 20px; font-weight: bold; color: #c53030;">Mẫu số: RECEIPT-{{record.id}}</span><br>
        <span style="font-size: 13px; color: #718096;">Ngày lập: {{record.date}}</span>
      </td>
    </tr>
  </table>

  <div style="text-align: center; margin-bottom: 25px;">
    <h3 style="margin: 0; font-size: 22px; color: #1a365d; font-weight: bold;">PHIẾU THANH TOÁN CHI TIẾT</h3>
  </div>

  <table style="width: 100%; border: none; margin-bottom: 20px;">
    <tr>
      <td style="width: 50%; padding: 4px 0;"><strong>Khách hàng / Đối tượng:</strong> {{data.customer_name}}</td>
      <td style="width: 50%; padding: 4px 0; text-align: right;"><strong>Người yêu cầu:</strong> {{data.requester_name}}</td>
    </tr>
    <tr>
      <td style="width: 50%; padding: 4px 0;"><strong>Hình thức thanh toán:</strong> Chuyển khoản ngân hàng</td>
      <td style="width: 50%; padding: 4px 0; text-align: right;"><strong>Số tiền đề xuất:</strong> <strong style="color: #2b6cb0; font-size: 16px;">{{data.amount}} {{data.currency}}</strong></td>
    </tr>
  </table>

  <div style="margin-top: 30px; text-align: right;">
    <table style="width: 250px; margin-left: auto; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 0; font-weight: bold;">Thành tiền:</td>
        <td style="padding: 6px 0; text-align: right;">{{data.amount}}</td>
      </tr>
      <tr style="border-top: 1px solid #cbd5e0;">
        <td style="padding: 6px 0; font-weight: bold; color: #1a365d;">Tổng cộng thanh toán:</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1a365d;">{{data.amount}}</td>
      </tr>
    </table>
  </div>

  <table style="width: 100%; border: none; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
    <tr style="text-align: center;">
      <td>
        <strong>Người nộp đơn</strong><br>
        <span style="font-size: 12px; font-style: italic; color: #718096;">(Ký & ghi rõ họ tên)</span>
      </td>
      <td>
        <strong>Kế toán trưởng</strong><br>
        <span style="font-size: 12px; font-style: italic; color: #718096;">(Ký & ghi rõ họ tên)</span>
      </td>
      <td>
        <strong>Giám đốc duyệt</strong><br>
        <span style="font-size: 12px; font-style: italic; color: #718096;">(Chữ ký điện tử)</span>
        <div style="margin-top: 12px; min-height: 40px; color: #2b6cb0; font-weight: bold;">
          {{approvals[0].signature}}
        </div>
      </td>
    </tr>
  </table>
</div>
      `.trim(),
    },
  ];

  // Queries & Mutations
  const templatesQuery = usePrintTemplates(entityId);
  const createMutation = useCreatePrintTemplate();
  const updateMutation = useUpdatePrintTemplate();
  const deleteMutation = useDeletePrintTemplate();

  // Load editor content on open
  useEffect(() => {
    if (isDrawerOpen) {
      if (editingTemplate) {
        const html = editingTemplate.template?.html || "";
        setWysiwygHtml(html);
        form.setFieldsValue({
          name: editingTemplate.name,
          htmlContent: html,
        });
        setTimeout(() => {
          if (wysiwygRef.current) {
            wysiwygRef.current.innerHTML = html;
          }
        }, 50);
      } else {
        const defaultHtml = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; background: #ffffff; color: #2d3748; line-height: 1.6;">
  <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #3182ce; padding-bottom: 12px;">
    <h2 style="color: #2b6cb0; margin: 0;">PHIẾU IN HỒ SƠ YÊU CẦU</h2>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #718096;">Mã hồ sơ: <strong>{{record.id}}</strong> | Ngày lập: <strong>{{record.date}}</strong></p>
  </div>
  
  <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
    <thead>
      <tr style="background-color: #ebf8ff; color: #2b6cb0;">
        <th style="border: 1px solid #cbd5e0; padding: 10px; text-align: left; width: 35%;">Trường thông tin</th>
        <th style="border: 1px solid #cbd5e0; padding: 10px; text-align: left;">Giá trị dữ liệu</th>
      </tr>
    </thead>
    <tbody>
      ${fields
        .filter((f) => f.type !== "TABLE")
        .map(
          (f) => `<tr>
        <td style="border: 1px solid #cbd5e0; padding: 8px; font-weight: bold; background-color: #f7fafc;">${f.name}</td>
        <td style="border: 1px solid #cbd5e0; padding: 8px;">{{data.${f.code}}}</td>
      </tr>`
        )
        .join("\n      ")}
    </tbody>
  </table>
  
  <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
    <h4 style="margin: 0 0 10px 0; color: #4a5568;">Lịch sử phê duyệt (Workflow Logs)</h4>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="background-color: #f7fafc;">
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Bước duyệt</th>
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Người duyệt</th>
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left;">Ý kiến phản hồi</th>
          <th style="border: 1px solid #e2e8f0; padding: 6px; text-align: left; width: 25%;">Chữ ký</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].step}}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].user}}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].comment}}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px;">{{approvals[0].signature}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
        `.trim();
        setWysiwygHtml(defaultHtml);
        form.setFieldsValue({
          name: "",
          htmlContent: defaultHtml,
        });
        setTimeout(() => {
          if (wysiwygRef.current) {
            wysiwygRef.current.innerHTML = defaultHtml;
          }
        }, 50);
      }
    }
  }, [isDrawerOpen, editingTemplate, fields, form]);

  // Sync WYSIWYG change to Form state
  const handleWysiwygChange = (e: React.FormEvent<HTMLDivElement>) => {
    const html = e.currentTarget.innerHTML;
    form.setFieldsValue({ htmlContent: html });
  };

  // Sync texteditor change back to WYSIWYG state when tab changes
  const handleTabChange = (key: string) => {
    setActiveEditorTab(key);
    if (key === "wysiwyg") {
      const codeHtml = form.getFieldValue("htmlContent") || "";
      setWysiwygHtml(codeHtml);
      if (wysiwygRef.current) {
        wysiwygRef.current.innerHTML = codeHtml;
      }
    }
  };

  // Toolbar action helper
  const execCmd = (command: string, value: string = "") => {
    restoreSelection();
    document.execCommand(command, false, value);
    // Focus back to editable div
    wysiwygRef.current?.focus();
    // Trigger change sync manually
    if (wysiwygRef.current) {
      const html = wysiwygRef.current.innerHTML;
      form.setFieldsValue({ htmlContent: html });
    }
    saveSelection();
  };

  // Insert Table in WYSIWYG
  const insertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e0; padding: 8px; font-weight: bold; background-color: #f7fafc;">Tiêu đề cột 1</td>
            <td style="border: 1px solid #cbd5e0; padding: 8px; font-weight: bold; background-color: #f7fafc;">Tiêu đề cột 2</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e0; padding: 8px;">Dòng 1 Ô 1</td>
            <td style="border: 1px solid #cbd5e0; padding: 8px;">Dòng 1 Ô 2</td>
          </tr>
        </tbody>
      </table>
    `;
    insertTokenAtCursor(tableHtml);
  };

  // Insert Page Break in WYSIWYG
  const insertPageBreak = () => {
    const pageBreakHtml = `
      <div style="page-break-after: always; margin: 24px 0; border-top: 1px dashed #718096; position: relative;" class="no-print" contenteditable="false">
        <span style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #f8fafc; padding: 0 8px; font-size: 11px; color: #718096; font-family: sans-serif; font-weight: bold;">[ ĐƯỜNG NGẮT TRANG KHI IN / PAGE BREAK ]</span>
      </div>
      <p><br></p>
    `;
    insertTokenAtCursor(pageBreakHtml);
  };

  // Insert dynamically dynamic token at cursor position
  const insertTokenAtCursor = (token: string) => {
    if (activeEditorTab === "wysiwyg") {
      restoreSelection();
      wysiwygRef.current?.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        
        // If it looks like HTML, insert as element nodes
        if (token.startsWith("<") && token.endsWith(">")) {
          const div = document.createElement("div");
          div.innerHTML = token;
          const frag = document.createDocumentFragment();
          let child;
          while ((child = div.firstChild)) {
            frag.appendChild(child);
          }
          range.insertNode(frag);
        } else {
          const textNode = document.createTextNode(token);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
        }
        
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        if (wysiwygRef.current) {
          wysiwygRef.current.innerHTML += token;
        }
      }
      
      // Update form state
      if (wysiwygRef.current) {
        const html = wysiwygRef.current.innerHTML;
        form.setFieldsValue({ htmlContent: html });
      }
      saveSelection();
    } else {
      // For textarea text insert
      const textarea = document.getElementById("html-code-textarea") as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        const newValue = before + token + after;
        form.setFieldsValue({ htmlContent: newValue });
        textarea.value = newValue;
        textarea.focus();
        textarea.selectionStart = start + token.length;
        textarea.selectionEnd = start + token.length;
      }
    }
  };

  // Local HTML File Import
  const handleUploadHtml = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        form.setFieldsValue({ htmlContent: text });
        setWysiwygHtml(text);
        message.success("Nạp tệp HTML địa phương thành công!");
      }
    };
    reader.readAsText(file);
    return false; // Stop auto post upload
  };

  // Form Submit Handler
  const onFormSubmit = (values: any) => {
    const payload = {
      entityId,
      name: values.name,
      template: {
        html: values.htmlContent,
      },
    };

    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, entityId, payload },
        {
          onSuccess: () => {
            message.success("Cập nhật mẫu in thành công!");
            setIsDrawerOpen(false);
          },
          onError: () => {
            message.error("Có lỗi xảy ra khi cập nhật mẫu in.");
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          message.success("Tạo mẫu in mới thành công!");
          setIsDrawerOpen(false);
        },
        onError: () => {
          message.error("Có lỗi xảy ra khi khởi tạo mẫu in.");
        },
      });
    }
  };

  // Delete Handler
  const handleDeleteClick = (id: number) => {
    deleteMutation.mutate(
      { id, entityId },
      {
        onSuccess: () => {
          message.success("Đã xóa mẫu in thành công!");
        },
        onError: () => {
          message.error("Có lỗi xảy ra khi xóa.");
        },
      }
    );
  };

  const columns = [
    {
      title: "Tên mẫu in",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong style={{ color: "#2d3748" }}>{text}</Text>,
    },
    {
      title: "Ngày khởi tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => new Date(date).toLocaleDateString("vi-VN"),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 150,
      render: (_: any, record: PrintTemplate) => (
        <Space size="middle">
          <Tooltip title="Chỉnh sửa cấu hình mẫu in">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: "#3182ce" }} />}
              onClick={() => {
                setEditingTemplate(record);
                setIsDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Xóa mẫu in">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteClick(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Card
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={4} style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, color: "#1a202c" }}>
            <Html5Outlined style={{ color: "#0050b3" }} />
            Danh sách Mẫu in biểu mẫu (Print Templates Designer)
          </Title>
          <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
            Kiến tạo nhiều mẫu biên dịch biểu mẫu khác nhau để xuất báo cáo, biên bản bàn giao, phiếu thanh toán, hỗ trợ chèn chữ ký điện tử.
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingTemplate(null);
            setIsDrawerOpen(true);
          }}
          style={{
            background: "linear-gradient(135deg, #0050b3 0%, #096dd9 100%)",
            border: "none",
            borderRadius: "6px",
            boxShadow: "0 2px 4px rgba(0, 80, 179, 0.2)",
          }}
        >
          Tạo mẫu in mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={templatesQuery.data || []}
        rowKey="id"
        loading={templatesQuery.isLoading}
        locale={{
          emptyText: (
            <Empty
              description="Biểu mẫu này chưa có mẫu in động nào. Bạn có thể tự soạn thảo trực quan hoặc nhập file HTML có sẵn."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="dashed"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsDrawerOpen(true);
                }}
              >
                Kiến tạo Mẫu in đầu tiên
              </Button>
            </Empty>
          ),
        }}
      />

      {/* DRAWER THIẾT KẾ MẪU IN DUAL-MODE */}
      <Drawer
        title={
          <span style={{ fontSize: "16px", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <FileTextOutlined style={{ color: "#0050b3" }} />
            {editingTemplate ? `Hiệu chỉnh mẫu in: ${editingTemplate.name}` : "Kiến tạo mẫu in động mới"}
          </span>
        }
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerFullscreen(false);
        }}
        width={drawerFullscreen ? "100vw" : 980}
        destroyOnClose
        extra={
          <Space>
            <Tooltip title={drawerFullscreen ? "Thu nhỏ" : "Phóng to toàn màn hình"}>
              <Button
                type="text"
                size="small"
                icon={drawerFullscreen ? <ShrinkOutlined /> : <ExpandAltOutlined />}
                onClick={() => setDrawerFullscreen((prev) => !prev)}
                style={{ color: "#595959", marginRight: 8 }}
              />
            </Tooltip>
            <Button onClick={() => setIsDrawerOpen(false)}>Hủy bỏ</Button>
            <Button type="primary" onClick={() => form.submit()}>
              {editingTemplate ? "Cập nhật mẫu" : "Lưu mẫu"}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFormSubmit}
          preserve={true}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="name"
                label={<Text strong>Tên mẫu in</Text>}
                rules={[{ required: true, message: "Vui lòng đặt tên mẫu in" }]}
              >
                <Input placeholder="Ví dụ: Phiếu đề xuất mua sắm (Mẫu đầy đủ)" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label={<Text strong>Chọn mẫu dựng sẵn gợi ý</Text>}
              >
                <Select
                  placeholder="Chọn mẫu để áp dụng nhanh..."
                  options={starterTemplates.map((t) => ({ value: t.key, label: t.name }))}
                  onChange={(key) => {
                    const t = starterTemplates.find((x) => x.key === key);
                    if (t) {
                      form.setFieldsValue({ htmlContent: t.html });
                      setWysiwygHtml(t.html);
                      message.info(`Đã áp dụng ${t.name}`);
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={6} style={{ display: "flex", alignItems: "flex-end", paddingBottom: 24 }}>
              <Upload
                beforeUpload={handleUploadHtml}
                showUploadList={false}
                accept=".html"
              >
                <Button icon={<UploadOutlined />} type="dashed" style={{ width: "100%" }}>
                  Nhập file HTML (.html)
                </Button>
              </Upload>
            </Col>
          </Row>

          <Divider style={{ margin: "8px 0 16px 0" }} />

          <Row gutter={20} style={{ flexGrow: 1, minHeight: 0 }}>
            {/* CỬA SỔ BIÊN TẬP (EDITOR ZONE) */}
            <Col span={16} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Tabs
                activeKey={activeEditorTab}
                onChange={handleTabChange}
                size="small"
                style={{ marginBottom: 8 }}
                items={[
                  {
                    key: "wysiwyg",
                    label: (
                      <span>
                        <BgColorsOutlined /> Soạn thảo trực quan (Visual View)
                      </span>
                    ),
                  },
                  {
                    key: "html",
                    label: (
                      <span>
                        <CodeOutlined /> Mã nguồn HTML/CSS (Code View)
                      </span>
                    ),
                  },
                ]}
              />

              <div
                style={{
                  display: activeEditorTab === "wysiwyg" ? "flex" : "none",
                  border: "1px solid #cbd5e0",
                  borderRadius: 8,
                  flexDirection: "column",
                  height: "500px",
                }}
              >
                {/* WYSIWYG Toolbar */}
                <div
                  style={{
                    background: "#f7fafc",
                    borderBottom: "1px solid #cbd5e0",
                    padding: "6px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                    alignItems: "center",
                    borderTopLeftRadius: 7,
                    borderTopRightRadius: 7,
                  }}
                >
                  <Tooltip title="In đậm">
                    <Button size="small" type="text" icon={<BoldOutlined />} onClick={() => execCmd("bold")} />
                  </Tooltip>
                  <Tooltip title="In nghiêng">
                    <Button size="small" type="text" icon={<ItalicOutlined />} onClick={() => execCmd("italic")} />
                  </Tooltip>
                  <Tooltip title="Gạch chân">
                    <Button size="small" type="text" icon={<UnderlineOutlined />} onClick={() => execCmd("underline")} />
                  </Tooltip>
                  <Divider type="vertical" />
                  <Tooltip title="Căn trái">
                    <Button size="small" type="text" icon={<AlignLeftOutlined />} onClick={() => execCmd("justifyLeft")} />
                  </Tooltip>
                  <Tooltip title="Căn giữa">
                    <Button size="small" type="text" icon={<AlignCenterOutlined />} onClick={() => execCmd("justifyCenter")} />
                  </Tooltip>
                  <Tooltip title="Căn phải">
                    <Button size="small" type="text" icon={<AlignRightOutlined />} onClick={() => execCmd("justifyRight")} />
                  </Tooltip>
                  <Divider type="vertical" />
                  <Tooltip title="Danh sách số">
                    <Button size="small" type="text" icon={<OrderedListOutlined />} onClick={() => execCmd("insertOrderedList")} />
                  </Tooltip>
                  <Tooltip title="Danh sách ký hiệu">
                    <Button size="small" type="text" icon={<UnorderedListOutlined />} onClick={() => execCmd("insertUnorderedList")} />
                  </Tooltip>
                  <Tooltip title="Đường kẻ ngang">
                    <Button size="small" type="text" icon={<LineOutlined />} onClick={() => execCmd("insertHorizontalRule")} />
                  </Tooltip>
                  <Tooltip title="Chèn dấu ngắt trang khi in">
                    <Button size="small" type="text" icon={<ScissorOutlined />} onClick={insertPageBreak} />
                  </Tooltip>
                  <Divider type="vertical" />
                  <Select
                    size="small"
                    placeholder="Phông chữ"
                    style={{ width: 100 }}
                    options={[
                      { value: "Arial", label: "Arial" },
                      { value: "Times New Roman", label: "Times New" },
                      { value: "Courier New", label: "Monospace" },
                      { value: "Georgia", label: "Georgia" },
                      { value: "Verdana", label: "Verdana" },
                    ]}
                    onChange={(val: string) => execCmd("fontName", val)}
                  />
                  <Select
                    size="small"
                    placeholder="Kích cỡ"
                    style={{ width: 90 }}
                    options={[
                      { value: "1", label: "Cực nhỏ" },
                      { value: "3", label: "Bình thường" },
                      { value: "5", label: "Tiêu đề vừa" },
                      { value: "7", label: "Tiêu đề lớn" },
                    ]}
                    onChange={(val: string) => execCmd("fontSize", val)}
                  />
                  <Select
                    size="small"
                    placeholder="Màu chữ"
                    style={{ width: 100 }}
                    dropdownStyle={{ minWidth: 120 }}
                    options={[
                      { value: "#2d3748", label: <span style={{ color: "#2d3748" }}>● Mặc định</span> },
                      { value: "#1a365d", label: <span style={{ color: "#1a365d" }}>● Xanh đậm</span> },
                      { value: "#2b6cb0", label: <span style={{ color: "#2b6cb0" }}>● Xanh biển</span> },
                      { value: "#c53030", label: <span style={{ color: "#c53030" }}>● Đỏ đậm</span> },
                      { value: "#2f855a", label: <span style={{ color: "#2f855a" }}>● Xanh lá</span> },
                      { value: "#718096", label: <span style={{ color: "#718096" }}>● Xám</span> },
                    ]}
                    onChange={(val: string) => execCmd("foreColor", val)}
                  />
                  <Select
                    size="small"
                    placeholder="Định dạng"
                    style={{ width: 100 }}
                    options={[
                      { value: "H1", label: "Tiêu đề H1" },
                      { value: "H2", label: "Tiêu đề H2" },
                      { value: "H3", label: "Tiêu đề H3" },
                      { value: "P", label: "Đoạn văn P" },
                    ]}
                    onChange={(val: string) => execCmd("formatBlock", val)}
                  />
                  <Divider type="vertical" />
                  <Tooltip title="Chèn bảng cơ bản">
                    <Button size="small" type="text" icon={<TableOutlined />} onClick={insertTable} />
                  </Tooltip>
                  <Tooltip title="Xóa định dạng">
                    <Button size="small" type="text" icon={<FormatPainterOutlined />} onClick={() => execCmd("removeFormat")} />
                  </Tooltip>
                </div>

                {/* WYSIWYG Editable div */}
                <div
                  ref={wysiwygRef}
                  contentEditable
                  onInput={handleWysiwygChange}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onBlur={saveSelection}
                  suppressContentEditableWarning
                  style={{
                    flexGrow: 1,
                    padding: "16px",
                    overflowY: "auto",
                    outline: "none",
                    background: "white",
                    borderBottomLeftRadius: 7,
                    borderBottomRightRadius: 7,
                    minHeight: "400px",
                  }}
                />
              </div>

              <div style={{ display: activeEditorTab === "html" ? "block" : "none", width: "100%" }}>
                <Form.Item name="htmlContent" noStyle>
                  <Input.TextArea
                    id="html-code-textarea"
                    rows={22}
                    style={{
                      fontFamily: "monospace",
                      fontSize: "13px",
                      background: "#1e1e1e",
                      color: "#d4d4d4",
                      borderRadius: "8px",
                      padding: "12px",
                      width: "100%",
                    }}
                    placeholder="Viết mã nguồn HTML/CSS tại đây..."
                    onChange={(e) => {
                      const val = e.target.value;
                      setWysiwygHtml(val);
                      if (wysiwygRef.current) {
                        wysiwygRef.current.innerHTML = val;
                      }
                    }}
                  />
                </Form.Item>
              </div>
            </Col>

            {/* DANH SÁCH TOKEN ĐỘNG HỖ TRỢ (TOKEN HELPER SIDEBAR) */}
            <Col span={8} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Card
                size="small"
                title={
                  <span style={{ fontSize: "13px", color: "#4a5568" }}>
                    Danh sách các Token chèn động
                  </span>
                }
                style={{ height: "550px", overflowY: "auto", background: "#f8fafc", border: "1px solid #edf2f7" }}
              >
                <div style={{ marginBottom: "12px" }}>
                  <Text type="secondary" style={{ fontSize: "11px" }}>
                    Nhấp vào bất kỳ token nào bên dưới để chèn thẳng vào vị trí con trỏ trong trình soạn thảo:
                  </Text>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Hệ thống */}
                  <div>
                    <Text strong style={{ fontSize: "12px", color: "#2b6cb0" }}>1. Thông tin chung hồ sơ</Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                      <Tag color="blue" style={{ cursor: "pointer", width: "fit-content" }} onClick={() => insertTokenAtCursor("{{record.id}}")}>
                        Mã hồ sơ: &#123;&#123;record.id&#125;&#125;
                      </Tag>
                      <Tag color="blue" style={{ cursor: "pointer", width: "fit-content" }} onClick={() => insertTokenAtCursor("{{record.date}}")}>
                        Ngày lập: &#123;&#123;record.date&#125;&#125;
                      </Tag>
                    </div>
                  </div>

                  {/* Dữ liệu động */}
                  <div>
                    <Text strong style={{ fontSize: "12px", color: "#2b6cb0" }}>2. Trường dữ liệu biểu mẫu</Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                      {fields.map((f) => (
                        <Tooltip key={f.id} title={`Click để chèn trường: ${f.name}`}>
                          <Tag
                            color="cyan"
                            style={{ cursor: "pointer", width: "fit-content" }}
                            onClick={() => insertTokenAtCursor(`{{data.${f.code}}}`)}
                          >
                            {f.name}: &#123;&#123;data.{f.code}&#125;&#125;
                          </Tag>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Lịch sử duyệt */}
                  <div>
                    <Text strong style={{ fontSize: "12px", color: "#2b6cb0" }}>3. Phê duyệt & Chữ ký số</Text>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: "11px", display: "block" }}>Trạm duyệt 1 (Index 0):</Text>
                        <Space wrap size={[2, 4]} style={{ marginTop: 2 }}>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[0].step}}")}>
                            Bước duyệt: approvals[0].step
                          </Tag>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[0].user}}")}>
                            Người duyệt: approvals[0].user
                          </Tag>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[0].signature}}")}>
                            Chữ ký: approvals[0].signature
                          </Tag>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[0].comment}}")}>
                            Ý kiến: approvals[0].comment
                          </Tag>
                        </Space>
                      </div>

                      <Divider style={{ margin: "4px 0" }} />

                      <div>
                        <Text type="secondary" style={{ fontSize: "11px", display: "block" }}>Trạm duyệt 2 (Index 1):</Text>
                        <Space wrap size={[2, 4]} style={{ marginTop: 2 }}>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[1].step}}")}>
                            Bước duyệt: approvals[1].step
                          </Tag>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[1].user}}")}>
                            Người duyệt: approvals[1].user
                          </Tag>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[1].signature}}")}>
                            Chữ ký: approvals[1].signature
                          </Tag>
                          <Tag color="purple" style={{ cursor: "pointer" }} onClick={() => insertTokenAtCursor("{{approvals[1].comment}}")}>
                            Ý kiến: approvals[1].comment
                          </Tag>
                        </Space>
                      </div>
                    </div>
                  </div>

                  {/* Print Helpers */}
                  <div>
                    <Text strong style={{ fontSize: "12px", color: "#2b6cb0" }}>4. Tiện ích in ấn (Print CSS)</Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag
                        color="orange"
                        style={{ cursor: "pointer", display: "block", marginBottom: 4 }}
                        onClick={() =>
                          insertTokenAtCursor(`
<style>
  @media print {
    body { background: white; color: black; }
    .no-print { display: none; }
    @page { size: A4; margin: 1.5cm; }
  }
</style>
                        `.trim())
                        }
                      >
                        Chèn thẻ ngắt trang CSS A4
                      </Tag>
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </Card>
  );
}
