// File: src/hooks/useEntityDetail.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import { operations } from "@/types/api";
import { message } from "antd";

// Trích xuất kiểu dữ liệu bám sát E2E Type-Safety của OpenAPI Spec
export type EntityDetailResponse =
  operations["EntitiesController_findOne"]["responses"][200]["content"]["application/json"];
export type UpdateEntityRequest =
  operations["EntitiesController_update"]["requestBody"]["content"]["application/json"];

export function useEntityDetail(id: string | number) {
  const queryClient = useQueryClient();

  // Query lấy chi tiết thực thể kèm danh sách Fields liên kết từ Backend
  const entityQuery = useQuery({
    queryKey: ["entity-detail", id],
    queryFn: async (): Promise<EntityDetailResponse> => {
      const response = await axiosInstance.get(`/api/v1/entities/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  // Mutation gọi API PATCH để cập nhật thông tin chung của Thực thể
  const updateEntityMutation = useMutation({
    mutationFn: async (data: UpdateEntityRequest) => {
      const response = await axiosInstance.patch(
        `/api/v1/entities/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: (data) => {
      message.success("Cập nhật cấu hình thực thể thành công!");
      // Refresh cache của trang chi tiết và sidebar menu
      queryClient.invalidateQueries({ queryKey: ["entity-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (error: any) => {
      const backendError = error.response?.data?.message;
      const errorMsg = Array.isArray(backendError)
        ? backendError.join(", ")
        : backendError || error.message || "Cập nhật thực thể thất bại";
      message.error(`Lỗi cập nhật: ${errorMsg}`);
    },
  });

  return {
    entity: entityQuery.data,
    isLoading: entityQuery.isLoading,
    refetch: entityQuery.refetch,
    updateEntity: updateEntityMutation.mutateAsync,
    isUpdating: updateEntityMutation.isPending,
  };
}
