// File: src/services/entity.ts
import axiosInstance from "@/lib/axios";
import { operations } from "@/types/api";

// Trích xuất Type-Safe cực kỳ an toàn
export type EntityListResponse =
  operations["EntitiesController_findAll"]["responses"][200]["content"]["application/json"];
export type CreateEntityRequest =
  operations["EntitiesController_create"]["requestBody"]["content"]["application/json"];

export const entityService = {
  findAll: async (): Promise<EntityListResponse> => {
    const response = await axiosInstance.get("/api/v1/entities");
    return response.data;
  },

  create: async (data: CreateEntityRequest): Promise<any> => {
    const response = await axiosInstance.post("/api/v1/entities", data);
    return response.data;
  },

  remove: async (id: number | string): Promise<any> => {
    const response = await axiosInstance.delete(`/api/v1/entities/${id}`);
    return response.data;
  },
};
