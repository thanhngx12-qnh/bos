// File: src/hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface Task {
  id: number;
  tenantId: number;
  instanceId: number;
  stepId: number;
  assigneeType: string;
  assigneeId: number;
  assignmentStrategy: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  estimatedCompletionTime?: string;
  actualCompletionTime?: string;
  completionTimeSeconds?: number;
  createdAt: string;
  updatedAt: string;
  instance?: {
    id: number;
    versionId: number;
    recordId: number;
    currentStepId: number;
    status: "IN_PROGRESS" | "COMPLETED" | "REJECTED";
    record: {
      id: number;
      businessCode: string;
      title: string;
      status?: string;
      entityId: number;
      data: Record<string, any>;
    };
  };
}

export interface WorkflowLog {
  id: number;
  instanceId: number;
  stepId?: number;
  userId?: number;
  action: string;
  comment?: string;
  createdAt: string;
  step?: {
    id: number;
    name: string;
  };
  user?: {
    id: number;
    fullName: string;
    email: string;
  };
  snapshot?: any;
}

// Lấy danh sách nhiệm vụ được giao cho tôi
export function useMyTasks(status?: "PENDING" | "COMPLETED" | "", page = 1, limit = 10) {
  return useQuery<{ data: Task[]; total: number }>({
    queryKey: ["myTasks", status, page, limit],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/tasks/my-tasks", {
        params: {
          page,
          limit,
          status: status || undefined,
        },
      });
      return {
        data: data.data || [],
        total: data.meta?.total || 0,
      };
    },
  });
}

// Hoàn thành nhiệm vụ chung (thông qua Event Bus)
export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, comment }: { taskId: number; comment?: string }) => {
      const { data } = await api.post(`/api/v1/tasks/${taskId}/complete`, { comment });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
    },
  });
}

// Thực hiện hành động chuyển tiếp quy trình (Approve/Reject...) qua transitionId cụ thể
export function useWorkflowAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      transitionId,
      comment,
      signatureData,
      otpCode,
      stampData,
      signatureLayout,
      showSignerName,
      showSignerRole,
      showSignerDept,
      showSigningTime,
      nextAssigneeId,
    }: {
      instanceId: number;
      transitionId: number;
      comment?: string;
      signatureData?: string;
      otpCode?: string;
      stampData?: string;
      signatureLayout?: string;
      showSignerName?: boolean;
      showSignerRole?: boolean;
      showSignerDept?: boolean;
      showSigningTime?: boolean;
      nextAssigneeId?: number;
    }) => {
      const { data } = await api.post(`/api/v1/workflows/instances/${instanceId}/action`, {
        transitionId,
        comment,
        signatureData,
        otpCode,
        stampData,
        signatureLayout,
        showSignerName,
        showSignerRole,
        showSignerDept,
        showSigningTime,
        nextAssigneeId,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
    },
  });
}

// Lấy lịch sử phê duyệt (Audit Log Timeline)
export function useWorkflowLogs(instanceId: number | null) {
  return useQuery<WorkflowLog[]>({
    queryKey: ["workflowLogs", instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      const { data } = await api.get(`/api/v1/workflows/instances/${instanceId}/logs`);
      return data;
    },
    enabled: !!instanceId,
  });
}

export function useRecordWorkflowLogs(recordId: number | null) {
  return useQuery<WorkflowLog[]>({
    queryKey: ["recordWorkflowLogs", recordId],
    queryFn: async () => {
      if (!recordId) return [];
      const { data } = await api.get(`/api/v1/workflows/instances/record/${recordId}/logs`);
      return data;
    },
    enabled: !!recordId,
  });
}
