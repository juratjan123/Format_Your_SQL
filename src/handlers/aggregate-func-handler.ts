import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';

export class AggregateFuncHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        // 不处理窗口函数，那些应该由WindowFunctionHandler处理
        return expr?.type === 'aggr_func' && !this.isWindowFunction(expr);
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
            
            // 因为我们确保这不是窗口函数，所以不需要处理OVER子句
            return `${funcName}(${distinct}${args})`;
        } catch (error) {
            console.error('Error in AggregateFuncHandler:', error);
            return expr.value || '';
        }
    }
} 