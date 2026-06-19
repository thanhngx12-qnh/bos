// File: src/hooks/useWorkflows.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface WorkflowVersion {
  id: number;
  workflowId: number;
  version: number;
  status: "DRAFT" | "PUBLISHED";
  createdAt: string;
}

export interface Workflow {
  id: number;
  entityId: number;
  name: string;
  description?: string;
  versions: WorkflowVersion[];
}

export interface WorkflowStep {
  id: number;
  versionId: number;
  name: string;
  stepType: "USER_TASK" | "SYSTEM_TASK";
  permissions: Record<string, any>;
  orderIndex: number;
  transitionsOut?: any[];
  transitionsIn?: any[];
}

// Gọi API lấy danh sách Quy trình lọc theo Thực thể Biểu mẫu [1]
export function useWorkflows(entityId: number | null) {
  return useQuery<{ data: Workflow[] }>({
    queryKey: ["workflows", entityId],
    queryFn: async () => {
      if (!entityId) return { data: [] };
      const { data } = await api.get("/api/v1/workflows", {
        params: { entityId, page: 1, limit: 10 },
      });
      if (Array.isArray(data)) {
        return { data };
      }
      return { data: data.data || [] };
    },
    enabled: !!entityId,
  });
}

// Gọi API lấy sơ đồ các Bước duyệt của Phiên bản quy trình [1]
export function useWorkflowSteps(versionId: number | null) {
  return useQuery<WorkflowStep[]>({
    queryKey: ["workflowSteps", versionId],
    queryFn: async () => {
      if (!versionId) return [];
      const { data } = await api.get(
        `/api/v1/workflow-pipeline/versions/${versionId}`,
      );
      return data;
    },
    enabled: !!versionId,
  });
}

// Gọi API cập nhật cấu hình Ma trận Phân quyền của Bước duyệt trực tiếp vào DB [1]
export function useUpdateStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      versionId,
      payload,
    }: {
      id: number;
      versionId: number;
      payload: { permissions?: any; name?: string; stepType?: string; orderIndex?: number };
    }) => {
      const { data } = await api.patch(
        `/api/v1/workflow-pipeline/steps/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflowSteps", variables.versionId],
      });
    },
  });
}

// Khởi tạo Quy trình mới kèm Version 1 (DRAFT) cho Entity [1]
export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      entityId: number;
      name: string;
      description?: string;
    }) => {
      const { data } = await api.post("/api/v1/workflows", payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.entityId],
      });
    },
  });
}

// Khởi tạo Bước duyệt mới trong Version quy trình [1]
export function useCreateStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      versionId: number;
      name: string;
      stepType?: string;
      orderIndex?: number;
      permissions?: any;
    }) => {
      const { data } = await api.post("/api/v1/workflow-pipeline/steps", payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflowSteps", variables.versionId],
      });
    },
  });
}

// Xóa Bước duyệt khỏi Version quy trình [1]
export function useDeleteStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, versionId }: { id: number; versionId: number }) => {
      const { data } = await api.delete(`/api/v1/workflow-pipeline/steps/${id}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflowSteps", variables.versionId],
      });
    },
  });
}

// Nhân bản (Clone) phiên bản quy trình sang DRAFT mới [1]
export function useCloneWorkflowVersion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workflowId, versionId }: { workflowId: number; versionId: number }) => {
      const { data } = await api.post(`/api/v1/workflows/${workflowId}/versions/${versionId}/clone`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.workflowId],
      });
    },
  });
}

// Cập nhật trạng thái phiên bản quy trình (DRAFT -> PUBLISHED / ARCHIVED) [1]
export function useUpdateWorkflowVersionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workflowId,
      versionId,
      status,
    }: {
      workflowId: number;
      versionId: number;
      status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    }) => {
      const { data } = await api.patch(
        `/api/v1/workflows/${workflowId}/versions/${versionId}/status`,
        { status }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["workflows", variables.workflowId],
      });
    },
  });
}


