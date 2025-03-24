import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';
import { QueryComplexityAnalyzer } from '../analyzers/query-complexity-analyzer';

export class SubqueryHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return this.isSubquery(expr);
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        // 检查是否是简单查询
        const isSimple = QueryComplexityAnalyzer.isSimpleQuery(expr.ast);
        
        // 创建子查询上下文
        const subqueryContext: ExpressionContext = {
            ...context,
            level: (context?.level || 1) + (isSimple ? 0 : 1),
            isSubquery: true
        };
        
        // 格式化子查询
        const formattedQuery = formatter.formatQuery(expr.ast, subqueryContext.level);
        
        // 根据查询复杂度决定格式化样式
        if (isSimple) {
            // 简单查询：单行样式
            return formattedQuery.replace(/\n\s*/g, ' ').trim();
        } else {
            // 复杂查询：多行样式
            const baseIndent = formatter.indent(context.level || 0);
            const innerIndent = formatter.indent(subqueryContext.level);
            
            // 处理多行格式，确保正确的缩进
            const lines = formattedQuery.split('\n').map(line => 
                line.trim() ? innerIndent + line.trim() : ''
            ).filter(line => line);
            
            return `(\n${lines.join('\n')}\n${baseIndent})`;
        }
    }
} 