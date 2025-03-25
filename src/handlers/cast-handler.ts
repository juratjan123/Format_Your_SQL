import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';
import { BaseHandler } from './base-handler';

/**
 * CAST 函数表达式处理器
 * 处理SQL中的类型转换表达式，如 CAST(expr AS type)
 */
export class CastHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return expr?.type === 'cast';
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            if (!expr.expr || !expr.target || !expr.target.length) {
                return ''; // 缺少必要的属性则返回空字符串
            }
            
            // 格式化源表达式
            const sourceExpr = formatter.formatExpression(expr.expr, {
                ...context,
                isInFunction: true // 使用函数上下文以保持紧凑格式
            });
            
            // 获取目标数据类型
            const targetType = expr.target[0].dataType;
            
            // 构建 CAST 函数表达式
            return `CAST(${sourceExpr} AS ${targetType})`;
        } catch (error) {
            console.error('Error in CastHandler:', error);
            // 出错时尝试返回原始表达式的字符串形式
            return expr.value || '';
        }
    }
} 