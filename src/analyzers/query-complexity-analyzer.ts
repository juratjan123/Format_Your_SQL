/**
 * 查询复杂度分析器
 * 用于分析SQL查询的复杂度，决定格式化策略
 */
export class QueryComplexityAnalyzer {
    /**
     * 判断查询是否为简单查询
     * 简单查询的定义：
     * 1. 只包含 SELECT 和 FROM
     * 2. 没有 WHERE, GROUP BY, HAVING, ORDER BY 等子句
     * 3. 没有子查询
     * 4. 没有 JOIN
     * 5. 没有复杂函数调用
     */
    static isSimpleQuery(ast: any): boolean {
        // 基本条件检查
        if (!ast || ast.type !== 'select') return false;
        
        // 检查是否只有基本子句
        if (ast.where || ast.groupby || ast.having || 
            ast.orderby || ast.limit || ast.with) {
            return false;
        }
        
        // 检查FROM子句
        if (!ast.from || ast.from.length !== 1 || ast.from[0].join) {
            return false;
        }
        
        // 检查SELECT列表的复杂度
        return this.isSimpleColumns(ast.columns);
    }
    
    /**
     * 检查SELECT列表是否简单
     * 简单的定义：
     * 1. 只包含列引用
     * 2. 没有复杂函数调用
     * 3. 没有子查询
     */
    private static isSimpleColumns(columns: any[]): boolean {
        if (!columns || !Array.isArray(columns)) return false;
        
        return columns.every(col => {
            if (!col.expr) return false;
            
            // 检查表达式类型
            switch (col.expr.type) {
                case 'column_ref':
                    return true;
                case 'string':
                case 'number':
                    return true;
                default:
                    return false;
            }
        });
    }
    
    /**
     * 获取查询的缩进级别
     * 基于查询的复杂度决定缩进策略
     */
    static getQueryIndentLevel(ast: any): number {
        let level = 0;
        
        // 有WITH子句增加缩进
        if (ast.with) level++;
        
        // 有复杂WHERE子句增加缩进
        if (ast.where && this.isComplexWhere(ast.where)) level++;
        
        // 有GROUP BY, HAVING, ORDER BY等子句增加缩进
        if (ast.groupby || ast.having || ast.orderby) level++;
        
        return level;
    }
    
    /**
     * 判断WHERE子句是否复杂
     */
    private static isComplexWhere(where: any): boolean {
        if (!where) return false;
        
        // 检查是否包含AND/OR链
        if (where.type === 'binary_expr' && 
            (where.operator === 'AND' || where.operator === 'OR')) {
            return true;
        }
        
        // 检查是否包含子查询
        if (where.type === 'binary_expr' && where.operator === 'IN') {
            return where.right?.value?.[0]?.ast !== undefined;
        }
        
        return false;
    }
} 