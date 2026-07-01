// File: src/modules/records/formula-parser.util.ts

export class FormulaParser {
  public static evaluate(
    expression: string,
    context: Record<string, any>,
  ): number {
    try {
      const parser = new ExpressionParser(expression, context);
      return parser.parse();
    } catch (e) {
      throw new Error(`Lỗi parse công thức: ${e.message}`);
    }
  }
}

class ExpressionParser {
  private tokens: string[];
  private pos = 0;
  private context: Record<string, any>;

  constructor(expression: string, context: Record<string, any>) {
    // Tokenize: match numbers, words, comparison operators, logical operators, single character operators
    this.tokens =
      expression
        .replace(/\s+/g, '')
        .match(/([0-9]+(?:\.[0-9]+)?|[a-zA-Z_][a-zA-Z0-9_]*|>=|<=|==|!=|&&|\|\||[+\-*/(),<>!])/g) || [];
    this.context = context;
  }

  private peek(): string {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : '';
  }

  private consume(expected?: string): string {
    const token = this.peek();
    if (expected !== undefined && token !== expected) {
      throw new Error(`Expected '${expected}' but got '${token}'`);
    }
    this.pos++;
    return token;
  }

  public parse(): number {
    const val = this.logicalOr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token '${this.tokens[this.pos]}'`);
    }
    return val;
  }

  private logicalOr(): number {
    let left = this.logicalAnd();
    while (this.peek() === '||') {
      this.consume();
      const right = this.logicalAnd();
      left = left !== 0 || right !== 0 ? 1 : 0;
    }
    return left;
  }

  private logicalAnd(): number {
    let left = this.comparison();
    while (this.peek() === '&&') {
      this.consume();
      const right = this.comparison();
      left = left !== 0 && right !== 0 ? 1 : 0;
    }
    return left;
  }

  private comparison(): number {
    let left = this.additive();
    const op = this.peek();
    if (
      op === '>' ||
      op === '<' ||
      op === '>=' ||
      op === '<=' ||
      op === '==' ||
      op === '!='
    ) {
      this.consume();
      const right = this.additive();
      switch (op) {
        case '>':
          left = left > right ? 1 : 0;
          break;
        case '<':
          left = left < right ? 1 : 0;
          break;
        case '>=':
          left = left >= right ? 1 : 0;
          break;
        case '<=':
          left = left <= right ? 1 : 0;
          break;
        case '==':
          left = left === right ? 1 : 0;
          break;
        case '!=':
          left = left !== right ? 1 : 0;
          break;
      }
    }
    return left;
  }

  private additive(): number {
    let left = this.multiplicative();
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.consume();
      const right = this.multiplicative();
      if (op === '+') left += right;
      else left -= right;
    }
    return left;
  }

  private multiplicative(): number {
    let left = this.unary();
    while (this.peek() === '*' || this.peek() === '/') {
      const op = this.consume();
      const right = this.unary();
      if (op === '*') {
        left *= right;
      } else {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      }
    }
    return left;
  }

  private unary(): number {
    const op = this.peek();
    if (op === '-' || op === '!') {
      this.consume();
      const val = this.unary();
      return op === '-' ? -val : val === 0 ? 1 : 0;
    }
    return this.primary();
  }

  private primary(): number {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of expression');

    if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
      this.consume();
      return Number(token);
    }

    if (token === '(') {
      this.consume();
      const val = this.logicalOr();
      this.consume(')');
      return val;
    }

    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/i.test(token)) {
      if (token.toUpperCase() === 'IF') {
        this.consume();
        this.consume('(');
        const cond = this.logicalOr();
        this.consume(',');
        const thenVal = this.logicalOr();
        this.consume(',');
        const elseVal = this.logicalOr();
        this.consume(')');
        return cond !== 0 ? thenVal : elseVal;
      }

      this.consume();
      const rawVal = this.context[token];
      if (rawVal === undefined || rawVal === null) return 0;

      // Auto-parse date-time strings to timestamp milliseconds
      if (
        typeof rawVal === 'string' &&
        !isNaN(Date.parse(rawVal)) &&
        isNaN(Number(rawVal))
      ) {
        return Date.parse(rawVal);
      }
      return Number(rawVal) || 0;
    }

    throw new Error(`Unexpected token '${token}'`);
  }
}
