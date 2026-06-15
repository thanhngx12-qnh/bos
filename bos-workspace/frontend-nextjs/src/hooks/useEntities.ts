// File: src/hooks/useEntities.ts
import { useQuery } from "@tanstack/react-query";
import { entityService } from "@/services/entity";

export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: entityService.findAll,
    staleTime: 5 * 60 * 1000, // Cache dữ liệu cấu trúc thực thể trong 5 phút
  });
}
