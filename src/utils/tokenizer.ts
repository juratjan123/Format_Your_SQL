/**
 * SQL标记化工具
 * 将SQL语句转换为标记序列，用于比较格式化前后的SQL语句
 */

export interface SQLToken {
  type: 'keyword' | 'identifier' | 'operator' | 'literal' | 'comment' | 'delimiter' | 'other';
  value: string;
}

export class SQLTokenizer {
  // SQL关键词列表
  private static readonly KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER',
    'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'JOIN', 'ON', 'AS',
    'UNION', 'ALL', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
    'DELETE', 'CREATE', 'TABLE', 'VIEW', 'INDEX', 'DROP', 'ALTER',
    'ADD', 'COLUMN', 'CONSTRAINT', 'PRIMARY', 'KEY', 'FOREIGN',
    'REFERENCES', 'UNIQUE', 'NOT', 'NULL', 'DEFAULT', 'CASE',
    'WHEN', 'THEN', 'ELSE', 'END', 'AND', 'OR', 'IN', 'EXISTS',
    'BETWEEN', 'LIKE', 'IS', 'TRUE', 'FALSE', 'DESC', 'ASC',
    'WITH', 'DISTINCT', 'TOP', 'LIMIT', 'OFFSET', 'OVER', 'PARTITION',
    'ROWS', 'RANGE', 'UNBOUNDED', 'PRECEDING', 'FOLLOWING',
    'CURRENT', 'ROW', 'IF', 'FUNCTION', 'PROCEDURE', 'TRIGGER', 'DATABASE'
  ];

  // 操作符列表
  private static readonly OPERATORS = [
    '=', '<', '>', '<=', '>=', '<>', '!=', '+', '-', '*', '/',
    '%', '^', '&', '|', '~', '!', '(', ')', '[', ']', ',', ';',
    '.'
  ];

  /**
   * 将SQL语句转换为标记序列
   * @param sql SQL语句
   * @returns 标记序列
   */
  public static tokenize(sql: string): SQLToken[] {
    if (!sql) {
      return [];
    }

    const tokens: SQLToken[] = [];
    let position = 0;
    const sqlLength = sql.length;

    while (position < sqlLength) {
      let char = sql[position];

      // 跳过空白字符
      if (this.isWhitespace(char)) {
        position++;
        continue;
      }

      // 处理注释
      if (char === '-' && position + 1 < sqlLength && sql[position + 1] === '-') {
        const comment = this.extractLineComment(sql, position);
        tokens.push({ type: 'comment', value: comment.value });
        position = comment.nextPosition;
        continue;
      }

      if (char === '/' && position + 1 < sqlLength && sql[position + 1] === '*') {
        const comment = this.extractBlockComment(sql, position);
        tokens.push({ type: 'comment', value: comment.value });
        position = comment.nextPosition;
        continue;
      }

      // 处理字符串字面量
      if (char === "'" || char === '"') {
        const literal = this.extractStringLiteral(sql, position, char);
        tokens.push({ type: 'literal', value: literal.value });
        position = literal.nextPosition;
        continue;
      }

      // 处理数字字面量
      if (this.isDigit(char)) {
        const literal = this.extractNumberLiteral(sql, position);
        tokens.push({ type: 'literal', value: literal.value });
        position = literal.nextPosition;
        continue;
      }

      // 处理标识符
      if (this.isIdentifierStart(char)) {
        const identifier = this.extractIdentifier(sql, position);
        const uppercaseValue = identifier.value.toUpperCase();
        
        // 检查是否是关键词
        if (this.KEYWORDS.includes(uppercaseValue)) {
          tokens.push({ type: 'keyword', value: uppercaseValue });
        } else {
          tokens.push({ type: 'identifier', value: identifier.value });
        }
        
        position = identifier.nextPosition;
        continue;
      }

      // 处理操作符和分隔符
      if (this.isOperatorChar(char)) {
        const operator = this.extractOperator(sql, position);
        tokens.push({ type: 'operator', value: operator.value });
        position = operator.nextPosition;
        continue;
      }

      // 处理其他字符
      tokens.push({ type: 'other', value: char });
      position++;
    }

    return tokens;
  }

  /**
   * 提取行注释 (-- 注释)
   */
  private static extractLineComment(sql: string, position: number): { value: string, nextPosition: number } {
    let start = position;
    position += 2; // 跳过 '--'
    
    while (position < sql.length && sql[position] !== '\n') {
      position++;
    }
    
    return {
      value: sql.substring(start, position),
      nextPosition: position + 1 // 跳过换行符
    };
  }

  /**
   * 提取块注释 (/* 注释 *\/)
   */
  private static extractBlockComment(sql: string, position: number): { value: string, nextPosition: number } {
    let start = position;
    position += 2; // 跳过 '/*'
    
    while (position + 1 < sql.length && !(sql[position] === '*' && sql[position + 1] === '/')) {
      position++;
    }
    
    if (position + 1 < sql.length) {
      position += 2; // 跳过 '*/'
    }
    
    return {
      value: sql.substring(start, position),
      nextPosition: position
    };
  }

  /**
   * 提取字符串字面量
   */
  private static extractStringLiteral(sql: string, position: number, quote: string): { value: string, nextPosition: number } {
    let start = position;
    position++; // 跳过引号
    
    while (position < sql.length) {
      if (sql[position] === quote) {
        // 检查是否是转义的引号
        if (position + 1 < sql.length && sql[position + 1] === quote) {
          position += 2; // 跳过转义的引号
        } else {
          position++; // 跳过结束引号
          break;
        }
      } else {
        position++;
      }
    }
    
    return {
      value: sql.substring(start, position),
      nextPosition: position
    };
  }

  /**
   * 提取数字字面量
   */
  private static extractNumberLiteral(sql: string, position: number): { value: string, nextPosition: number } {
    let start = position;
    
    // 处理整数部分
    while (position < sql.length && this.isDigit(sql[position])) {
      position++;
    }
    
    // 处理小数点和小数部分
    if (position < sql.length && sql[position] === '.') {
      position++;
      while (position < sql.length && this.isDigit(sql[position])) {
        position++;
      }
    }
    
    // 处理科学计数法
    if (position < sql.length && (sql[position] === 'e' || sql[position] === 'E')) {
      position++;
      
      // 可选的符号
      if (position < sql.length && (sql[position] === '+' || sql[position] === '-')) {
        position++;
      }
      
      // 指数部分
      while (position < sql.length && this.isDigit(sql[position])) {
        position++;
      }
    }
    
    return {
      value: sql.substring(start, position),
      nextPosition: position
    };
  }

  /**
   * 提取标识符
   */
  private static extractIdentifier(sql: string, position: number): { value: string, nextPosition: number } {
    let start = position;
    
    // 处理引用标识符 (使用 [] 或 ``)
    if (sql[position] === '[' || sql[position] === '`') {
      const quoteChar = sql[position] === '[' ? ']' : '`';
      position++; // 跳过开始引号
      
      while (position < sql.length && sql[position] !== quoteChar) {
        position++;
      }
      
      if (position < sql.length) {
        position++; // 跳过结束引号
      }
      
      return {
        value: sql.substring(start, position),
        nextPosition: position
      };
    }
    
    // 处理普通标识符
    while (position < sql.length && this.isIdentifierPart(sql[position])) {
      position++;
    }
    
    return {
      value: sql.substring(start, position),
      nextPosition: position
    };
  }

  /**
   * 提取操作符
   */
  private static extractOperator(sql: string, position: number): { value: string, nextPosition: number } {
    let start = position;
    let char = sql[position];
    
    // 检查是否是多字符操作符
    if (position + 1 < sql.length) {
      const twoChars = char + sql[position + 1];
      if (twoChars === '<=' || twoChars === '>=' || twoChars === '<>' || twoChars === '!=') {
        return {
          value: twoChars,
          nextPosition: position + 2
        };
      }
    }
    
    // 单字符操作符
    return {
      value: char,
      nextPosition: position + 1
    };
  }

  // 辅助方法
  private static isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private static isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  private static isIdentifierStart(char: string): boolean {
    return /[a-zA-Z_\[\`]/.test(char);
  }

  private static isIdentifierPart(char: string): boolean {
    return /[a-zA-Z0-9_\.]/.test(char);
  }

  private static isOperatorChar(char: string): boolean {
    return this.OPERATORS.some(op => op[0] === char);
  }
} 