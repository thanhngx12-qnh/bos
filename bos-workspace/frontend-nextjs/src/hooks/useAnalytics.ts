// File: src/hooks/useAnalytics.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export function useEntitiesSummary() {
  return useQuery<any[]>({
    queryKey: ["analytics", "entities-summary"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/analytics/entities-summary");
      return data;
    },
  });
}

export function useWorkflowsSummary() {
  return useQuery<any[]>({
    queryKey: ["analytics", "workflows-summary"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/analytics/workflows-summary");
      return data;
    },
  });
}

export function useSpendingByDepartment(entityId?: number, amountField?: string) {
  return useQuery<any[]>({
    queryKey: ["analytics", "spending-by-department", entityId, amountField],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/analytics/spending-by-department", {
        params: { entityId, amountField },
      });
      return data;
    },
  });
}

export function useTaskAnalytics() {
  return useQuery<{
    statusBreakdown: { status: string; count: number; avgCompletionSeconds: number }[];
    overdueCount: number;
  }>({
    queryKey: ["analytics", "tasks"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/tasks/analytics");
      return data;
    },
  });
}
