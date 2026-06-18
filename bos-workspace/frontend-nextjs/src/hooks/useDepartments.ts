// File: src/hooks/useDepartments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface DepartmentNode {
  id: number;
  name: string;
  parentId: number | null;
  children?: DepartmentNode[];
}

export interface CreateDepartmentPayload {
  name: string;
  parentId?: number;
}

export interface UpdateDepartmentPayload {
  name: string;
}

export function useDepartmentTree() {
  return useQuery<DepartmentNode[]>({
    queryKey: ["departmentTree"],
    queryFn: async () => {
      const { data } = await api.get<DepartmentNode[]>(
        "/api/v1/departments/tree",
      );
      return data;
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateDepartmentPayload) => {
      const { data } = await api.post("/api/v1/departments", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentTree"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: UpdateDepartmentPayload;
    }) => {
      const { data } = await api.patch(`/api/v1/departments/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentTree"] });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/departments/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departmentTree"] });
    },
  });
}
