// File: src/hooks/useEntities.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { entityService, CreateEntityRequest } from "@/services/entity";
import { message } from "antd";

export function useEntities() {
  const queryClient = useQueryClient();

  const entitiesQuery = useQuery({
    queryKey: ["entities"],
    queryFn: entityService.findAll,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation tạo thực thể mới kèm Log Debug chi tiết
  const createEntityMutation = useMutation({
    mutationFn: entityService.create,
    onSuccess: (data) => {
      console.log("[DEBUG-BOS] Create Entity Success Response:", data);
      message.success("Tạo thực thể mới thành công!");
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (error: any) => {
      console.error("[DEBUG-BOS] Create Entity API Failed:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.config?.headers,
      });

      const backendError = error.response?.data?.message;
      const errorMsg = Array.isArray(backendError)
        ? backendError.join(", ")
        : backendError || error.message || "Tạo thực thể thất bại";

      message.error(`Lỗi tạo thực thể: ${errorMsg}`);
    },
  });

  // Mutation xóa thực thể kèm Log Debug chi tiết
  const removeEntityMutation = useMutation({
    mutationFn: entityService.remove,
    onSuccess: (data) => {
      console.log("[DEBUG-BOS] Remove Entity Success:", data);
      message.success("Xóa thực thể thành công!");
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
    onError: (error: any) => {
      console.error("[DEBUG-BOS] Remove Entity API Failed:", {
        message: error.message,
        response: error.response?.data,
      });
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Xóa thực thể thất bại";
      message.error(`Lỗi xóa thực thể: ${errorMsg}`);
    },
  });

  return {
    entities: entitiesQuery.data || [],
    isLoading: entitiesQuery.isLoading,
    refetch: entitiesQuery.refetch,
    createEntity: createEntityMutation.mutateAsync,
    isCreating: createEntityMutation.isPending,
    removeEntity: removeEntityMutation.mutateAsync,
    isRemoving: removeEntityMutation.isPending,
  };
}
