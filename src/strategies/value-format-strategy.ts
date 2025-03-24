import { SQLValue, SQLValueFormatter } from '../types/sql-value';

export class SQLValueFormatStrategy implements SQLValueFormatter {
    formatValue(value: SQLValue): string {
        if (!value) {
            return '';
        }

        try {
            switch (value.type) {
                case 'number':
                    return value.value?.toString() || '0';
                case 'single_quote_string':
                    return `'${value.value}'`;
                case 'double_quote_string':
                    return `"${value.value}"`;
                case 'column_ref':
                    return value.value?.toString() || '';
                case 'function':
                    // 函数调用保持原样
                    return value.value?.toString() || '';
                case 'subquery':
                    // 子查询由其他处理器处理
                    return value.value?.toString() || '';
                case 'simple':
                    // 向后兼容的处理
                    return value.value?.toString() || '';
                default:
                    console.warn(`Unknown value type: ${(value as any).type}`);
                    return value.value?.toString() || '';
            }
        } catch (error) {
            console.error('Error in SQLValueFormatStrategy:', error);
            // 出错时返回原始值的字符串形式，保证程序不会崩溃
            return value.value?.toString() || '';
        }
    }
} 