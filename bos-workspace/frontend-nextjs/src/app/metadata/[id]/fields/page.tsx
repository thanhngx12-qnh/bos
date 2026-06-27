// File: src/app/metadata/[id]/fields/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Breadcrumb,
  Avatar,
  Space,
  Typography,
  Badge,
  Button,
  Row,
  Col,
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  Select,
  theme,
  App,
  Spin,
  Card,
  Dropdown,
  Tag,
  DatePicker,
  TreeSelect,
  Segmented,
  Tabs,
  Result,
} from "antd";
import {
  DashboardOutlined,
  PartitionOutlined,
  BuildOutlined,
  DeploymentUnitOutlined,
  BellOutlined,
  UserOutlined,
  GlobalOutlined,
  ArrowLeftOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  FormOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { useEntities } from "@/hooks/useEntities";
import {
  useFields,
  useCreateField,
  useUpdateField,
  useDeleteField,
  Field,
} from "@/hooks/useFields";
import { useWorkflows, useWorkflowSteps, WorkflowStep } from "@/hooks/useWorkflows";
import { useTenantDetail } from "@/hooks/useTenant";
import { useMyTenants, useSwitchTenant } from "@/hooks/useAuth";
import { BankOutlined } from "@ant-design/icons";
import { useDepartmentTree } from "@/hooks/useDepartments";
import { useUsers } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

import WorkflowStepsController from "./components/WorkflowStepsController";
import DragDropCanvas from "./components/DragDropCanvas";
import ToolboxAndInspector from "./components/ToolboxAndInspector";
import AutomationRulesManager from "./components/AutomationRulesManager";
import PrintTemplateManager from "./components/PrintTemplateManager";
import FormulaBuilder from "./components/FormulaBuilder";
import VisualWorkflowCanvas from "./components/VisualWorkflowCanvas";
import VersionHistoryManager from "./components/VersionHistoryManager";

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const COMMON_REGEX_PATTERNS = [
  {
    label: "Số điện thoại VN",
    pattern: "^(0|84)[3|5|7|8|9][0-9]{8}$",
    error: "Số điện thoại Việt Nam không hợp lệ (10 số, bắt đầu bằng 0 hoặc 84)",
  },
  {
    label: "Email chuẩn",
    pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
    error: "Địa chỉ Email không đúng định dạng",
  },
  {
    label: "Mã Code (Chữ hoa & số)",
    pattern: "^[A-Z0-9_]+$",
    error: "Chỉ chấp nhận chữ in hoa không dấu, chữ số và gạch dưới (_)",
  },
  {
    label: "Chỉ nhập số",
    pattern: "^[0-9]+$",
    error: "Chỉ cho phép nhập ký tự số",
  },
  {
    label: "Chỉ nhập chữ",
    pattern: "^[a-zA-ZÀ-ỹ\\s]+$",
    error: "Chỉ cho phép nhập ký tự chữ và khoảng trắng",
  },
];

interface InitValueInputProps {
  type: string;
  form: any;
  choicesPath?: (string | number)[];
  userOptions: any[];
  deptTreeData: any[];
  roleOptions: any[];
  value?: any;
  checked?: boolean;
  onChange?: (val: any) => void;
}

const InitValueInput: React.FC<InitValueInputProps> = ({
  type,
  form,
  choicesPath = ["options", "choices"],
  userOptions,
  deptTreeData,
  roleOptions,
  value,
  checked,
  onChange,
}) => {
  const currentChoices = Form.useWatch(choicesPath, form) || [];
  const choicesOptions = Array.isArray(currentChoices)
    ? currentChoices.map((c: any) => ({ value: c, label: c }))
    : [];

  switch (type) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
      return <Input value={value} onChange={onChange} placeholder="Giá trị mặc định..." />;
    case "TEXTAREA":
      return <Input.TextArea value={value} onChange={onChange} rows={2} placeholder="Văn bản mặc định..." />;
    case "NUMBER":
    case "DECIMAL":
    case "CURRENCY":
    case "PERCENTAGE":
      return <InputNumber value={value} onChange={onChange} placeholder="Số mặc định..." style={{ width: "100%" }} />;
    case "DATE":
      return <DatePicker value={value} onChange={onChange} placeholder="Chọn ngày..." style={{ width: "100%" }} format="DD/MM/YYYY" />;
    case "TIME":
      return <Input value={value} onChange={onChange} placeholder="Ví dụ: 08:30" />;
    case "DATETIME":
      return <DatePicker showTime value={value} onChange={onChange} placeholder="Chọn ngày & giờ..." style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" />;
    case "MONTH_YEAR":
      return <DatePicker picker="month" value={value} onChange={onChange} placeholder="Chọn tháng/năm..." style={{ width: "100%" }} format="MM/YYYY" />;
    case "SELECT":
      return (
        <Select
          value={value}
          onChange={onChange}
          placeholder="Chọn giá trị mặc định..."
          options={choicesOptions}
          allowClear
        />
      );
    case "MULTI_SELECT":
      return (
        <Select
          mode="multiple"
          value={value}
          onChange={onChange}
          placeholder="Chọn các giá trị mặc định..."
          options={choicesOptions}
          allowClear
        />
      );
    case "CHECKBOX":
      return (
        <Checkbox
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        >
          Mặc định checked (BẬT)
        </Checkbox>
      );
    case "USER_REF":
      return (
        <Select
          value={value}
          onChange={onChange}
          placeholder="Chọn nhân viên mặc định..."
          options={userOptions}
          allowClear
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
        />
      );
    case "DEPT_REF":
      return (
        <TreeSelect
          value={value}
          onChange={onChange}
          placeholder="Chọn phòng ban mặc định..."
          treeData={deptTreeData}
          allowClear
          treeDefaultExpandAll
        />
      );
    case "ROLE_REF":
      return (
        <Select
          value={value}
          onChange={onChange}
          placeholder="Chọn vai trò mặc định..."
          options={roleOptions}
          allowClear
          showSearch
          filterOption={(input, opt) => String(opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
        />
      );
    default:
      return null;
  }
};

export default function WorkspaceContainerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = React.use(params); // Unwrapping dynamic parameters chuẩn Next.js 15 App Router [1]
  const entityIdNum = Number(id);

  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const { message } = App.useApp();

  // Đọc động ID Doanh nghiệp và Tên nhân viên từ LocalStorage [1]
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("Thành viên BOS");
  const [collapsed, setCollapsed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("bos_token");
      if (!token) {
        router.push("/auth/login");
        return;
      }
      const storedTenantId = localStorage.getItem("bos_tenant_id");
      const storedUserName = localStorage.getItem("bos_user_name");
      const storedUserType = localStorage.getItem("bos_user_type");
      setIsSuperAdmin(storedUserType === "SUPER_ADMIN");

      if (storedTenantId) {
        setTenantId(Number(storedTenantId));
      }
      if (storedUserName) {
        setUserName(storedUserName);
      }
      const storedPermissions = localStorage.getItem("bos_user_permissions");
      if (storedPermissions) {
        try {
          setUserPermissions(JSON.parse(storedPermissions));
        } catch (e) {
          console.error(e);
        }
      }
      setPermissionsLoaded(true);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("bos_token");
    localStorage.removeItem("bos_tenant_id");
    localStorage.removeItem("bos_user_name");
    localStorage.removeItem("bos_user_permissions");
    localStorage.removeItem("bos_user_type");
    router.push("/auth/login");
  };

  const userMenu = {
    items: [
      { key: "profile", label: "Thông tin cá nhân" },
      { key: "security", label: "Thiết lập bảo mật" },
      { type: "divider" as const },
      { key: "logout", label: "Đăng xuất hệ thống", danger: true },
    ],
    onClick: (info: any) => {
      if (info.key === "logout") {
        handleLogout();
      } else if (info.key === "profile") {
        router.push("/profile");
      }
    },
  };

  // Trạng thái liên kết đồng bộ 4 phân khu [1]
  const [activeStepId, setActiveStepId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "workflow" | "automations" | "templates" | "history">("form");
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);

  // Gọi API Hooks Hệ thống thực tế
  const entitiesQuery = useEntities();
  const activeEntity = entitiesQuery.data?.data?.find(
    (e) => e.id === entityIdNum,
  );

  const fieldsQuery = useFields(entityIdNum);
  const createField = useCreateField();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();

  // Gọi API Hook truy vấn thông tin Doanh nghiệp ĐỘNG từ database [1]
  const tenantQuery = useTenantDetail(tenantId);

  const activeTenantName = tenantId === null
    ? "Quản trị Hệ thống (Super Admin)"
    : tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : "Đang tải thông tin doanh nghiệp...";

  const { data: myTenants = [] } = useMyTenants();
  const switchTenantMutation = useSwitchTenant();

  const handleSwitchTenant = (targetTenantId: number | null) => {
    switchTenantMutation.mutate({ tenantId: targetTenantId as any }, {
      onSuccess: (res) => {
        message.success("Chuyển doanh nghiệp thành công!");
        localStorage.setItem("bos_token", res.accessToken);
        localStorage.setItem("bos_user_name", res.user.fullName);
        localStorage.setItem("bos_user_permissions", JSON.stringify((res.user as any).role?.permissions || {}));
        localStorage.setItem("bos_user_type", (res.user as any).userType);
        if (res.user.tenantId === null || res.user.tenantId === undefined) {
          localStorage.removeItem("bos_tenant_id");
        } else {
          localStorage.setItem("bos_tenant_id", String(res.user.tenantId));
        }
        window.location.reload();
      },
      onError: (err: any) => {
        message.error("Không thể chuyển đổi doanh nghiệp.");
      }
    });
  };

  const tenantMenu = {
    items: [
      ...(isSuperAdmin ? [{
        key: "root",
        label: "Quản trị Hệ thống (Super Admin)",
        icon: <SettingOutlined />,
        disabled: tenantId === null,
      }] : []),
      ...myTenants.map((t) => ({
        key: String(t.id),
        label: t.name,
        icon: <BankOutlined />,
        disabled: t.id === tenantId,
      }))
    ],
    onClick: (info: any) => {
      if (info.key === "root") {
        handleSwitchTenant(null);
      } else {
        handleSwitchTenant(Number(info.key));
      }
    }
  };

  // Gọi API Hooks liên kết luồng quy trình của Entity [1]
  const workflowsQuery = useWorkflows(entityIdNum);
  const activeWorkflow = workflowsQuery.data?.data?.[0]; // Lấy quy trình đầu tiên của Thực thể

  // Trích xuất activeVersionId trực tiếp từ Quy trình liên đới thực tế [1]
  const activeVersionId = selectedVersionId || activeWorkflow?.versions?.[0]?.id || null;

  // Gọi API lấy danh sách Steps tại page.tsx
  const stepsQuery = useWorkflowSteps(activeVersionId);
  const steps = stepsQuery.data || [];
  const activeStep = steps.find((s) => s.id === activeStepId) || null;
  const setActiveStep = (step: WorkflowStep | null) => {
    setActiveStepId(step ? step.id : null);
  };

  // Gọi các API hooks phục vụ cho việc nhập và hiển thị dropdown tham chiếu/cơ cấu tổ chức
  const deptsQuery = useDepartmentTree();
  const usersQuery = useUsers(1, 1000);
  const rolesQuery = useRoles(1, 1000);

  const deptTreeData = React.useMemo(() => {
    const mapNode = (node: any): any => ({
      value: node.id,
      title: node.name,
      children: node.children ? node.children.map(mapNode) : undefined,
    });
    return (deptsQuery.data || []).map(mapNode);
  }, [deptsQuery.data]);

  const userOptions = React.useMemo(() => {
    return (usersQuery.data?.data || []).map((u) => ({
      value: u.id,
      label: `${u.fullName} (${u.email})`,
    }));
  }, [usersQuery.data]);

  const roleOptions = React.useMemo(() => {
    return (rolesQuery.data?.data || []).map((r) => ({
      value: r.id,
      label: r.name,
    }));
  }, [rolesQuery.data]);

  // Đồng bộ phiên bản quy trình đã chọn
  useEffect(() => {
    if (activeWorkflow?.versions?.length) {
      const exists = activeWorkflow.versions.some((v: any) => v.id === selectedVersionId);
      if (!exists) {
        setSelectedVersionId(activeWorkflow.versions[0].id);
      }
    } else {
      setSelectedVersionId(null);
    }
  }, [activeWorkflow, selectedVersionId]);

  // Reset active step khi đổi version
  useEffect(() => {
    setActiveStepId(null);
  }, [selectedVersionId]);

  // Trạng thái modal thêm nhanh
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState<string>("TEXT");
  const [quickForm] = Form.useForm();
  const watchedQuickType = Form.useWatch("type", quickForm);

  // Trạng thái modal chỉnh sửa trường dữ liệu
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [editForm] = Form.useForm();
  const watchedEditType = Form.useWatch("type", editForm);

  const handleEditClick = (field: Field) => {
    setEditingField(field);
    editForm.resetFields();
    editForm.setFieldsValue({
      name: field.name,
      code: field.code,
      type: field.type,
      orderIndex: field.config?.orderIndex || 0,
      isRequired: field.config?.isRequired || false,
      options: {
        placeholder: field.config?.options?.placeholder || "",
        min: field.config?.options?.min,
        max: field.config?.options?.max,
        prefix: field.config?.options?.prefix || "",
        choices: Array.isArray(field.config?.options?.choices)
          ? field.config.options.choices
          : typeof field.config?.options?.choices === "string"
          ? field.config.options.choices.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [],
        lookupEntityId: field.config?.options?.lookupEntityId,
        displayField: field.config?.options?.displayField || "",
        formula: field.config?.options?.formula || (field.config as any)?.formula || "",
        minLength: field.config?.options?.minLength,
        maxLength: field.config?.options?.maxLength,
        regexPattern: field.config?.options?.regexPattern || "",
        errorMessage: field.config?.options?.errorMessage || "",
        columns: (field.config?.options?.columns || []).map((col: any) => {
          if (col.type === "SELECT") {
            return {
              ...col,
              choices: Array.isArray(col.choices)
                ? col.choices
                : typeof col.choices === "string"
                ? col.choices.split(",").map((s: string) => s.trim()).filter(Boolean)
                : [],
            };
          }
          return col;
        }),
        showIf: field.config?.options?.showIf || { logicalOperator: "AND", rules: [] },
        requiredIf: field.config?.options?.requiredIf || { logicalOperator: "AND", rules: [] },
        initValue: (() => {
          const val = field.config?.options?.initValue !== undefined ? field.config.options.initValue : field.config?.options?.defaultValue;
          if (val === undefined || val === null || val === "") return undefined;
          if (["DATE", "DATETIME", "MONTH_YEAR"].includes(field.type)) {
            return dayjs(val);
          }
          if (field.type === "CHECKBOX") {
            return val === true || val === "true";
          }
          return val;
        })(),
      },
    });
    setIsEditModalOpen(true);
  };

  const onEditFieldSubmit = (values: any) => {
    if (!editingField) return;
    const payload = formatChoicesPayload(values);

    updateField.mutate(
      {
        id: editingField.id,
        entityId: entityIdNum,
        payload: {
          name: payload.name,
          type: payload.type,
          isRequired: payload.isRequired,
          orderIndex: payload.orderIndex,
          options: payload.options,
        },
      },
      {
        onSuccess: () => {
          message.success(`Cập nhật thông tin trường "${payload.name}" thành công!`);
          setIsEditModalOpen(false);
          setEditingField(null);
        },
        onError: (err: any) => {
          const errMsg =
            err?.response?.data?.message || "Có lỗi xảy ra khi lưu.";
          message.error(errMsg);
        },
      },
    );
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "dashboard") router.push("/");
    if (e.key === "organization") router.push("/organization");
    if (e.key === "metadata") router.push("/metadata");
    if (e.key === "workflow") router.push("/metadata");
    if (e.key === "records") router.push("/records");
    if (e.key === "settings") router.push("/settings");
  };

  const handleAddQuickField = (type: string, targetFieldId?: number) => {
    setQuickCreateType(type);
    quickForm.resetFields();

    let targetOrder = (fieldsQuery.data?.length || 0) + 1;
    if (targetFieldId !== undefined && fieldsQuery.data) {
      const targetField = fieldsQuery.data.find((f) => f.id === targetFieldId);
      if (targetField) {
        targetOrder = targetField.config?.orderIndex || 1;
      }
    }

    quickForm.setFieldsValue({
      type,
      orderIndex: targetOrder,
      isRequired: false,
      options: {
        columns: [],
        choices: [],
        initValue: undefined,
      },
    });
    setIsQuickCreateOpen(true);
  };

  const formatChoicesPayload = (values: any) => {
    const formatted = { ...values };
    
    if (values.type === "SELECT" || values.type === "MULTI_SELECT") {
      let finalChoices: string[] = [];
      if (Array.isArray(values.options?.choices)) {
        finalChoices = values.options.choices
          .map((c: any) => typeof c === "string" ? c.trim() : c)
          .filter(Boolean);
      } else if (typeof values.options?.choices === "string") {
        finalChoices = values.options.choices
          .split(",")
          .map((c: string) => c.trim())
          .filter(Boolean);
      }
      formatted.options = {
        ...values.options,
        choices: finalChoices,
      };
    }

    // Format nested columns inside TABLE type
    if (values.type === "TABLE" && Array.isArray(values.options?.columns)) {
      formatted.options = {
        ...values.options,
        columns: values.options.columns.map((col: any) => {
          if (col.type === "SELECT") {
            let colChoices: string[] = [];
            if (Array.isArray(col.choices)) {
              colChoices = col.choices
                .map((c: any) => typeof c === "string" ? c.trim() : c)
                .filter(Boolean);
            } else if (typeof col.choices === "string") {
              colChoices = col.choices
                .split(",")
                .map((c: string) => c.trim())
                .filter(Boolean);
            }
            return {
              ...col,
              choices: colChoices,
            };
          }
          return col;
        }),
      };
    }

    // Clean dynamic initValue if it is a Dayjs object
    if (formatted.options?.initValue) {
      const initVal = formatted.options.initValue;
      if (typeof initVal === "object" && initVal && "$d" in initVal) {
        formatted.options.initValue = initVal.toISOString();
      }
    } else if (formatted.options && formatted.options.initValue === undefined) {
      delete formatted.options.initValue;
    }

    return formatted;
  };

  const onQuickFieldCreateSubmit = (values: any) => {
    const payload = formatChoicesPayload({
      ...values,
      entityId: entityIdNum,
    });

    createField.mutate(payload, {
      onSuccess: () => {
        message.success(`Khởi tạo thành công trường "${values.name}"!`);
        setIsQuickCreateOpen(false);
        quickForm.resetFields();
      },
      onError: (err: any) => {
        const errMsg =
          err?.response?.data?.message || "Không thể khởi tạo trường mới.";
        message.error(errMsg);
      },
    });
  };

  const onSaveInspectorSubmit = (values: any) => {
    if (!selectedField) return;
    const payload = formatChoicesPayload(values);

    updateField.mutate(
      {
        id: selectedField.id,
        entityId: entityIdNum,
        payload: {
          name: payload.name,
          type: payload.type,
          isRequired: payload.isRequired,
          orderIndex: payload.orderIndex,
          options: payload.options,
        },
      },
      {
        onSuccess: () => {
          message.success(
            "Cập nhật thông số kỹ thuật cấu hình trường thành công!",
          );
          setSelectedField(null);
        },
        onError: (err: any) => {
          const errMsg =
            err?.response?.data?.message || "Có lỗi xảy ra khi lưu.";
          message.error(errMsg);
        },
      },
    );
  };

  const handleDeleteFieldSubmit = (field: Field) => {
    deleteField.mutate(
      { id: field.id, entityId: entityIdNum },
      {
        onSuccess: () => {
          message.success("Đã gỡ bỏ trường dữ liệu khỏi biểu mẫu!");
          if (selectedField?.id === field.id) setSelectedField(null);
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || "Không thể xóa.";
          message.error(errMsg);
        },
      },
    );
  };

  // --- XỬ LÝ KÉO THẢ SẮP XẾP LẠI THỨ TỰ TRƯỜNG DỮ LIỆU ---
  const handleReorderFields = async (draggedId: number, targetId: number) => {
    if (!fieldsQuery.data) return;

    const sortedFields = [...fieldsQuery.data].sort(
      (a, b) => (a.config?.orderIndex || 0) - (b.config?.orderIndex || 0)
    );

    const draggedIndex = sortedFields.findIndex((f) => f.id === draggedId);
    const targetIndex = sortedFields.findIndex((f) => f.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedField] = sortedFields.splice(draggedIndex, 1);
    sortedFields.splice(targetIndex, 0, draggedField);

    const updates = sortedFields
      .map((field, idx) => {
        const newOrder = idx + 1;
        const currentOrder = field.config?.orderIndex || 0;
        if (currentOrder !== newOrder) {
          return {
            id: field.id,
            payload: {
              name: field.name,
              type: field.type,
              isRequired: field.config?.isRequired || false,
              orderIndex: newOrder,
              options: field.config?.options || {},
            },
          };
        }
        return null;
      })
      .filter((update): update is NonNullable<typeof update> => update !== null);

    if (updates.length === 0) return;

    const hideMessage = message.loading("Đang đồng bộ vị trí sắp xếp mới...", 0);

    try {
      const axiosCalls = updates.map((up) =>
        api.patch(`/api/v1/fields/${up.id}`, up.payload)
      );
      await Promise.all(axiosCalls);
      hideMessage();
      queryClient.invalidateQueries({ queryKey: ["fields", entityIdNum] });
      message.success("Đã đồng bộ vị trí sắp xếp mới thành công!");
    } catch (err) {
      hideMessage();
      message.error("Có lỗi xảy ra khi đồng bộ thứ tự sắp xếp.");
      console.error(err);
    }
  };

  // Trích xuất activeVersionId đã được di chuyển lên trên để tránh lỗi compiler


  if (permissionsLoaded && !isSuperAdmin && !userPermissions.entities?.includes("READ")) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#f8fafc" }}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền truy cập trang Thiết kế Biểu mẫu."
          extra={<Button type="primary" onClick={() => router.push("/")}>Quay lại Trang chủ</Button>}
        />
      </div>
    );
  }

  const sidebarItems = [
    { key: "dashboard", icon: <DashboardOutlined />, label: "Bảng tổng quan" },
  ];

  if (isSuperAdmin || userPermissions.departments?.includes("READ")) {
    sidebarItems.push({ key: "organization", icon: <PartitionOutlined />, label: "Cơ cấu Tổ chức" });
  }
  if (isSuperAdmin || userPermissions.entities?.includes("READ")) {
    sidebarItems.push({ key: "metadata", icon: <BuildOutlined />, label: "Biểu mẫu Động" });
  }
  if (isSuperAdmin || userPermissions.workflows?.includes("READ")) {
    sidebarItems.push({ key: "workflow", icon: <DeploymentUnitOutlined />, label: "Luồng Quy trình" });
  }
  if (isSuperAdmin || userPermissions.records?.includes("READ")) {
    sidebarItems.push({ key: "records", icon: <FormOutlined />, label: "Hồ sơ & Biểu mẫu" });
  }
  if (isSuperAdmin || userPermissions.users?.includes("READ") || userPermissions.roles?.includes("READ")) {
    sidebarItems.push({ key: "settings", icon: <SettingOutlined />, label: "Cài đặt Hệ thống" });
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="light"
        style={{ borderRight: "1px solid #f0f0f0" }}
      >
        <div
          className="flex items-center justify-center py-4 border-b border-gray-100"
          style={{ minHeight: "64px" }}
        >
          <Title level={4} style={{ margin: 0, color: "#0050b3" }}>
            BOS Platform
          </Title>
        </div>
        <Menu
          theme="light"
          selectedKeys={["metadata"]}
          mode="inline"
          onClick={handleMenuClick}
          items={sidebarItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
          }}
          className="flex justify-between w-full"
        >
          {/* TRUY VẤN TÊN DOANH NGHIỆP THỜI GIAN THỰC TỪ DATABASE [1] */}
          <Dropdown menu={tenantMenu} trigger={['click']} placement="bottomLeft">
            <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading || switchTenantMutation.isPending}>
              <Text strong>{activeTenantName}</Text>
            </Button>
          </Dropdown>
          <Space size="large">
            <Badge count={3} dot>
              <Button type="text" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#0050b3" }}
                />
                {/* HIỂN THỊ ĐỘNG TÊN THÀNH VIÊN ĐÃ ĐĂNG NHẬP [1] */}
                <Text strong className="hidden md:block">
                  {userName}
                </Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: "24px" }}>
          <Space direction="vertical" size="large" className="w-full">
            {/* Standard low-code workspace page header */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center">
              <div>
                <Breadcrumb
                  items={[
                    { title: "Trang chủ" },
                    {
                      title: (
                        <span
                          onClick={() => router.push("/metadata")}
                          style={{ cursor: "pointer" }}
                        >
                          Động hóa biểu mẫu
                        </span>
                      ),
                    },
                    {
                      title: activeEntity
                        ? `Kiến tạo: ${activeEntity.name}`
                        : "Không gian thiết kế",
                    },
                  ]}
                />
                <Title level={2} style={{ margin: "8px 0 0 0" }}>
                  Không gian Kiến tạo:{" "}
                  {activeEntity?.name || <Spin size="small" />}
                </Title>
                <Paragraph type="secondary" style={{ margin: "4px 0 0 0" }}>
                  Trình thiết kế ba phân khu liên kết sâu sắc: Form Schema, Step
                  permissions, Formula compiler.
                </Paragraph>
              </div>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/metadata")}
              >
                Quay lại danh sách
              </Button>
            </div>

            {/* Bộ chuyển đổi phân khu Thiết kế */}
            <div className="flex justify-start">
              <Segmented
                value={activeTab}
                onChange={(value) => setActiveTab(value as any)}
                options={[
                  { label: "Thiết kế Biểu mẫu (Form Schema)", value: "form", icon: <BuildOutlined /> },
                  { label: "Sơ đồ Quy trình (Workflow Canvas)", value: "workflow", icon: <PartitionOutlined /> },
                  { label: "Quy tắc Tự động (Automations)", value: "automations", icon: <SettingOutlined /> },
                  { label: "Mẫu in (Templates)", value: "templates", icon: <BankOutlined /> },
                  { label: "Lịch sử Phiên bản (History)", value: "history", icon: <ClockCircleOutlined /> },
                ]}
                size="large"
                style={{ borderRadius: "8px", padding: "4px" }}
              />
            </div>

            {/* SIÊU LAYOUT BA PHÂN KHU (3-PANEL SYNC WORKSPACE) HOẶC CANVAS QUY TRÌNH */}
            {activeTab === "form" ? (
              <Row gutter={[20, 20]}>
                {/* PHÂN KHU 1: TRÁI - WORKFLOW STEPS CONTROLLER TRUY VẤN LIVE STEPS (5 COLS) */}
                <Col xs={24} xl={5}>
                  <WorkflowStepsController
                    entityId={entityIdNum}
                    entityName={activeEntity?.name || ""}
                    workflowId={activeWorkflow?.id || null}
                    versionId={activeVersionId}
                    selectedVersionId={activeVersionId}
                    setSelectedVersionId={setSelectedVersionId}
                    versions={activeWorkflow?.versions || []}
                    fields={fieldsQuery.data || []}
                    steps={steps}
                    isLoading={stepsQuery.isLoading}
                    activeStep={activeStep}
                    setActiveStep={setActiveStep}
                  />
                </Col>

                {/* PHÂN KHU 2: GIỮA - FORM CANVAS PREVIEW ĐỒNG BỘ ĐỘNG (13 COLS) */}
                <Col xs={24} md={14} xl={13}>
                  <DragDropCanvas
                    fields={fieldsQuery.data || []}
                    isLoading={fieldsQuery.isLoading}
                    selectedField={selectedField}
                    setSelectedField={setSelectedField}
                    activeStep={activeStep}
                    onEditClick={(field) => handleEditClick(field)}
                    onDeleteClick={(field) => handleDeleteFieldSubmit(field)}
                    onReorderFields={handleReorderFields}
                    onDropBlock={(type, targetId) => handleAddQuickField(type, targetId)}
                  />
                </Col>

                {/* PHÂN KHU 3: PHẢI - TOOLBOX & FIELD INSPECTOR (6 COLS) */}
                <Col xs={24} md={10} xl={6}>
                  <ToolboxAndInspector
                    fields={fieldsQuery.data || []}
                    entities={entitiesQuery.data?.data || []}
                    selectedField={selectedField}
                    onAddQuickField={handleAddQuickField}
                    onSaveInspector={onSaveInspectorSubmit}
                    isSaving={updateField.isPending}
                  />
                </Col>
              </Row>
            ) : activeTab === "workflow" ? (
              <VisualWorkflowCanvas
                entityId={entityIdNum}
                entityName={activeEntity?.name || ""}
                workflowId={activeWorkflow?.id || null}
                versionId={activeVersionId}
                steps={steps}
                fields={fieldsQuery.data || []}
                activeStep={activeStep}
                setActiveStep={setActiveStep}
              />
            ) : activeTab === "automations" ? (
              <AutomationRulesManager
                entityId={entityIdNum}
                fields={fieldsQuery.data || []}
              />
            ) : activeTab === "templates" ? (
              <PrintTemplateManager
                entityId={entityIdNum}
                fields={fieldsQuery.data || []}
              />
            ) : (
              <VersionHistoryManager
                entityId={entityIdNum}
              />
            )}

          </Space>
        </Content>
      </Layout>

      {/* --- MODAL THÊM TRƯỜNG DỮ LIỆU ĐỘNG NHANH TỪ TOOLBOX --- */}
      <Modal
        title={`Tạo trường: Kiểu ${quickCreateType}`}
        open={isQuickCreateOpen}
        onCancel={() => setIsQuickCreateOpen(false)}
        onOk={() => quickForm.submit()}
        confirmLoading={createField.isPending}
        width={600}
      >
        <Form
          form={quickForm}
          layout="vertical"
          onFinish={onQuickFieldCreateSubmit}
          style={{ marginTop: "16px" }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên trường hiển thị"
                rules={[
                  { required: true, message: "Vui lòng nhập tên trường" },
                ]}
              >
                <Input placeholder="Ví dụ: Đơn giá" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã trường (snake_case viết thường)"
                rules={[
                  {
                    required: true,
                    pattern: /^[a-z0-9_]+$/,
                    message: "Chữ thường và gạch dưới",
                  },
                ]}
              >
                <Input placeholder="unit_price" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Kiểu trường">
                <Select
                  disabled
                  options={[{ value: quickCreateType, label: quickCreateType }]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="orderIndex"
                label="Thứ tự hiển thị"
                rules={[{ required: true }]}
              >
                <InputNumber className="w-full" placeholder="Ví dụ: 1, 2, 3..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="isRequired" valuePropName="checked">
                <Checkbox>Trường này bắt buộc nhập (isRequired)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name={["options", "placeholder"]}
                label="Gợi ý nhập liệu (Placeholder)"
              >
                <Input placeholder="Ví dụ: Nhập họ và tên..." />
              </Form.Item>
            </Col>

            {/* options động tùy kiểu trường */}
            {(watchedQuickType === "TEXT" ||
              watchedQuickType === "EMAIL" ||
              watchedQuickType === "PHONE" ||
              watchedQuickType === "TEXTAREA") && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "minLength"]}
                    label="Độ dài tối thiểu"
                  >
                    <InputNumber className="w-full" placeholder="Ví dụ: 2" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={["options", "maxLength"]}
                    label="Độ dài tối đa"
                  >
                    <InputNumber className="w-full" placeholder="Ví dụ: 255" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "regexPattern"]}
                    label="Biểu thức chính quy (Regex)"
                  >
                    <Input placeholder="Ví dụ: ^(0|84)[3|5|7|8|9][0-9]{8}$" />
                  </Form.Item>

                  {/* Hộp gợi ý các mẫu regex hay dùng trong Quick Create Modal */}
                  <div style={{ marginBottom: "16px", padding: "8px", background: "#f9f9f9", borderRadius: "6px", border: "1px solid #e8e8e8" }}>
                    <div style={{ marginBottom: "6px" }}>
                      <Text type="secondary" style={{ fontSize: "11px", fontWeight: "bold" }}>
                        Mẫu gợi ý kiểm tra Regex nhanh:
                      </Text>
                    </div>
                    <Space wrap size={[4, 6]}>
                      {COMMON_REGEX_PATTERNS.map((item, idx) => (
                        <Tag
                          key={idx}
                          color="blue"
                          style={{ cursor: "pointer", fontSize: "11px" }}
                          onClick={() => {
                            quickForm.setFieldsValue({
                              options: {
                                ...quickForm.getFieldValue("options"),
                                regexPattern: item.pattern,
                                errorMessage: item.error,
                              },
                            });
                          }}
                        >
                          {item.label}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "errorMessage"]}
                    label="Thông báo lỗi Regex"
                  >
                    <Input placeholder="Ví dụ: Định dạng không hợp lệ" />
                  </Form.Item>
                </Col>
              </>
            )}

            {(watchedQuickType === "NUMBER" ||
              watchedQuickType === "DECIMAL" ||
              watchedQuickType === "CURRENCY" ||
              watchedQuickType === "PERCENTAGE") && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "min"]}
                    label="Giá trị tối thiểu"
                  >
                    <InputNumber className="w-full" placeholder="Ví dụ: 0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={["options", "max"]} label="Giá trị tối đa">
                    <InputNumber className="w-full" placeholder="Ví dụ: 9999" />
                  </Form.Item>
                </Col>
                {watchedQuickType === "CURRENCY" && (
                  <Col span={24}>
                    <Form.Item
                      name={["options", "prefix"]}
                      label="Ký hiệu tiền tệ (prefix)"
                    >
                      <Input placeholder="Ví dụ: ₫, $, €..." />
                    </Form.Item>
                  </Col>
                )}
              </>
            )}

            {(watchedQuickType === "SELECT" ||
              watchedQuickType === "MULTI_SELECT") && (
              <Col span={24}>
                <Card size="small" title="Danh sách các lựa chọn (Choices)" style={{ marginBottom: 16, background: "#fafafa" }}>
                  <Form.List
                    name={["options", "choices"]}
                    rules={[
                      {
                        validator: async (_, names) => {
                          if (!names || names.length < 1) {
                            return Promise.reject(new Error("Vui lòng cấu hình tối thiểu 1 lựa chọn."));
                          }
                        },
                      },
                    ]}
                  >
                    {(fields, { add, remove }, { errors }) => (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {fields.map((field) => (
                          <Space key={field.key} align="baseline">
                            <Form.Item
                              {...field}
                              rules={[{ required: true, whitespace: true, message: "Nhập giá trị lựa chọn" }]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="Nhập tên lựa chọn..." style={{ width: 380 }} />
                            </Form.Item>
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                            />
                          </Space>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          icon={<PlusOutlined />}
                          style={{ width: "100%" }}
                          size="small"
                        >
                          Thêm lựa chọn mới
                        </Button>
                        <Form.ErrorList errors={errors} />
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>
            )}

            {watchedQuickType === "LOOKUP" && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "lookupEntityId"]}
                    label="Liên kết tới Biểu mẫu"
                    rules={[{ required: true, message: "Chọn biểu mẫu" }]}
                  >
                    <Select
                      placeholder="Chọn biểu mẫu..."
                      options={(entitiesQuery.data?.data || []).map((e) => ({
                        value: e.id,
                        label: e.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={["options", "displayField"]}
                    label="Trường hiển thị"
                    rules={[{ required: true, message: "Nhập displayField" }]}
                  >
                    <Input placeholder="Ví dụ: display_name" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "filter", "status"]}
                    label="Lọc theo trạng thái hồ sơ liên kết"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Chọn trạng thái lọc (Mặc định: Tất cả)"
                      allowClear
                      options={[
                        { value: "DRAFT", label: "Nháp (DRAFT)" },
                        { value: "IN_PROGRESS", label: "Đang duyệt (IN_PROGRESS)" },
                        { value: "COMPLETED", label: "Hoàn thành (COMPLETED)" },
                        { value: "REJECTED", label: "Bị từ chối (REJECTED)" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </>
            )}

            {/* Tạo bảng con trong modal tạo nhanh */}
            {watchedQuickType === "TABLE" && (
              <Col span={24}>
                <Card
                  size="small"
                  title="Thiết lập các cột con cho Lưới TABLE"
                  headStyle={{ background: "#fafafa" }}
                >
                  <Form.List name={["options", "columns"]}>
                    {(columns, { add, remove }) => (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {columns.map(({ key, name, ...restField }) => (
                          <Card
                            size="small"
                            key={key}
                            style={{ background: "#fcfdfd" }}
                          >
                            <Space direction="vertical" className="w-full">
                              <Form.Item
                                {...restField}
                                name={[name, "name"]}
                                label="Tên cột"
                                rules={[{ required: true, message: "Nhập tên" }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Input size="small" placeholder="Ví dụ: Tên sản phẩm" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "code"]}
                                label="Mã cột (snake_case)"
                                rules={[{ required: true, message: "Nhập mã" }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Input size="small" placeholder="Ví dụ: product_name" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "type"]}
                                label="Loại cột"
                                rules={[{ required: true, message: "Chọn loại cột" }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Select
                                  size="small"
                                  placeholder="Chọn loại cột..."
                                  options={[
                                    { value: "TEXT", label: "Chữ (TEXT)" },
                                    { value: "NUMBER", label: "Số (NUMBER)" },
                                    { value: "DATE", label: "Ngày (DATE)" },
                                    { value: "SELECT", label: "Hộp chọn (SELECT)" },
                                    { value: "CHECKBOX", label: "Đóng mở (CHECKBOX)" },
                                    { value: "STT", label: "Số thứ tự (STT)" },
                                    { value: "FORMULA", label: "Công thức toán (FORMULA)" },
                                  ]}
                                />
                              </Form.Item>

                              <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) => {
                                  const prevCol = prevValues?.options?.columns?.[name]?.type;
                                  const currCol = currentValues?.options?.columns?.[name]?.type;
                                  return prevCol !== currCol;
                                }}
                              >
                                {({ getFieldValue }) => {
                                  const colType = getFieldValue(["options", "columns", name, "type"]);
                                  const isNumeric = colType === "NUMBER" || colType === "FORMULA";
                                  return (
                                    <>
                                      {colType === "FORMULA" && (
                                        <Form.Item
                                          {...restField}
                                          name={[name, "formula"]}
                                          label="Công thức của cột"
                                          rules={[{ required: true, message: "Nhập công thức cột" }]}
                                          style={{ marginBottom: 4 }}
                                        >
                                          <Input size="small" placeholder="Ví dụ: {don_gia} * {so_luong}" />
                                        </Form.Item>
                                      )}
                                      {colType === "SELECT" && (
                                        <Card size="small" title="Lựa chọn cho cột SELECT" style={{ marginBottom: 8, background: "#fafafa" }}>
                                          <Form.List {...restField} name={[name, "choices"]}>
                                            {(choicesFields, { add: addChoice, remove: removeChoice }) => (
                                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                {choicesFields.map((choiceField) => (
                                                  <Space key={choiceField.key} align="baseline">
                                                    <Form.Item
                                                      {...choiceField}
                                                      rules={[{ required: true, whitespace: true, message: "Nhập giá trị" }]}
                                                      style={{ marginBottom: 0 }}
                                                    >
                                                      <Input size="small" placeholder="Tên lựa chọn..." style={{ width: 220 }} />
                                                    </Form.Item>
                                                    <Button
                                                      type="text"
                                                      danger
                                                      size="small"
                                                      icon={<MinusCircleOutlined />}
                                                      onClick={() => removeChoice(choiceField.name)}
                                                    />
                                                  </Space>
                                                ))}
                                                <Button
                                                  type="dashed"
                                                  size="small"
                                                  onClick={() => addChoice()}
                                                  icon={<PlusOutlined />}
                                                  style={{ width: "100%" }}
                                                >
                                                  Thêm lựa chọn
                                                </Button>
                                              </div>
                                            )}
                                          </Form.List>
                                        </Card>
                                      )}
                                      {isNumeric && (
                                        <Form.Item
                                          {...restField}
                                          name={[name, "summaryType"]}
                                          label="Hàm tổng hợp chân trang"
                                          style={{ marginBottom: 4 }}
                                          initialValue="NONE"
                                        >
                                          <Select
                                            size="small"
                                            placeholder="Chọn hàm tổng hợp..."
                                            options={[
                                              { value: "NONE", label: "Không tính" },
                                              { value: "SUM", label: "Tổng cộng (SUM)" },
                                              { value: "AVG", label: "Trung bình cộng (AVG)" },
                                              { value: "MIN", label: "Nhỏ nhất (MIN)" },
                                              { value: "MAX", label: "Lớn nhất (MAX)" },
                                            ]}
                                          />
                                        </Form.Item>
                                      )}
                                    </>
                                  );
                                }}
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, "isRequired"]}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <Checkbox>Bắt buộc nhập</Checkbox>
                              </Form.Item>
                              <Button
                                type="text"
                                danger
                                onClick={() => remove(name)}
                                icon={<MinusCircleOutlined />}
                                size="small"
                              >
                                Xóa cột
                              </Button>
                            </Space>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() =>
                            add({
                              name: "",
                              code: "",
                              type: "TEXT",
                              isRequired: false,
                            })
                          }
                          block
                          icon={<PlusOutlined />}
                          size="small"
                        >
                          Thêm cột
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>
            )}

            {watchedQuickType && watchedQuickType !== "TABLE" && watchedQuickType !== "FORMULA" && (
              <Col span={24}>
                <Form.Item
                  name={["options", "initValue"]}
                  label="Giá trị khởi tạo (Mặc định)"
                  valuePropName={watchedQuickType === "CHECKBOX" ? "checked" : "value"}
                  style={{ marginBottom: "16px" }}
                >
                  <InitValueInput
                  type={watchedQuickType}
                  form={quickForm}
                  userOptions={userOptions}
                  deptTreeData={deptTreeData}
                  roleOptions={roleOptions}
                />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>

      {/* --- MODAL HIỆU CHỈNH TRƯỜNG DỮ LIỆU --- */}
      <Modal
        title={editingField ? `Hiệu chỉnh trường: ${editingField.name} (Kiểu ${editingField.type})` : "Hiệu chỉnh trường"}
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingField(null);
        }}
        onOk={() => editForm.submit()}
        confirmLoading={updateField.isPending}
        width={700}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={onEditFieldSubmit}
          style={{ marginTop: "16px" }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Tên trường hiển thị"
                rules={[
                  { required: true, message: "Vui lòng nhập tên trường" },
                ]}
              >
                <Input placeholder="Ví dụ: Đơn giá" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="code"
                label="Mã trường (Không được sửa)"
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Kiểu trường">
                <Select
                  disabled
                  options={[{ value: watchedEditType, label: watchedEditType }]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="orderIndex"
                label="Thứ tự hiển thị"
                rules={[{ required: true }]}
              >
                <InputNumber className="w-full" placeholder="Ví dụ: 1, 2, 3..." />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="isRequired" valuePropName="checked">
                <Checkbox>Trường này bắt buộc nhập (isRequired)</Checkbox>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name={["options", "placeholder"]}
                label="Gợi ý nhập liệu (Placeholder)"
              >
                <Input placeholder="Ví dụ: Nhập họ và tên..." />
              </Form.Item>
            </Col>

            {/* options động tùy kiểu trường trong modal sửa */}
            {(watchedEditType === "TEXT" ||
              watchedEditType === "EMAIL" ||
              watchedEditType === "PHONE" ||
              watchedEditType === "TEXTAREA") && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "minLength"]}
                    label="Độ dài tối thiểu"
                  >
                    <InputNumber className="w-full" placeholder="Ví dụ: 2" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={["options", "maxLength"]}
                    label="Độ dài tối đa"
                  >
                    <InputNumber className="w-full" placeholder="Ví dụ: 255" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "regexPattern"]}
                    label="Biểu thức chính quy (Regex)"
                  >
                    <Input placeholder="Ví dụ: ^(0|84)[3|5|7|8|9][0-9]{8}$" />
                  </Form.Item>

                  {/* Hộp gợi ý các mẫu regex hay dùng trong Edit Modal */}
                  <div style={{ marginBottom: "16px", padding: "8px", background: "#f9f9f9", borderRadius: "6px", border: "1px solid #e8e8e8" }}>
                    <div style={{ marginBottom: "6px" }}>
                      <Text type="secondary" style={{ fontSize: "11px", fontWeight: "bold" }}>
                        Mẫu gợi ý kiểm tra Regex nhanh:
                      </Text>
                    </div>
                    <Space wrap size={[4, 6]}>
                      {COMMON_REGEX_PATTERNS.map((item, idx) => (
                        <Tag
                          key={idx}
                          color="blue"
                          style={{ cursor: "pointer", fontSize: "11px" }}
                          onClick={() => {
                            editForm.setFieldsValue({
                              options: {
                                ...editForm.getFieldValue("options"),
                                regexPattern: item.pattern,
                                errorMessage: item.error,
                              },
                            });
                          }}
                        >
                          {item.label}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "errorMessage"]}
                    label="Thông báo lỗi Regex"
                  >
                    <Input placeholder="Ví dụ: Định dạng không hợp lệ" />
                  </Form.Item>
                </Col>
              </>
            )}

            {(watchedEditType === "NUMBER" ||
              watchedEditType === "DECIMAL" ||
              watchedEditType === "CURRENCY" ||
              watchedEditType === "PERCENTAGE") && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "min"]}
                    label="Giá trị tối thiểu"
                  >
                    <InputNumber className="w-full" placeholder="Ví dụ: 0" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={["options", "max"]} label="Giá trị tối đa">
                    <InputNumber className="w-full" placeholder="Ví dụ: 9999" />
                  </Form.Item>
                </Col>
                {watchedEditType === "CURRENCY" && (
                  <Col span={24}>
                    <Form.Item
                      name={["options", "prefix"]}
                      label="Ký hiệu tiền tệ (prefix)"
                    >
                      <Input placeholder="Ví dụ: ₫, $, €..." />
                    </Form.Item>
                  </Col>
                )}
              </>
            )}

            {(watchedEditType === "SELECT" ||
              watchedEditType === "MULTI_SELECT") && (
              <Col span={24}>
                <Card size="small" title="Danh sách các lựa chọn (Choices)" style={{ marginBottom: 16, background: "#fafafa" }}>
                  <Form.List
                    name={["options", "choices"]}
                    rules={[
                      {
                        validator: async (_, names) => {
                          if (!names || names.length < 1) {
                            return Promise.reject(new Error("Vui lòng cấu hình tối thiểu 1 lựa chọn."));
                          }
                        },
                      },
                    ]}
                  >
                    {(fields, { add, remove }, { errors }) => (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {fields.map((field) => (
                          <Space key={field.key} align="baseline">
                            <Form.Item
                              {...field}
                              rules={[{ required: true, whitespace: true, message: "Nhập giá trị lựa chọn" }]}
                              style={{ marginBottom: 0 }}
                            >
                              <Input placeholder="Nhập tên lựa chọn..." style={{ width: 380 }} />
                            </Form.Item>
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(field.name)}
                            />
                          </Space>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() => add()}
                          icon={<PlusOutlined />}
                          style={{ width: "100%" }}
                          size="small"
                        >
                          Thêm lựa chọn mới
                        </Button>
                        <Form.ErrorList errors={errors} />
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>
            )}

            {watchedEditType === "LOOKUP" && (
              <>
                <Col span={12}>
                  <Form.Item
                    name={["options", "lookupEntityId"]}
                    label="Liên kết tới Biểu mẫu"
                    rules={[{ required: true, message: "Chọn biểu mẫu" }]}
                  >
                    <Select
                      placeholder="Chọn biểu mẫu..."
                      options={(entitiesQuery.data?.data || []).map((e) => ({
                        value: e.id,
                        label: e.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name={["options", "displayField"]}
                    label="Trường hiển thị"
                    rules={[{ required: true, message: "Nhập displayField" }]}
                  >
                    <Input placeholder="Ví dụ: display_name" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    name={["options", "filter", "status"]}
                    label="Lọc theo trạng thái hồ sơ liên kết"
                  >
                    <Select
                      mode="multiple"
                      placeholder="Chọn trạng thái lọc (Mặc định: Tất cả)"
                      allowClear
                      options={[
                        { value: "DRAFT", label: "Nháp (DRAFT)" },
                        { value: "IN_PROGRESS", label: "Đang duyệt (IN_PROGRESS)" },
                        { value: "COMPLETED", label: "Hoàn thành (COMPLETED)" },
                        { value: "REJECTED", label: "Bị từ chối (REJECTED)" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </>
            )}

            {watchedEditType === "FORMULA" && (
              <Col span={24}>
                <Form.Item
                  name={["options", "formula"]}
                  label="Biểu thức Công thức"
                  rules={[{ required: true, message: "Vui lòng nhập công thức" }]}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Ví dụ: {so_luong} * {don_gia}"
                  />
                </Form.Item>
                <div style={{ marginBottom: "16px" }}>
                  <FormulaBuilder
                    fields={fieldsQuery.data || []}
                    currentFormula={editForm.getFieldValue(["options", "formula"]) || ""}
                    onFormulaChange={(newFormula) => {
                      editForm.setFieldsValue({
                        options: {
                          ...editForm.getFieldValue("options"),
                          formula: newFormula,
                        },
                      });
                    }}
                  />
                </div>
              </Col>
            )}

            {/* Thiết lập cột cho Lưới TABLE */}
            {watchedEditType === "TABLE" && (
              <Col span={24}>
                <Card
                  size="small"
                  title="Thiết lập các cột con cho Lưới TABLE"
                  headStyle={{ background: "#fafafa" }}
                  style={{ marginBottom: "16px" }}
                >
                  <Form.List name={["options", "columns"]}>
                    {(columns, { add, remove }) => (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {columns.map(({ key, name, ...restField }) => (
                          <Card
                            size="small"
                            key={key}
                            style={{ background: "#fcfdfd" }}
                          >
                            <Space direction="vertical" className="w-full">
                              <Form.Item
                                {...restField}
                                name={[name, "name"]}
                                label="Tên cột"
                                rules={[{ required: true, message: "Nhập tên" }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Input size="small" placeholder="Ví dụ: Tên sản phẩm" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "code"]}
                                label="Mã cột (snake_case)"
                                rules={[{ required: true, message: "Nhập mã" }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Input size="small" placeholder="Ví dụ: product_name" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, "type"]}
                                label="Loại cột"
                                rules={[{ required: true, message: "Chọn loại cột" }]}
                                style={{ marginBottom: 4 }}
                              >
                                <Select
                                  size="small"
                                  placeholder="Chọn loại cột..."
                                  options={[
                                    { value: "TEXT", label: "Chữ (TEXT)" },
                                    { value: "NUMBER", label: "Số (NUMBER)" },
                                    { value: "DATE", label: "Ngày (DATE)" },
                                    { value: "SELECT", label: "Hộp chọn (SELECT)" },
                                    { value: "CHECKBOX", label: "Đóng mở (CHECKBOX)" },
                                    { value: "STT", label: "Số thứ tự (STT)" },
                                    { value: "FORMULA", label: "Công thức toán (FORMULA)" },
                                  ]}
                                />
                              </Form.Item>

                              <Form.Item
                                noStyle
                                shouldUpdate={(prevValues, currentValues) => {
                                  const prevCol = prevValues?.options?.columns?.[name]?.type;
                                  const currCol = currentValues?.options?.columns?.[name]?.type;
                                  return prevCol !== currCol;
                                }}
                              >
                                {({ getFieldValue }) => {
                                  const colType = getFieldValue(["options", "columns", name, "type"]);
                                  const isNumeric = colType === "NUMBER" || colType === "FORMULA";
                                  return (
                                    <>
                                      {colType === "FORMULA" && (
                                        <Form.Item
                                          {...restField}
                                          name={[name, "formula"]}
                                          label="Công thức của cột"
                                          rules={[{ required: true, message: "Nhập công thức cột" }]}
                                          style={{ marginBottom: 4 }}
                                        >
                                          <Input size="small" placeholder="Ví dụ: {don_gia} * {so_luong}" />
                                        </Form.Item>
                                      )}
                                      {colType === "SELECT" && (
                                        <Card size="small" title="Lựa chọn cho cột SELECT" style={{ marginBottom: 8, background: "#fafafa" }}>
                                          <Form.List {...restField} name={[name, "choices"]}>
                                            {(choicesFields, { add: addChoice, remove: removeChoice }) => (
                                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                {choicesFields.map((choiceField) => (
                                                  <Space key={choiceField.key} align="baseline">
                                                    <Form.Item
                                                      {...choiceField}
                                                      rules={[{ required: true, whitespace: true, message: "Nhập giá trị" }]}
                                                      style={{ marginBottom: 0 }}
                                                    >
                                                      <Input size="small" placeholder="Tên lựa chọn..." style={{ width: 220 }} />
                                                    </Form.Item>
                                                    <Button
                                                      type="text"
                                                      danger
                                                      size="small"
                                                      icon={<MinusCircleOutlined />}
                                                      onClick={() => removeChoice(choiceField.name)}
                                                    />
                                                  </Space>
                                                ))}
                                                <Button
                                                  type="dashed"
                                                  size="small"
                                                  onClick={() => addChoice()}
                                                  icon={<PlusOutlined />}
                                                  style={{ width: "100%" }}
                                                >
                                                  Thêm lựa chọn
                                                </Button>
                                              </div>
                                            )}
                                          </Form.List>
                                        </Card>
                                      )}
                                      {isNumeric && (
                                        <Form.Item
                                          {...restField}
                                          name={[name, "summaryType"]}
                                          label="Hàm tổng hợp chân trang"
                                          style={{ marginBottom: 4 }}
                                          initialValue="NONE"
                                        >
                                          <Select
                                            size="small"
                                            placeholder="Chọn hàm tổng hợp..."
                                            options={[
                                              { value: "NONE", label: "Không tính" },
                                              { value: "SUM", label: "Tổng cộng (SUM)" },
                                              { value: "AVG", label: "Trung bình cộng (AVG)" },
                                              { value: "MIN", label: "Nhỏ nhất (MIN)" },
                                              { value: "MAX", label: "Lớn nhất (MAX)" },
                                            ]}
                                          />
                                        </Form.Item>
                                      )}
                                    </>
                                  );
                                }}
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, "isRequired"]}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <Checkbox>Bắt buộc nhập</Checkbox>
                              </Form.Item>
                              <Button
                                type="text"
                                danger
                                onClick={() => remove(name)}
                                icon={<MinusCircleOutlined />}
                                size="small"
                              >
                                Xóa cột
                              </Button>
                            </Space>
                          </Card>
                        ))}
                        <Button
                          type="dashed"
                          onClick={() =>
                            add({
                              name: "",
                              code: "",
                              type: "TEXT",
                              isRequired: false,
                            })
                          }
                          block
                          icon={<PlusOutlined />}
                          size="small"
                        >
                          Thêm cột
                        </Button>
                      </div>
                    )}
                  </Form.List>
                </Card>
              </Col>
            )}

            {/* Điều kiện Hiển thị (showIf) */}
            <Col span={24}>
              <Card
                size="small"
                title="Điều kiện Hiển thị (showIf)"
                style={{ marginBottom: "16px", background: "#f9fcfc" }}
                headStyle={{ background: "#e6f7ff" }}
              >
                <Form.Item
                  name={["options", "showIf", "logicalOperator"]}
                  label="Kết hợp logic"
                  initialValue="AND"
                  style={{ marginBottom: "12px" }}
                >
                  <Select
                    options={[
                      { value: "AND", label: "Tất cả điều kiện đúng (AND)" },
                      { value: "OR", label: "Chỉ cần 1 điều kiện đúng (OR)" },
                    ]}
                  />
                </Form.Item>
                
                <Form.List name={["options", "showIf", "rules"]}>
                  {(rules, { add, remove }) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {rules.map(({ key, name, ...restField }) => (
                        <Card key={key} size="small" style={{ background: "white", border: "1px solid #f0f0f0" }}>
                          <Form.Item
                            {...restField}
                            name={[name, "fieldCode"]}
                            label="Trường kiểm tra"
                            rules={[{ required: true, message: "Chọn trường" }]}
                            style={{ marginBottom: "8px" }}
                          >
                            <Select
                              placeholder="Chọn trường..."
                              options={(fieldsQuery.data || [])
                                .filter((f) => f.code !== editingField?.code)
                                .map((f) => ({ value: f.code, label: `${f.name} (${f.code})` }))}
                            />
                          </Form.Item>
                          
                          <Form.Item
                            {...restField}
                            name={[name, "operator"]}
                            label="Phép so sánh"
                            rules={[{ required: true }]}
                            style={{ marginBottom: "8px" }}
                          >
                            <Select
                              options={[
                                { value: "EQUALS", label: "Bằng (=)" },
                                { value: "NOT_EQUALS", label: "Khác (!=)" },
                                { value: "CONTAINS", label: "Chứa chuỗi" },
                                { value: "IS_EMPTY", label: "Bị trống" },
                                { value: "IS_NOT_EMPTY", label: "Không bị trống" },
                              ]}
                            />
                          </Form.Item>

                          <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => {
                              const prevOp = prevValues?.options?.showIf?.rules?.[name]?.operator;
                              const currOp = currentValues?.options?.showIf?.rules?.[name]?.operator;
                              return prevOp !== currOp;
                            }}
                          >
                            {({ getFieldValue }) => {
                              const op = getFieldValue(["options", "showIf", "rules", name, "operator"]);
                              if (op === "IS_EMPTY" || op === "IS_NOT_EMPTY") return null;
                              return (
                                <Form.Item
                                  {...restField}
                                  name={[name, "value"]}
                                  label="Giá trị so sánh"
                                  rules={[{ required: true, message: "Nhập giá trị" }]}
                                  style={{ marginBottom: "8px" }}
                                >
                                  <Input placeholder="Giá trị..." />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>

                          <Button
                            type="text"
                            danger
                            size="small"
                            onClick={() => remove(name)}
                            icon={<MinusCircleOutlined />}
                          >
                            Xóa quy tắc
                          </Button>
                        </Card>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() => add({ fieldCode: "", operator: "EQUALS", value: "" })}
                        block
                        icon={<PlusOutlined />}
                        size="small"
                      >
                        Thêm quy tắc hiển thị
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Card>
            </Col>

            {/* Điều kiện Bắt buộc (requiredIf) */}
            <Col span={24}>
              <Card
                size="small"
                title="Điều kiện Bắt buộc (requiredIf)"
                style={{ marginBottom: "16px", background: "#fcfaf9" }}
                headStyle={{ background: "#fffbe6" }}
              >
                <Form.Item
                  name={["options", "requiredIf", "logicalOperator"]}
                  label="Kết hợp logic"
                  initialValue="AND"
                  style={{ marginBottom: "12px" }}
                >
                  <Select
                    options={[
                      { value: "AND", label: "Tất cả điều kiện đúng (AND)" },
                      { value: "OR", label: "Chỉ cần 1 điều kiện đúng (OR)" },
                    ]}
                  />
                </Form.Item>
                
                <Form.List name={["options", "requiredIf", "rules"]}>
                  {(rules, { add, remove }) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {rules.map(({ key, name, ...restField }) => (
                        <Card key={key} size="small" style={{ background: "white", border: "1px solid #f0f0f0" }}>
                          <Form.Item
                            {...restField}
                            name={[name, "fieldCode"]}
                            label="Trường kiểm tra"
                            rules={[{ required: true, message: "Chọn trường" }]}
                            style={{ marginBottom: "8px" }}
                          >
                            <Select
                              placeholder="Chọn trường..."
                              options={(fieldsQuery.data || [])
                                .filter((f) => f.code !== editingField?.code)
                                .map((f) => ({ value: f.code, label: `${f.name} (${f.code})` }))}
                            />
                          </Form.Item>
                          
                          <Form.Item
                            {...restField}
                            name={[name, "operator"]}
                            label="Phép so sánh"
                            rules={[{ required: true }]}
                            style={{ marginBottom: "8px" }}
                          >
                            <Select
                              options={[
                                { value: "EQUALS", label: "Bằng (=)" },
                                { value: "NOT_EQUALS", label: "Khác (!=)" },
                                { value: "CONTAINS", label: "Chứa chuỗi" },
                                { value: "IS_EMPTY", label: "Bị trống" },
                                { value: "IS_NOT_EMPTY", label: "Không bị trống" },
                              ]}
                            />
                          </Form.Item>

                          <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => {
                              const prevOp = prevValues?.options?.requiredIf?.rules?.[name]?.operator;
                              const currOp = currentValues?.options?.requiredIf?.rules?.[name]?.operator;
                              return prevOp !== currOp;
                            }}
                          >
                            {({ getFieldValue }) => {
                              const op = getFieldValue(["options", "requiredIf", "rules", name, "operator"]);
                              if (op === "IS_EMPTY" || op === "IS_NOT_EMPTY") return null;
                              return (
                                <Form.Item
                                  {...restField}
                                  name={[name, "value"]}
                                  label="Giá trị so sánh"
                                  rules={[{ required: true, message: "Nhập giá trị" }]}
                                  style={{ marginBottom: "8px" }}
                                >
                                  <Input placeholder="Giá trị..." />
                                </Form.Item>
                              );
                            }}
                          </Form.Item>

                          <Button
                            type="text"
                            danger
                            size="small"
                            onClick={() => remove(name)}
                            icon={<MinusCircleOutlined />}
                          >
                            Xóa quy tắc
                          </Button>
                        </Card>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() => add({ fieldCode: "", operator: "EQUALS", value: "" })}
                        block
                        icon={<PlusOutlined />}
                        size="small"
                      >
                        Thêm quy tắc bắt buộc
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Card>
            </Col>

            {watchedEditType && watchedEditType !== "TABLE" && watchedEditType !== "FORMULA" && (
              <Col span={24}>
                <Form.Item
                  name={["options", "initValue"]}
                  label="Giá trị khởi tạo (Mặc định)"
                  valuePropName={watchedEditType === "CHECKBOX" ? "checked" : "value"}
                  style={{ marginBottom: "16px" }}
                >
                  <InitValueInput
                  type={watchedEditType}
                  form={editForm}
                  userOptions={userOptions}
                  deptTreeData={deptTreeData}
                  roleOptions={roleOptions}
                />
                </Form.Item>
              </Col>
            )}
          </Row>
        </Form>
      </Modal>
    </Layout>
  );
}

