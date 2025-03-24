export interface SQLFormatterInterface {
    formatQuery(ast: any, level?: number): string;
    indent(level: number): string;
    formatExpression(expr: any, context?: any): string;
    formatBinaryExpr(expr: any): string;
} 