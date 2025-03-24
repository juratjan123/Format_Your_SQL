import { ExpressionContext } from '../types/expression-context';

export interface ExpressionFormatter {
    formatExpression(expr: any, context?: ExpressionContext): string;
    formatQuery(ast: any, level?: number): string;
    indent(level: number): string;
    getIndentSize(): number;
} 