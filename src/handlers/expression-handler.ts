import { SQLFormatter } from '../formatter';
import { ExpressionTypeChecker } from '../types/expression-checker';
import { ExpressionContext } from '../types/expression-context';

export interface ExpressionHandler {
    canHandle(expr: any): boolean;
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string;
}

export class InClauseHandler implements ExpressionHandler {
    private typeChecker: ExpressionTypeChecker;
    
    constructor(typeChecker: ExpressionTypeChecker) {
        this.typeChecker = typeChecker;
    }
    
    canHandle(expr: any): boolean {
        return this.typeChecker.isInClause(expr);
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            const left = formatter.formatExpression(expr.left, context);
            const values = expr.right.value.map((val: any) => {
                if (val.type === 'number') {
                    return val.value;
                }
                return formatter.formatExpression(val, context);
            });
            
            const valuesStr = values.join(', ');
            if (valuesStr.length > 50) {
                return `${left} IN (\n${formatter.indent(context.level + 1)}${values.join(', ')}\n${formatter.indent(context.level)})`;
            }
            
            return `${left} IN (${valuesStr})`;
        } catch (error) {
            console.error('Error in InClauseHandler:', error);
            // 出错时返回原始格式化方法的结果，确保向后兼容
            return formatter.formatBinaryExpr(expr);
        }
    }
} 