// File: src/hooks/useRoles.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface Role {
  id: number;
  name: string;
  permissions: Record<string, string[]>;
  createdAt: string;
}

export function useRoles(page = 1, limit = 50) {
  return useQuery<{ data: Role[]; total: number }>({
    queryKey: ["roles", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/roles", {
        params: { page, limit, sortBy: "id", sortOrder: "asc" },
      });
      if (Array.isArray(data)) {
        return { data, total: data.length };
      }
      return { data: data.items || data.data || [], total: data.total || 0 };
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; permissions?: any }) => {
      const { data } = await api.post("/api/v1/roles", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: { name?: string; permissions?: any };
    }) => {
      const { data } = await api.patch(`/api/v1/roles/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/roles/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}
