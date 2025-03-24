export interface FlattenedCondition {
    operator: string;
    conditions: any[];
    level: number;
}

export class ConditionFlattener {
    flatten(expr: any, operator?: string): FlattenedCondition {
        const conditions: any[] = [];
        this.flattenRecursive(expr, conditions, operator);
        
        return {
            operator: operator || (expr.operator || '').toUpperCase(),
            conditions: conditions,
            level: 0
        };
    }
    
    private flattenRecursive(expr: any, conditions: any[], parentOperator?: string): void {
        if (!expr) return;
        
        const currentOperator = (expr.operator || '').toUpperCase();
        
        // 如果是二元表达式
        if (expr.type === 'binary_expr') {
            // 如果操作符与父级相同（AND-AND 或 OR-OR）
            if (currentOperator === parentOperator && 
                (currentOperator === 'AND' || currentOperator === 'OR')) {
                // 递归处理左右子树
                this.flattenRecursive(expr.left, conditions, currentOperator);
                this.flattenRecursive(expr.right, conditions, currentOperator);
            } else {
                // 如果是不同的操作符或非逻辑操作符，作为单独的条件
                conditions.push(expr);
            }
        } else {
            // 非二元表达式直接添加
            conditions.push(expr);
        }
    }
} 