import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface AuditLog {
  id: number;
  tenantId: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: number | null;
  payload: any;
  ipAddress: string | null;
  createdAt: string;
  user: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useAuditLogs(page = 1, limit = 10) {
  return useQuery<PaginatedAuditLogs>({
    queryKey: ["auditLogs", page, limit],
    queryFn: async () => {
      const { data } = await api.get("/api/v1/audit-logs", {
        params: { page, limit },
      });
      return data;
    },
  });
}
