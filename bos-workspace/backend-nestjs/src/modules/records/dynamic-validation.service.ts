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

      const isEmpty =
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' &&
          Object.keys(value).length === 0 &&
          !(value instanceof Date));

      if (isFieldRequired && isEmpty) {
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

          case 'EMAIL':
            const emailVal = String(value);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailVal)) {
              throw new BadRequestException(
                `Trường '${field.name}' không đúng định dạng email (VD: user@example.com).`,
              );
            }
            if (options.regexPattern) {
              try {
                const regex = new RegExp(options.regexPattern);
                if (!regex.test(emailVal)) {
                  throw new BadRequestException(
                    options.errorMessage || `Trường '${field.name}' không đúng định dạng.`,
                  );
                }
              } catch (e) {
                // ignore
              }
            }
            sanitizedData[field.code] = emailVal;
            break;

          case 'PHONE':
            const phoneVal = String(value);
            if (!options.regexPattern) {
              const phoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
              if (!phoneRegex.test(phoneVal)) {
                throw new BadRequestException(
                  options.errorMessage || `Trường '${field.name}' không đúng định dạng số điện thoại Việt Nam (VD: 0901234567).`,
                );
              }
            } else {
              try {
                const regex = new RegExp(options.regexPattern);
                if (!regex.test(phoneVal)) {
                  throw new BadRequestException(
                    options.errorMessage || `Trường '${field.name}' không đúng định dạng.`,
                  );
                }
              } catch (e) {
                // ignore
              }
            }
            sanitizedData[field.code] = phoneVal;
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

          case 'DATETIME':
            const dtVal = new Date(value);
            if (isNaN(dtVal.getTime()))
              throw new BadRequestException(
                `'${field.name}' không phải là ngày giờ hợp lệ.`,
              );
            sanitizedData[field.code] = dtVal.toISOString();
            break;

          case 'TIME':
            if (typeof value === 'string') {
              const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
              const isIso = !isNaN(new Date(value).getTime());
              if (!timeRegex.test(value) && !isIso) {
                throw new BadRequestException(
                  `'${field.name}' không phải là giờ hợp lệ (định dạng HH:mm hoặc ISO).`,
                );
              }
            }
            sanitizedData[field.code] = value;
            break;

          case 'MONTH_YEAR':
            if (typeof value === 'string') {
              const myRegex = /^\d{4}-\d{2}$/;
              const isIso = !isNaN(new Date(value).getTime());
              if (!myRegex.test(value) && !isIso) {
                throw new BadRequestException(
                  `'${field.name}' không phải là tháng năm hợp lệ (định dạng YYYY-MM hoặc ISO).`,
                );
              }
            }
            sanitizedData[field.code] = value;
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
