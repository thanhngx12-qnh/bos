// File: src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface User {
  id: number;
  email: string;
  fullName: string;
  departmentId: number | null;
  roleId: number | null;
  status: string;
  createdAt: string;
}

export function useUsers(page = 1, limit = 50) {
  return useQuery<{ data: User[]; total: number }>({
    queryKey: ["users", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/users", {
        params: { page, limit, sortBy: "id", sortOrder: "asc" },
      });
      if (Array.isArray(data)) {
        return { data, total: data.length };
      }
      return { data: data.items || data.data || [], total: data.total || 0 };
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post("/api/v1/users", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const { data } = await api.patch(`/api/v1/users/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/users/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
