// File: src/hooks/useRecords.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import { message } from "antd";

export interface FindAllRecordsParams {
  entityId: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  searchQuery?: string;
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

  // Query lấy danh sách bản ghi động có phân trang và lọc từ Server-side
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
    queryFn: async () => {
      const response = await axiosInstance.get("/api/v1/records", {
        params: {
          entityId,
          page,
          limit,
          sortBy,
          sortOrder,
          searchQuery: searchQuery || undefined,
          filters: filters ? JSON.stringify(filters) : undefined,
        },
      });
      return response.data;
    },
    enabled: !!entityId,
  });

  // Mutation gọi API POST tạo mới bản ghi dữ liệu động
  const createRecordMutation = useMutation({
    mutationFn: async (data: {
      entityId: number;
      data: Record<string, any>;
    }) => {
      const response = await axiosInstance.post("/api/v1/records", data);
      return response.data;
    },
    onSuccess: () => {
      message.success("Tạo bản ghi mới thành công!");
      queryClient.invalidateQueries({ queryKey: ["records", entityId] });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Tạo bản ghi thất bại",
      );
    },
  });

  // Mutation gọi API PATCH cập nhật bản ghi dữ liệu động
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
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Cập nhật bản ghi thất bại",
      );
    },
  });

  // Mutation gọi API DELETE xóa bản ghi dữ liệu động
  const removeRecordMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axiosInstance.delete(`/api/v1/records/${id}`);
      return response.data;
    },
    onSuccess: () => {
      message.success("Xóa bản ghi thành công!");
      queryClient.invalidateQueries({ queryKey: ["records", entityId] });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Xóa bản ghi thất bại",
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
