import { BaseHandler } from './base-handler';
import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';

export class UnionSubqueryHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return expr.expr && 
               expr.expr.ast && 
               expr.expr.ast._next && 
               expr.expr.ast.set_op === 'union all';
    }

    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        // 保持原有逻辑不变
        const originalResult = this.formatFromItem(expr, formatter, context);
        
        // 如果结果包含undefined，使用补充逻辑
        if (originalResult.includes('undefined')) {
            return this.handleUnionSubquery(expr, formatter, context);
        }
        
        return originalResult;
    }

    private formatFromItem(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        if (expr.db) {
            return `${expr.db}.${expr.table}${expr.as ? ` ${expr.as}` : ''}`;
        }
        return `${expr.table || ''}${expr.as ? ` ${expr.as}` : ''}`;
    }

    private handleUnionSubquery(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        // 从tableList中获取实际的表信息
        if (expr.expr.tableList && expr.expr.tableList.length > 0) {
            const subqueryContent = this.formatUnionSubquery(expr.expr.ast, formatter, context);
            return `(\n${subqueryContent}\n)${expr.as ? ` ${expr.as}` : ''}`;
        }
        
        // 如果无法处理，返回原始结果
        return this.formatFromItem(expr, formatter, context);
    }

    private formatUnionSubquery(ast: any, formatter: SQLFormatter, context: ExpressionContext): string {
        if (Array.isArray(ast)) {
            return ast.map(subAst => this.formatSingleQuery(subAst, formatter, context)).join('\n');
        }
        return this.formatSingleQuery(ast, formatter, context);
    }

    private formatSingleQuery(ast: any, formatter: SQLFormatter, context: ExpressionContext): string {
        const query = formatter.formatQuery(ast);
        if (ast._next && ast.set_op) {
            return query + '\n' + formatter.indent(context.level || 1) + ast.set_op.toUpperCase();
        }
        return query;
    }
} 