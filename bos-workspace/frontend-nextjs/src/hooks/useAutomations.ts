// File: src/hooks/useAutomations.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface AutomationEvent {
  id: number;
  tenantId: number;
  code: string;
  name: string;
  schema: any;
}

export interface AutomationRule {
  id: number;
  tenantId: number;
  eventId: number;
  name: string;
  conditions: any;
  actions: any;
  isActive: boolean;
  eventDef?: {
    id: number;
    name: string;
    code: string;
  };
}

export function useAutomationEvents() {
  return useQuery<AutomationEvent[]>({
    queryKey: ["automationEvents"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/automation/events");
      return data;
    },
  });
}

export function useAutomationRules() {
  return useQuery<AutomationRule[]>({
    queryKey: ["automationRules"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/automation/rules");
      return data;
    },
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<AutomationRule>) => {
      const { data } = await api.post("/api/v1/automation/rules", dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automationRules"] });
    },
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dto }: Partial<AutomationRule> & { id: number }) => {
      const { data } = await api.patch(`/api/v1/automation/rules/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automationRules"] });
    },
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/automation/rules/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automationRules"] });
    },
  });
}
