// File: src/hooks/useRecords.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface RecordData {
  id: number;
  tenantId: number;
  entityId: number;
  metadataVersionId: number;
  businessCode: string;
  title: string;
  status: string;
  createdById: number;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function useRecords(
  entityId: number | null,
  page = 1,
  limit = 10,
  searchQuery = "",
  filters = "",
  sortBy = "id",
  sortOrder = "desc",
) {
  return useQuery<{ data: RecordData[]; total: number }>({
    queryKey: ["records", entityId, page, limit, searchQuery, filters, sortBy, sortOrder],
    queryFn: async () => {
      if (!entityId) return { data: [], total: 0 };
      const { data } = await api.get("/api/v1/records", {
        params: {
          entityId,
          page,
          limit,
          sortBy,
          sortOrder,
          searchQuery: searchQuery || undefined,
          filters: filters || undefined,
        },
      });
      return {
        data: data.data || [],
        total: data.meta?.total || 0,
      };
    },
    enabled: !!entityId,
  });
}

export function useCreateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { entityId: number; title?: string; data: any }) => {
      const { data } = await api.post("/api/v1/records", payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["records", variables.entityId],
      });
    },
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      entityId,
      payload,
    }: {
      id: number;
      entityId: number;
      payload: { title?: string; data: any };
    }) => {
      const { data } = await api.patch(`/api/v1/records/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["records", variables.entityId],
      });
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityId }: { id: number; entityId: number }) => {
      const { data } = await api.delete(`/api/v1/records/${id}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["records", variables.entityId],
      });
    },
  });
}

export interface RecordRevision {
  id: number;
  tenantId: number;
  recordId: number;
  userId: number;
  patchData: Record<string, { old: any; new: any }>;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  };
}

export function useRecordRevisions(recordId: number | null) {
  return useQuery<RecordRevision[]>({
    queryKey: ["recordRevisions", recordId],
    queryFn: async () => {
      if (!recordId) return [];
      const { data } = await api.get(`/api/v1/records/${recordId}/revisions`);
      return data || [];
    },
    enabled: !!recordId,
  });
}

export function useRecordDetail(id: number | null) {
  return useQuery<RecordData>({
    queryKey: ["recordDetail", id],
    queryFn: async () => {
      if (!id) throw new Error("ID không hợp lệ");
      const { data } = await api.get<RecordData>(`/api/v1/records/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

