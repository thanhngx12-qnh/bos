// File: src/hooks/useTenant.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface TenantDetail {
  id: number;
  name: string;
  code: string;
  status: string;
  createdAt: string;
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
