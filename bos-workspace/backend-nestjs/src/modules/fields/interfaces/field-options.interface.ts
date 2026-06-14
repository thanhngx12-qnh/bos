// File: src/modules/fields/interfaces/field-options.interface.ts

// --- LOGIC ĐỘNG (DYNAMIC LOGIC) ---
export interface DynamicCondition {
  field: string; // Mã code của trường làm điều kiện (VD: 'total_amount')
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'NOT_IN';
  value: any; // Giá trị so sánh
}

// --- CẤU HÌNH CHUNG MỌI LOẠI TRƯỜNG ---
export interface BaseFieldOptions {
  defaultValue?: any;
  placeholder?: string;
  tooltip?: string;
  showIf?: DynamicCondition;
  requiredIf?: DynamicCondition;
}

// --- CẤU HÌNH ĐẶC THÙ: TEXT ---
export interface TextFieldOptions extends BaseFieldOptions {
  minLength?: number;
  maxLength?: number;
  regexPattern?: string; // VD: "^[a-zA-Z0-9]+$"
  errorMessage?: string; // Lời nhắn khi regex sai
}

// --- CẤU HÌNH ĐẶC THÙ: NUMBER ---
export interface NumberFieldOptions extends BaseFieldOptions {
  min?: number;
  max?: number;
  allowDecimal?: boolean;
  decimalPlaces?: number;
  prefix?: string; // VD: "VNĐ"
}

// --- CẤU HÌNH ĐẶC THÙ: SELECT ---
export interface SelectOptionItem {
  label: string;
  value: string | number;
}

export interface SelectFieldOptions extends BaseFieldOptions {
  multiple?: boolean;
  optionsList?: SelectOptionItem[];
}

// --- CẤU HÌNH ĐẶC THÙ: DATE ---
export interface DateFieldOptions extends BaseFieldOptions {
  format?: string; // VD: "YYYY-MM-DD"
  minDate?: string; // Có thể là chuỗi ISO hoặc từ khóa "today"
  maxDate?: string;
}

// --- GỘP CHUNG (UNION TYPE) ---
export type FieldOptions =
  | TextFieldOptions
  | NumberFieldOptions
  | SelectFieldOptions
  | DateFieldOptions
  | Record<string, any>;
