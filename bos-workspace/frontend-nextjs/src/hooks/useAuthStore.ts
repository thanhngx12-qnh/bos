// File: src/hooks/useAuthStore.ts
import { create } from "zustand";

interface UserDetail {
  id: number;
  email: string;
  fullName: string;
  roleId: number | null;
  departmentId: number | null;
}

interface AuthState {
  user: UserDetail | null;
  token: string | null;
  tenantId: number | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: UserDetail, token: string, tenantId: number) => void;
  logout: () => void;
  setTenantId: (tenantId: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  tenantId:
    typeof window !== "undefined"
      ? Number(localStorage.getItem("tenant_id")) || null
      : null,
  isAuthenticated:
    typeof window !== "undefined" ? !!localStorage.getItem("token") : false,

  login: (user, token, tenantId) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("tenant_id", String(tenantId));
    }
    set({ user, token, tenantId, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("tenant_id");
    }
    set({ user: null, token: null, tenantId: null, isAuthenticated: false });
  },

  setTenantId: (tenantId) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tenant_id", String(tenantId));
    }
    set({ tenantId });
  },
}));
