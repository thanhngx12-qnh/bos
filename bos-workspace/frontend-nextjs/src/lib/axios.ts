// File: src/lib/axios.ts
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor tự động bắt Token và Tenant ID đồng bộ từ Zustand Auth Store hoặc LocalStorage
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const tenantId = localStorage.getItem("tenant_id");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (tenantId) {
        config.headers["x-tenant-id"] = tenantId;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor phản hồi: Tự động điều hướng về /login khi Token hết hạn (401)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("tenant_id");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
