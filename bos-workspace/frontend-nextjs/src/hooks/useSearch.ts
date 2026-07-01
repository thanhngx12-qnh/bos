import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface SearchResult {
  id: number;
  recordId: number;
  entityId: number;
  title: string;
  searchData: Record<string, any>;
  rank?: number;
}

export function useSearch(query: string, limit = 10) {
  return useQuery<SearchResult[]>({
    queryKey: ["search", query, limit],
    queryFn: async () => {
      if (!query || !query.trim()) return [];
      const { data } = await api.get<SearchResult[]>("/api/v1/search", {
        params: { q: query, limit },
      });
      return data;
    },
    enabled: !!query && query.trim().length >= 2,
  });
}
