// File: src/hooks/useFields.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fieldService, CreateFieldRequest } from "@/services/field";
import { message } from "antd";

export function useFields(entityId?: number) {
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ["fields", entityId],
    queryFn: () => fieldService.findAllByEntity(entityId!),
    enabled: !!entityId,
  });

  const createFieldMutation = useMutation({
    mutationFn: fieldService.create,
    onSuccess: () => {
      message.success("Thêm trường dữ liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["fields", entityId] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Thêm trường thất bại";
      message.error(errorMsg);
    },
  });

  const removeFieldMutation = useMutation({
    mutationFn: fieldService.remove,
    onSuccess: () => {
      message.success("Xóa trường dữ liệu thành công!");
      queryClient.invalidateQueries({ queryKey: ["fields", entityId] });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (error: any) => {
      const errorMsg =
        error.response?.data?.message || error.message || "Xóa trường thất bại";
      message.error(errorMsg);
    },
  });

  // 🛑 TRANSACTION SYNC MUTATION: Bộ đồng bộ nguyên tử hóa (Unit of Work Sync)
  const syncFieldsMutation = useMutation({
    mutationFn: async ({
      added,
      updated,
      deleted,
    }: {
      added: any[];
      updated: Record<number, any>;
      deleted: number[];
    }) => {
      // 1. Thực thi xóa tuần tự (DELETE)
      for (const id of deleted) {
        console.log(`[DEBUG-BOS-SYNC] Gửi API DELETE trường ID: ${id}`);
        await fieldService.remove(id);
      }

      // 2. Thực thi tạo mới tuần tự (POST)
      for (const field of added) {
        // Loại bỏ khóa ID tạm dạng string 'temp_' trước khi đẩy lên DB
        const { id, ...payload } = field;
        const formattedPayload = {
          ...payload,
          entityId: Number(entityId), // Ép kiểu an toàn khớp cột Database
        };
        console.log(
          "[DEBUG-BOS-SYNC] Gửi API POST tạo trường:",
          formattedPayload,
        );
        await fieldService.create(formattedPayload as any);
      }

      // 3. Thực thi cập nhật tuần tự (PATCH - dùng cho cập nhật thuộc tính và vị trí kéo thả sortOrder)
      for (const [idStr, payload] of Object.entries(updated)) {
        const id = Number(idStr);
        console.log(
          `[DEBUG-BOS-SYNC] Gửi API PATCH cập nhật trường ID: ${id}`,
          payload,
        );
        await fieldService.update(id, payload as any);
      }
    },
    onSuccess: () => {
      message.success("Đồng bộ cấu hình trường dữ liệu thành công!");
      // Invalidate các queries liên quan để ép Client tải lại bộ dữ liệu sạch mới nhất từ Database
      queryClient.invalidateQueries({
        queryKey: ["entity-detail", String(entityId)],
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (error: any) => {
      const backendError = error.response?.data?.message;
      const errorMsg = Array.isArray(backendError)
        ? backendError.join(", ")
        : backendError || error.message || "Lỗi đồng bộ cấu hình";
      message.error(`Đồng bộ thất bại: ${errorMsg}`);
    },
  });

  return {
    fields: fieldsQuery.data || [],
    isLoading: fieldsQuery.isLoading,
    refetch: fieldsQuery.refetch,
    createField: createFieldMutation.mutateAsync,
    isCreating: createFieldMutation.isPending,
    removeField: removeFieldMutation.mutateAsync,
    isRemoving: removeFieldMutation.isPending,

    // Xuất bản tính năng đồng bộ lưu thay đổi
    syncFields: syncFieldsMutation.mutateAsync,
    isSyncing: syncFieldsMutation.isPending,
  };
}
