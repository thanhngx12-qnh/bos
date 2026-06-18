// File: src/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { LoginDto, LoginResponse, RegisterTenantDto, RegisterTenantResponse } from '@/types/auth';

export function useLogin() {
  return useMutation<LoginResponse, Error, LoginDto>({
    mutationFn: async (payload: LoginDto) => {
      const { data } = await api.post<LoginResponse>('/api/v1/auth/login', payload);
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
