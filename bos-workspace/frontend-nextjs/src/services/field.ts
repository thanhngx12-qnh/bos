// File: src/services/field.ts
import axiosInstance from "@/lib/axios";
import { operations } from "@/types/api";

export type FieldListResponse =
  operations["FieldsController_findAllByEntity"]["responses"][200]["content"]["application/json"];
export type CreateFieldRequest =
  operations["FieldsController_create"]["requestBody"]["content"]["application/json"];
export type UpdateFieldDto =
  operations["FieldsController_update"]["requestBody"]["content"]["application/json"];

export const fieldService = {
  /**
   * Lấy danh sách trường dữ liệu của một thực thể (entityId)
   */
  findAllByEntity: async (entityId: number): Promise<FieldListResponse> => {
    const response = await axiosInstance.get("/api/v1/fields", {
      params: { entityId },
    });
    return response.data;
  },

  /**
   * Tạo trường dữ liệu mới
   */
  create: async (data: CreateFieldRequest): Promise<any> => {
    const response = await axiosInstance.post("/api/v1/fields", data);
    return response.data;
  },

  /**
   * Cập nhật thông tin/cấu hình/thứ tự sắp xếp của trường dữ liệu
   */
  update: async (id: number | string, data: UpdateFieldDto): Promise<any> => {
    const response = await axiosInstance.patch(`/api/v1/fields/${id}`, data);
    return response.data;
  },

  /**
   * Xóa một trường dữ liệu khỏi Database
   */
  remove: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(`/api/v1/fields/${id}`);
    return response.data;
  },
};
