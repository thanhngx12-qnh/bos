// File: src/core/engines/condition-evaluator.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConditionEvaluatorService {
  private readonly logger = new Logger(ConditionEvaluatorService.name);

  /**
   * Đánh giá một tập hợp các quy tắc dựa trên dữ liệu đầu vào.
   * Hỗ trợ đệ quy cho các toán tử logic AND / OR.
   */
  public evaluate(
    conditionLogic: any,
    contextData: Record<string, any>,
  ): boolean {
    if (!conditionLogic || Object.keys(conditionLogic).length === 0) {
      return true; // Không có điều kiện gì -> Mặc định là TRUE
    }

    try {
      return this.processNode(conditionLogic, contextData);
    } catch (error) {
      this.logger.error(
        `Lỗi khi đánh giá điều kiện logic: ${error.message}`,
        error.stack,
      );
      return false; // Fail-safe: Lỗi cấu hình thì không cho qua
    }
  }

  private processNode(node: any, contextData: Record<string, any>): boolean {
    // 1. Nếu là cụm logic AND
    if (node.operator === 'AND' && Array.isArray(node.rules)) {
      return node.rules.every((rule: any) =>
        this.processNode(rule, contextData),
      );
    }

    // 2. Nếu là cụm logic OR
    if (node.operator === 'OR' && Array.isArray(node.rules)) {
      return node.rules.some((rule: any) =>
        this.processNode(rule, contextData),
      );
    }

    // 3. Nếu là một Node so sánh vật lý (Lá)
    return this.evaluateLeaf(node, contextData);
  }

  private evaluateLeaf(rule: any, contextData: Record<string, any>): boolean {
    if (!rule.field) return true; // Cấu hình lá không hợp lệ, bỏ qua

    const actualVal = contextData[rule.field];
    const targetVal = rule.value;

    switch (rule.operator) {
      case '==':
        return actualVal === targetVal;
      case '!=':
        return actualVal !== targetVal;
      case '>':
        return Number(actualVal) > Number(targetVal);
      case '<':
        return Number(actualVal) < Number(targetVal);
      case '>=':
        return Number(actualVal) >= Number(targetVal);
      case '<=':
        return Number(actualVal) <= Number(targetVal);
      case 'IN':
        return Array.isArray(targetVal) && targetVal.includes(actualVal); // <-- ĐÃ SỬA
      case 'NOT_IN':
        return Array.isArray(targetVal) && !targetVal.includes(actualVal); // <-- ĐÃ SỬA
      case 'CONTAINS':
        return String(actualVal || '')
          .toLowerCase()
          .includes(String(targetVal || '').toLowerCase());
      case 'IS_NULL':
        return (
          actualVal === null || actualVal === undefined || actualVal === ''
        );
      case 'IS_NOT_NULL':
        return (
          actualVal !== null && actualVal !== undefined && actualVal !== ''
        );
      default:
        // Fallback cho các trường hợp cấu hình cũ
        if (rule.rules && rule.rules.field) {
          return this.evaluateLeaf(rule.rules, contextData);
        }
        return false;
    }
  }
}
