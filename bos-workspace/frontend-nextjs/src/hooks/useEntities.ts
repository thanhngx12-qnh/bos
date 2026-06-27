// File: src/hooks/useEntities.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface Entity {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  description?: string;
  autoCodePattern?: string;
  titlePattern?: string;
  displayMode?: string;
}

export function useEntities(page = 1, limit = 50) {
  return useQuery<{ data: Entity[]; total: number }>({
    queryKey: ["entities", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/entities", {
        params: { page, limit, sortBy: "id", sortOrder: "asc" },
      });
      if (Array.isArray(data)) {
        return { data, total: data.length };
      }
      return { data: data.items || data.data || [], total: data.total || 0 };
    },
  });
}

export function useCreateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      code: string;
      description?: string;
      autoCodePattern?: string;
    }) => {
      const { data } = await api.post("/api/v1/entities", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useUpdateEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<Entity>;
    }) => {
      const { data } = await api.patch(`/api/v1/entities/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export function useDeleteEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/entities/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}

export interface EntityVersion {
  id: number;
  tenantId: number;
  entityId: number;
  version: number;
  status: string;
  snapshotHash: string;
  fieldsSnapshot: any;
  createdAt: string;
}

export function useEntityVersions(entityId: number | null) {
  return useQuery<EntityVersion[]>({
    queryKey: ["entity-versions", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data } = await api.get(`/api/v1/entities/${entityId}/versions`);
      return data || [];
    },
    enabled: !!entityId,
  });
}

export function useRestoreEntityVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityId,
      versionId,
    }: {
      entityId: number;
      versionId: number;
    }) => {
      const { data } = await api.post(
        `/api/v1/entities/${entityId}/versions/${versionId}/restore`
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      queryClient.invalidateQueries({ queryKey: ["entity-versions", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["fields", variables.entityId] });
    },
  });
}

