// File: src/hooks/useDelegations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface Delegation {
  id: number;
  tenantId: number;
  fromUserId: number;
  toUserId: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  toUser: {
    id: number;
    email: string;
    fullName: string;
  };
}

export function useDelegations() {
  return useQuery<Delegation[]>({
    queryKey: ["delegations"],
    queryFn: async () => {
      const { data } = await api.get<Delegation[]>("/api/v1/delegations");
      return data || [];
    },
  });
}

export function useCreateDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { toUserId: number; startDate: string; endDate: string }) => {
      const { data } = await api.post("/api/v1/delegations", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
  });
}

export function useUpdateDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const { data } = await api.patch(`/api/v1/delegations/${id}`, { isActive });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
  });
}

export function useDeleteDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/delegations/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegations"] });
    },
  });
}
