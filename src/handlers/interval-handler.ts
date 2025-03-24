import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';
import { BaseHandler } from './base-handler';

/**
 * INTERVAL 表达式处理器
 * 处理SQL中的时间间隔表达式，如 INTERVAL 1 DAY, INTERVAL '1-2' YEAR TO MONTH 等
 */
export class IntervalHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return expr?.type === 'interval';
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            if (!expr.expr) {
                return 'INTERVAL';
            }
            
            // 格式化间隔值表达式
            const intervalValue = formatter.formatExpression(expr.expr, {
                ...context,
                isInFunction: true // 使用函数上下文以保持紧凑格式
            });
            
            // 处理单位
            let unit = '';
            if (expr.unit) {
                unit = expr.unit.toUpperCase();
            }
            
            return `INTERVAL ${intervalValue} ${unit}`.trim();
        } catch (error) {
            console.error('Error in IntervalHandler:', error);
            // 出错时返回尽可能多的信息，避免数据丢失
            return `INTERVAL ${expr.expr?.value || ''} ${expr.unit || ''}`.trim();
        }
    }
}