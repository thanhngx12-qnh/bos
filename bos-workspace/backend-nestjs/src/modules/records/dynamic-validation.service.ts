// File: src/modules/records/dynamic-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { FieldRegistry } from '@prisma/client';
import { DynamicCondition } from '../fields/interfaces/field-options.interface';

@Injectable()
export class DynamicValidationService {
  private evaluateCondition(
    condition: DynamicCondition,
    inputData: any,
  ): boolean {
    if (!condition || !condition.field) return false;
    const actualValue = inputData[condition.field];
    const targetValue = condition.value;

    switch (condition.operator) {
      case '==':
        return actualValue === targetValue;
      case '!=':
        return actualValue !== targetValue;
      case '>':
        return Number(actualValue) > Number(targetValue);
      case '<':
        return Number(actualValue) < Number(targetValue);
      case '>=':
        return Number(actualValue) >= Number(targetValue);
      case '<=':
        return Number(actualValue) <= Number(targetValue);
      case 'IN':
        return Array.isArray(targetValue) && targetValue.includes(actualValue);
      case 'NOT_IN':
        return Array.isArray(targetValue) && !targetValue.includes(actualValue);
      default:
        return false;
    }
  }

  public validateAndSanitize(
    fields: FieldRegistry[],
    inputData: any,
  ): Record<string, any> {
    const sanitizedData: Record<string, any> = {};

    for (const field of fields) {
      const config: any = field.config || {};
      const options: any = config.options || {};
      let value = inputData[field.code];

      if (
        (value === undefined || value === null || value === '') &&
        options.defaultValue !== undefined
      ) {
        value = options.defaultValue;
      }

      let isFieldRequired = config.isRequired || false;
      if (!isFieldRequired && options.requiredIf) {
        isFieldRequired = this.evaluateCondition(options.requiredIf, inputData);
      }

      if (
        isFieldRequired &&
        (value === undefined || value === null || value === '')
      ) {
        throw new BadRequestException(
          `Trường '${field.name}' là bắt buộc nhập.`,
        );
      }

      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'NUMBER':
            const numVal = Number(value);
            if (isNaN(numVal))
              throw new BadRequestException(
                `Trường '${field.name}' phải là số.`,
              );
            if (options.min !== undefined && numVal < options.min)
              throw new BadRequestException(
                `'${field.name}' không được nhỏ hơn ${options.min}.`,
              );
            if (options.max !== undefined && numVal > options.max)
              throw new BadRequestException(
                `'${field.name}' không được lớn hơn ${options.max}.`,
              );
            if (options.allowDecimal === false && !Number.isInteger(numVal))
              throw new BadRequestException(
                `'${field.name}' phải là số nguyên.`,
              );
            sanitizedData[field.code] = numVal;
            break;

          case 'TEXT':
            const strVal = String(value);
            if (
              options.minLength !== undefined &&
              strVal.length < options.minLength
            )
              throw new BadRequestException(
                `'${field.name}' phải dài tối thiểu ${options.minLength} ký tự.`,
              );
            if (
              options.maxLength !== undefined &&
              strVal.length > options.maxLength
            )
              throw new BadRequestException(
                `'${field.name}' vượt quá giới hạn ${options.maxLength} ký tự.`,
              );
            if (options.regexPattern) {
              const regex = new RegExp(options.regexPattern);
              if (!regex.test(strVal))
                throw new BadRequestException(
                  options.errorMessage ||
                    `'${field.name}' không đúng định dạng.`,
                );
            }
            sanitizedData[field.code] = strVal;
            break;

          case 'SELECT':
            if (options.multiple) {
              if (!Array.isArray(value))
                throw new BadRequestException(
                  `'${field.name}' phải là một danh sách (mảng).`,
                );
              sanitizedData[field.code] = value;
            } else {
              sanitizedData[field.code] = String(value);
            }
            break;

          case 'DATE':
            const dateVal = new Date(value);
            if (isNaN(dateVal.getTime()))
              throw new BadRequestException(
                `'${field.name}' không phải là ngày hợp lệ.`,
              );

            if (
              options.minDate === 'today' &&
              dateVal < new Date(new Date().setHours(0, 0, 0, 0))
            ) {
              throw new BadRequestException(
                `'${field.name}' không được nằm trong quá khứ.`,
              );
            }
            sanitizedData[field.code] = dateVal.toISOString();
            break;

          // --- FIX LỖI TẠI ĐÂY: KHAI BÁO TYPE LOOKUP ---
          case 'LOOKUP':
            const lookupId = Number(value);
            if (isNaN(lookupId)) {
              throw new BadRequestException(
                `Trường '${field.name}' phải chứa ID của bản ghi liên kết hợp lệ.`,
              );
            }
            sanitizedData[field.code] = lookupId;
            break;

          default:
            sanitizedData[field.code] = value;
        }
      }
    }

    return sanitizedData;
  }
}
