// File: src/lib/api/client.ts
import axios from "axios";

export const apiClient = axios.create({
  // Mặc định gọi đến Backend đang chạy ở port 3000
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor chặn request để gắn Token và Tenant ID
apiClient.interceptors.request.use(
  (config) => {
    // Chỉ thực thi trên môi trường Browser (Client-side)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      const tenantId = localStorage.getItem("tenantId");

      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
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

// Interceptor chặn response để xử lý lỗi tập trung (ví dụ: hết hạn token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Xóa token và có thể redirect về trang đăng nhập (sẽ cập nhật ở module Auth)
        localStorage.removeItem("accessToken");
      }
    }
    return Promise.reject(error);
  },
);
