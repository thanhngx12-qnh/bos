// File: src/hooks/useBuilderStore.ts
import { create } from "zustand";
import { operations } from "@/types/api";

// Trích xuất Type-Safe các DTO trực tiếp từ OpenAPI Spec của NestJS
type EntityDetail =
  operations["EntitiesController_findOne"]["responses"][200]["content"]["application/json"];
type FieldItem =
  operations["FieldsController_findAllByEntity"]["responses"][200]["content"]["application/json"][number];

export type CreateFieldDto =
  operations["FieldsController_create"]["requestBody"]["content"]["application/json"];
export type UpdateFieldDto =
  operations["FieldsController_update"]["requestBody"]["content"]["application/json"];

interface BuilderState {
  // Trạng thái dữ liệu biểu mẫu
  entity: EntityDetail | null;
  originalFields: FieldItem[]; // Snapshot dữ liệu gốc từ DB để so sánh/hoàn tác
  fields: FieldItem[]; // Danh sách các trường đang hiển thị & kéo thả trên Canvas

  // Trạng thái tương tác UI
  selectedFieldId: string | number | null;
  isDirty: boolean; // Cờ đánh dấu có thay đổi chưa lưu hay không

  // 🛑 TRANSACTION TRACKING: Quản lý biến động dữ liệu (Unit of Work)
  addedFields: FieldItem[]; // Các trường tạo mới tạm thời (id dạng 'temp_...')
  updatedFields: Record<number, Partial<FieldItem>>; // Các trường hiện có bị sửa đổi (id là number)
  deletedFieldIds: number[]; // Các trường hiện có bị xóa khỏi database (id là number)

  // Actions quản lý thực thể & khởi tạo
  setEntity: (entity: EntityDetail) => void;
  initializeFields: (fields: FieldItem[]) => void;
  setSelectedFieldId: (id: string | number | null) => void;

  // Actions thay đổi cấu trúc biểu mẫu (Canvas Mutations)
  addField: (field: Omit<FieldItem, "id">) => void;
  updateField: (id: string | number, updates: Partial<FieldItem>) => void;
  removeField: (id: string | number) => void;
  reorderFields: (newFields: FieldItem[]) => void;

  // Actions dọn dẹp & hoàn tác thay đổi
  resetChanges: () => void;
  clearStore: () => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  entity: null,
  originalFields: [],
  fields: [],
  selectedFieldId: null,
  isDirty: false,

  // Danh sách vết nghiệp vụ
  addedFields: [],
  updatedFields: {},
  deletedFieldIds: [],

  setEntity: (entity) => set({ entity }),

  // Khởi tạo hoặc nạp lại dữ liệu đồng bộ từ Database
  initializeFields: (fields) => {
    // Deep clone để đảm bảo snapshot dữ liệu gốc không bị tham chiếu chéo
    const clonedFields = JSON.parse(JSON.stringify(fields));
    set({
      originalFields: clonedFields,
      fields: clonedFields,
      addedFields: [],
      updatedFields: {},
      deletedFieldIds: [],
      isDirty: false,
      selectedFieldId: null,
    });
  },

  setSelectedFieldId: (id) => set({ selectedFieldId: id }),

  // Thêm mới một trường dữ liệu tạm thời lên Canvas (Sinh temp ID)
  addField: (field) => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newFieldItem = { ...field, id: tempId } as unknown as FieldItem;

