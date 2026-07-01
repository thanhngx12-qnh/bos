// File: src/hooks/useSignatures.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface UserSignature {
  id: number;
  tenantId: number;
  userId: number;
  name: string;
  type: "DRAW" | "IMAGE" | "STAMP" | "TEXT";
  signatureUrl: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSignaturePayload {
  name: string;
  type: "DRAW" | "IMAGE" | "STAMP" | "TEXT";
  signatureUrl: string; // Base64 representation
}

export function useSignatures() {
  return useQuery<UserSignature[]>({
    queryKey: ["user-signatures"],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/signatures");
      return data;
    },
  });
}

export function useCreateSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSignaturePayload) => {
      const { data } = await api.post("/api/v1/signatures", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-signatures"] });
    },
  });
}

export function useSetDefaultSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/api/v1/signatures/${id}/default`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-signatures"] });
    },
  });
}

export function useDeleteSignature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete(`/api/v1/signatures/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-signatures"] });
    },
  });
}
