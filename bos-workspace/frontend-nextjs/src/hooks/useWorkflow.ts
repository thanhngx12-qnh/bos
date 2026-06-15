// File: src/hooks/useWorkflow.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowService } from "@/services/workflow";
import { message } from "antd";

export function useWorkflow(
  versionId?: number,
  workflowId?: number,
  entityId?: number,
) {
  const queryClient = useQueryClient();

  // 1. Query tải danh sách toàn bộ workflows của Tenant
  const workflowsQuery = useQuery({
    queryKey: ["workflows"],
    queryFn: workflowService.findAll,
  });

  // 2. Query tải chi tiết 1 workflow để lấy mảng versions lồng nhau
  const workflowDetailQuery = useQuery({
    queryKey: ["workflow-detail", workflowId],
    queryFn: () => workflowService.findOne(workflowId!),
    enabled: !!workflowId,
  });

  // 3. Query tải dữ liệu Pipeline quy trình (Steps & Transitions Out/In)
  const pipelineQuery = useQuery({
    queryKey: ["workflow-pipeline", versionId],
    queryFn: () => workflowService.getPipeline(versionId!),
    enabled: !!versionId,
  });

  // Mutation khởi tạo luồng quy trình đầu tiên cho Thực thể
  const createWorkflowMutation = useMutation({
    mutationFn: workflowService.createWorkflow,
    onSuccess: () => {
      message.success("Khởi tạo quy trình nháp thành công!");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Khởi tạo quy trình thất bại",
      );
    },
  });

  const createStepMutation = useMutation({
    mutationFn: workflowService.createStep,
    onSuccess: () => {
      message.success("Tạo bước duyệt mới thành công!");
      queryClient.invalidateQueries({
        queryKey: ["workflow-pipeline", versionId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Tạo bước duyệt thất bại",
      );
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: any }) =>
      workflowService.updateStep(id, data),
    onSuccess: () => {
      message.success("Cập nhật bước duyệt thành công!");
      queryClient.invalidateQueries({
        queryKey: ["workflow-pipeline", versionId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Cập nhật bước duyệt thất bại",
      );
    },
  });

  const removeStepMutation = useMutation({
    mutationFn: workflowService.removeStep,
    onSuccess: () => {
      message.success("Xóa bước duyệt thành công!");
      queryClient.invalidateQueries({
        queryKey: ["workflow-pipeline", versionId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Xóa bước duyệt thất bại",
      );
    },
  });

  const createTransitionMutation = useMutation({
    mutationFn: workflowService.createTransition,
    onSuccess: () => {
      message.success("Tạo rẽ nhánh chuyển tiếp thành công!");
      queryClient.invalidateQueries({
        queryKey: ["workflow-pipeline", versionId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Tạo rẽ nhánh thất bại",
      );
    },
  });

  const removeTransitionMutation = useMutation({
    mutationFn: workflowService.removeTransition,
    onSuccess: () => {
      message.success("Xóa rẽ nhánh thành công!");
      queryClient.invalidateQueries({
        queryKey: ["workflow-pipeline", versionId],
      });
    },
    onError: (error: any) => {
      message.error(
        error.response?.data?.message ||
          error.message ||
          "Xóa rẽ nhánh thất bại",
      );
    },
  });

  // 🛑 KHẮC PHỤC: Nhận tham số động khi thực thi Mutation tránh lỗi undefined scope
  const cloneVersionMutation = useMutation({
    mutationFn: ({
      wId,
      vId,
    }: {
      wId: number | string;
      vId: number | string;
    }) => workflowService.cloneVersion(wId, vId),
    onSuccess: () => {
      message.success(
        "Nhân bản quy trình thành công! Một bản nháp (DRAFT) mới đã được tạo.",
      );
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({
        queryKey: ["workflow-detail", workflowId],
      });
    },
    onError: (error: any) => {
      const backendError = error.response?.data?.message;
      message.error(
        `Không thể nhân bản quy trình: ${
          Array.isArray(backendError)
            ? backendError.join(", ")
            : backendError || error.message
        }`,
      );
    },
  });

  // 🛑 KHẮC PHỤC: Nhận tham số động khi thực thi Mutation tránh lỗi undefined scope
  const updateVersionStatusMutation = useMutation({
    mutationFn: ({
      wId,
      vId,
      status,
    }: {
      wId: number | string;
      vId: number | string;
      status: "PUBLISHED" | "ARCHIVED";
    }) => workflowService.updateVersionStatus(wId, vId, status),
    onSuccess: () => {
      message.success("Cập nhật trạng thái quy trình thành công!");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({
        queryKey: ["workflow-detail", workflowId],
      });
      queryClient.invalidateQueries({
        queryKey: ["workflow-pipeline", versionId],
      });
    },
    onError: (error: any) => {
      const backendError = error.response?.data?.message;
      message.error(
        `Không thể cập nhật trạng thái: ${
          Array.isArray(backendError)
            ? backendError.join(", ")
            : backendError || error.message
        }`,
      );
    },
  });

  return {
    workflows: workflowsQuery.data || [],
    isLoadingWorkflows: workflowsQuery.isLoading,

    workflowDetail: workflowDetailQuery.data,
    isLoadingWorkflowDetail: workflowDetailQuery.isLoading,

    steps: pipelineQuery.data || [],
    isLoading: pipelineQuery.isLoading,
    refetch: pipelineQuery.refetch,

    createWorkflow: createWorkflowMutation.mutateAsync,
    isCreatingWorkflow: createWorkflowMutation.isPending,

    createStep: createStepMutation.mutateAsync,
    isCreatingStep: createStepMutation.isPending,
    updateStep: updateStepMutation.mutateAsync,
    isUpdatingStep: updateStepMutation.isPending,
    removeStep: removeStepMutation.mutateAsync,
    isRemovingStep: removeStepMutation.isPending,

    createTransition: createTransitionMutation.mutateAsync,
    isCreatingTransition: createTransitionMutation.isPending,
    removeTransition: removeTransitionMutation.mutateAsync,
    isRemovingTransition: removeTransitionMutation.isPending,

    cloneVersion: cloneVersionMutation.mutateAsync,
    isCloning: cloneVersionMutation.isPending,
    updateVersionStatus: updateVersionStatusMutation.mutateAsync,
    isUpdatingStatus: updateVersionStatusMutation.isPending,
  };
}