    set((state) => ({
      fields: [...state.fields, newFieldItem],
      addedFields: [...state.addedFields, newFieldItem],
      isDirty: true,
      selectedFieldId: tempId,
    }));
  },

  // Cập nhật cấu hình của một trường dữ liệu (Cập nhật tức thì trên UI)
  updateField: (id, updates) => {
    set((state) => {
      // 1. Cập nhật mảng hiển thị trực quan trên Canvas
      const updatedFieldsList = state.fields.map((f) =>
        f.id === id ? { ...f, ...updates } : f,
      );

      const isTemp = typeof id === "string" && id.startsWith("temp_");
      let nextAdded = [...state.addedFields];
      let nextUpdated = { ...state.updatedFields };

      if (isTemp) {
        // 2a. Nếu là trường tạm thời, sửa trực tiếp trong addedFields
        nextAdded = nextAdded.map((f) =>
          f.id === id ? { ...f, ...updates } : f,
        );
      } else {
        // 2b. Nếu là trường đã lưu trên DB, ghi nhận thay đổi vào record tracking
        const numericId = Number(id);
        nextUpdated[numericId] = {
          ...(nextUpdated[numericId] || {}),
          ...updates,
        };
      }

      return {
        fields: updatedFieldsList,
        addedFields: nextAdded,
        updatedFields: nextUpdated,
        isDirty: true,
      };
    });
  },

  // Xóa một trường dữ liệu khỏi Canvas
  removeField: (id) => {
    set((state) => {
      const isTemp = typeof id === "string" && id.startsWith("temp_");
      let nextAdded = [...state.addedFields];
      const nextUpdated = { ...state.updatedFields };
      let nextDeleted = [...state.deletedFieldIds];

      if (isTemp) {
        // 1a. Nếu xóa trường tạm: Loại bỏ khỏi addedFields
        nextAdded = nextAdded.filter((f) => f.id !== id);
      } else {
        // 1b. Nếu xóa trường thực tế: Loại bỏ khỏi update tracking và đẩy vào deletedFieldIds
        const numericId = Number(id);
        delete nextUpdated[numericId];
        if (!nextDeleted.includes(numericId)) {
          nextDeleted.push(numericId);
        }
      }

      const filteredFieldsList = state.fields.filter((f) => f.id !== id);
      const nextSelectedId =
        state.selectedFieldId === id ? null : state.selectedFieldId;

      return {
        fields: filteredFieldsList,
        addedFields: nextAdded,
        updatedFields: nextUpdated,
        deletedFieldIds: nextDeleted,
        isDirty: true,
        selectedFieldId: nextSelectedId,
      };
    });
  },

  // Sắp xếp lại thứ tự trường dữ liệu bằng thao tác kéo thả
  reorderFields: (newFields) => {
    set((state) => {
      // Tự động gán lại chỉ số sortOrder tuần tự từ 0 -> n-1 dựa trên mảng kéo thả mới
      const reordered = newFields.map((field, index) => ({
        ...field,
        sortOrder: index,
      }));

      const nextUpdated = { ...state.updatedFields };

      reordered.forEach((field) => {
        const isTemp =
          typeof field.id === "string" && field.id.startsWith("temp_");
        if (!isTemp) {
          const numericId = Number(field.id);
          const original = state.originalFields.find((o) => o.id === numericId);
          // Chỉ ghi nhận thay đổi sortOrder nếu vị trí kéo thả thực sự bị dịch chuyển so với DB
          if (original && original.sortOrder !== field.sortOrder) {
            nextUpdated[numericId] = {
              ...(nextUpdated[numericId] || {}),
              sortOrder: field.sortOrder,
            };
          }
        }
      });

      return {
        fields: reordered,
        updatedFields: nextUpdated,
        isDirty: true,
      };
    });
  },

  // Hủy bỏ mọi thay đổi nháp, hoàn tác về trạng thái ban đầu của Database
  resetChanges: () => {
    set((state) => ({
      fields: JSON.parse(JSON.stringify(state.originalFields)),
      addedFields: [],
      updatedFields: {},
      deletedFieldIds: [],
      isDirty: false,
      selectedFieldId: null,
    }));
  },

  // Giải phóng bộ nhớ Store khi người dùng thoát khỏi Workspace
  clearStore: () =>
    set({
      entity: null,
      originalFields: [],
      fields: [],
      selectedFieldId: null,
      addedFields: [],
      updatedFields: {},
      deletedFieldIds: [],
      isDirty: false,
    }),
}));
