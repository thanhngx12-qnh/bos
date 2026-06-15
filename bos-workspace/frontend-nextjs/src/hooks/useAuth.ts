// File: src/hooks/useAuth.ts
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService, LoginRequest } from "@/services/auth";
import { message } from "antd";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async (data: LoginRequest, tenantId: string) => {
    setLoading(true);
    try {
      // 1. Lưu tenantId vào localStorage trước để các request kế tiếp tự động đính kèm header
      localStorage.setItem("tenant_id", tenantId);

      const response = await authService.login(data, tenantId);

      // 2. Trích xuất token linh hoạt theo cấu trúc trả về chuẩn của Backend
      const token =
        response?.accessToken || response?.token || response?.data?.accessToken;

      if (!token) {
        throw new Error(
          "Đăng nhập thành công nhưng không nhận được Token từ máy chủ.",
        );
      }

      // 3. Lưu trữ token phiên làm việc
      localStorage.setItem("token", token);
      message.success("Đăng nhập hệ thống BOS thành công!");

      // 4. Điều hướng về trang chủ quản trị
      router.push("/");
    } catch (error: any) {
      // Xóa thông tin tenant nếu quá trình đăng nhập thất bại
      localStorage.removeItem("tenant_id");
      const errorMsg =
        error.response?.data?.message || error.message || "Đăng nhập thất bại";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("tenant_id");
    router.push("/login");
  };

  return {
    login,
    logout,
    loading,
  };
}
