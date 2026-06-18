// File: src/modules/records/formula-parser.util.tsw

export class FormulaParser {
  private static readonly precedence: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
  };

  private static tokenize(expression: string): string[] {
    return (
      expression
        .replace(/\s+/g, '')
        .match(/([0-9]+(?:\.[0-9]+)?|[a-z_][a-z0-9_]*|[\+\-\*\/\(\)])/gi) || []
    );
  }

  private static infixToPostfix(tokens: string[]): string[] {
    const output: string[] = [];
    const operators: string[] = [];

    for (const token of tokens) {
      if (
        /^[0-9]+(?:\.[0-9]+)?$/.test(token) ||
        /^[a-z_][a-z0-9_]*$/i.test(token)
      ) {
        output.push(token);
      } else if (token === '(') {
        operators.push(token);
      } else if (token === ')') {
        while (
          operators.length > 0 &&
          operators[operators.length - 1] !== '('
        ) {
          output.push(operators.pop()!);
        }
        operators.pop();
      } else if (this.precedence[token]) {
        while (
          operators.length > 0 &&
          this.precedence[operators[operators.length - 1]] >=
            this.precedence[token]
        ) {
          output.push(operators.pop()!);
        }
        operators.push(token);
      }
    }

    while (operators.length > 0) {
      output.push(operators.pop()!);
    }

    return output;
  }

  public static evaluate(
    expression: string,
    context: Record<string, any>,
  ): number {
    const tokens = this.tokenize(expression);
    const postfix = this.infixToPostfix(tokens);
    const stack: number[] = [];

    for (const token of postfix) {
      if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
        stack.push(Number(token));
      } else if (/^[a-z_][a-z0-9_]*$/i.test(token)) {
        const rawVal = context[token];
        let val = 0;

        if (rawVal !== undefined && rawVal !== null) {
          if (
            typeof rawVal === 'string' &&
            !isNaN(Date.parse(rawVal)) &&
            isNaN(Number(rawVal))
          ) {
            val = Date.parse(rawVal);
          } else {
            val = Number(rawVal || 0);
          }
        }
        stack.push(val);
      } else if (this.precedence[token]) {
        const b = stack.pop();
        const a = stack.pop();

        if (a === undefined || b === undefined) {
          throw new Error('Cú pháp công thức không hợp lệ.');
        }

        switch (token) {
          case '+':
            stack.push(a + b);
            break;
          case '-':
            stack.push(a - b);
            break;
          case '*':
            stack.push(a * b);
            break;
          case '/':
            if (b === 0) throw new Error('Lỗi chia cho 0.');
            stack.push(a / b);
            break;
        }
      }
    }

    if (stack.length !== 1) {
      throw new Error('Cú pháp công thức không hợp lệ.');
    }

    return stack[0];
  }
}
