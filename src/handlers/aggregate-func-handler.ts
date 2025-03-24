import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';

export class AggregateFuncHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return expr?.type === 'aggr_func';
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            const funcName = expr.name.toUpperCase();
            // 创建新的上下文，保持isInFunction标记
            const newContext: ExpressionContext = {
                ...context,
                isInFunction: true,  // 确保在聚合函数内部
                level: context.level
            };
            
            // 处理 DISTINCT 关键字
            const distinct = expr.args.distinct ? 'DISTINCT ' : '';
            
            // 处理函数参数
            const args = expr.args.expr ? 
                formatter.formatExpression(expr.args.expr, newContext) :
                '';
            
            // 处理OVER子句
            const over = this.formatOverClause(expr.over, formatter, newContext);
            
            return `${funcName}(${distinct}${args})${over}`;
        } catch (error) {
            console.error('Error in AggregateFuncHandler:', error);
            return expr.value || '';
        }
    }
    
    private formatOverClause(over: any, formatter: SQLFormatter, context: ExpressionContext): string {
        if (!over?.as_window_specification?.window_specification) {
            return '';
        }
        
        const spec = over.as_window_specification.window_specification;
        let overStr = ' OVER (';
        
        // 处理 PARTITION BY
        if (spec.partitionby) {
            overStr += 'PARTITION BY ' + spec.partitionby
                .map((item: any) => formatter.formatExpression(item.expr, context))
                .join(', ');
        }
        
        // 处理 ORDER BY
        if (spec.orderby) {
            if (spec.partitionby) {
                overStr += ' ';
            }
            overStr += 'ORDER BY ' + spec.orderby
                .map((item: any) => formatter.formatExpression(item.expr, context))
                .join(', ');
        }
        
        overStr += ')';
        return overStr;
    }
} 