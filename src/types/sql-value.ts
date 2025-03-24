export type SQLDataType = 
  | 'NULL'
  | 'BOOLEAN'
  | 'NUMBER'
  | 'STRING'
  | 'DATE'
  | 'TIMESTAMP'
  | 'ARRAY'
  | 'OBJECT';

export type SQLValueType = 
  | 'number' 
  | 'single_quote_string' 
  | 'double_quote_string'
  | 'column_ref'
  | 'function'
  | 'subquery'
  | 'bool'    // 添加bool类型
  | 'simple'  // 保持向后兼容
  | 'expression'  // 添加expression类型
  | 'literal';   // 新增literal类型

export type SQLLiteralType = 'string' | 'number' | 'boolean' | 'null';
export type SQLQuoteStyle = 'single' | 'double' | 'none';

export interface SQLValue {
    type: SQLValueType;
    dataType?: SQLDataType;  // 可选，用于新系统
    value?: any;
    ast?: any;
}

export interface SQLLiteralValue extends SQLValue {
    type: 'literal';
    literalType: SQLLiteralType;
    quoteStyle?: SQLQuoteStyle;
    originalValue: any;
    originalType?: string;
}

export interface SQLValueFormatter {
    formatValue(value: SQLValue): string;
}

// 新增的接口
export interface SQLValueConverter {
    canConvert(value: any): boolean;
    convert(value: any): SQLValue;
}

export interface InClauseExpression {
    type: 'binary_expr';
    operator: 'IN' | 'NOT IN';
    left: any;
    right: {
        type: 'expr_list';
        value: SQLValue[];
    };
} 