// File: src/modules/records/formula-engine.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { FieldDefinition } from '@prisma/client';
import { FormulaParser } from './formula-parser.util';

@Injectable()
export class FormulaEngineService {
  // Quét qua danh sách trường và tự động tính toán các trường công thức
  public calculate(
    fields: FieldDefinition[],
    data: Record<string, any>,
  ): Record<string, any> {
    const calculatedData = { ...data };

    // Lọc ra các trường có kiểu dữ liệu là FORMULA
    const formulaFields = fields.filter((f) => f.type === 'FORMULA');

    for (const field of formulaFields) {
      const options: any = field.options || {};
      const expression = options.formula; // Cấu hình công thức từ Admin (VD: "total_amount * 0.1")

      if (expression) {
        try {
          const result = FormulaParser.evaluate(expression, calculatedData);
          // Làm tròn kết quả 4 chữ số thập phân để đảm bảo độ chính xác tài chính
          calculatedData[field.code] = parseFloat(result.toFixed(4));
        } catch (error) {
          throw new BadRequestException(
            `Lỗi tính toán tại trường '${field.name}' (${field.code}): ${error.message}`,
          );
        }
      }
    }

    return calculatedData;
  }
}
