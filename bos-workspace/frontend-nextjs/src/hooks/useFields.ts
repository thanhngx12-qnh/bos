// File: src/hooks/useFields.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface Field {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  type: string;
  config: {
    entityId: number;
    isRequired: boolean;
    orderIndex: number;
    options?: any;
  };
  createdAt: string;
}

export function useFields(entityId: number | null) {
  return useQuery<Field[]>({
    queryKey: ["fields", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data } = await api.get<Field[]>("/api/v1/fields", {
        params: { entityId },
      });
      return data;
    },
    enabled: !!entityId,
  });
}

export function useCreateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      entityId: number;
      name: string;
      code: string;
      type: string;
      isRequired: boolean;
      orderIndex: number;
      options?: any;
    }) => {
      const { data } = await api.post("/api/v1/fields", payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["fields", variables.entityId],
      });
    },
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      entityId,
      payload,
    }: {
      id: number;
      entityId: number;
      payload: {
        name: string;
        type: string;
        isRequired: boolean;
        orderIndex: number;
        options?: any;
      };
    }) => {
      const { data } = await api.patch(`/api/v1/fields/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["fields", variables.entityId],
      });
    },
  });
}

export function useDeleteField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityId }: { id: number; entityId: number }) => {
      const { data } = await api.delete(`/api/v1/fields/${id}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["fields", variables.entityId],
      });
    },
  });
}
