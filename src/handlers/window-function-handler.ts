import { BaseHandler } from './base-handler';
import { ExpressionContext } from '../types/expression-context';
import { SQLFormatter } from '../formatter';

/**
 * 窗口函数处理器
 * 专门处理带OVER子句的窗口函数
 */
export class WindowFunctionHandler extends BaseHandler {
    canHandle(expr: any): boolean {
        return this.isWindowFunction(expr);
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            // 根据expr类型决定如何提取函数名和参数
            let funcName = '';
            let args = '';
            
            if (expr.type === 'function') {
                funcName = expr.name?.name?.[0]?.value || expr.name?.value || '';
                args = expr.args.value.map((arg: any) => 
                    formatter.formatExpression(arg, { ...context, isInFunction: true })
                ).join(', ');
            } else if (expr.type === 'aggr_func') {
                funcName = expr.name.toUpperCase();
                const distinct = expr.args.distinct ? 'DISTINCT ' : '';
                args = expr.args.expr ? 
                    distinct + formatter.formatExpression(expr.args.expr, { ...context, isInFunction: true }) :
                    '';
            }
            
            // 格式化OVER子句
            const overClause = this.formatOverClause(expr.over, formatter, { ...context, isInFunction: true });
            
            return `${funcName}(${args})${overClause}`;
        } catch (error) {
            console.error('Error in WindowFunctionHandler:', error);
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
                .map((item: any) => {
                    const expr = formatter.formatExpression(item.expr, context);
                    return `${expr} ${item.type}`;
                }).join(', ');
        }
        
        // 处理窗口框架，如ROWS或RANGE
        if (spec.frame) {
            if (spec.partitionby || spec.orderby) {
                overStr += ' ';
            }
            overStr += this.formatWindowFrame(spec.frame, formatter, context);
        }
        
        overStr += ')';
        return overStr;
    }
    
    private formatWindowFrame(frame: any, formatter: SQLFormatter, context: ExpressionContext): string {
        if (!frame) {return '';}
        
        // 提取框架类型 (ROWS/RANGE)
        const frameType = frame.type ? frame.type.toUpperCase() : 'ROWS';
        
        // 处理起始点
        let start = '';
        if (frame.start) {
            if (frame.start.direction === 'PRECEDING' && frame.start.value && frame.start.value.value === 'UNBOUNDED') {
                start = 'UNBOUNDED PRECEDING';
            } else if (frame.start.direction === 'CURRENT') {
                start = 'CURRENT ROW';
            } else if (frame.start.direction === 'PRECEDING') {
                const value = formatter.formatExpression(frame.start.value, context);
                start = `${value} PRECEDING`;
            } else if (frame.start.direction === 'FOLLOWING') {
                const value = formatter.formatExpression(frame.start.value, context);
                start = `${value} FOLLOWING`;
            }
        }
        
        // 如果只有起始点，返回简单格式
        if (!frame.end) {
            return `${frameType} ${start}`;
        }
        
        // 处理终点
        let end = '';
        if (frame.end) {
            if (frame.end.direction === 'FOLLOWING' && frame.end.value && frame.end.value.value === 'UNBOUNDED') {
                end = 'UNBOUNDED FOLLOWING';
            } else if (frame.end.direction === 'CURRENT') {
                end = 'CURRENT ROW';
            } else if (frame.end.direction === 'PRECEDING') {
                const value = formatter.formatExpression(frame.end.value, context);
                end = `${value} PRECEDING`;
            } else if (frame.end.direction === 'FOLLOWING') {
                const value = formatter.formatExpression(frame.end.value, context);
                end = `${value} FOLLOWING`;
            }
        }
        
        return `${frameType} BETWEEN ${start} AND ${end}`;
    }
} 