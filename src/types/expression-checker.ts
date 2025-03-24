export interface ExpressionTypeChecker {
    isInClause(expr: any): boolean;
    isBinaryExpr(expr: any): boolean;
    isFunction(expr: any): boolean;
    isCaseWhen(expr: any): boolean;
    isInterval(expr: any): boolean;
}

export class SQLExpressionTypeChecker implements ExpressionTypeChecker {
    isInClause(expr: any): boolean {
        return expr?.type === 'binary_expr' && 
               expr?.operator?.toUpperCase() === 'IN' &&
               expr?.right?.type === 'expr_list';
    }
    
    isBinaryExpr(expr: any): boolean {
        return expr?.type === 'binary_expr' &&
               expr?.operator?.toUpperCase() !== 'IN';
    }
    
    isFunction(expr: any): boolean {
        return expr?.type === 'function' || expr?.type === 'aggr_func';
    }

    isCaseWhen(expr: any): boolean {
        return expr?.type === 'case' || 
               (expr?.type === 'function' && expr?.args?.value?.[0]?.type === 'case') ||
               (expr?.type === 'aggr_func' && expr?.args?.expr?.type === 'case');
    }
    
    isInterval(expr: any): boolean {
        return expr?.type === 'interval';
    }
}