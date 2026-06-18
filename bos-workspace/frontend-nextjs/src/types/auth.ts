// File: src/types/auth.ts

export interface RegisterTenantDto {
  tenantName: string;
  tenantCode: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

export interface RegisterTenantResponse {
  message: string;
  tenant: {
    id: number;
    name: string;
    code: string;
    status: string;
  };
  admin: {
    id: number;
    tenantId: number;
    email: string;
    fullName: string;
  };
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  accessToken: string;
  user: {
    id: number;
    tenantId: number;
    email: string;
    fullName: string;
    roleId: number | null;
    departmentId: number | null;
  };
}
