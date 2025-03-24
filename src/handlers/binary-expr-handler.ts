import { SQLFormatter } from '../formatter';
import { ExpressionContext } from '../types/expression-context';
import { OperatorHandler, LogicalOperatorHandler, ComparisonOperatorHandler, DefaultOperatorHandler } from './operator-handler';
import { ExpressionHandler } from './expression-handler';
import { BaseHandler } from './base-handler';
import { OperatorPrecedence } from '../utils/operator-precedence';

export class BinaryExprHandler extends BaseHandler {
    private operatorHandlers: OperatorHandler[];
    
    constructor() {
        super();
        this.operatorHandlers = [
            new LogicalOperatorHandler(),
            new ComparisonOperatorHandler(),
            new DefaultOperatorHandler()
        ];
    }
    
    canHandle(expr: any): boolean {
        return expr?.type === 'binary_expr' && expr?.operator;
    }
    
    handle(expr: any, formatter: SQLFormatter, context: ExpressionContext): string {
        try {
            const operator = expr.operator.toUpperCase();
            
            // 检查是否需要括号
            const needsParentheses = expr.parentheses || 
                (context.parentOperator && 
                 OperatorPrecedence.needsParentheses(context.parentOperator, operator));

            // 创建子表达式的上下文
            const childContext: ExpressionContext = {
                ...context,
                parentOperator: operator,
                isTopLevel: false,
                level: needsParentheses ? context.level : context.level
            };

            // 特殊处理 IS [NOT] NULL
            if (operator === 'IS' || operator === 'IS NOT') {
                const left = formatter.formatExpression(expr.left, childContext);
                const right = expr.right.value?.toUpperCase() || 'NULL';
                const result = `${left} ${operator} ${right}`;
                return needsParentheses ? `(${result})` : result;
            }

            const left = formatter.formatExpression(expr.left, childContext);
            const right = formatter.formatExpression(expr.right, childContext);

            let result = '';
            // 在函数内部或JOIN条件时保持在同一行
            if (context.isInFunction || context.isJoinCondition) {
                result = `${left} ${operator} ${right}`;
            } else {
                // 如果需要括号，在括号内保持紧凑格式
                if (needsParentheses) {
                    result = `(${left} ${operator} ${right})`;
                } else {
                    // 使用操作符处理器的格式化选项
                    for (const handler of this.operatorHandlers) {
                        if (handler.canHandle(operator)) {
                            const options = handler.getFormatOptions(context);
                            if (options.shouldLineBreak) {
                                result = `${left}\n${formatter.indent(context.level)}${operator} ${right}`;
                            } else {
                                result = `${left} ${operator} ${right}`;
                            }
                            break;
                        }
                    }
                }
            }

            return result || `${left} ${operator} ${right}`;
        } catch (error) {
            console.error('Error in BinaryExprHandler:', error);
            return expr.value || '';
        }
    }
} 