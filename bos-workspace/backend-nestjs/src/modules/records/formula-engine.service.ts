// File: src/modules/records/formula-engine.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { FieldRegistry } from '@prisma/client';
import { FormulaParser } from './formula-parser.util';

@Injectable()
export class FormulaEngineService {
  // --- BỘ TIỀN XỬ LÝ (PREPROCESSOR): XỬ LÝ HÀM TỔNG HỢP TRÊN BẢNG CON ---
  private preprocessRollups(
    expression: string,
    data: Record<string, any>,
  ): string {
    // Nhận diện cú pháp: SUM(table.column), COUNT(table), AVG(table.column)
    const rollupRegex =
      /(SUM|COUNT|AVG)\(([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\)/gi;

    return expression.replace(
      rollupRegex,
      (match, func, tableCode, columnCode) => {
        const tableData = data[tableCode];

        // Nếu dữ liệu bảng con trống hoặc không phải mảng, trả về 0
        if (!Array.isArray(tableData) || tableData.length === 0) {
          return '0';
        }

        let values: number[] = [];
        if (func.toUpperCase() === 'COUNT') {
          return tableData.length.toString();
        } else if (columnCode) {
          // Trích xuất các giá trị của cột được chỉ định từ tất cả các dòng
          values = tableData.map((row) => Number(row[columnCode]) || 0);
        } else {
          return '0';
        }

        // Tính tổng
        if (func.toUpperCase() === 'SUM') {
          const sum = values.reduce((a, b) => a + b, 0);
          return sum.toString();
        }

        // Tính trung bình
        if (func.toUpperCase() === 'AVG') {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          return avg.toString();
        }

        return '0';
      },
    );
  }

  public calculate(
    fields: FieldRegistry[],
    data: Record<string, any>,
  ): Record<string, any> {
    const calculatedData = { ...data };
    const formulaFields = fields.filter((f) => f.type === 'FORMULA');

    for (const field of formulaFields) {
      const config: any = field.config || {};
      const options: any = config.options || {};
      let expression = options.formula || config.formula;

      if (expression) {
        try {
          // 1. Tiền xử lý: Dịch các hàm mảng (SUM, COUNT) thành số cụ thể
          expression = this.preprocessRollups(expression, calculatedData);

          // 2. Tính toán: Giải quyết biểu thức toán học (+, -, *, /)
          const result = FormulaParser.evaluate(expression, calculatedData);
          calculatedData[field.code] = parseFloat(result.toFixed(4));
        } catch (error) {
          throw new BadRequestException(
            `Lỗi tính toán tại trường '${field.name}' (${field.code}): Cú pháp hoặc dữ liệu bị lỗi (${error.message})`,
          );
        }
      }
    }

    return calculatedData;
  }
}
