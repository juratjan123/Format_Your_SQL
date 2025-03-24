import { SQLValue, SQLValueConverter, SQLValueFormatter, SQLDataType, SQLLiteralValue, SQLLiteralType, SQLQuoteStyle } from '../types/sql-value';
import { ValueConversionContext } from '../types/expression-context';

// 表达式值类型扩展
interface SQLExpressionValue extends SQLValue {
    type: 'expression';
    expressionType: 'binary' | 'unary' | 'function' | 'compound' | 'column_ref';
    complexity: number;
}

// 表达式复杂度评估器
class ExpressionComplexityEvaluator {
    evaluate(expr: any): number {
        if (!expr) {return 0;}
        let complexity = 1;
        
        // 二元表达式增加复杂度
        if (expr.type === 'binary_expr') {
            complexity += this.evaluate(expr.left) + this.evaluate(expr.right);
        }
        
        // 函数调用增加复杂度
        if (expr.type === 'function') {
            complexity += (expr.args?.value?.length || 0);
        }
        
        return complexity;
    }

    getExpressionType(expr: any): 'binary' | 'unary' | 'function' | 'compound' {
        if (expr.type === 'binary_expr') {return 'binary';}
        if (expr.type === 'unary_expr') {return 'unary';}
        if (expr.type === 'function') {return 'function';}
        return 'compound';
    }
}

// 字面量处理器
class LiteralProcessor {
    isLiteral(value: any): boolean {
        return value?.type === 'single_quote_string' ||
               value?.type === 'double_quote_string' ||
               value?.type === 'number' ||
               value?.type === 'bool' ||
               value?.type === 'null';
    }
    
    isLiteralValue(value: SQLValue): boolean {
        return value?.type === 'literal';
    }
    
    processLiteral(value: any, context?: ValueConversionContext): SQLLiteralValue {
        const literalType = this.getLiteralType(value);
        const quoteStyle = this.getQuoteStyle(value);
        
        return {
            type: 'literal',
            literalType,
            quoteStyle,
            originalValue: value.value,
            originalType: value.type
        };
    }
    
    formatLiteral(value: SQLLiteralValue): string {
        switch (value.literalType) {
            case 'string':
                const quote = value.quoteStyle === 'single' ? "'" : '"';
                return `${quote}${value.originalValue}${quote}`;
            case 'number':
                return value.originalValue.toString();
            case 'boolean':
                return value.originalValue.toString().toUpperCase();
            case 'null':
                return 'NULL';
            default:
                return value.originalValue?.toString() || '';
        }
    }
    
    private getLiteralType(value: any): SQLLiteralType {
        if (value.type.includes('string')) {return 'string';}
        if (value.type === 'number') {return 'number';}
        if (value.type === 'bool') {return 'boolean';}
        if (value.type === 'null') {return 'null';}
        throw new Error(`Unknown literal type: ${value.type}`);
    }
    
    private getQuoteStyle(value: any): SQLQuoteStyle {
        if (value.type === 'single_quote_string') {return 'single';}
        if (value.type === 'double_quote_string') {return 'double';}
        return 'none';
    }
}

// 布尔值转换器
export class BooleanValueConverter implements SQLValueConverter {
    canConvert(value: any): boolean {
        return value?.type === 'bool' || typeof value?.value === 'boolean';
    }

    convert(value: any): SQLValue {
        return {
            type: 'bool',
            dataType: 'BOOLEAN',
            value: typeof value === 'boolean' ? value : value.value
        };
    }
}

// 布尔值格式化器
export class BooleanValueFormatter implements SQLValueFormatter {
    formatValue(value: SQLValue): string {
        if (value.type !== 'bool' || typeof value.value !== 'boolean') {
            throw new Error('Invalid boolean value');
        }
        return value.value.toString().toUpperCase();
    }
}

// 值系统管理器
export class SQLValueSystem {
    private converters: SQLValueConverter[] = [];
    private formatters: Map<string, SQLValueFormatter> = new Map();
    private expressionEvaluator: ExpressionComplexityEvaluator;
    private literalProcessor: LiteralProcessor;

    constructor() {
        // 注册默认转换器和格式化器
        this.registerConverter(new BooleanValueConverter());
        this.registerFormatter('bool', new BooleanValueFormatter());
        this.expressionEvaluator = new ExpressionComplexityEvaluator();
        this.literalProcessor = new LiteralProcessor();
    }

    registerConverter(converter: SQLValueConverter) {
        this.converters.push(converter);
    }

    registerFormatter(type: string, formatter: SQLValueFormatter) {
        this.formatters.set(type, formatter);
    }

    convert(value: any, context?: ValueConversionContext): SQLValue {
        // 1. 首先检查是否是字面量
        if (this.literalProcessor.isLiteral(value)) {
            return this.literalProcessor.processLiteral(value, context);
        }
        
        // 2. 特殊上下文处理
        if (context?.parentClause === 'CASE_WHEN' && context?.role === 'RESULT') {
            // 保持列引用的原始形式
            if (value?.type === 'column_ref') {
                return {
                    type: 'expression',
                    expressionType: 'column_ref',
                    complexity: 1,
                    value: value
                } as SQLExpressionValue;
            }
            
            // 处理字符串字面量
            if (value?.type === 'single_quote_string' || 
                value?.type === 'double_quote_string') {
                return this.literalProcessor.processLiteral(value, context);
            }
        }

        // 3. 评估表达式复杂度
        const complexity = this.expressionEvaluator.evaluate(value);
        
        // 4. 如果复杂度超过阈值，返回表达式值
        if (complexity > 2) {
            return {
                type: 'expression',
                expressionType: this.expressionEvaluator.getExpressionType(value),
                complexity,
                value: value
            } as SQLExpressionValue;
        }

        // 5. 如果已经是SQLValue类型，直接返回
        if (value?.type && typeof value.type === 'string') {
            return value as SQLValue;
        }

        // 6. 查找合适的转换器
        const converter = this.converters.find(c => c.canConvert(value));
        if (converter) {
            return converter.convert(value);
        }

        // 7. 如果没有找到转换器，返回原始值
        return value;
    }

    format(value: SQLValue): string {
        try {
            // 1. 处理字面量
            if (this.literalProcessor.isLiteralValue(value)) {
                return this.literalProcessor.formatLiteral(value as SQLLiteralValue);
            }
            
            // 2. 对于表达式类型，保持原始值
            if (value.type === 'expression') {
                return value.value?.toString() || '';
            }

            // 3. 使用注册的格式化器
            const formatter = this.formatters.get(value.type);
            if (formatter) {
                return formatter.formatValue(value);
            }

            // 4. 处理字符串字面量
            if (value.type === 'single_quote_string') {
                return `'${value.value}'`;
            }
            if (value.type === 'double_quote_string') {
                return `"${value.value}"`;
            }
        } catch (error: any) {
            console.warn(`Error formatting value: ${error.message}`);
        }
        
        // 5. 降级处理：返回原始值的字符串表示
        return value.value?.toString() || '';
    }
} 