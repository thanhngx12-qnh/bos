### 1. Nhận định kết quả hiện tại

- **Trạng thái**: Đồng ý hoàn toàn với ý kiến của bạn. Việc biên soạn tài liệu tích hợp (Frontend Integration Guide) ngay sau khi các API được kiểm thử thành công là một thực hành cực kỳ hữu ích (Best Practice) trong quy trình phát triển phần mềm chuyên nghiệp. Nó giúp lập trình viên Frontend biết chính xác cấu trúc dữ liệu, cách đính kèm header, lưu trữ token, và xử lý lỗi mà không cần phải tự mày mò thử nghiệm.
- **Tài liệu tích hợp dưới đây**: Được viết bằng **TypeScript / Axios** cho các giai đoạn chúng ta vừa kiểm thử thành công (Onboarding, Authentication, Departments).

---

## TÀI LIỆU TÍCH HỢP FRONTEND (PHASE 1, 2, 3)

### 1. Cấu hình Axios Client cơ bản (Multi-Tenant Context)

Frontend cần lưu trữ `accessToken` và `tenantId` vào `localStorage` hoặc Cookie sau khi đăng nhập và tự động đính kèm vào mọi request tiếp theo [1].

```typescript
import axios from "axios";

const API_BASE_URL = "http://localhost:3000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor tự động đính kèm Token và Tenant ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    const tenantId = localStorage.getItem("tenant_id");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers["x-tenant-id"] = tenantId; // Header định danh tenant bắt buộc [1]
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
```

---

### 2. Chi tiết API Tích hợp

#### 2.1 Đăng ký Doanh nghiệp mới (Onboarding SaaS)

- **Endpoint**: `POST /auth/register-tenant`
- **Mô tả**: Dùng ở trang Đăng ký (Onboarding) cho doanh nghiệp mới. Không cần truyền Token hay Tenant ID lên header.

```typescript
export interface RegisterTenantDto {
  tenantName: string;
  tenantCode: string; // snake_case viết thường [1]
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

export const registerTenant = async (data: RegisterTenantDto) => {
  const response = await apiClient.post("/auth/register-tenant", data);
  return response.data; // Trả về thông tin Tenant mới và Admin tài khoản [1]
};
```

#### 2.2 Đăng nhập hệ thống (Login)

- **Endpoint**: `POST /auth/login`
- **Mô tả**: Đăng nhập lấy JWT Token [1]. Frontend cần lưu lại `accessToken` và `tenantId` của User vừa đăng nhập.

```typescript
export interface LoginDto {
  email: string;
  password: string;
}

export const login = async (data: LoginDto) => {
  const response = await apiClient.post("/auth/login", data);
  const { accessToken, user } = response.data;

  // Lưu trữ thông tin phiên làm việc
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("tenant_id", String(user.tenantId));

  return response.data;
};
```

#### 2.3 Quản lý Phòng ban (Departments & Closure Table)

- **Mô tả**: Các API tương tác với cây cơ cấu tổ chức doanh nghiệp [1].

```typescript
export interface Department {
  id: number;
  tenantId: number;
  name: string;
  parentId: number | null;
  deletedAt: string | null;
}

// 1. Lấy sơ đồ cây phòng ban để vẽ UI Tổ chức (Dạng cây đã lọc bỏ các phần tử bị soft-delete)
export const getDepartmentTree = async (): Promise<Department[]> => {
  const response = await apiClient.get("/departments/tree");
  return response.data;
};

// 2. Tạo phòng ban mới (Hệ thống tự động tính toán Closure Table) [1]
export const createDepartment = async (
  name: string,
  parentId?: number,
): Promise<Department> => {
  const response = await apiClient.post("/departments", { name, parentId });
  return response.data;
};

// 3. Lấy toàn bộ phòng ban con/cháu đệ quy (Dùng để phân tích ngân sách hoặc gán việc) [1]
export const getDescendants = async (id: number): Promise<Department[]> => {
  const response = await apiClient.get(`/departments/${id}/descendants`);
  return response.data;
};

// 4. Cập nhật thông tin phòng ban (Lưu ý: Không truyền parentId lên PATCH) [1]
export const updateDepartment = async (
  id: number,
  name: string,
): Promise<Department> => {
  const response = await apiClient.patch(`/departments/${id}`, { name });
  return response.data;
};

// 5. Xóa mềm phòng ban [1]
// Lưu ý: Sẽ trả về lỗi 400 Bad Request nếu phòng ban này đang có con hoạt động [1]
export const deleteDepartment = async (id: number): Promise<void> => {
  await apiClient.delete(`/departments/${id}`);
};
```

---

### 3. Danh sách bug/risk hiện tại

- **Chưa phát hiện thêm** (Chúng ta vừa làm sạch DB và chuẩn bị chuyển sang Giai đoạn 4 & 5).

---
