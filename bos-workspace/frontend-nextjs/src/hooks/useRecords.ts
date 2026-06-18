// File: src/hooks/useRecords.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import { operations } from "@/types/api";
import { message } from "antd";

// Trích xuất Type-Safe chính xác từ Swagger Spec V8.1 mới sinh
export type FindAllRecordsResponse =
  operations["RecordsController_findAllByEntity"]["responses"][200]["content"]["application/json"];
export type RecordItem = FindAllRecordsResponse["data"][number];

// Đặc tả tham số tìm kiếm, phân trang và bộ lọc đệ quy nâng cao của V8.1
export interface FindAllRecordsParams {
  entityId: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  searchQuery?: string;
  // Cấu trúc cây lọc đệ quy AND/OR của V8.1
  filters?: Record<string, any>;
}

export function useRecords(params: FindAllRecordsParams) {
  const queryClient = useQueryClient();
  const {
    entityId,
    page = 1,
    limit = 10,
    sortBy,
    sortOrder,
    searchQuery,
    filters,
  } = params;

  // Query tải danh sách bản ghi động có phân trang và lọc từ Server-side
  const recordsQuery = useQuery({
    queryKey: [
      "records",
      entityId,
      page,
      limit,
      sortBy,
      sortOrder,
      searchQuery,
      filters,
    ],
    queryFn: async (): Promise<FindAllRecordsResponse> => {
      const response = await axiosInstance.get("/api/v1/records", {
        params: {
          entityId,
          page,
          limit,
          sortBy,
          sortOrder,
          searchQuery: searchQuery || undefined,
          // Chuỗi hóa cấu trúc cây AND/OR logic trước khi truyền xuống Backend V8.1
          filters: filters ? JSON.stringify(filters) : undefined,
        },
      });
      return response.data;
    },
    enabled: !!entityId,
  });

  // Mutation gọi API POST tạo mới bản ghi
  const createRecordMutation = useMutation({
    mutationFn: async (data: {
      entityId: number;
      data: Record<string, any>;
    }) => {
      const response = await axiosInstance.post("/api/v1/records", data);
      return response.data;
    },
    onSuccess: () => {
      message.success("Khởi tạo bản ghi mới thành công!");
      queryClient.invalidateQueries({ queryKey: ["records", entityId] });
    },
    onError: (error: any) => {
      const backendError = error.response?.data?.message;
      const errorMsg = Array.isArray(backendError)
        ? backendError.join(", ")
        : backendError || error.message || "Lỗi khởi tạo bản ghi";
      message.error(`Thất bại: ${errorMsg}`);
    },
  });

  // Mutation gọi API PATCH cập nhật bản ghi
  const updateRecordMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Record<string, any>;
    }) => {
      const response = await axiosInstance.patch(`/api/v1/records/${id}`, {
        data,
      });
      return response.data;
    },
    onSuccess: () => {
      message.success("Cập nhật bản ghi thành công!");
      queryClient.invalidateQueries({ queryKey: ["records", entityId] });
    },
    onError: (error: any) => {
      const backendError = error.response?.data?.message;
      const errorMsg = Array.isArray(backendError)
        ? backendError.join(", ")
        : backendError || error.message || "Lỗi cập nhật bản ghi";
      message.error(`Cập nhật thất bại: ${errorMsg}`);
    },
  });

  // Mutation gọi API DELETE xóa bản ghi
  const removeRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axiosInstance.delete(`/api/v1/records/${id}`);
      return response.data;
    },
    onSuccess: () => {
      message.success("Xóa bản ghi dữ liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["records", entityId] });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message || error.message || "Lỗi xóa bản ghi",
      );
    },
  });

  return {
    records: recordsQuery.data?.data || [],
    meta: recordsQuery.data?.meta || {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
    isLoading: recordsQuery.isLoading,
    refetch: recordsQuery.refetch,

    createRecord: createRecordMutation.mutateAsync,
    isCreating: createRecordMutation.isPending,
    updateRecord: updateRecordMutation.mutateAsync,
    isUpdating: updateRecordMutation.isPending,
    removeRecord: removeRecordMutation.mutateAsync,
    isRemoving: removeRecordMutation.isPending,
  };
}
