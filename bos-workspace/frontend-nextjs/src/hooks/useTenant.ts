// File: src/hooks/useTenant.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface TenantDetail {
  id: number;
  name: string;
  code: string;
  status: string;
  createdAt: string;
  _count?: {
    users: number;
    entities: number;
    records: number;
    workflows: number;
  };
}

export function useTenantDetail(id: number | null) {
  return useQuery<TenantDetail>({
    queryKey: ["tenantDetail", id],
    queryFn: async () => {
      if (!id)
        throw new Error(
          "Không tìm thấy ID Doanh nghiệp trong phiên đăng nhập.",
        );
      const { data } = await api.get<TenantDetail>(`/api/v1/tenants/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useTenants(page = 1, limit = 50) {
  return useQuery<{ data: TenantDetail[]; total: number }>({
    queryKey: ["tenants", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/tenants", {
        params: { page, limit, sortBy: "id", sortOrder: "desc" },
      });
      if (Array.isArray(data)) {
        return { data, total: data.length };
      }
      return {
        data: data.data || [],
        total: data.meta?.total ?? data.total ?? 0,
      };
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; code: string }) => {
      const { data } = await api.post("/api/v1/tenants", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: { name: string } }) => {
      const { data } = await api.patch(`/api/v1/tenants/${id}`, payload);
      return data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["tenantDetail", id] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/tenants/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

