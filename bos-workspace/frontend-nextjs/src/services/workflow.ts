// File: src/services/workflow.ts
import axiosInstance from "@/lib/axios";

export const workflowService = {
  /**
   * Lấy danh sách toàn bộ các luồng quy trình của Tenant (WorkflowsController_findAll)
   * GET /api/v1/workflows
   */
  findAll: async () => {
    const response = await axiosInstance.get("/api/v1/workflows", {
      params: { limit: 100 }, // Lấy tối đa 100 bản ghi để đảm bảo bao phủ hết thực thể
    });
    return response.data;
  },

  /**
   * Lấy chi tiết luồng quy trình kèm mảng versions lồng bên trong (WorkflowsController_findOne)
   * GET /api/v1/workflows/{id}
   */
  findOne: async (id: number | string) => {
    const response = await axiosInstance.get(`/api/v1/workflows/${id}`);
    return response.data;
  },

  /**
   * Lấy toàn bộ Sơ đồ (Pipeline Steps & Transitions) của một Version quy trình
   */
  getPipeline: async (versionId: number | string) => {
    const response = await axiosInstance.get(
      `/api/v1/workflow-pipeline/versions/${versionId}`,
    );
    return response.data;
  },

  /**
   * Tạo luồng quy trình gốc mới cho Thực thể (WorkflowsController_create)
   * Method: POST /api/v1/workflows
   */
  createWorkflow: async (data: { entityId: number; name: string }) => {
    const response = await axiosInstance.post("/api/v1/workflows", data);
    return response.data;
  },

  /**
   * Tạo bước duyệt mới (Step)
   */
  createStep: async (data: any) => {
    const response = await axiosInstance.post(
      "/api/v1/workflow-pipeline/steps",
      data,
    );
    return response.data;
  },

  /**
   * Cập nhật bước duyệt (Step) và Step-level RBAC
   */
  updateStep: async (id: number | string, data: any) => {
    const response = await axiosInstance.patch(
      `/api/v1/workflow-pipeline/steps/${id}`,
      data,
    );
    return response.data;
  },

  /**
   * Xóa bước duyệt
   */
  removeStep: async (id: number | string) => {
    const response = await axiosInstance.delete(
      `/api/v1/workflow-pipeline/steps/${id}`,
    );
    return response.data;
  },

  /**
   * Tạo đường rẽ nhánh chuyển tiếp (Transition)
   */
  createTransition: async (data: any) => {
    const response = await axiosInstance.post(
      "/api/v1/workflow-pipeline/transitions",
      data,
    );
    return response.data;
  },

  /**
   * Cập nhật đường rẽ nhánh
   */
  updateTransition: async (id: number | string, data: any) => {
    const response = await axiosInstance.patch(
      `/api/v1/workflow-pipeline/transitions/${id}`,
      data,
    );
    return response.data;
  },

  /**
   * Xóa đường rẽ nhánh
   */
  removeTransition: async (id: number | string) => {
    const response = await axiosInstance.delete(
      `/api/v1/workflow-pipeline/transitions/${id}`,
    );
    return response.data;
  },

  /**
   * API Nhân bản Phiên bản (Clone Version)
   * Method: POST /api/v1/workflows/{workflowId}/versions/{versionId}/clone
   */
  cloneVersion: async (
    workflowId: number | string,
    versionId: number | string,
  ) => {
    const response = await axiosInstance.post(
      `/api/v1/workflows/${workflowId}/versions/${versionId}/clone`,
    );
    return response.data;
  },

  /**
   * API Cập nhật Trạng thái (Publish Version)
   * Method: PATCH /api/v1/workflows/{workflowId}/versions/{versionId}/status
   */
  updateVersionStatus: async (
    workflowId: number | string,
    versionId: number | string,
    status: "PUBLISHED" | "ARCHIVED",
  ) => {
    const response = await axiosInstance.patch(
      `/api/v1/workflows/${workflowId}/versions/${versionId}/status`,
      { status },
    );
    return response.data;
  },
};
