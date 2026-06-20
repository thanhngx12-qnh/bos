// File: src/hooks/useAuth.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { LoginDto, LoginResponse, RegisterTenantDto, RegisterTenantResponse } from '@/types/auth';

export function useLogin() {
  return useMutation<LoginResponse | any, Error, LoginDto>({
    mutationFn: async (payload: LoginDto) => {
      const { data } = await api.post<LoginResponse | any>('/api/v1/auth/login', payload);
      return data;
    },
  });
}

export function useLoginSelectTenant() {
  return useMutation<LoginResponse, Error, any>({
    mutationFn: async (payload: any) => {
      const { data } = await api.post<LoginResponse>('/api/v1/auth/login/select-tenant', payload);
      return data;
    },
  });
}

export function useMyTenants() {
  return useQuery<{ id: number; name: string; code: string }[]>({
    queryKey: ['myTenants'],
    queryFn: async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bos_token') : null;
      if (!token) return [];
      const { data } = await api.get('/api/v1/auth/my-tenants');
      return data;
    },
    enabled: typeof window !== 'undefined' ? !!localStorage.getItem('bos_token') : false,
  });
}

export function useSwitchTenant() {
  return useMutation<LoginResponse, Error, { tenantId: number }>({
    mutationFn: async (payload: { tenantId: number }) => {
      const { data } = await api.post<LoginResponse>('/api/v1/auth/switch-tenant', payload);
      return data;
    },
  });
}

export function useRegisterTenant() {
  return useMutation<RegisterTenantResponse, Error, RegisterTenantDto>({
    mutationFn: async (payload: RegisterTenantDto) => {
      const { data } = await api.post<RegisterTenantResponse>('/api/v1/auth/register-tenant', payload);
      return data;
    },
  });
}
