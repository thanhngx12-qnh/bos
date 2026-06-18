// File: src/hooks/useFields.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fieldService, CreateFieldRequest } from "@/services/field";
import { useBuilderStore } from "@/hooks/useBuilderStore";
import { message } from "antd";
import { useMemo } from "react"; // 🛑 IMPORT: Dùng useMemo để ổn định tham chiếu [2]

export function useFields(entityId?: number) {
  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ["fields", entityId],
    queryFn: () => fieldService.findAllByEntity(entityId!),
    enabled: !!entityId,
  });

  // 🛑 CHỐT CHẶN V8.1: Sử dụng useMemo giữ nguyên tham chiếu mảng tránh vòng lặp vô hạn [2]
  const fieldsArray = useMemo(() => {
    const rawFields = fieldsQuery.data;
    return Array.isArray(rawFields)
      ? rawFields
      : (rawFields as any)?.data && Array.isArray((rawFields as any).data)
        ? (rawFields as any).data
        : (rawFields as any)?.items && Array.isArray((rawFields as any).items)
          ? (rawFields as any).items
          : [];
  }, [fieldsQuery.data]);

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
      for (const id of deleted) {
        await fieldService.remove(id);
      }

      for (const field of added) {
        const { id, ...payload } = field;
        const formattedPayload = {
          ...payload,
          entityId: Number(entityId),
        };
        await fieldService.create(formattedPayload as any);
      }

      for (const [idStr, payload] of Object.entries(updated)) {
        const id = Number(idStr);
        await fieldService.update(id, payload as any);
      }
    },
    onSuccess: () => {
      message.success("Đồng bộ cấu hình trường dữ liệu thành công!");
      queryClient.invalidateQueries({
        queryKey: ["entity-detail", String(entityId)],
      });
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["fields", entityId] });
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
    fields: fieldsArray, // Mảng phẳng ổn định tuyệt đối
    isLoading: fieldsQuery.isLoading,
    refetch: fieldsQuery.refetch,
    createField: createFieldMutation.mutateAsync,
    isCreating: createFieldMutation.isPending,
    removeField: removeFieldMutation.mutateAsync,
    isRemoving: removeFieldMutation.isPending,

    syncFields: syncFieldsMutation.mutateAsync,
    isSyncing: syncFieldsMutation.isPending,
  };
}
