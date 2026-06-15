// File: src/services/entity.ts
import axiosInstance from "@/lib/axios";
import { operations } from "@/types/api";

// Trích xuất Type-Safe Response cực kỳ an toàn trực tiếp từ Operation của NestJS
export type EntityListResponse =
  operations["EntitiesController_findAll"]["responses"][200]["content"]["application/json"];
export type EntityItem = EntityListResponse extends Array<infer T> ? T : any;

export const entityService = {
  /**
   * Lấy danh sách tất cả các thực thể (Entities) đang hoạt động trên hệ thống
   */
  findAll: async (): Promise<EntityListResponse> => {
    const response = await axiosInstance.get("/api/v1/entities");
    return response.data;
  },
};
