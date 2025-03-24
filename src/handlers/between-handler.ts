import { EnhancedBaseHandler } from './enhanced-base-handler';
import { SQLFormatter } from '../formatter';
import { ExpressionState } from '../types/expression-state';

export class BetweenHandler extends EnhancedBaseHandler {
    canHandle(expr: any): boolean {
        return expr?.type === 'binary_expr' && 
               expr?.operator?.toUpperCase() === 'BETWEEN';
    }

    protected handleInternal(
        expr: any,
        formatter: SQLFormatter,
        state: ExpressionState
    ): string {
        try {
            const leftState = this.createChildState(state, 'left');
            const left = this.formatWithState(expr.left, formatter, leftState);

            if (expr.right?.type === 'expr_list' && Array.isArray(expr.right.value)) {
                if (expr.right.value.length !== 2) {
                    throw new Error('BETWEEN expression must have exactly two bounds');
                }

                // 创建带有BETWEEN操作符信息的上下文
                const rightContext = {
                    ...state.context,
                    parentOperator: 'BETWEEN'
                };

                const rightState = {
                    ...this.createChildState(state, 'right'),
                    context: rightContext
                };

                // 使用新的上下文格式化表达式列表
                const exprList = this.formatWithState(expr.right, formatter, rightState);

                // 如果在函数内部，使用紧凑格式
                if (state.context.isInFunction) {
                    return `${left} BETWEEN ${exprList}`;
                }

                // 否则使用标准格式
                return `${left} BETWEEN ${exprList}`;
            }

            throw new Error('Invalid BETWEEN expression: right operand must be an expr_list');
        } catch (error: any) {
            console.error('Error in BetweenHandler:', error.message);
            throw error;
        }
    }
} 