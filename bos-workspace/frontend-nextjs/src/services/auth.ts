// File: src/services/auth.ts
import axiosInstance from "@/lib/axios";
import { paths } from "@/types/api";

// Trích xuất Type-Safe Request Body trực tiếp từ API Spec của NestJS
export type LoginRequest =
  paths["/api/v1/auth/login"]["post"]["requestBody"]["content"]["application/json"];

export const authService = {
  /**
   * Gọi API đăng nhập kèm x-tenant-id thủ công cho request đầu tiên
   */
  login: async (data: LoginRequest, tenantId: string) => {
    const response = await axiosInstance.post("/api/v1/auth/login", data, {
      headers: {
        "x-tenant-id": tenantId,
      },
    });
    return response.data;
  },
};
