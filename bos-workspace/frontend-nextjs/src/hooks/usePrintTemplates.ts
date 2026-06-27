// File: src/hooks/usePrintTemplates.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface PrintTemplate {
  id: number;
  tenantId: number;
  entityId: number;
  name: string;
  template: {
    html: string;
  };
  createdAt: string;
}

export function usePrintTemplates(entityId: number | null) {
  return useQuery<PrintTemplate[]>({
    queryKey: ["printTemplates", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data } = await api.get("/api/v1/print-templates", {
        params: { entityId },
      });
      return data;
    },
    enabled: !!entityId,
  });
}

export function usePrintTemplate(id: number | null) {
  return useQuery<PrintTemplate>({
    queryKey: ["printTemplate", id],
    queryFn: async () => {
      if (!id) throw new Error("Template ID is required");
      const { data } = await api.get(`/api/v1/print-templates/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePrintTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      entityId: number;
      name: string;
      template: { html: string };
    }) => {
      const { data } = await api.post("/api/v1/print-templates", payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["printTemplates", variables.entityId] });
    },
  });
}

export function useUpdatePrintTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      entityId,
      payload,
    }: {
      id: number;
      entityId: number;
      payload: {
        name?: string;
        template?: { html: string };
      };
    }) => {
      const { data } = await api.patch(`/api/v1/print-templates/${id}`, payload);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["printTemplates", variables.entityId] });
      queryClient.invalidateQueries({ queryKey: ["printTemplate", variables.id] });
    },
  });
}

export function useDeletePrintTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityId }: { id: number; entityId: number }) => {
      const { data } = await api.delete(`/api/v1/print-templates/${id}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["printTemplates", variables.entityId] });
    },
  });
}

export function useRenderPrintTemplate(templateId: number | null, recordId: number | null) {
  return useQuery<{ templateName: string; renderedHtml: string }>({
    queryKey: ["renderPrintTemplate", templateId, recordId],
    queryFn: async () => {
      if (!templateId || !recordId) throw new Error("Template ID and Record ID are required");
      const { data } = await api.get(`/api/v1/print-templates/${templateId}/render/${recordId}`);
      return data;
    },
    enabled: !!templateId && !!recordId,
  });
}
