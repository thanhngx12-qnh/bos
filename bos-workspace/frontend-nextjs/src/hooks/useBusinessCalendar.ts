// File: src/hooks/useBusinessCalendar.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";

export interface CalendarShift {
  dayOfWeek: number;
  working: boolean;
  hours: { start: string; end: string }[];
}

export interface BusinessCalendar {
  id: number;
  tenantId: number;
  name: string;
  isDefault: boolean;
  shifts: CalendarShift[];
  holidays: any[]; // e.g. { date: string, description: string }[] or string[]
  createdAt: string;
}

export function useBusinessCalendar() {
  return useQuery<BusinessCalendar>({
    queryKey: ["business_calendar"],
    queryFn: async () => {
      const { data } = await api.get<BusinessCalendar>("/api/v1/business-calendar");
      return data;
    },
  });
}

export function useUpdateBusinessCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { shifts: CalendarShift[]; holidays: string[] }) => {
      const { data } = await api.patch("/api/v1/business-calendar", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business_calendar"] });
    },
  });
}
